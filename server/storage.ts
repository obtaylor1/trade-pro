import { randomUUID } from "crypto";
import { db } from "./db";
import { users, trades, watchlist, learnProgress, portfolioSnapshots, tradingAccounts, orders, orderEvents } from "@shared/schema";
import type { User, InsertUser, Trade, InsertTrade, LearnProgress, PortfolioSnapshot, TradingAccount, InsertTradingAccount, Order, InsertOrder, OrderEvent, InsertOrderEvent } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export interface IStorage {
  // Users
  createUser(data: Omit<InsertUser, "id">): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUserBalance(userId: string, newBalance: number): Promise<void>;
  updateUserOnboarding(userId: string, marketInterests: string[], paperBalance: number): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;

  // Trades
  createTrade(data: Omit<InsertTrade, "id">): Promise<Trade>;
  getUserTrades(userId: string): Promise<Trade[]>;
  closeTrade(tradeId: string, exitPrice: number, pnl: number): Promise<void>;

  // Watchlist
  addToWatchlist(userId: string, ticker: string, market: string): Promise<void>;
  removeFromWatchlist(userId: string, ticker: string): Promise<void>;
  getUserWatchlist(userId: string): Promise<{ id: string; ticker: string; market: string }[]>;

  // Learn Progress
  getLearnProgress(userId: string): Promise<LearnProgress[]>;
  updateLearnProgress(userId: string, moduleId: number, completed: boolean, quizScore: number): Promise<void>;

  // Portfolio Snapshots
  saveSnapshot(userId: string, balance: number): Promise<void>;
  getSnapshots(userId: string, limit?: number): Promise<PortfolioSnapshot[]>;

  // Reset
  resetPortfolio(userId: string): Promise<void>;

  // Admin
  getAllUsers(): Promise<User[]>;
  getAllTrades(): Promise<Trade[]>;

  // Trading Accounts (Brokers)
  getTradingAccount(id: string): Promise<TradingAccount | null>;
  getTradingAccounts(userId: string): Promise<TradingAccount[]>;
  connectTradingAccount(userId: string, data: Omit<InsertTradingAccount, "id" | "userId" | "createdAt" | "updatedAt">): Promise<TradingAccount>;
  deleteTradingAccount(userId: string, accountId: string): Promise<void>;

  // Orders
  createOrder(userId: string, data: Omit<InsertOrder, "id" | "userId" | "createdAt" | "updatedAt">): Promise<Order>;
  getOrder(id: string): Promise<Order | null>;
  getUserOrders(userId: string): Promise<Order[]>;
  updateOrderStatus(orderId: string, status: string, closedAt?: Date): Promise<void>;

  // Order Events
  createOrderEvent(orderId: string, eventType: string, oldStatus: string | null, newStatus: string, message: string, rawPayload?: any): Promise<void>;
  getOrderEvents(orderId: string): Promise<OrderEvent[]>;
}

export class DbStorage implements IStorage {
  async createUser(data: Omit<InsertUser, "id">): Promise<User> {
    const [user] = await db.insert(users).values({ ...data, id: randomUUID() }).returning();
    return user;
  }

  async getUserById(id: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user ?? null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user ?? null;
  }

  async updateUserBalance(userId: string, newBalance: number): Promise<void> {
    await db.update(users).set({ paperBalance: String(newBalance) }).where(eq(users.id, userId));
  }

  async updateUserOnboarding(userId: string, marketInterests: string[], paperBalance: number): Promise<void> {
    await db.update(users).set({
      marketInterests,
      paperBalance: String(paperBalance),
      onboardingComplete: true,
    }).where(eq(users.id, userId));
  }

  async updateLastLogin(userId: string): Promise<void> {
    await db.update(users).set({ lastLogin: new Date().toISOString() }).where(eq(users.id, userId));
  }

  async createTrade(data: Omit<InsertTrade, "id">): Promise<Trade> {
    const [trade] = await db.insert(trades).values({ ...data, id: randomUUID() }).returning();
    return trade;
  }

  async getUserTrades(userId: string): Promise<Trade[]> {
    return db.select().from(trades).where(eq(trades.userId, userId)).orderBy(desc(trades.entryAt));
  }

  async closeTrade(tradeId: string, exitPrice: number, pnl: number): Promise<void> {
    await db.update(trades).set({
      status: "CLOSED",
      exitPrice: String(exitPrice),
      exitAt: new Date(),
      pnl: String(pnl),
    }).where(eq(trades.id, tradeId));
  }

  async addToWatchlist(userId: string, ticker: string, market: string): Promise<void> {
    await db.insert(watchlist).values({ id: randomUUID(), userId, ticker, market }).onConflictDoNothing();
  }

  async removeFromWatchlist(userId: string, ticker: string): Promise<void> {
    await db.delete(watchlist).where(and(eq(watchlist.userId, userId), eq(watchlist.ticker, ticker)));
  }

  async getUserWatchlist(userId: string): Promise<{ id: string; ticker: string; market: string }[]> {
    return db.select({ id: watchlist.id, ticker: watchlist.ticker, market: watchlist.market })
      .from(watchlist).where(eq(watchlist.userId, userId)).orderBy(desc(watchlist.addedAt));
  }

  async getLearnProgress(userId: string): Promise<LearnProgress[]> {
    return db.select().from(learnProgress).where(eq(learnProgress.userId, userId));
  }

  async updateLearnProgress(userId: string, moduleId: number, completed: boolean, quizScore: number): Promise<void> {
    const existing = await db.select().from(learnProgress)
      .where(and(eq(learnProgress.userId, userId), eq(learnProgress.moduleId, moduleId)));
    if (existing.length > 0) {
      await db.update(learnProgress).set({ completed, quizScore, completedAt: completed ? new Date() : null })
        .where(and(eq(learnProgress.userId, userId), eq(learnProgress.moduleId, moduleId)));
    } else {
      await db.insert(learnProgress).values({
        id: randomUUID(), userId, moduleId, completed, quizScore,
        completedAt: completed ? new Date() : null,
      });
    }
  }

  async saveSnapshot(userId: string, balance: number): Promise<void> {
    await db.insert(portfolioSnapshots).values({ id: randomUUID(), userId, balance: String(balance) });
  }

  async getSnapshots(userId: string, limit = 30): Promise<PortfolioSnapshot[]> {
    return db.select().from(portfolioSnapshots).where(eq(portfolioSnapshots.userId, userId))
      .orderBy(desc(portfolioSnapshots.snapshotAt)).limit(limit);
  }

  async resetPortfolio(userId: string): Promise<void> {
    await db.update(users).set({ paperBalance: "10000" }).where(eq(users.id, userId));
    await db.update(trades).set({ status: "CLOSED", pnl: "0" }).where(eq(trades.userId, userId));
  }

  async getAllUsers(): Promise<User[]> {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }

  async getAllTrades(): Promise<Trade[]> {
    return db.select().from(trades).orderBy(desc(trades.entryAt));
  }

  // Trading Accounts (Brokers)
  async getTradingAccount(id: string): Promise<TradingAccount | null> {
    const [acc] = await db.select().from(tradingAccounts).where(eq(tradingAccounts.id, id));
    return acc ?? null;
  }

  async getTradingAccounts(userId: string): Promise<TradingAccount[]> {
    return db.select().from(tradingAccounts).where(eq(tradingAccounts.userId, userId)).orderBy(desc(tradingAccounts.createdAt));
  }

  async connectTradingAccount(userId: string, data: Omit<InsertTradingAccount, "id" | "userId" | "createdAt" | "updatedAt">): Promise<TradingAccount> {
    const id = randomUUID();
    const [acc] = await db.insert(tradingAccounts).values({
      ...data,
      id,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return acc;
  }

  async deleteTradingAccount(userId: string, accountId: string): Promise<void> {
    await db.delete(tradingAccounts).where(and(eq(tradingAccounts.id, accountId), eq(tradingAccounts.userId, userId)));
  }

  // Orders
  async createOrder(userId: string, data: Omit<InsertOrder, "id" | "userId" | "createdAt" | "updatedAt">): Promise<Order> {
    const id = randomUUID();
    const [order] = await db.insert(orders).values({
      ...data,
      id,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return order;
  }

  async getOrder(id: string): Promise<Order | null> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    return order ?? null;
  }

  async getUserOrders(userId: string): Promise<Order[]> {
    return db.select().from(orders).where(eq(orders.userId, userId)).orderBy(desc(orders.createdAt));
  }

  async updateOrderStatus(orderId: string, status: string, closedAt?: Date): Promise<void> {
    await db.update(orders).set({
      status,
      closedAt: closedAt || null,
      updatedAt: new Date(),
    }).where(eq(orders.id, orderId));
  }

  // Order Events
  async createOrderEvent(orderId: string, eventType: string, oldStatus: string | null, newStatus: string, message: string, rawPayload?: any): Promise<void> {
    await db.insert(orderEvents).values({
      id: randomUUID(),
      orderId,
      eventType,
      oldStatus,
      newStatus,
      message,
      rawBrokerPayload: rawPayload || null,
      createdAt: new Date(),
    });
  }

  async getOrderEvents(orderId: string): Promise<OrderEvent[]> {
    return db.select().from(orderEvents).where(eq(orderEvents.orderId, orderId)).orderBy(desc(orderEvents.createdAt));
  }
}

export const storage = new DbStorage();
