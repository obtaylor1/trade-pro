import { z } from "zod";
import { pgTable, text, timestamp, numeric, integer, boolean, decimal } from "drizzle-orm/pg-core";

// Trading opportunity schema
export const tradingOpportunitySchema = z.object({
  id: z.string(),
  name: z.string(),
  type: z.string(),
  entryPrice: z.string(),
  risk: z.string(),
  potentialGain: z.string(),
  netProfit: z.string(),
  confidence: z.number().min(0).max(100),
  action: z.enum(["BUY", "SELL"]),
  market: z.enum(["stocks", "commodities", "crypto", "options", "forex"]),
  rationale: z.string(),
  isMicro: z.boolean().default(false),
  contractSize: z.string().optional(),
  minimumTrade: z.string().optional(),
  exchange: z.string().optional(),
  sector: z.string().optional(),
  volume: z.string().optional(),
  riskLevel: z.string().optional(),
  // Options-specific fields
  optionType: z.enum(["CALL", "PUT"]).optional(),
  strikePrice: z.string().optional(),
  expirationDate: z.string().optional(),
  premium: z.string().optional(),
  underlyingPrice: z.string().optional(),
  impliedVolatility: z.string().optional(),
  // Futures-specific fields
  marginRequired: z.string().optional(),
  tickValue: z.string().optional(),
  leverage: z.string().optional(),
  strategy: z.string().optional(),
  stopLoss: z.string().optional(),
  takeProfit: z.string().optional(),
  
  // Forex-specific fields
  lotSize: z.string().optional(),
  pipValue: z.string().optional(),
  spread: z.string().optional(),
  targetPips: z.string().optional()
});

export const tradeExecutionSchema = z.object({
  opportunityId: z.string(),
  amount: z.number().optional().default(1000),
  isLiveTrading: z.boolean().default(false),
  selectedBroker: z.string().optional(),
});

export const tradeResultSchema = z.object({
  id: z.string(),
  opportunityId: z.string(),
  executedAt: z.string(),
  success: z.boolean(),
  message: z.string(),
  expectedProfit: z.string()
});

// User Profile Schema
export const userProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  accountType: z.enum(["individual", "joint", "retirement"]),
  availableFunds: z.number(),
  virtualFunds: z.number(),
  selectedBroker: z.string().optional(),
  isLiveTrading: z.boolean().default(false),
});

// Simulator Setup Schema
export const simulatorSetupSchema = z.object({
  userName: z.string().min(1, "Name is required"),
  initialCapital: z.number().min(100, "Minimum starting balance is $100"),
  selectedBroker: z.string().min(1, "Please select a broker"),
  accountType: z.enum(["individual", "joint", "retirement"]).default("individual"),
});

// Broker Schema
export const brokerSchema = z.object({
  id: z.string(),
  name: z.string(),
  assetClass: z.enum(["stocks", "commodities", "crypto", "options"]),
  logoUrl: z.string().optional(),
  features: z.array(z.string()),
  rating: z.number().min(1).max(5),
  fees: z.object({
    stockCommission: z.number().default(0),
    optionCommission: z.number().default(0),
    futuresCommission: z.number().default(0),
    cryptoFee: z.number().default(0), // percentage
    marginRate: z.number().default(0), // percentage
    inactivityFee: z.number().default(0),
  }),
});

// Portfolio Position Schema
export const portfolioPositionSchema = z.object({
  id: z.string(),
  symbol: z.string(),
  name: z.string(),
  quantity: z.number(),
  entryPrice: z.number(),
  currentPrice: z.number(),
  marketValue: z.number(),
  unrealizedPnL: z.number(),
  unrealizedPnLPercent: z.number(),
  assetClass: z.string(),
});

// Paper Trade Schema for detailed trade tracking
export const paperTradeSchema = z.object({
  id: z.string(),
  userId: z.string(),
  tradeId: z.string(),
  timestamp: z.string(),
  broker: z.string(),
  symbol: z.string(),
  assetName: z.string(),
  assetClass: z.string(),
  direction: z.enum(["BUY", "SELL"]),
  quantity: z.number(),
  entryPrice: z.number(),
  currentPrice: z.number(),
  positionSize: z.number(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
  commission: z.number(),
  margin: z.number(),
  grossPnL: z.number(),
  netPnL: z.number(),
  status: z.enum(["OPEN", "CLOSED", "PENDING"]),
  successRate: z.number(), // % progress toward target
  executedAt: z.string(),
  closedAt: z.string().optional(),
});

// Trade Summary Schema for aggregated statistics
export const tradeSummarySchema = z.object({
  userId: z.string(),
  totalTrades: z.number(),
  openTrades: z.number(),
  closedTrades: z.number(),
  winRate: z.number(),
  avgReturnPerTrade: z.number(),
  largestGain: z.number(),
  largestLoss: z.number(),
  netAccountGrowth: z.number(),
  totalCommissions: z.number(),
  totalVolume: z.number(),
});

// Database Tables
export const paperTrades = pgTable("paper_trades", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  tradeId: text("trade_id").notNull(),
  timestamp: timestamp("timestamp").notNull(),
  broker: text("broker").notNull(),
  symbol: text("symbol").notNull(),
  assetName: text("asset_name").notNull(),
  assetClass: text("asset_class").notNull(),
  direction: text("direction").notNull(), // BUY or SELL
  quantity: numeric("quantity").notNull(),
  entryPrice: numeric("entry_price").notNull(),
  currentPrice: numeric("current_price").notNull(),
  positionSize: numeric("position_size").notNull(),
  stopLoss: numeric("stop_loss"),
  takeProfit: numeric("take_profit"),
  commission: numeric("commission").notNull(),
  margin: numeric("margin").notNull(),
  grossPnL: numeric("gross_pnl").notNull(),
  netPnL: numeric("net_pnl").notNull(),
  status: text("status").notNull(), // OPEN, CLOSED, PENDING
  successRate: numeric("success_rate").notNull(),
  executedAt: timestamp("executed_at").notNull(),
  closedAt: timestamp("closed_at"),
});

export const users = pgTable("users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").unique().notNull(),
  startingCapital: numeric("starting_capital").default("10000"),
  currentBalance: numeric("current_balance").default("10000"),
  selectedBroker: text("selected_broker").default("ninjatrader-sim"),
  isLiveTrading: boolean("is_live_trading").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// User registration/login schemas
export const userRegistrationSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  startingCapital: z.number().min(100, "Minimum starting capital is $100"),
  selectedBroker: z.string().default("ninjatrader-sim"),
});

export const userLoginSchema = z.object({
  email: z.string().email("Please enter a valid email address"),
});

export type TradingOpportunity = z.infer<typeof tradingOpportunitySchema>;
export type TradeExecution = z.infer<typeof tradeExecutionSchema>;
export type TradeResult = z.infer<typeof tradeResultSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type Broker = z.infer<typeof brokerSchema>;
export type PortfolioPosition = z.infer<typeof portfolioPositionSchema>;
export type SimulatorSetup = z.infer<typeof simulatorSetupSchema>;
export type PaperTrade = z.infer<typeof paperTradeSchema>;
export type TradeSummary = z.infer<typeof tradeSummarySchema>;
export type UserRegistration = z.infer<typeof userRegistrationSchema>;
export type UserLogin = z.infer<typeof userLoginSchema>;

// Forex Database Tables
export const forexUsers = pgTable("forex_users", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  baseCurrency: text("base_currency").default("USD"),
  startBalance: decimal("start_balance", { precision: 20, scale: 2 }).notNull(),
  balance: decimal("balance", { precision: 20, scale: 2 }).notNull(),
  equity: decimal("equity", { precision: 20, scale: 2 }).notNull(),
  margin: decimal("margin", { precision: 20, scale: 2 }).default("0"),
  freeMargin: decimal("free_margin", { precision: 20, scale: 2 }).notNull(),
  marginLevel: decimal("margin_level", { precision: 10, scale: 2 }).default("0"),
  riskPerTrade: decimal("risk_per_trade", { precision: 5, scale: 4 }).default("0.01"),
  dailyLossMax: decimal("daily_loss_max", { precision: 5, scale: 4 }).default("0.05"),
  leverageMax: decimal("leverage_max", { precision: 10, scale: 2 }).default("30"),
  dailyPnL: decimal("daily_pnl", { precision: 20, scale: 2 }).default("0"),
  totalPnL: decimal("total_pnl", { precision: 20, scale: 2 }).default("0"),
  isLocked: boolean("is_locked").default(false),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const forexOrders = pgTable("forex_orders", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // BUY, SELL
  type: text("type").notNull(), // MARKET, LIMIT, STOP, STOP_LIMIT
  lots: decimal("lots", { precision: 10, scale: 4 }).notNull(),
  price: decimal("price", { precision: 15, scale: 6 }),
  stopLoss: decimal("stop_loss", { precision: 15, scale: 6 }),
  takeProfit: decimal("take_profit", { precision: 15, scale: 6 }),
  trailingPips: integer("trailing_pips"),
  status: text("status").notNull().default("NEW"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
  filledAt: timestamp("filled_at"),
});

export const forexPositions = pgTable("forex_positions", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(), // LONG, SHORT
  lots: decimal("lots", { precision: 10, scale: 4 }).notNull(),
  avgPrice: decimal("avg_price", { precision: 15, scale: 6 }).notNull(),
  currentPrice: decimal("current_price", { precision: 15, scale: 6 }).notNull(),
  commission: decimal("commission", { precision: 15, scale: 2 }).default("0"),
  swap: decimal("swap", { precision: 15, scale: 2 }).default("0"),
  unrealizedPnL: decimal("unrealized_pnl", { precision: 20, scale: 2 }).default("0"),
  realizedPnL: decimal("realized_pnl", { precision: 20, scale: 2 }).default("0"),
  stopLoss: decimal("stop_loss", { precision: 15, scale: 6 }),
  takeProfit: decimal("take_profit", { precision: 15, scale: 6 }),
  openedAt: timestamp("opened_at").defaultNow(),
  closedAt: timestamp("closed_at"),
});

export const forexFills = pgTable("forex_fills", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull(),
  positionId: text("position_id"),
  userId: text("user_id").notNull(),
  symbol: text("symbol").notNull(),
  side: text("side").notNull(),
  lots: decimal("lots", { precision: 10, scale: 4 }).notNull(),
  price: decimal("price", { precision: 15, scale: 6 }).notNull(),
  commission: decimal("commission", { precision: 15, scale: 2 }).default("0"),
  spreadCost: decimal("spread_cost", { precision: 15, scale: 2 }).default("0"),
  slippage: decimal("slippage", { precision: 15, scale: 6 }).default("0"),
  timestamp: timestamp("timestamp").defaultNow(),
});

export const accountSnapshots = pgTable("account_snapshots", {
  id: text("id").primaryKey(),
  userId: text("user_id").notNull(),
  timestamp: timestamp("timestamp").defaultNow(),
  balance: decimal("balance", { precision: 20, scale: 2 }).notNull(),
  equity: decimal("equity", { precision: 20, scale: 2 }).notNull(),
  margin: decimal("margin", { precision: 20, scale: 2 }).notNull(),
  freeMargin: decimal("free_margin", { precision: 20, scale: 2 }).notNull(),
  marginLevel: decimal("margin_level", { precision: 10, scale: 2 }).notNull(),
  dailyPnL: decimal("daily_pnl", { precision: 20, scale: 2 }).notNull(),
  totalPnL: decimal("total_pnl", { precision: 20, scale: 2 }).notNull(),
  openPositions: integer("open_positions").notNull(),
  openOrders: integer("open_orders").notNull(),
});

// Forex schemas for validation
export const forexUserSchema = z.object({
  id: z.string(),
  name: z.string(),
  baseCurrency: z.string().default("USD"),
  startBalance: z.number().min(100),
  balance: z.number(),
  equity: z.number(),
  margin: z.number().default(0),
  freeMargin: z.number(),
  marginLevel: z.number().default(0),
  riskPerTrade: z.number().min(0.001).max(0.1).default(0.01),
  dailyLossMax: z.number().min(0.01).max(0.2).default(0.05),
  leverageMax: z.number().min(1).max(500).default(30),
  dailyPnL: z.number().default(0),
  totalPnL: z.number().default(0),
  isLocked: z.boolean().default(false),
  createdAt: z.string(),
  updatedAt: z.string()
});

export const forexOrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  symbol: z.string(),
  side: z.enum(["BUY", "SELL"]),
  type: z.enum(["MARKET", "LIMIT", "STOP", "STOP_LIMIT"]),
  lots: z.number().positive(),
  price: z.number().optional(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional(),
  trailingPips: z.number().optional(),
  status: z.enum(["NEW", "FILLED", "CANCELED", "REJECTED", "PARTIAL"]),
  createdAt: z.string(),
  updatedAt: z.string(),
  filledAt: z.string().optional()
});

export const forexPositionSchema = z.object({
  id: z.string(),
  userId: z.string(),
  symbol: z.string(),
  side: z.enum(["LONG", "SHORT"]),
  lots: z.number().positive(),
  avgPrice: z.number().positive(),
  currentPrice: z.number().positive(),
  commission: z.number().default(0),
  swap: z.number().default(0),
  unrealizedPnL: z.number().default(0),
  realizedPnL: z.number().default(0),
  openedAt: z.string(),
  closedAt: z.string().optional(),
  stopLoss: z.number().optional(),
  takeProfit: z.number().optional()
});

// Database user type
export type DatabaseUser = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type ForexUser = z.infer<typeof forexUserSchema>;
export type ForexOrder = z.infer<typeof forexOrderSchema>;
export type ForexPosition = z.infer<typeof forexPositionSchema>;
