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
  origin: text("origin").default("manual").notNull(),
  idempotencyKey: text("idempotency_key"),
  openedAt: timestamp("opened_at"),
  closedAt: timestamp("closed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({ userCreatedIdx: index("orders_user_created_idx").on(table.userId, table.createdAt), brokerOrderIdx: index("orders_broker_order_idx").on(table.brokerOrderId), userIdempotencyUnique: uniqueIndex("orders_user_idempotency_uidx").on(table.userId, table.idempotencyKey) }));

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

// ─── AI Managed Investing ───────────────────────────────────────────────────
// These records describe a user's practice-mode mandate. They are deliberately
// separate from broker orders so no profile change can silently grant live
// trading authority.
export const managedProfiles = pgTable("managed_profiles", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  goal: text("goal").notNull(),
  horizon: text("horizon").notNull(),
  riskComfort: text("risk_comfort").notNull(),
  experience: text("experience").notNull(),
  riskLevel: text("risk_level").notNull(),
  allowedMarkets: json("allowed_markets").$type<string[]>().notNull(),
  authorityLevel: text("authority_level").default("practice_managed").notNull(),
  maxOrderAmount: numeric("max_order_amount").notNull(),
  maxDailyAmount: numeric("max_daily_amount").default("250").notNull(),
  maxPositionPercent: integer("max_position_percent").default(20).notNull(),
  maxLossAmount: numeric("max_loss_amount").default("100").notNull(),
  approvalMode: text("approval_mode").default("confirm_each").notNull(),
  mandateExpiresAt: timestamp("mandate_expires_at"),
  emergencyPaused: boolean("emergency_paused").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({ userUnique: uniqueIndex("managed_profiles_user_uidx").on(table.userId) }));

export const managedPlans = pgTable("managed_plans", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  profileId: text("profile_id").notNull().references(() => managedProfiles.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  status: text("status").default("proposed").notNull(),
  recurringAmount: numeric("recurring_amount").notNull(),
  frequency: text("frequency").notNull(),
  allocations: json("allocations").$type<Array<{ symbol: string; name: string; market: string; weight: number; reason: string }>>().notNull(),
  rationale: text("rationale").notNull(),
  nextRunAt: timestamp("next_run_at"),
  lastRunAt: timestamp("last_run_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({ userStatusIdx: index("managed_plans_user_status_idx").on(table.userId, table.status) }));

export const managedActivities = pgTable("managed_activities", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  planId: text("plan_id").notNull().references(() => managedPlans.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  explanation: text("explanation").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({ planCreatedIdx: index("managed_activities_plan_created_idx").on(table.planId, table.createdAt) }));

// ─── Owner Security & Audit ─────────────────────────────────────────────────
export const adminMfa = pgTable("admin_mfa", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  encryptedSecret: text("encrypted_secret").notNull(),
  recoveryCodeHashes: json("recovery_code_hashes").$type<string[]>().default([]).notNull(),
  enabled: boolean("enabled").default(false).notNull(),
  confirmedAt: timestamp("confirmed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
}, (table) => ({ userUnique: uniqueIndex("admin_mfa_user_uidx").on(table.userId) }));

export const adminAuditLogs = pgTable("admin_audit_logs", {
  id: text("id").primaryKey(),
  adminUserId: text("admin_user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  targetType: text("target_type"),
  targetId: text("target_id"),
  summary: text("summary").notNull(),
  ipAddress: text("ip_address"),
  userAgent: text("user_agent"),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({ adminCreatedIdx: index("admin_audit_admin_created_idx").on(table.adminUserId, table.createdAt) }));

export const platformControls = pgTable("platform_controls", {
  id: text("id").primaryKey(),
  globalTradingPaused: boolean("global_trading_paused").default(false).notNull(),
  paperBetaInviteOnly: boolean("paper_beta_invite_only").default(false).notNull(),
  liveTradingEnabled: boolean("live_trading_enabled").default(false).notNull(),
  liveTradingReason: text("live_trading_reason").default("Broker approval and compliance review required").notNull(),
  updatedBy: text("updated_by").references(() => users.id, { onDelete: "set null" }),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const betaInvites = pgTable("beta_invites", {
  id: text("id").primaryKey(),
  codeHash: text("code_hash").unique().notNull(),
  label: text("label").notNull(),
  maxUses: integer("max_uses").default(1).notNull(),
  usedCount: integer("used_count").default(0).notNull(),
  active: boolean("active").default(true).notNull(),
  expiresAt: timestamp("expires_at"),
  createdBy: text("created_by").references(() => users.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const betaFeedback = pgTable("beta_feedback", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  category: text("category").notNull(),
  message: text("message").notNull(),
  page: text("page"),
  status: text("status").default("new").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const safetyEvents = pgTable("safety_events", {
  id: text("id").primaryKey(),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  orderId: text("order_id").references(() => orders.id, { onDelete: "set null" }),
  rule: text("rule").notNull(),
  severity: text("severity").default("warning").notNull(),
  message: text("message").notNull(),
  metadata: json("metadata"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({ createdIdx: index("safety_events_created_idx").on(table.createdAt) }));

export const reconciliationEvents = pgTable("reconciliation_events", {
  id: text("id").primaryKey(),
  orderId: text("order_id").references(() => orders.id, { onDelete: "cascade" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  brokerName: text("broker_name").notNull(),
  status: text("status").notNull(),
  localStatus: text("local_status"),
  brokerStatus: text("broker_status"),
  message: text("message").notNull(),
  checkedAt: timestamp("checked_at").defaultNow().notNull(),
}, (table) => ({ statusCheckedIdx: index("reconciliation_status_checked_idx").on(table.status, table.checkedAt) }));

export const userNotifications = pgTable("user_notifications", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({ userReadIdx: index("notifications_user_read_idx").on(table.userId, table.read) }));

export const expertStrategies = pgTable("expert_strategies", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  sourceName: text("source_name").notNull(),
  sourceUrl: text("source_url"),
  riskLevel: text("risk_level").notNull(),
  disclosureDelay: text("disclosure_delay").notNull(),
  allocations: json("allocations").$type<Array<{ symbol: string; weight: number }>>().notNull(),
  active: boolean("active").default(false).notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

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
export type ManagedProfile = typeof managedProfiles.$inferSelect;
export type ManagedPlan = typeof managedPlans.$inferSelect;
export type ManagedActivity = typeof managedActivities.$inferSelect;
export type AdminMfa = typeof adminMfa.$inferSelect;
export type AdminAuditLog = typeof adminAuditLogs.$inferSelect;
