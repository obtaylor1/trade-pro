import { z } from "zod";
import { pgTable, text, timestamp, numeric, integer, boolean, json, index, uniqueIndex } from "drizzle-orm/pg-core";
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
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
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
}, (table) => ({ userStatusIdx: index("trades_user_status_idx").on(table.userId, table.status), entryAtIdx: index("trades_entry_at_idx").on(table.entryAt) }));

export const watchlist = pgTable("watchlist_v2", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  ticker: text("ticker").notNull(),
  market: text("market").notNull(),
  addedAt: timestamp("added_at").defaultNow().notNull(),
}, (table) => ({ userTickerUnique: uniqueIndex("watchlist_user_ticker_uidx").on(table.userId, table.ticker) }));

export const learnProgress = pgTable("learn_progress_v2", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  moduleId: integer("module_id").notNull(),
  completed: boolean("completed").default(false).notNull(),
  quizScore: integer("quiz_score").default(0),
  completedAt: timestamp("completed_at"),
}, (table) => ({ userModuleUnique: uniqueIndex("learn_progress_user_module_uidx").on(table.userId, table.moduleId) }));

export const portfolioSnapshots = pgTable("portfolio_snapshots_v2", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  balance: numeric("balance").notNull(),
  snapshotAt: timestamp("snapshot_at").defaultNow().notNull(),
}, (table) => ({ userSnapshotIdx: index("portfolio_user_snapshot_idx").on(table.userId, table.snapshotAt) }));

// ─── Insert Schemas ───────────────────────────────────────────────────────────

export const insertUserSchema = createInsertSchema(users).omit({ id: true, createdAt: true });
export const insertTradeSchema = createInsertSchema(trades).omit({ id: true, entryAt: true });
export const insertWatchlistSchema = createInsertSchema(watchlist).omit({ id: true, addedAt: true });
export const insertLearnProgressSchema = createInsertSchema(learnProgress).omit({ id: true });
export const insertPortfolioSnapshotSchema = createInsertSchema(portfolioSnapshots).omit({ id: true, snapshotAt: true });

// ─── Auth Schemas ─────────────────────────────────────────────────────────────

export const signupSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters").max(80, "Name is too long"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").max(128, "Password is too long"),
});

// ─── Shared Field Validators ─────────────────────────────────────────────────

export const marketEnum = z.enum(["stocks", "commodities", "crypto", "options", "forex"]);
export const tickerSchema = z.string()
  .regex(/^[A-Za-z0-9][A-Za-z0-9\/\-\.=]{0,19}$/, "Invalid ticker symbol")
  .transform(t => t.toUpperCase());

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
  market: marketEnum,
  ticker: tickerSchema,
  tickerName: z.string().max(120).optional(),
  action: z.enum(["BUY", "SELL"]),
  entryPrice: z.coerce.number(),
  units: z.coerce.number(),
  investedAmount: z.coerce.number().positive(),
  potentialGain: z.coerce.number().optional().nullable(),
  targetPrice: z.coerce.number().optional(),
  stopLoss: z.coerce.number().optional(),
});

export const tradingAccounts = pgTable("trading_accounts", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  brokerName: text("broker_name").notNull(),
  mode: text("mode").notNull(), // 'paper' or 'live'
  status: text("status").notNull(), // 'connected', 'disconnected', 'needs_auth', 'error'
  accountLabel: text("account_label").notNull(),
  brokerAccountId: text("broker_account_id"),
  accessTokenEncrypted: text("access_token_encrypted"),
  refreshTokenEncrypted: text("refresh_token_encrypted"),
  apiKeyEncrypted: text("api_key_encrypted"),
  apiSecretEncrypted: text("api_secret_encrypted"),
  maskedKey: text("masked_key"),
  buyingPower: numeric("buying_power").default("0").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({ userBrokerIdx: index("trading_accounts_user_broker_idx").on(table.userId, table.brokerName) }));

export const orders = pgTable("orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  tradingAccountId: text("trading_account_id").references(() => tradingAccounts.id, { onDelete: "set null" }),
  mode: text("mode").notNull(), // 'paper' or 'live'
  brokerName: text("broker_name").notNull(),
  brokerOrderId: text("broker_order_id"),
  symbol: text("symbol").notNull(),
  assetClass: text("asset_class").notNull(),
  side: text("side").notNull(), // 'buy' or 'sell'
  orderType: text("order_type").notNull(), // 'market', 'limit', 'stop', 'stop_limit'
  quantity: numeric("quantity").notNull(),
  notionalAmount: numeric("notional_amount").notNull(),
  estimatedPrice: numeric("estimated_price").notNull(),
  estimatedCost: numeric("estimated_cost").notNull(),
  estimatedFees: numeric("estimated_fees").default("0").notNull(),
  status: text("status").notNull(), // 'preview', 'pending', 'filled', etc.
  tradeScore: integer("trade_score"),
  riskLevel: text("risk_level"),
  reason: text("reason"),
  openedAt: timestamp("opened_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({ userCreatedIdx: index("orders_user_created_idx").on(table.userId, table.createdAt), brokerOrderIdx: index("orders_broker_order_idx").on(table.brokerOrderId) }));

export const orderEvents = pgTable("order_events", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => orders.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  oldStatus: text("old_status"),
  newStatus: text("new_status"),
  message: text("message"),
  rawBrokerPayload: json("raw_broker_payload"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({ orderCreatedIdx: index("order_events_order_created_idx").on(table.orderId, table.createdAt) }));

// ─── Auto Trading Tables ──────────────────────────────────────────────────────
export const autoTradePlans = pgTable("auto_trade_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  mode: text("mode").notNull(), // 'paper' | 'live'
  status: text("status").notNull(), // 'draft' | 'awaiting_confirmation' | 'active' | 'paused' | 'completed' | 'stopped' | 'failed'
  market: text("market").notNull(),
  symbol: text("symbol").notNull(),
  direction: text("direction").notNull(), // 'BUY' | 'SELL'
  initialAmount: numeric("initial_amount").notNull(),
  currentCycleAmount: numeric("current_cycle_amount").notNull(),
  reinvestMode: text("reinvest_mode").notNull(), // 'none' | 'profit_only' | 'profit_plus_principal'
  maxCycles: integer("max_cycles").default(10).notNull(),
  completedCycles: integer("completed_cycles").default(0).notNull(),
  maxDailyTrades: integer("max_daily_trades").default(3).notNull(),
  maxDailyLoss: numeric("max_daily_loss").notNull(),
  stopAfterLoss: boolean("stop_after_loss").default(true).notNull(),
  profitGoalAmount: numeric("profit_goal_amount").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({ userStatusIdx: index("auto_plans_user_status_idx").on(table.userId, table.status) }));

export const autoTradeRules = pgTable("auto_trade_rules", {
  id: text("id").primaryKey(),
  autoTradePlanId: text("auto_trade_plan_id").notNull().references(() => autoTradePlans.id, { onDelete: "cascade" }),
  closeType: text("close_type").notNull(), // 'time' | 'profit_target' | 'stop_loss' | 'whichever_first'
  closeAfterMinutes: integer("close_after_minutes").notNull(),
  scheduledCloseTime: timestamp("scheduled_close_time").notNull(),
  profitTargetAmount: numeric("profit_target_amount").notNull(),
  stopLossAmount: numeric("stop_loss_amount").notNull(),
  trailingStopEnabled: boolean("trailing_stop_enabled").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({ planUnique: uniqueIndex("auto_rules_plan_uidx").on(table.autoTradePlanId) }));

export const autoTradeCycles = pgTable("auto_trade_cycles", {
  id: text("id").primaryKey(),
  autoTradePlanId: text("auto_trade_plan_id").notNull().references(() => autoTradePlans.id, { onDelete: "cascade" }),
  cycleNumber: integer("cycle_number").notNull(),
  orderId: text("order_id"), // null if paper simulation
  startingAmount: numeric("starting_amount").notNull(),
  entryPrice: numeric("entry_price"),
  profitLoss: numeric("profit_loss"),
  endingAmount: numeric("ending_amount"),
  reinvestAmount: numeric("reinvest_amount"),
  status: text("status").notNull(), // 'scheduled' | 'open' | 'won' | 'lost' | 'closed' | 'skipped' | 'failed'
  openedAt: timestamp("opened_at"),
  closedAt: timestamp("closed_at"),
  closeReason: text("close_reason"), // 'scheduled_time' | 'profit_target' | 'stop_loss' | 'manual_close'
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({ planCycleUnique: uniqueIndex("auto_cycles_plan_cycle_uidx").on(table.autoTradePlanId, table.cycleNumber), statusIdx: index("auto_cycles_status_idx").on(table.status) }));

export const autoTradeEvents = pgTable("auto_trade_events", {
  id: text("id").primaryKey(),
  autoTradePlanId: text("auto_trade_plan_id").notNull().references(() => autoTradePlans.id, { onDelete: "cascade" }),
  cycleId: text("cycle_id").references(() => autoTradeCycles.id, { onDelete: "set null" }),
  eventType: text("event_type").notNull(), // 'plan_created' | 'trade_opened' | 'auto_closed' | 'reinvested' | 'paused' | 'stopped' | 'error'
  message: text("message").notNull(),
  metadataJson: json("metadata_json"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({ planCreatedIdx: index("auto_events_plan_created_idx").on(table.autoTradePlanId, table.createdAt) }));

export const insertTradingAccountSchema = createInsertSchema(tradingAccounts).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(orders).omit({ id: true, createdAt: true, updatedAt: true });
export const insertOrderEventSchema = createInsertSchema(orderEvents).omit({ id: true, createdAt: true });
export const insertAutoTradePlanSchema = createInsertSchema(autoTradePlans).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAutoTradeRuleSchema = createInsertSchema(autoTradeRules).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAutoTradeCycleSchema = createInsertSchema(autoTradeCycles).omit({ id: true, createdAt: true, updatedAt: true });
export const insertAutoTradeEventSchema = createInsertSchema(autoTradeEvents).omit({ id: true, createdAt: true });

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
export type TradingAccount = typeof tradingAccounts.$inferSelect;
export type InsertTradingAccount = typeof tradingAccounts.$inferInsert;
export type Order = typeof orders.$inferSelect;
export type InsertOrder = typeof orders.$inferInsert;
export type OrderEvent = typeof orderEvents.$inferSelect;
export type InsertOrderEvent = typeof orderEvents.$inferInsert;
export type AutoTradePlan = typeof autoTradePlans.$inferSelect;
export type InsertAutoTradePlan = typeof autoTradePlans.$inferInsert;
export type AutoTradeRule = typeof autoTradeRules.$inferSelect;
export type InsertAutoTradeRule = typeof autoTradeRules.$inferInsert;
export type AutoTradeCycle = typeof autoTradeCycles.$inferSelect;
export type InsertAutoTradeCycle = typeof autoTradeCycles.$inferInsert;
export type AutoTradeEvent = typeof autoTradeEvents.$inferSelect;
export type InsertAutoTradeEvent = typeof autoTradeEvents.$inferInsert;
