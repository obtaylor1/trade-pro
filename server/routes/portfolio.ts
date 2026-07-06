import type { Express } from "express";
import { z } from "zod";
import { storage } from "../storage";
import { STARTING_BALANCE } from "../config";
import { marketEnum, tickerSchema } from "@shared/schema";
import { authMiddleware, authed } from "./middleware";

const learnProgressSchema = z.object({
  moduleId: z.coerce.number().int().min(0),
  completed: z.boolean(),
  quizScore: z.coerce.number().int().min(0).max(100).default(0),
});

export function registerPortfolioRoutes(app: Express) {
  // ── Watchlist ───────────────────────────────────────────────────────────────

  app.get("/api/watchlist", authMiddleware, authed(async (req, res) => {
    res.json(await storage.getUserWatchlist(req.userId));
  }));

  app.post("/api/watchlist/:ticker", authMiddleware, authed(async (req, res) => {
    const ticker = tickerSchema.safeParse(req.params.ticker);
    const market = marketEnum.safeParse(req.body?.market ?? "stocks");
    if (!ticker.success) return res.status(400).json({ message: "Invalid ticker symbol" });
    if (!market.success) return res.status(400).json({ message: "Invalid market" });
    await storage.addToWatchlist(req.userId, ticker.data, market.data);
    res.json({ success: true });
  }));

  app.delete("/api/watchlist/:ticker", authMiddleware, authed(async (req, res) => {
    const ticker = tickerSchema.safeParse(req.params.ticker);
    if (!ticker.success) return res.status(400).json({ message: "Invalid ticker symbol" });
    await storage.removeFromWatchlist(req.userId, ticker.data);
    res.json({ success: true });
  }));

  // ── Learn Progress ──────────────────────────────────────────────────────────

  app.get("/api/learn/progress", authMiddleware, authed(async (req, res) => {
    res.json(await storage.getLearnProgress(req.userId));
  }));

  app.post("/api/learn/progress", authMiddleware, authed(async (req, res) => {
    const parsed = learnProgressSchema.safeParse(req.body);
    if (!parsed.success) return res.status(400).json({ message: parsed.error.errors[0].message });
    const { moduleId, completed, quizScore } = parsed.data;
    await storage.updateLearnProgress(req.userId, moduleId, completed, quizScore);
    res.json({ success: true });
  }));

  // ── Portfolio Snapshots ─────────────────────────────────────────────────────

  app.get("/api/portfolio/snapshots", authMiddleware, authed(async (req, res) => {
    const limit = Math.min(parseInt(req.query.limit as string) || 30, 365);
    const snaps = await storage.getSnapshots(req.userId, limit);
    res.json(snaps.reverse());
  }));

  // ── Reset Portfolio ─────────────────────────────────────────────────────────

  app.post("/api/portfolio/reset", authMiddleware, authed(async (req, res) => {
    await storage.resetPortfolio(req.userId);
    await storage.saveSnapshot(req.userId, STARTING_BALANCE);
    res.json({ success: true, newBalance: STARTING_BALANCE });
  }));
}
