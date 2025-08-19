import { type TradingOpportunity, type TradeResult } from "@shared/schema";
import { randomUUID } from "crypto";
import { marketDataService } from "./marketDataService";

export interface IStorage {
  getTradingOpportunities(market: string): Promise<TradingOpportunity[]>;
  executeTrade(opportunityId: string, amount?: number, isLiveTrading?: boolean, selectedBroker?: string): Promise<TradeResult>;
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

  async executeTrade(
    opportunityId: string, 
    amount: number = 1000,
    isLiveTrading: boolean = false,
    selectedBroker?: string
  ): Promise<TradeResult> {
    const opportunity = this.opportunities.get(opportunityId);
    
    if (!opportunity) {
      throw new Error("Trading opportunity not found");
    }

    // Get broker fee structure based on selected broker
    const getBrokerFees = (brokerId: string | undefined) => {
      const brokerFees: Record<string, any> = {
        'td-ameritrade-sim': { futuresCommission: 2.25, optionCommission: 0.65, stockCommission: 0 },
        'interactive-brokers-sim': { futuresCommission: 0.85, optionCommission: 0.70, stockCommission: 0.005 },
        'ninjatrader-sim': { futuresCommission: 0.53, optionCommission: 0, stockCommission: 0 },
        'tastytrade-sim': { futuresCommission: 1.25, optionCommission: 1.00, stockCommission: 0 },
        'coinbase-pro-sim': { cryptoFee: 0.50, futuresCommission: 0, stockCommission: 0 }
      };
      return brokerFees[brokerId || 'ninjatrader-sim'] || brokerFees['ninjatrader-sim'];
    };

    const fees = getBrokerFees(selectedBroker);
    
    // Calculate fees based on trade type
    let commission = 0;
    if (opportunityId.includes('micro-commodity') || opportunityId.includes('futures')) {
      commission = fees.futuresCommission || 0.53;
    } else if (opportunityId.includes('crypto')) {
      commission = (amount * (fees.cryptoFee || 0.50)) / 100;
    } else if (opportunityId.includes('option')) {
      commission = fees.optionCommission || 0.65;
    } else {
      commission = fees.stockCommission || 0;
    }

    // Parse the original net profit and subtract commission
    const originalProfit = parseFloat(opportunity.netProfit.replace(/[^-0-9.]/g, '')) || 0;
    const netProfitAfterFees = originalProfit - commission;
    const success = Math.random() > 0.15; // 85% success rate

    const tradeResult: TradeResult = {
      id: randomUUID(),
      opportunityId,
      executedAt: new Date().toISOString(),
      success,
      message: success 
        ? `Trade for ${opportunity.name} executed successfully. Commission: $${commission.toFixed(2)}` 
        : 'Trade failed - insufficient margin or market conditions',
      expectedProfit: `$${netProfitAfterFees.toFixed(2)}`
    };

    this.tradeResults.set(tradeResult.id, tradeResult);
    return tradeResult;
  }
}

export const storage = new MemStorage();
