import type { Express } from "express";
import { storage } from "../storage";
import { authMiddleware, authed, requireAdmin, userPayload } from "./middleware";
import type { Trade } from "@shared/schema";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function tradeStats(userTrades: Trade[]) {
  const closed = userTrades.filter(t => t.status === "CLOSED");
  const wins = closed.filter(t => parseFloat(String(t.pnl ?? 0)) > 0);
  const totalPnl = closed.reduce((sum, t) => sum + parseFloat(String(t.pnl ?? 0)), 0);
  const winRate = closed.length > 0 ? Math.round((wins.length / closed.length) * 100) : 0;
  return { totalPnl: parseFloat(totalPnl.toFixed(2)), tradeCount: userTrades.length, winRate };
}

export function registerAdminRoutes(app: Express) {
  app.get("/api/admin/stats", authMiddleware, requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allTrades = await storage.getAllTrades();

      const todayStart = new Date();
      todayStart.setUTCHours(0, 0, 0, 0);
      const newUsersToday = allUsers.filter(u => new Date(u.createdAt) >= todayStart).length;

      const closedTrades = allTrades.filter(t => t.status === "CLOSED");
      const winningTrades = closedTrades.filter(t => parseFloat(String(t.pnl ?? 0)) > 0);
      const avgWinRate = closedTrades.length > 0
        ? Math.round((winningTrades.length / closedTrades.length) * 100)
        : 0;

      const assetCounts: Record<string, number> = {};
      for (const t of allTrades) {
        assetCounts[t.ticker] = (assetCounts[t.ticker] || 0) + 1;
      }
      const topAssets = Object.entries(assetCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)
        .map(([ticker, count]) => ({ ticker, count }));

      res.json({
        totalUsers: allUsers.length,
        totalTrades: allTrades.length,
        newUsersToday,
        avgWinRate,
        topAssets,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to load stats" });
    }
  });

  app.get("/api/admin/users", authMiddleware, requireAdmin, async (_req, res) => {
    try {
      const allUsers = await storage.getAllUsers();
      const allTrades = await storage.getAllTrades();

      const result = allUsers.map(u => ({
        id: u.id,
        name: u.name,
        email: u.email,
        createdAt: u.createdAt,
        lastLogin: u.lastLogin,
        paperBalance: u.paperBalance,
        isAdmin: u.isAdmin === 1,
        ...tradeStats(allTrades.filter(t => t.userId === u.id)),
      }));

      res.json(result);
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to load users" });
    }
  });

  app.get("/api/admin/users/:id", authMiddleware, requireAdmin, authed(async (req, res) => {
    try {
      if (!UUID_RE.test(req.params.id)) return res.status(400).json({ message: "Invalid user id" });
      const user = await storage.getUserById(req.params.id);
      if (!user) return res.status(404).json({ message: "User not found" });
      const userTrades = await storage.getUserTrades(req.params.id);
      res.json({
        ...userPayload(user),
        createdAt: user.createdAt,
        lastLogin: user.lastLogin,
        ...tradeStats(userTrades),
        trades: userTrades,
      });
    } catch (e) {
      console.error(e);
      res.status(500).json({ message: "Failed to load user" });
    }
  }));
}
