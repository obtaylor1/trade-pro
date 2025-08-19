import { type TradingOpportunity, type TradeResult } from "@shared/schema";
import { randomUUID } from "crypto";
import { marketDataService } from "./marketDataService";

export interface IStorage {
  getTradingOpportunities(market: string): Promise<TradingOpportunity[]>;
  executeTrade(opportunityId: string): Promise<TradeResult>;
}

// Cache for market data to avoid hitting API limits
interface DataCache {
  data: TradingOpportunity[];
  timestamp: number;
  market: string;
}

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export class MemStorage implements IStorage {
  private opportunities: Map<string, TradingOpportunity>;
  private tradeResults: Map<string, TradeResult>;
  private cache: Map<string, DataCache>;

  constructor() {
    this.opportunities = new Map();
    this.tradeResults = new Map();
    this.cache = new Map();
  }



  async getTradingOpportunities(market: string): Promise<TradingOpportunity[]> {
    // Check cache first
    const cached = this.cache.get(market);
    if (cached && Date.now() - cached.timestamp < CACHE_DURATION) {
      console.log(`Using cached data for ${market}`);
      return cached.data;
    }

    try {
      // Fetch fresh data from market data service
      console.log(`Fetching fresh data for ${market}`);
      const opportunities = await marketDataService.generateTradingOpportunities(market);
      
      // Update cache
      this.cache.set(market, {
        data: opportunities,
        timestamp: Date.now(),
        market
      });

      // Store in opportunities map for trade execution
      opportunities.forEach(opportunity => {
        this.opportunities.set(opportunity.id, opportunity);
      });

      return opportunities;
    } catch (error) {
      console.error(`Error fetching market data for ${market}:`, error);
      
      // Return cached data if available, even if expired
      if (cached) {
        console.log(`Using expired cache for ${market} due to API error`);
        return cached.data;
      }
      
      // Fallback to empty array if no cache available
      console.log(`No cache available for ${market}, returning empty array`);
      return [];
    }
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
