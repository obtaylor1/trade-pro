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
  rationale: z.string()
});

export const tradeExecutionSchema = z.object({
  opportunityId: z.string(),
  amount: z.number().optional().default(1000)
});

export const tradeResultSchema = z.object({
  id: z.string(),
  opportunityId: z.string(),
  executedAt: z.string(),
  success: z.boolean(),
  message: z.string(),
  expectedProfit: z.string()
});

export type TradingOpportunity = z.infer<typeof tradingOpportunitySchema>;
export type TradeExecution = z.infer<typeof tradeExecutionSchema>;
export type TradeResult = z.infer<typeof tradeResultSchema>;
