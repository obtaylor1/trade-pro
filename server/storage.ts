import { randomUUID } from "crypto";
import { db } from "./db";
import { STARTING_BALANCE } from "./config";
import { users, trades, watchlist, learnProgress, portfolioSnapshots, tradingAccounts, orders, orderEvents, autoTradePlans, autoTradeRules, autoTradeCycles, autoTradeEvents, managedPlans } from "@shared/schema";
import type { User, InsertUser, Trade, InsertTrade, LearnProgress, PortfolioSnapshot, TradingAccount, InsertTradingAccount, Order, InsertOrder, OrderEvent, InsertOrderEvent, AutoTradePlan, InsertAutoTradePlan, AutoTradeRule, InsertAutoTradeRule, AutoTradeCycle, InsertAutoTradeCycle, AutoTradeEvent, InsertAutoTradeEvent } from "@shared/schema";
import { eq, desc, and, sql } from "drizzle-orm";

export interface PracticeOrderTransactionInput {
  symbol: string;
  assetClass: string;
  side: "buy" | "sell";
  orderType: string;
  quantity: number;
  notionalAmount: number;
  estimatedPrice: number;
  estimatedFees?: number;
  tradeScore?: number | null;
  riskLevel?: string | null;
  reason?: string | null;
  tickerName?: string;
  potentialGain?: number | null;
  origin?: "manual" | "ai_confirmed" | "ai_managed" | "recurring_investment";
  idempotencyKey?: string;
}

export interface IStorage {
  // Users
  createUser(data: Omit<InsertUser, "id">): Promise<User>;
  getUserById(id: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUserBalance(userId: string, newBalance: number): Promise<void>;
  /** Atomically deducts `amount` if the balance covers it. Returns the new balance, or null if insufficient. */
  debitBalance(userId: string, amount: number): Promise<number | null>;
  /** Atomically adds `amount` to the balance. Returns the new balance, or null if the user doesn't exist. */
  creditBalance(userId: string, amount: number): Promise<number | null>;
  updateUserOnboarding(userId: string, marketInterests: string[], paperBalance: number): Promise<void>;
  updateLastLogin(userId: string): Promise<void>;

  // Trades
  createTrade(data: Omit<InsertTrade, "id">): Promise<Trade>;
  getUserTrades(userId: string): Promise<Trade[]>;
  /** Closes the trade only if it is still OPEN and owned by `userId`. Returns true if this call closed it. */
  closeTrade(tradeId: string, userId: string, exitPrice: number, pnl: number): Promise<boolean>;
  executePracticeOrderTransaction(userId: string, input: PracticeOrderTransactionInput): Promise<{ order: Order; trade: Trade; newBalance: number }>;

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

  // Auto Trading
  createAutoTradePlan(userId: string, planData: Omit<InsertAutoTradePlan, "id" | "userId" | "createdAt" | "updatedAt">, ruleData: Omit<InsertAutoTradeRule, "id" | "autoTradePlanId" | "createdAt" | "updatedAt">): Promise<AutoTradePlan>;
  createAutoTradePlanWithCycle(userId: string, planData: Omit<InsertAutoTradePlan, "id" | "userId" | "createdAt" | "updatedAt">, ruleData: Omit<InsertAutoTradeRule, "id" | "autoTradePlanId" | "createdAt" | "updatedAt">, startingAmount: number, entryPrice: number, debitPaperBalance: boolean): Promise<{ plan: AutoTradePlan; cycle: AutoTradeCycle; newBalance: number | null }>;
  getAutoTradePlan(id: string): Promise<AutoTradePlan | null>;
  getUserAutoTradePlans(userId: string): Promise<AutoTradePlan[]>;
  updateAutoTradePlanStatus(planId: string, status: string): Promise<void>;
  updateAutoTradePlanReinvest(planId: string, reinvestMode: string): Promise<void>;
  updateAutoTradePlanCycles(planId: string, completedCycles: number, currentAmount: number): Promise<void>;
  createAutoTradeRule(planId: string, data: Omit<InsertAutoTradeRule, "id" | "autoTradePlanId" | "createdAt" | "updatedAt">): Promise<AutoTradeRule>;
  getAutoTradeRuleForPlan(planId: string): Promise<AutoTradeRule | null>;
  updateAutoTradeRule(ruleId: string, data: Partial<Omit<InsertAutoTradeRule, "id" | "createdAt" | "updatedAt">>): Promise<void>;
  createAutoTradeCycle(planId: string, cycleNumber: number, startingAmount: number, entryPrice: number, status: string): Promise<AutoTradeCycle>;
  getAutoTradeCycle(id: string): Promise<AutoTradeCycle | null>;
  getAutoTradeCyclesForPlan(planId: string): Promise<AutoTradeCycle[]>;
  getActiveCycles(): Promise<AutoTradeCycle[]>;
  closeAutoTradeCycle(cycleId: string, profitLoss: number, endingAmount: number, closeReason: string, reinvestAmount: number, status: string): Promise<void>;
  settleAutoTradeCycle(cycleId: string, planId: string, userId: string, mode: string, profitLoss: number, endingAmount: number, closeReason: string, reinvestAmount: number, status: string, message: string, metadata?: unknown): Promise<{ settled: boolean; newBalance: number | null }>;
  startNextAutoTradeCycle(planId: string, userId: string, mode: string, cycleNumber: number, startingAmount: number, entryPrice: number, completedCycles: number, ruleId: string, nextCloseTime: Date): Promise<boolean>;
  createAutoTradeEvent(planId: string, cycleId: string | null, eventType: string, message: string, metadata?: any): Promise<void>;
  getAutoTradeEventsForPlan(planId: string): Promise<AutoTradeEvent[]>;
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

  async debitBalance(userId: string, amount: number): Promise<number | null> {
    const [row] = await db.update(users)
      .set({ paperBalance: sql`round(${users.paperBalance} - ${amount}::numeric, 2)` })
      .where(and(eq(users.id, userId), sql`${users.paperBalance} >= ${amount}::numeric`))
      .returning({ paperBalance: users.paperBalance });
    return row ? parseFloat(String(row.paperBalance)) : null;
  }

  async creditBalance(userId: string, amount: number): Promise<number | null> {
    const [row] = await db.update(users)
      .set({ paperBalance: sql`round(${users.paperBalance} + ${amount}::numeric, 2)` })
      .where(eq(users.id, userId))
      .returning({ paperBalance: users.paperBalance });
    return row ? parseFloat(String(row.paperBalance)) : null;
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

  async closeTrade(tradeId: string, userId: string, exitPrice: number, pnl: number): Promise<boolean> {
    // The status guard makes concurrent close requests idempotent: only one
    // call transitions OPEN → CLOSED, so the balance is credited exactly once.
    const closed = await db.update(trades).set({
      status: "CLOSED",
      exitPrice: String(exitPrice),
      exitAt: new Date(),
      pnl: String(pnl),
    }).where(and(eq(trades.id, tradeId), eq(trades.userId, userId), eq(trades.status, "OPEN")))
      .returning({ id: trades.id });
    return closed.length > 0;
  }

  async executePracticeOrderTransaction(
    userId: string,
    input: PracticeOrderTransactionInput,
  ): Promise<{ order: Order; trade: Trade; newBalance: number }> {
    return db.transaction(async (tx: any) => {
      const [user] = await tx.select({ paperBalance: users.paperBalance })
        .from(users).where(eq(users.id, userId)).for("update");
      const currentBalance = user ? Number(user.paperBalance) : NaN;
      const total = input.notionalAmount + (input.estimatedFees ?? 0);
      if (!Number.isFinite(currentBalance) || currentBalance < total) {
        throw Object.assign(new Error("Insufficient practice balance."), { statusCode: 400 });
      }

      const newBalance = Math.round((currentBalance - total) * 100) / 100;
      const now = new Date();
      const orderId = randomUUID();
      const tradeId = randomUUID();

      await tx.update(users).set({ paperBalance: String(newBalance) }).where(eq(users.id, userId));
      await tx.insert(orders).values({
        id: orderId,
        userId,
        tradingAccountId: null,
        mode: "paper",
        brokerName: "Paper Broker",
        brokerOrderId: `paper-order-${randomUUID().slice(0, 8)}`,
        symbol: input.symbol,
        assetClass: input.assetClass,
        side: input.side,
        orderType: input.orderType,
        quantity: String(input.quantity),
        notionalAmount: String(input.notionalAmount),
        estimatedPrice: String(input.estimatedPrice),
        estimatedCost: String(input.notionalAmount),
        estimatedFees: String(input.estimatedFees ?? 0),
        status: "filled",
        tradeScore: input.tradeScore ?? null,
        riskLevel: input.riskLevel ?? null,
        reason: input.reason ?? null,
        origin: input.origin ?? "manual",
        idempotencyKey: input.idempotencyKey ?? null,
        openedAt: now,
        closedAt: now,
        createdAt: now,
        updatedAt: now,
      });
      await tx.insert(trades).values({
        id: tradeId,
        userId,
        market: input.assetClass,
        ticker: input.symbol,
        tickerName: input.tickerName ?? input.reason ?? `${input.symbol} Order`,
        action: input.side.toUpperCase(),
        entryPrice: String(input.estimatedPrice),
        units: String(input.quantity),
        investedAmount: String(input.notionalAmount),
        status: "OPEN",
        exitPrice: null,
        exitAt: null,
        pnl: "0",
        potentialGain: input.potentialGain == null ? String(input.notionalAmount * 1.2) : String(input.potentialGain),
      });
      await tx.insert(orderEvents).values({
        id: randomUUID(), orderId, eventType: "FILL", oldStatus: null,
        newStatus: "filled", message: "Practice order executed successfully. Paper balance updated.",
        rawBrokerPayload: { estimatedTotal: total }, createdAt: now,
      });
      await tx.insert(portfolioSnapshots).values({
        id: randomUUID(), userId, balance: String(newBalance), snapshotAt: now,
      });

      const [order] = await tx.select().from(orders).where(eq(orders.id, orderId));
      const [trade] = await tx.select().from(trades).where(eq(trades.id, tradeId));
      return { order, trade, newBalance };
    });
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
    await db.insert(learnProgress).values({
      id: randomUUID(), userId, moduleId, completed, quizScore,
      completedAt: completed ? new Date() : null,
    }).onConflictDoUpdate({
      target: [learnProgress.userId, learnProgress.moduleId],
      set: { completed, quizScore, completedAt: completed ? new Date() : null },
    });
  }

  async saveSnapshot(userId: string, balance: number): Promise<void> {
    await db.insert(portfolioSnapshots).values({ id: randomUUID(), userId, balance: String(balance) });
  }

  async getSnapshots(userId: string, limit = 30): Promise<PortfolioSnapshot[]> {
    return db.select().from(portfolioSnapshots).where(eq(portfolioSnapshots.userId, userId))
      .orderBy(desc(portfolioSnapshots.snapshotAt)).limit(limit);
  }

  async resetPortfolio(userId: string): Promise<void> {
    await db.transaction(async (tx: any) => {
      // A reset is a true clean slate: remove paper positions, automation,
      // paper orders, and historical chart points before recording the reset.
      await tx.delete(autoTradePlans).where(and(eq(autoTradePlans.userId, userId), eq(autoTradePlans.mode, "paper")));
      await tx.delete(managedPlans).where(eq(managedPlans.userId, userId));
      await tx.delete(orders).where(and(eq(orders.userId, userId), eq(orders.mode, "paper")));
      await tx.delete(trades).where(eq(trades.userId, userId));
      await tx.delete(portfolioSnapshots).where(eq(portfolioSnapshots.userId, userId));
      await tx.update(users).set({ paperBalance: String(STARTING_BALANCE) }).where(eq(users.id, userId));
      await tx.insert(portfolioSnapshots).values({
        id: randomUUID(),
        userId,
        balance: String(STARTING_BALANCE),
        snapshotAt: new Date(),
      });
    });
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

  // Auto Trading
  async createAutoTradePlan(
    userId: string,
    planData: Omit<InsertAutoTradePlan, "id" | "userId" | "createdAt" | "updatedAt">,
    ruleData: Omit<InsertAutoTradeRule, "id" | "autoTradePlanId" | "createdAt" | "updatedAt">
  ): Promise<AutoTradePlan> {
    const planId = randomUUID();
    const ruleId = randomUUID();

    const [plan] = await db.insert(autoTradePlans).values({
      ...planData,
      id: planId,
      userId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();

    await db.insert(autoTradeRules).values({
      ...ruleData,
      id: ruleId,
      autoTradePlanId: planId,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    return plan;
  }

  async createAutoTradePlanWithCycle(
    userId: string,
    planData: Omit<InsertAutoTradePlan, "id" | "userId" | "createdAt" | "updatedAt">,
    ruleData: Omit<InsertAutoTradeRule, "id" | "autoTradePlanId" | "createdAt" | "updatedAt">,
    startingAmount: number,
    entryPrice: number,
    debitPaperBalance: boolean,
  ): Promise<{ plan: AutoTradePlan; cycle: AutoTradeCycle; newBalance: number | null }> {
    return db.transaction(async (tx: any) => {
      let newBalance: number | null = null;
      if (debitPaperBalance) {
        const [balanceRow] = await tx.select({ paperBalance: users.paperBalance })
          .from(users).where(eq(users.id, userId)).for("update");
        const currentBalance = balanceRow ? parseFloat(String(balanceRow.paperBalance)) : NaN;
        if (!Number.isFinite(currentBalance) || currentBalance < startingAmount) throw Object.assign(new Error("Insufficient balance to start this auto practice plan"), { statusCode: 400 });
        newBalance = Math.round((currentBalance - startingAmount) * 100) / 100;
        await tx.update(users).set({ paperBalance: String(newBalance) }).where(eq(users.id, userId));
        await tx.insert(portfolioSnapshots).values({ id: randomUUID(), userId, balance: String(newBalance), snapshotAt: new Date() });
      }

      const now = new Date();
      const planId = randomUUID();
      await tx.insert(autoTradePlans).values({ ...planData, id: planId, userId, createdAt: now, updatedAt: now });
      await tx.insert(autoTradeRules).values({ ...ruleData, id: randomUUID(), autoTradePlanId: planId, createdAt: now, updatedAt: now });
      const cycleId = randomUUID();
      await tx.insert(autoTradeCycles).values({
        id: cycleId, autoTradePlanId: planId, cycleNumber: 1,
        startingAmount: String(startingAmount), entryPrice: String(entryPrice),
        status: "open", openedAt: now, createdAt: now, updatedAt: now,
      });
      await tx.insert(autoTradeEvents).values([
        { id: randomUUID(), autoTradePlanId: planId, cycleId, eventType: "plan_created", message: `Auto Practice Plan started on ${planData.symbol}. Initial amount: $${startingAmount}.`, createdAt: now },
        { id: randomUUID(), autoTradePlanId: planId, cycleId, eventType: "trade_opened", message: `Auto Practice Cycle #1 opened on ${planData.symbol} at entry price $${entryPrice}.`, createdAt: now },
      ]);
      const [plan] = await tx.select().from(autoTradePlans).where(eq(autoTradePlans.id, planId));
      const [cycle] = await tx.select().from(autoTradeCycles).where(eq(autoTradeCycles.id, cycleId));
      return { plan, cycle, newBalance };
    });
  }

  async getAutoTradePlan(id: string): Promise<AutoTradePlan | null> {
    const [plan] = await db.select().from(autoTradePlans).where(eq(autoTradePlans.id, id));
    return plan ?? null;
  }

  async getUserAutoTradePlans(userId: string): Promise<AutoTradePlan[]> {
    return db.select().from(autoTradePlans).where(eq(autoTradePlans.userId, userId)).orderBy(desc(autoTradePlans.createdAt));
  }

  async updateAutoTradePlanStatus(planId: string, status: string): Promise<void> {
    await db.update(autoTradePlans).set({ status, updatedAt: new Date() }).where(eq(autoTradePlans.id, planId));
  }

  async updateAutoTradePlanReinvest(planId: string, reinvestMode: string): Promise<void> {
    await db.update(autoTradePlans).set({ reinvestMode, updatedAt: new Date() }).where(eq(autoTradePlans.id, planId));
  }

  async updateAutoTradePlanCycles(planId: string, completedCycles: number, currentAmount: number): Promise<void> {
    await db.update(autoTradePlans).set({
      completedCycles,
      currentCycleAmount: String(currentAmount),
      updatedAt: new Date(),
    }).where(eq(autoTradePlans.id, planId));
  }

  async createAutoTradeRule(planId: string, data: Omit<InsertAutoTradeRule, "id" | "autoTradePlanId" | "createdAt" | "updatedAt">): Promise<AutoTradeRule> {
    const [rule] = await db.insert(autoTradeRules).values({
      ...data,
      id: randomUUID(),
      autoTradePlanId: planId,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return rule;
  }

  async getAutoTradeRuleForPlan(planId: string): Promise<AutoTradeRule | null> {
    const [rule] = await db.select().from(autoTradeRules).where(eq(autoTradeRules.autoTradePlanId, planId));
    return rule ?? null;
  }

  async updateAutoTradeRule(ruleId: string, data: Partial<Omit<InsertAutoTradeRule, "id" | "createdAt" | "updatedAt">>): Promise<void> {
    await db.update(autoTradeRules).set({ ...data, updatedAt: new Date() }).where(eq(autoTradeRules.id, ruleId));
  }

  async createAutoTradeCycle(planId: string, cycleNumber: number, startingAmount: number, entryPrice: number, status: string): Promise<AutoTradeCycle> {
    const [cycle] = await db.insert(autoTradeCycles).values({
      id: randomUUID(),
      autoTradePlanId: planId,
      cycleNumber,
      startingAmount: String(startingAmount),
      entryPrice: String(entryPrice),
      status,
      createdAt: new Date(),
      updatedAt: new Date(),
    }).returning();
    return cycle;
  }

  async getAutoTradeCycle(id: string): Promise<AutoTradeCycle | null> {
    const [cycle] = await db.select().from(autoTradeCycles).where(eq(autoTradeCycles.id, id));
    return cycle ?? null;
  }

  async getAutoTradeCyclesForPlan(planId: string): Promise<AutoTradeCycle[]> {
    return db.select().from(autoTradeCycles).where(eq(autoTradeCycles.autoTradePlanId, planId)).orderBy(desc(autoTradeCycles.cycleNumber));
  }

  async getActiveCycles(): Promise<AutoTradeCycle[]> {
    return db.select().from(autoTradeCycles).where(eq(autoTradeCycles.status, "open"));
  }

  async closeAutoTradeCycle(
    cycleId: string,
    profitLoss: number,
    endingAmount: number,
    closeReason: string,
    reinvestAmount: number,
    status: string
  ): Promise<void> {
    await db.update(autoTradeCycles).set({
      profitLoss: String(profitLoss),
      endingAmount: String(endingAmount),
      reinvestAmount: String(reinvestAmount),
      closeReason,
      status,
      closedAt: new Date(),
      updatedAt: new Date(),
    }).where(eq(autoTradeCycles.id, cycleId));
  }

  async settleAutoTradeCycle(
    cycleId: string,
    planId: string,
    userId: string,
    mode: string,
    profitLoss: number,
    endingAmount: number,
    closeReason: string,
    reinvestAmount: number,
    status: string,
    message: string,
    metadata?: unknown,
  ): Promise<{ settled: boolean; newBalance: number | null }> {
    return db.transaction(async (tx: any) => {
      const now = new Date();
      const [openCycle] = await tx.select({ id: autoTradeCycles.id, status: autoTradeCycles.status })
        .from(autoTradeCycles).where(eq(autoTradeCycles.id, cycleId)).for("update");
      if (!openCycle || openCycle.status !== "open") return { settled: false, newBalance: null };
      await tx.update(autoTradeCycles).set({
        profitLoss: String(profitLoss), endingAmount: String(endingAmount),
        reinvestAmount: String(reinvestAmount), closeReason, status,
        closedAt: now, updatedAt: now,
      }).where(eq(autoTradeCycles.id, cycleId));

      await tx.insert(autoTradeEvents).values({
        id: randomUUID(), autoTradePlanId: planId, cycleId,
        eventType: "auto_closed", message, metadataJson: metadata || null, createdAt: now,
      });

      let newBalance: number | null = null;
      if (mode === "paper") {
        const [balanceRow] = await tx.select({ paperBalance: users.paperBalance })
          .from(users).where(eq(users.id, userId)).for("update");
        if (!balanceRow) throw new Error("User not found while settling auto trade");
        newBalance = Math.round((parseFloat(String(balanceRow.paperBalance)) + endingAmount) * 100) / 100;
        await tx.update(users).set({ paperBalance: String(newBalance) }).where(eq(users.id, userId));
        await tx.insert(portfolioSnapshots).values({ id: randomUUID(), userId, balance: String(newBalance), snapshotAt: now });
      }
      return { settled: true, newBalance };
    });
  }

  async startNextAutoTradeCycle(
    planId: string,
    userId: string,
    mode: string,
    cycleNumber: number,
    startingAmount: number,
    entryPrice: number,
    completedCycles: number,
    ruleId: string,
    nextCloseTime: Date,
  ): Promise<boolean> {
    return db.transaction(async (tx: any) => {
      const now = new Date();
      const [lockedPlan] = await tx.select({ id: autoTradePlans.id }).from(autoTradePlans)
        .where(eq(autoTradePlans.id, planId)).for("update");
      if (!lockedPlan) return false;
      const [existingCycle] = await tx.select({ id: autoTradeCycles.id }).from(autoTradeCycles)
        .where(and(eq(autoTradeCycles.autoTradePlanId, planId), eq(autoTradeCycles.cycleNumber, cycleNumber)));
      if (existingCycle) return false;
      if (mode === "paper") {
        const [balanceRow] = await tx.select({ paperBalance: users.paperBalance })
          .from(users).where(eq(users.id, userId)).for("update");
        const currentBalance = balanceRow ? parseFloat(String(balanceRow.paperBalance)) : NaN;
        if (!Number.isFinite(currentBalance) || currentBalance < startingAmount) return false;
        const newBalance = Math.round((currentBalance - startingAmount) * 100) / 100;
        await tx.update(users).set({ paperBalance: String(newBalance) }).where(eq(users.id, userId));
        await tx.insert(portfolioSnapshots).values({ id: randomUUID(), userId, balance: String(newBalance), snapshotAt: now });
      }
      const cycleId = randomUUID();
      await tx.insert(autoTradeCycles).values({
        id: cycleId, autoTradePlanId: planId, cycleNumber,
        startingAmount: String(startingAmount), entryPrice: String(entryPrice),
        status: "open", openedAt: now, createdAt: now, updatedAt: now,
      });
      await tx.update(autoTradeRules).set({ scheduledCloseTime: nextCloseTime, updatedAt: now }).where(eq(autoTradeRules.id, ruleId));
      await tx.update(autoTradePlans).set({ completedCycles, currentCycleAmount: String(startingAmount), updatedAt: now }).where(eq(autoTradePlans.id, planId));
      await tx.insert(autoTradeEvents).values({
        id: randomUUID(), autoTradePlanId: planId, cycleId,
        eventType: "trade_opened", message: `Auto Practice Cycle #${cycleNumber} opened with $${startingAmount}.`, createdAt: now,
      });
      return true;
    });
  }

  async createAutoTradeEvent(planId: string, cycleId: string | null, eventType: string, message: string, metadata?: any): Promise<void> {
    await db.insert(autoTradeEvents).values({
      id: randomUUID(),
      autoTradePlanId: planId,
      cycleId,
      eventType,
      message,
      metadataJson: metadata || null,
      createdAt: new Date(),
    });
  }

  async getAutoTradeEventsForPlan(planId: string): Promise<AutoTradeEvent[]> {
    return db.select().from(autoTradeEvents).where(eq(autoTradeEvents.autoTradePlanId, planId)).orderBy(desc(autoTradeEvents.createdAt));
  }
}

export const storage = new DbStorage();
