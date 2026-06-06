import type { Express } from "express";
import { createServer, type Server } from "http";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { marketDataService } from "./marketDataService";
import { startLiveDataService, getLivePrices, getOptionsChain, getAllOptionsChains } from "./liveDataService";
import { startNewsService, getNews } from "./newsService";
import { signupSchema, loginSchema, onboardingSchema, executeTradeSchema } from "@shared/schema";
import { z } from "zod";

const JWT_SECRET = process.env.JWT_SECRET || "tradepro-secret-2026";

function makeToken(userId: string, isAdmin: boolean, expiresIn: string | number = "30d") {
  return jwt.sign({ userId, isAdmin }, JWT_SECRET, { expiresIn } as any);
}

function authMiddleware(req: any, res: any, next: any) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith("Bearer ")) return res.status(401).json({ message: "Unauthorized" });
  try {
    const payload = jwt.verify(auth.slice(7), JWT_SECRET) as { userId: string; isAdmin?: boolean };
    req.userId = payload.userId;
    req.isAdmin = payload.isAdmin ?? false;
    next();
  } catch {
    return res.status(401).json({ message: "Invalid token" });
  }
}

function requireAdmin(req: any, res: any, next: any) {
  if (!req.isAdmin) return res.status(403).json({ message: "Forbidden" });
  next();
}

function userPayload(user: any) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    paperBalance: user.paperBalance,
    onboardingComplete: user.onboardingComplete,
    marketInterests: user.marketInterests,
    isAdmin: user.isAdmin === 1,
  };
}

export async function registerRoutes(app: Express): Promise<Server> {
  startLiveDataService();
  startNewsService();

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
      await storage.saveSnapshot(user.id, 10000);
      await storage.updateLastLogin(user.id);
      const token = makeToken(user.id, user.isAdmin === 1, "30d");
      res.json({ token, user: userPayload(user) });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      console.error(e);
      res.status(500).json({ message: "Signup failed" });
    }
  });

  app.post("/api/auth/login", async (req, res) => {
    try {
      const body = loginSchema.parse(req.body);
      const rememberMe = req.body.rememberMe === true;
      const user = await storage.getUserByEmail(body.email);
      if (!user) return res.status(401).json({ message: "Invalid email or password" });
      const ok = await bcrypt.compare(body.password, user.passwordHash);
      if (!ok) return res.status(401).json({ message: "Invalid email or password" });
      await storage.updateLastLogin(user.id);
      const expiry = rememberMe ? "90d" : "30d";
      const token = makeToken(user.id, user.isAdmin === 1, expiry);
      res.json({ token, user: userPayload(user) });
    } catch (e) {
      if (e instanceof z.ZodError) return res.status(400).json({ message: e.errors[0].message });
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post("/api/auth/refresh", authMiddleware, async (req: any, res) => {
    try {
      const user = await storage.getUserById(req.userId);
      if (!user) return res.status(404).json({ message: "User not found" });
      const rememberMe = req.body?.rememberMe === true;
      const expiry = rememberMe ? "90d" : "30d";
      const token = makeToken(user.id, user.isAdmin === 1, expiry);
      res.json({ token, user: userPayload(user) });
    } catch (e) {
      res.status(500).json({ message: "Refresh failed" });
    }
  });

  app.post("/api/auth/demo", async (req, res) => {
    try {
      const DEMO_EMAIL = "demo@tradepro.app";
      let user = await storage.getUserByEmail(DEMO_EMAIL);
      if (!user) {
        const passwordHash = await bcrypt.hash("demo-tradepro-2026", 10);
        user = await storage.createUser({
          name: "Demo Trader",
          email: DEMO_EMAIL,
          passwordHash,
          paperBalance: "10000",
          onboardingComplete: true,
          marketInterests: ["stocks", "crypto", "forex", "commodities", "options"],
        });
        await storage.saveSnapshot(user.id, 10000);
      }
      await storage.updateLastLogin(user.id);
      const token = makeToken(user.id, false, "30d");
      res.json({ token, user: userPayload(user) });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Demo login failed" });
    }
  });

  app.get("/api/auth/me", authMiddleware, async (req: any, res) => {
    const user = await storage.getUserById(req.userId);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.json(userPayload(user));
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

  // ── News ────────────────────────────────────────────────────────────────────

  app.get("/api/news", (req, res) => {
    const category = (req.query.category as string) || "all";
    const valid = ["all", "stocks", "crypto", "forex", "commodities", "options"];
    if (!valid.includes(category)) return res.status(400).json({ message: "Invalid category" });
    res.json(getNews(category));
  });

  // ── Live Prices ─────────────────────────────────────────────────────────────

  app.get("/api/live-prices", (req, res) => {
    res.json(getLivePrices());
  });

  app.get("/api/options-chain/:symbol", (req, res) => {
    const chain = getOptionsChain(req.params.symbol.toUpperCase());
    if (!chain) return res.status(404).json({ message: "No options chain for symbol" });
    res.json(chain);
  });

  app.get("/api/options-chains", (req, res) => {
    res.json(getAllOptionsChains());
  });

  // ── Admin ────────────────────────────────────────────────────────────────────

  app.get("/api/admin/stats", authMiddleware, requireAdmin, async (req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allTrades = await storage.getAllTrades();

      const totalUsers = allUsers.length;
      const totalTrades = allTrades.length;

      // New users today (UTC)
      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const newUsersToday = allUsers.filter(u => new Date(u.createdAt) >= todayStart).length;

      // Avg win rate
      const closedTrades = allTrades.filter(t => t.status === "CLOSED");
      const winningTrades = closedTrades.filter(t => parseFloat(String(t.pnl ?? 0)) > 0);
      const avgWinRate = closedTrades.length > 0
        ? Math.round((winningTrades.length / closedTrades.length) * 100)
        : 0;

      // Top assets by trade count
      const assetCounts: Record<string, number> = {};
      for (const t of allTrades) {
        assetCounts[t.ticker] = (assetCounts[t.ticker] || 0) + 1;
      }
      const topAssets = Object.entries(assetCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([ticker, count]) => ({ ticker, count }));

      res.json({ totalUsers, totalTrades, newUsersToday, avgWinRate, topAssets });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to load stats" });
    }
  });

  app.get("/api/admin/users", authMiddleware, requireAdmin, async (req: any, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allTrades = await storage.getAllTrades();

      const result = allUsers.map(u => {
        const userTrades = allTrades.filter(t => t.userId === u.id);
        const closed = userTrades.filter(t => t.status === "CLOSED");
        const wins = closed.filter(t => parseFloat(String(t.pnl ?? 0)) > 0);
        const totalPnl = closed.reduce((sum, t) => sum + parseFloat(String(t.pnl ?? 0)), 0);
        const winRate = closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0;
        return {
          id: u.id,
          name: u.name,
          email: u.email,
          createdAt: u.createdAt,
          lastLogin: u.lastLogin,
          paperBalance: u.paperBalance,
          totalPnl: parseFloat(totalPnl.toFixed(2)),
          tradeCount: userTrades.length,
          winRate,
          isAdmin: u.isAdmin === 1,
        };
      });

      res.json(result);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to load users" });
    }
  });

  app.get("/api/admin/users/:id", authMiddleware, requireAdmin, async (req: any, res) => {
    try {
      const user = await storage.getUserById(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const userTrades = await storage.getUserTrades(req.params.id);
      const closed = userTrades.filter(t => t.status === "CLOSED");
      const wins = closed.filter(t => parseFloat(String(t.pnl ?? 0)) > 0);
      const totalPnl = closed.reduce((sum, t) => sum + parseFloat(String(t.pnl ?? 0)), 0);
      const winRate = closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0;
      res.json({
        ...userPayload(user),
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        totalPnl: parseFloat(totalPnl.toFixed(2)),
        tradeCount: userTrades.length,
        winRate,
        trades: userTrades,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to load user" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
