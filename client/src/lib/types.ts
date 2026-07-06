// Shared client-side types for trade ideas and live pricing.

export type MarketId = "forex" | "stocks" | "crypto" | "commodities" | "options";
export type DurationId = "quick" | "shortTerm" | "longTerm";
export type TradeDirection = "BUY" | "SELL";
export type RiskLevel = "Low" | "Medium" | "High";
export type IdeaStatus = "Open" | "Win" | "Loss" | "Closed";

/** A trade suggestion shown on the Choose a Trade page (best match + idea cards). */
export interface TradeIdea {
  id: string;
  pair: string;
  description: string;
  market: MarketId | string;
  direction: TradeDirection | string;
  duration: DurationId | string;
  score: number;
  riskLevel: RiskLevel | string;
  status: IdeaStatus | string;
  openTime: string;
  closeTime: string;
  tradeLength: string;
  bestTime: string;
  sessionName: string;
  whyThisTrade: string;
  profitRate: number;
  lossRate: number;
  entryPrice: number;
  profitGoal: string;
  safetyStop: string;
  tradeSize: string;
  timeframe: string;
  signalType: string;
  rank?: number;
}

/** A single quote from /api/live-prices. */
export interface LivePrice {
  price: number;
  change24h: number;
  marketOpen: boolean;
  lastUpdated: string;
  bid?: number;
  ask?: number;
  spread?: string;
  source: "live" | "cache";
}

/** Order data passed to the live order preview modal. */
export interface LiveOrderPreview {
  previewId: string;
  symbol: string;
  assetClass: string;
  side: "buy" | "sell";
  orderType: string;
  quantity: number;
  notionalAmount: number;
  estimatedPrice: number;
  estimatedCost: number;
  estimatedFees: number;
  estimatedTotal: number;
  tradeScore: number;
  riskLevel: string;
  reason: string;
}
