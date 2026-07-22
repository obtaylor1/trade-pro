import type { Express } from "express";
import { randomUUID } from "crypto";
import { storage } from "../storage";
import { getBrokerAdapter, type OrderRequest } from "../broker";
import { authMiddleware, authed } from "./middleware";
import { z } from "zod";
import { enforceOrderSafety } from "../orderSafetyService";

// Beginner safety rules: cap per-order notional and lock complex products.
const BEGINNER_MAX_NOTIONAL = 100;
const BEGINNER_LOCKED_ASSETS = new Set(["options", "futures"]);
const brokerConnectionSchema = z.object({
  brokerName: z.enum(["Alpaca", "Public", "Charles Schwab", "Tradier", "tastytrade", "TradeStation", "OANDA", "Interactive Brokers", "Tradovate", "Coinbase", "Kraken", "SnapTrade", "DriveWealth"]),
  mode: z.enum(["paper", "live"]),
  accountLabel: z.string().trim().min(2).max(80),
  brokerAccountId: z.string().trim().max(100).optional(),
});

function publicAccount(account: any) {
  const { apiKeyEncrypted, apiSecretEncrypted, accessTokenEncrypted, refreshTokenEncrypted, ...safe } = account;
  return { ...safe, environment: "sandbox" };
}

export function registerTradingRoutes(app: Express) {
  const userModes = new Map<string, string>();
  const activePreviews = new Map<string, any>(); // keyed by `${userId}-${previewId}`

  async function resolveAdapter(userId: string) {
    const mode = userModes.get(userId) || "paper";
    if (mode === "paper") return getBrokerAdapter("paper");
    const accounts = await storage.getTradingAccounts(userId);
    const liveAcc = accounts.find(a => a.mode === "live" && a.status === "connected");
    if (!liveAcc) return null;
    return getBrokerAdapter(liveAcc.brokerName);
  }

  app.get("/api/trading/mode", authMiddleware, authed((req, res) => {
    res.json({ mode: userModes.get(req.userId) || "paper" });
  }));

  app.post("/api/trading/mode", authMiddleware, authed(async (req, res) => {
    const { mode } = req.body;
    if (mode !== "paper" && mode !== "live") {
      return res.status(400).json({ message: "Invalid trading mode" });
    }

    if (mode === "live") {
      const accounts = await storage.getTradingAccounts(req.userId);
      const hasLiveBroker = accounts.some(acc => acc.mode === "live" && acc.status === "connected");
      if (!hasLiveBroker) {
        return res.status(400).json({ message: "No broker sandbox profile found. Connect one first." });
      }
    }

    userModes.set(req.userId, mode);
    res.json({ success: true, mode });
  }));

  app.get("/api/trading/accounts", authMiddleware, authed(async (req, res) => {
    res.json((await storage.getTradingAccounts(req.userId)).map(publicAccount));
  }));

  app.post("/api/trading/accounts/connect", authMiddleware, authed(async (req, res) => {
    try {
      const { brokerName, mode, accountLabel, brokerAccountId } = brokerConnectionSchema.parse(req.body);

      const acc = await storage.connectTradingAccount(req.userId, {
        brokerName,
        mode,
        status: "connected",
        accountLabel,
        brokerAccountId: brokerAccountId || null,
        apiKeyEncrypted: null,
        apiSecretEncrypted: null,
        maskedKey: "SANDBOX",
        // Broker adapters are sandbox simulations until a verified provider
        // integration replaces the stubs in server/broker.ts.
        buyingPower: mode === "live" ? "25000" : "10000",
        accessTokenEncrypted: null,
        refreshTokenEncrypted: null,
      });

      res.json(publicAccount(acc));
    } catch (e) {
      console.error(e);
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.issues[0]?.message || "Invalid broker connection" });
      res.status(500).json({ message: "Failed to connect broker account" });
    }
  }));

  app.delete("/api/trading/accounts/:id", authMiddleware, authed(async (req, res) => {
    try {
      await storage.deleteTradingAccount(req.userId, req.params.id);
      res.json({ success: true });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to disconnect account" });
    }
  }));

  app.post("/api/trading/orders/preview", authMiddleware, authed(async (req, res) => {
    try {
      const { symbol, assetClass, side, orderType, quantity, notionalAmount, estimatedPrice, tradeScore, riskLevel, reason } = req.body;
      const origin = (["manual", "ai_confirmed", "ai_managed", "recurring_investment"].includes(req.body.origin) ? req.body.origin : "manual") as "manual" | "ai_confirmed" | "ai_managed" | "recurring_investment";

      const amount = parseFloat(String(notionalAmount));
      if (!isFinite(amount) || amount <= 0) {
        return res.status(400).json({ message: "Invalid order amount" });
      }
      if (amount > BEGINNER_MAX_NOTIONAL) {
        return res.status(400).json({ message: `This trade is above your beginner safety limit. Lower the amount to $${BEGINNER_MAX_NOTIONAL} or less, or unlock Advanced Mode after reviewing the risks.` });
      }
      if (BEGINNER_LOCKED_ASSETS.has(assetClass)) {
        return res.status(400).json({ message: "Options and futures trades are locked under beginner safety rules. Enable Advanced Mode to trade them." });
      }
      await enforceOrderSafety({ userId: req.userId, amount, assetClass, symbol, origin, executionMode: "sandbox" });

      const adapter = await resolveAdapter(req.userId);
      if (!adapter) {
        return res.status(400).json({ message: "No broker sandbox profile found. Connect one first." });
      }

      const preview = await adapter.previewOrder(req.userId, {
        symbol,
        assetClass,
        side,
        orderType,
        quantity: parseFloat(String(quantity)),
        notionalAmount: amount,
        estimatedPrice: parseFloat(String(estimatedPrice)),
        estimatedCost: amount,
        tradeScore,
        riskLevel,
        reason,
      });

      const previewId = randomUUID();
      activePreviews.set(`${req.userId}-${previewId}`, { ...req.body, origin, preview });
      res.json({ previewId, ...preview });
    } catch (e: any) {
      console.error(e);
      res.status(400).json({ message: e.message || "Failed to preview order" });
    }
  }));

  app.post("/api/trading/orders/place", authMiddleware, authed(async (req, res) => {
    try {
      const { previewId } = req.body;
      if (!previewId) {
        return res.status(400).json({ message: "previewId is required for placing orders." });
      }

      const cachedKey = `${req.userId}-${previewId}`;
      const cached = activePreviews.get(cachedKey);
      if (!cached) {
        return res.status(400).json({ message: "Order preview has expired or is invalid. Please preview your order again." });
      }

      // Remove the preview so it cannot be double-executed (replay protection).
      activePreviews.delete(cachedKey);

      const adapter = await resolveAdapter(req.userId);
      if (!adapter) {
        return res.status(400).json({ message: "No broker sandbox profile found. Connect one first." });
      }

      const order: OrderRequest = {
        symbol: cached.symbol,
        assetClass: cached.assetClass,
        side: cached.side,
        orderType: cached.orderType,
        quantity: parseFloat(String(cached.quantity)),
        notionalAmount: parseFloat(String(cached.notionalAmount)),
        estimatedPrice: parseFloat(String(cached.estimatedPrice)),
        estimatedCost: parseFloat(String(cached.notionalAmount)),
        tradeScore: cached.tradeScore,
        riskLevel: cached.riskLevel,
        reason: cached.reason,
        origin: cached.origin ?? "manual",
        idempotencyKey: previewId,
      };

      res.json(await adapter.placeOrder(req.userId, order));
    } catch (e: any) {
      console.error(e);
      res.status(400).json({ message: e.message || "Failed to place order" });
    }
  }));

  app.get("/api/trading/orders", authMiddleware, authed(async (req, res) => {
    res.json(await storage.getUserOrders(req.userId));
  }));

  app.get("/api/trading/orders/:id", authMiddleware, authed(async (req, res) => {
    const order = await storage.getOrder(req.params.id);
    if (!order || order.userId !== req.userId) {
      return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
  }));

  app.post("/api/trading/orders/:id/cancel", authMiddleware, authed(async (req, res) => {
    try {
      const order = await storage.getOrder(req.params.id);
      if (!order || order.userId !== req.userId) {
        return res.status(404).json({ message: "Order not found" });
      }

      const adapter = getBrokerAdapter(order.brokerName);
      await adapter.cancelOrder(order.id);

      res.json({ success: true });
    } catch (e: any) {
      console.error(e);
      res.status(400).json({ message: e.message || "Failed to cancel order" });
    }
  }));
}
