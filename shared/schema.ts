import { z } from "zod";
import { pgTable, text, timestamp, numeric, integer, boolean, json } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";

// ─── Database Tables ──────────────────────────────────────────────────────────

export const users = pgTable("users_v2", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  paperBalance: numeric("paper_balance").default("10000").notNull(),
  onboardingComplete: boolean("onboarding_complete").default(false).notNull(),
  marketInterests: json("market_interests").$type<string[]>().default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  isAdmin: integer("is_admin").default(0).notNull(),
  lastLogin: text("last_login"),
});

export const trades = pgTable("trades_v2", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  market: text("market").notNull(),
  ticker: text("ticker").notNull(),
  tickerName: text("ticker_name").notNull(),
  action: text("action").notNull(),
  entryPrice: numeric("entry_price").notNull(),
  units: numeric("units").notNull(),
  investedAmount: numeric("invested_amount").notNull(),
  status: text("status").default("OPEN").notNull(),
  entryAt: timestamp("entry_at").defaultNow().notNull(),
  exitPrice: numeric("exit_price"),
  exitAt: timestamp("exit_at"),
  pnl: numeric("pnl").default("0"),
  potentialGain: numeric("potential_gain"),
});

export const watchlist = pgTable("watchlist_v2", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  ticker: text("ticker").notNull(),
  market: text("market").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
});

export const learnProgress = pgTable("learn_progress_v2", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  moduleId: integer("module_id").notNull(),
  completed: boolean("completed").default(false).notNull(),
  quizScore: integer("quiz_score").default(0),
  completedAt: timestamp("completed_at"),
});

export const portfolioSnapshots = pgTable("portfolio_snapshots_v2", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  balance: numeric("balance").notNull(),
  snapshotAt: timestamp("snapshot_at").defaultNow().notNull(),
});

// ─── Insert Schemas ───────────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTradeSchema = createInsertSchema(trades).omit({ id: true, entryAt: true });
export const insertWatchlistSchema = createInsertSchema(watchlist).omit({ id: true, addedAt: true });
export const insertLearnProgressSchema = createInsertSchema(learnProgress).omit({ id: true });
export const insertPortfolioSnapshotSchema = createInsertSchema(portfolioSnapshots).omit({ id: true, snapshotAt: true });

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
});

export const onboardingSchema = z.object({
  marketInterests: z.array(z.string()).min(1, "Select at least one market"),
  paperBalance: z.number().min(100).default(10000),
});

// ─── Trading Opportunity Schema ───────────────────────────────────────────────

export const tradingOpportunitySchema = z.object({
  id: z.string(),
  market: z.enum(["stocks", "commodities", "crypto", "options", "forex"]),
  ticker: z.string(),
  name: z.string(),
  action: z.enum(["BUY", "SELL", "HOLD"]),
  signalType: z.enum(["BREAKOUT", "REVERSAL", "MOMENTUM", "MEAN_REVERSION"]),
  entryPrice: z.number(),
  targetPrice: z.number(),
  stopLoss: z.number(),
  confidence: z.number(),
  rationale: z.string(),
  rsi: z.number().optional(),
  macd: z.string().optional(),
  volume: z.string().optional(),
  change24h: z.number().optional(),
  // Options-specific
  optionType: z.enum(["CALL", "PUT"]).optional(),
  strikePrice: z.number().optional(),
  premium: z.number().optional(),
  expiry: z.string().optional(),
  daysLeft: z.number().optional(),
  weeklyRationale: z.string().optional(),
  // Forex-specific
  forexStyle: z.enum(["SCALP", "SWING", "POSITION"]).optional(),
  pipTarget: z.number().optional(),
  stopPips: z.number().optional(),
  spread: z.string().optional(),
  bestTime: z.string().optional(),
  timeframes: z.string().optional(),
  fullName: z.string().optional(),
});

export const executeTradeSchema = z.object({
  userId: z.string().optional(),
  opportunityId: z.string().optional(),
  market: z.string(),
  ticker: z.string(),
  tickerName: z.string(),
  action: z.string(),
  entryPrice: z.number(),
  units: z.number(),
  investedAmount: z.number().positive(),
  potentialGain: z.number().optional(),
  targetPrice: z.number().optional(),
  stopLoss: z.number().optional(),
});

// ─── Types ────────────────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Trade = typeof trades.$inferSelect;
export type InsertTrade = typeof trades.$inferInsert;
export type Watchlist = typeof watchlist.$inferSelect;
export type LearnProgress = typeof learnProgress.$inferSelect;
export type PortfolioSnapshot = typeof portfolioSnapshots.$inferSelect;
export type TradingOpportunity = z.infer<typeof tradingOpportunitySchema>;
export type ExecuteTrade = z.infer<typeof executeTradeSchema>;
export type SignupInput = z.infer<typeof signupSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
