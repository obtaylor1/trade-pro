import { z } from "zod";

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
  market: z.enum(["stocks", "commodities", "crypto"]),
  rationale: z.string(),
  isMicro: z.boolean().default(false),
  contractSize: z.string().optional(),
  minimumTrade: z.string().optional()
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

export type TradingOpportunity = z.infer<typeof tradingOpportunitySchema>;
export type TradeExecution = z.infer<typeof tradeExecutionSchema>;
export type TradeResult = z.infer<typeof tradeResultSchema>;
export type UserProfile = z.infer<typeof userProfileSchema>;
export type Broker = z.infer<typeof brokerSchema>;
export type PortfolioPosition = z.infer<typeof portfolioPositionSchema>;
export type SimulatorSetup = z.infer<typeof simulatorSetupSchema>;
