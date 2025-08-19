import { type TradingOpportunity, type TradeResult } from "@shared/schema";
import { randomUUID } from "crypto";

export interface IStorage {
  getTradingOpportunities(market: string): Promise<TradingOpportunity[]>;
  executeTrade(opportunityId: string): Promise<TradeResult>;
}

export class MemStorage implements IStorage {
  private opportunities: Map<string, TradingOpportunity>;
  private tradeResults: Map<string, TradeResult>;

  constructor() {
    this.opportunities = new Map();
    this.tradeResults = new Map();
    this.initializeMockData();
  }

  private initializeMockData() {
    const mockOpportunities: TradingOpportunity[] = [
      // Stocks
      {
        id: "stock-1",
        name: "Apple Inc. (AAPL)",
        type: "Technology Stock",
        entryPrice: "$178.25",
        risk: "-$125",
        potentialGain: "+$450",
        netProfit: "+$325",
        confidence: 87,
        action: "BUY",
        market: "stocks"
      },
      {
        id: "stock-2",
        name: "Microsoft Corp. (MSFT)",
        type: "Technology Stock",
        entryPrice: "$415.50",
        risk: "-$200",
        potentialGain: "+$680",
        netProfit: "+$480",
        confidence: 92,
        action: "BUY",
        market: "stocks"
      },
      {
        id: "stock-3",
        name: "Tesla Inc. (TSLA)",
        type: "Electric Vehicle",
        entryPrice: "$248.75",
        risk: "-$185",
        potentialGain: "+$380",
        netProfit: "+$195",
        confidence: 74,
        action: "SELL",
        market: "stocks"
      },
      // Commodities
      {
        id: "commodity-1",
        name: "Gold Futures (GC)",
        type: "Precious Metal",
        entryPrice: "$2,035.50",
        risk: "-$300",
        potentialGain: "+$750",
        netProfit: "+$450",
        confidence: 85,
        action: "BUY",
        market: "commodities"
      },
      {
        id: "commodity-2",
        name: "Crude Oil (CL)",
        type: "Energy",
        entryPrice: "$78.25",
        risk: "-$150",
        potentialGain: "+$420",
        netProfit: "+$270",
        confidence: 79,
        action: "BUY",
        market: "commodities"
      },
      {
        id: "commodity-3",
        name: "Silver Futures (SI)",
        type: "Precious Metal",
        entryPrice: "$23.45",
        risk: "-$180",
        potentialGain: "+$380",
        netProfit: "+$200",
        confidence: 71,
        action: "BUY",
        market: "commodities"
      },
      // Crypto
      {
        id: "crypto-1",
        name: "Bitcoin (BTC)",
        type: "Cryptocurrency",
        entryPrice: "$43,250",
        risk: "-$500",
        potentialGain: "+$1,200",
        netProfit: "+$700",
        confidence: 88,
        action: "BUY",
        market: "crypto"
      },
      {
        id: "crypto-2",
        name: "Ethereum (ETH)",
        type: "Cryptocurrency",
        entryPrice: "$2,680",
        risk: "-$350",
        potentialGain: "+$850",
        netProfit: "+$500",
        confidence: 82,
        action: "BUY",
        market: "crypto"
      },
      {
        id: "crypto-3",
        name: "Cardano (ADA)",
        type: "Cryptocurrency",
        entryPrice: "$0.485",
        risk: "-$120",
        potentialGain: "+$280",
        netProfit: "+$160",
        confidence: 76,
        action: "BUY",
        market: "crypto"
      }
    ];

    mockOpportunities.forEach(opportunity => {
      this.opportunities.set(opportunity.id, opportunity);
    });
  }

  async getTradingOpportunities(market: string): Promise<TradingOpportunity[]> {
    return Array.from(this.opportunities.values()).filter(
      opportunity => opportunity.market === market
    );
  }

  async executeTrade(opportunityId: string): Promise<TradeResult> {
    const opportunity = this.opportunities.get(opportunityId);
    
    if (!opportunity) {
      throw new Error("Trading opportunity not found");
    }

    const tradeResult: TradeResult = {
      id: randomUUID(),
      opportunityId,
      executedAt: new Date().toISOString(),
      success: true,
      message: `Your trade for ${opportunity.name} has been executed successfully.`,
      expectedProfit: opportunity.netProfit
    };

    this.tradeResults.set(tradeResult.id, tradeResult);
    return tradeResult;
  }
}

export const storage = new MemStorage();
