import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { marketDataService } from "./marketDataService";
import { startLiveDataService, getLivePrices, getOptionsChain, getAllOptionsChains } from "./liveDataService";
import { signupSchema, loginSchema, onboardingSchema, executeTradeSchema } from "@shared/schema";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "tradepro-secret-2026";

function makeToken(userId: string) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: "7d" });
}

function authMiddleware(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string };
    req.userId = payload.userId;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Start live market data service (non-blocking background job)
  startLiveDataService();

  // ── Auth ────────────────────────────────────────────────────────────────────

  app.post("/api/auth/signup", async (req, res) => {
    try {
      const body = signupSchema.parse(req.body);
      const existing = await storage.getUserByEmail(body.email);
      if (existing) return res.status(409).json({ message: "Email already registered" });
      const passwordHash = await bcrypt.hash(body.password, 10);
      const user = await storage.createUser({
        name: body.name,
        email: body.email,
        passwordHash,
        paperBalance: "10000",
        onboardingComplete: false,
        marketInterests: [],
      });
      // Save initial snapshot
      await storage.saveSnapshot(user.id, 10000);
      const token = makeToken(user.id);
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, paperBalance: user.paperBalance, onboardingComplete: user.onboardingComplete, marketInterests: user.marketInterests } });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      console.error(e);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const body = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(body.email);
      if (!user) return res.status(401).json({ message: "Invalid email or password" });
      const ok = await bcrypt.compare(body.password, user.passwordHash);
      if (!ok) return res.status(401).json({ message: "Invalid email or password" });
      const token = makeToken(user.id);
      res.json({ token, user: { id: user.id, name: user.name, email: user.email, paperBalance: user.paperBalance, onboardingComplete: user.onboardingComplete, marketInterests: user.marketInterests } });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: any, res) => {
    const user = await storage.getUserById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json({ id: user.id, name: user.name, email: user.email, paperBalance: user.paperBalance, onboardingComplete: user.onboardingComplete, marketInterests: user.marketInterests });
  });

  // ── Onboarding ──────────────────────────────────────────────────────────────

  app.post("/api/onboarding", authMiddleware, async (req: any, res) => {
    try {
      const body = onboardingSchema.parse(req.body);
      await storage.updateUserOnboarding(req.userId, body.marketInterests, body.paperBalance);
      await storage.saveSnapshot(req.userId, body.paperBalance);
      res.json({ success: true });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      res.status(500).json({ message: "Onboarding failed" });
    }
  });

  // ── Market Opportunities ────────────────────────────────────────────────────

  app.get("/api/opportunities/:market", (req, res) => {
    const { market } = req.params;
    if (!["stocks","commodities","crypto","options","forex"].includes(market)) {
      return res.status(400).json({ message: "Invalid market" });
    }
    const style = req.query.style as string | undefined;
    const data = marketDataService.generateOpportunities(market, style);
    res.json(data);
  });

  // ── AI Signals ──────────────────────────────────────────────────────────────

  app.get("/api/ai-signals", (req, res) => {
    res.json(marketDataService.generateAISignals());
  });

  // ── Prices ──────────────────────────────────────────────────────────────────

  app.get("/api/prices/:ticker", (req, res) => {
    res.json(marketDataService.getPrice(req.params.ticker.toUpperCase()));
  });

  // ── Trades ──────────────────────────────────────────────────────────────────

  app.post("/api/trades/execute", authMiddleware, async (req: any, res) => {
    try {
      const body = executeTradeSchema.parse({ ...req.body, userId: req.userId });
      // Deduct from balance
      const user = await storage.getUserById(req.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const balance = parseFloat(String(user.paperBalance));
      if (balance < body.investedAmount) {
        return res.status(400).json({ message: "Insufficient balance" });
      }
      const newBalance = parseFloat((balance - body.investedAmount).toFixed(2));
      await storage.updateUserBalance(req.userId, newBalance);
      const trade = await storage.createTrade({
        userId: req.userId,
        market: body.market,
        ticker: body.ticker,
        tickerName: body.tickerName,
        action: body.action,
        entryPrice: String(body.entryPrice),
        units: String(body.units),
        investedAmount: String(body.investedAmount),
        potentialGain: body.potentialGain ? String(body.potentialGain) : null,
        status: "OPEN",
      });
      await storage.saveSnapshot(req.userId, newBalance);
      res.json({ trade, newBalance });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      console.error(e);
      res.status(500).json({ message: "Trade failed" });
    }
  });

  app.get("/api/trades", authMiddleware, async (req: any, res) => {
    const userTrades = await storage.getUserTrades(req.userId);
    res.json(userTrades);
  });

  app.post("/api/trades/:tradeId/close", authMiddleware, async (req: any, res) => {
    try {
      const { tradeId } = req.params;
      const { exitPrice } = req.body;
      const userTrades = await storage.getUserTrades(req.userId);
      const trade = userTrades.find(t => t.id === tradeId);
      if (!trade) return res.status(404).json({ message: "Trade not found" });
      const entry = parseFloat(String(trade.entryPrice));
      const exit = exitPrice ?? entry * (1 + (Math.random() - 0.4) * 0.05);
      const units = parseFloat(String(trade.units));
      const invested = parseFloat(String(trade.investedAmount));
      const pnl = parseFloat(((exit - entry) / entry * invested).toFixed(2));
      await storage.closeTrade(tradeId, exit, pnl);
      // Return invested amount + pnl to balance
      const user = await storage.getUserById(req.userId);
      if (user) {
        const newBal = parseFloat((parseFloat(String(user.paperBalance)) + invested + pnl).toFixed(2));
        await storage.updateUserBalance(req.userId, newBal);
        await storage.saveSnapshot(req.userId, newBal);
      }
      res.json({ success: true, pnl });
    } catch (e) {
      res.status(500).json({ message: "Close trade failed" });
    }
  });

  // ── Watchlist ───────────────────────────────────────────────────────────────

  app.get("/api/watchlist", authMiddleware, async (req: any, res) => {
    res.json(await storage.getUserWatchlist(req.userId));
  });

  app.post("/api/watchlist/:ticker", authMiddleware, async (req: any, res) => {
    await storage.addToWatchlist(req.userId, req.params.ticker, req.body.market || "stocks");
    res.json({ success: true });
  });

  app.delete("/api/watchlist/:ticker", authMiddleware, async (req: any, res) => {
    await storage.removeFromWatchlist(req.userId, req.params.ticker);
    res.json({ success: true });
  });

  // ── Learn Progress ──────────────────────────────────────────────────────────

  app.get("/api/learn/progress", authMiddleware, async (req: any, res) => {
    res.json(await storage.getLearnProgress(req.userId));
  });

  app.post("/api/learn/progress", authMiddleware, async (req: any, res) => {
    const { moduleId, completed, quizScore } = req.body;
    await storage.updateLearnProgress(req.userId, moduleId, completed, quizScore);
    res.json({ success: true });
  });

  // ── Portfolio Snapshots ─────────────────────────────────────────────────────

  app.get("/api/portfolio/snapshots", authMiddleware, async (req: any, res) => {
    const limit = parseInt(req.query.limit as string) || 30;
    const snaps = await storage.getSnapshots(req.userId, limit);
    res.json(snaps.reverse());
  });

  // ── Reset Portfolio ─────────────────────────────────────────────────────────

  app.post("/api/portfolio/reset", authMiddleware, async (req: any, res) => {
    await storage.resetPortfolio(req.userId);
    await storage.saveSnapshot(req.userId, 10000);
    res.json({ success: true, newBalance: 10000 });
  });

  // ── Live Prices ──────────────────────────────────────────────────────────────

  app.get("/api/live-prices", (_req, res) => {
    res.json(getLivePrices());
  });

  app.get("/api/options-chain/:symbol", (req, res) => {
    const sym = req.params.symbol.toUpperCase();
    const chain = getOptionsChain(sym);
    if (!chain) return res.status(404).json({ message: "No chain data yet" });
    res.json(chain);
  });

  app.get("/api/options-chains", (_req, res) => {
    res.json(getAllOptionsChains());
  });

  const httpServer = createServer(app);
  return httpServer;
}
