import { z } from "zod";
import { pgTable, text, timestamp, numeric, integer, boolean } from "drizzle-orm/pg-core";

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
  spread: z.string().optional(),
  swapLong: z.string().optional(),
  swapShort: z.string().optional(),
  lotSize: z.string().optional(),
  // Forex bot-specific fields
  botStrategy: z.string().optional(),
  botRiskLevel: z.string().optional(),
  botAutomation: z.string().optional(),
  botSession: z.string().optional(),
  
  // Trading timeframe fields
  tradingTimeframe: z.string().optional(),
  timeframeDuration: z.string().optional(),
  chartTimeframe: z.string().optional(),
  timeframeDescription: z.string().optional()
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
  assetClass: z.enum(["stocks", "commodities", "crypto", "options", "forex"]),
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

// Database user type
export type DatabaseUser = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
