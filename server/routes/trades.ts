import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { executeTradeSchema } from "@shared/schema";
import { authMiddleware, authed } from "./middleware";
import { executePracticeOrder } from "../practiceOrderService";

export function registerTradeRoutes(app: Express) {
  app.post("/api/trades/execute", authMiddleware, authed(async (req, res) => {
    try {
      const body = executeTradeSchema.parse({ ...req.body, userId: req.userId });
      const potGain = body.potentialGain != null && isFinite(body.potentialGain) ? body.potentialGain : null;
      const result = await executePracticeOrder(req.userId, {
        symbol: body.ticker, assetClass: body.market,
        side: body.action.toLowerCase() === "sell" ? "sell" : "buy",
        orderType: "market", quantity: body.units,
        notionalAmount: body.investedAmount, estimatedPrice: body.entryPrice,
        tickerName: body.tickerName ?? body.ticker, potentialGain: potGain,
      });
      res.json({ trade: result.trade, order: result.order, newBalance: result.newBalance });
    } catch (e: any) {
      if (e instanceof z.ZodError) {
        const fields = e.errors.map(err => `${err.path.join(".")}: ${err.message}`).join(", ");
        console.error("[trade] Validation failed:", fields, "| body:", JSON.stringify(req.body));
        return res.status(400).json({ message: e.errors[0].message, fields });
      }
      console.error(e);
      res.status(e.statusCode || 500).json({ message: e.message || "Trade failed" });
    }
  }));

  app.get("/api/trades", authMiddleware, authed(async (req, res) => {
    const userTrades = await storage.getUserTrades(req.userId);
    res.json(userTrades);
  }));

  app.post("/api/trades/:tradeId/close", authMiddleware, authed(async (req, res) => {
    try {
      const { tradeId } = req.params;
      const exitPriceInput = req.body?.exitPrice != null ? Number(req.body.exitPrice) : null;
      if (exitPriceInput !== null && (!isFinite(exitPriceInput) || exitPriceInput <= 0)) {
        return res.status(400).json({ message: "Invalid exit price" });
      }
      const userTrades = await storage.getUserTrades(req.userId);
      const trade = userTrades.find(t => t.id === tradeId);
      if (!trade) return res.status(404).json({ message: "Trade not found" });
      if (trade.status !== "OPEN") return res.status(400).json({ message: "Trade is already closed" });

      const entry = parseFloat(String(trade.entryPrice));
      const exit = exitPriceInput ?? entry * (1 + (Math.random() - 0.4) * 0.05);
      const invested = parseFloat(String(trade.investedAmount));
      const directionFactor = trade.action === "SELL" ? -1 : 1;
      const pnl = parseFloat((directionFactor * (exit - entry) / entry * invested).toFixed(2));

      // closeTrade only succeeds for the first close of an OPEN trade,
      // so the credit below runs exactly once even under concurrent requests.
      const closed = await storage.closeTrade(tradeId, req.userId, exit, pnl);
      if (!closed) return res.status(400).json({ message: "Trade is already closed" });

      const newBal = await storage.creditBalance(req.userId, invested + pnl);
      if (newBal !== null) await storage.saveSnapshot(req.userId, newBal);
      res.json({ success: true, pnl, newBalance: newBal });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Close trade failed" });
    }
  }));
}
