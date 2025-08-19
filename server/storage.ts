import { type TradingOpportunity, type TradeResult, type PaperTrade, type TradeSummary } from "@shared/schema";
import { randomUUID } from "crypto";
import { marketDataService } from "./marketDataService";
import { db } from "./db";
import { paperTrades } from "@shared/schema";
import { eq, desc, and } from "drizzle-orm";

export interface IStorage {
  getTradingOpportunities(market: string): Promise<TradingOpportunity[]>;
  executeTrade(opportunityId: string, amount?: number, isLiveTrading?: boolean, selectedBroker?: string, userId?: string): Promise<TradeResult>;
  savePaperTrade(trade: Omit<PaperTrade, 'id'>): Promise<PaperTrade>;
  getUserTrades(userId: string, limit?: number): Promise<PaperTrade[]>;
  getTradeSummary(userId: string): Promise<TradeSummary>;
  updateTradeStatus(tradeId: string, status: string, currentPrice?: number): Promise<void>;
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
    selectedBroker?: string,
    userId?: string
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

    // Save paper trade to database if it's simulator mode and successful
    if (!isLiveTrading && success && userId) {
      try {
        const paperTrade: Omit<PaperTrade, 'id'> = {
          userId,
          tradeId: tradeResult.id,
          timestamp: new Date().toISOString(),
          broker: selectedBroker || 'ninjatrader-sim',
          symbol: opportunity.id.includes('micro-commodity-gold') ? 'MGC' : 
                  opportunity.id.includes('micro-commodity-oil') ? 'MCL' :
                  opportunity.id.includes('crypto-eth') ? 'MET' :
                  opportunity.id.includes('crypto-btc') ? 'MBT' : 'MGC',
          assetName: opportunity.name,
          assetClass: opportunity.market,
          direction: opportunity.action,
          quantity: Math.floor(amount / parseFloat(opportunity.entryPrice.replace(/[^0-9.]/g, ''))),
          entryPrice: parseFloat(opportunity.entryPrice.replace(/[^0-9.]/g, '')),
          currentPrice: parseFloat(opportunity.entryPrice.replace(/[^0-9.]/g, '')),
          positionSize: amount,
          commission,
          margin: amount * 0.1, // 10% margin requirement
          grossPnL: originalProfit,
          netPnL: netProfitAfterFees,
          status: 'OPEN',
          successRate: 0,
          executedAt: new Date().toISOString(),
        };

        await this.savePaperTrade(paperTrade);
      } catch (error) {
        console.error('Error saving paper trade:', error);
      }
    }

    this.tradeResults.set(tradeResult.id, tradeResult);
    return tradeResult;
  }

  async savePaperTrade(trade: Omit<PaperTrade, 'id'>): Promise<PaperTrade> {
    const id = randomUUID();
    
    await db.insert(paperTrades).values({
      id,
      userId: trade.userId,
      tradeId: trade.tradeId,
      timestamp: new Date(trade.timestamp),
      broker: trade.broker,
      symbol: trade.symbol,
      assetName: trade.assetName,
      assetClass: trade.assetClass,
      direction: trade.direction,
      quantity: trade.quantity.toString(),
      entryPrice: trade.entryPrice.toString(),
      currentPrice: trade.currentPrice.toString(),
      positionSize: trade.positionSize.toString(),
      stopLoss: trade.stopLoss?.toString(),
      takeProfit: trade.takeProfit?.toString(),
      commission: trade.commission.toString(),
      margin: trade.margin.toString(),
      grossPnL: trade.grossPnL.toString(),
      netPnL: trade.netPnL.toString(),
      status: trade.status,
      successRate: trade.successRate.toString(),
      executedAt: new Date(trade.executedAt),
      closedAt: trade.closedAt ? new Date(trade.closedAt) : null,
    });

    return { id, ...trade };
  }

  async getUserTrades(userId: string, limit = 50): Promise<PaperTrade[]> {
    const trades = await db
      .select()
      .from(paperTrades)
      .where(eq(paperTrades.userId, userId))
      .orderBy(desc(paperTrades.executedAt))
      .limit(limit);

    return trades.map(trade => ({
      id: trade.id,
      userId: trade.userId,
      tradeId: trade.tradeId,
      timestamp: trade.timestamp.toISOString(),
      broker: trade.broker,
      symbol: trade.symbol,
      assetName: trade.assetName,
      assetClass: trade.assetClass,
      direction: trade.direction as "BUY" | "SELL",
      quantity: parseFloat(trade.quantity),
      entryPrice: parseFloat(trade.entryPrice),
      currentPrice: parseFloat(trade.currentPrice),
      positionSize: parseFloat(trade.positionSize),
      stopLoss: trade.stopLoss ? parseFloat(trade.stopLoss) : undefined,
      takeProfit: trade.takeProfit ? parseFloat(trade.takeProfit) : undefined,
      commission: parseFloat(trade.commission),
      margin: parseFloat(trade.margin),
      grossPnL: parseFloat(trade.grossPnL),
      netPnL: parseFloat(trade.netPnL),
      status: trade.status as "OPEN" | "CLOSED" | "PENDING",
      successRate: parseFloat(trade.successRate),
      executedAt: trade.executedAt.toISOString(),
      closedAt: trade.closedAt?.toISOString(),
    }));
  }

  async getTradeSummary(userId: string): Promise<TradeSummary> {
    const trades = await this.getUserTrades(userId);
    
    const totalTrades = trades.length;
    const openTrades = trades.filter(t => t.status === 'OPEN').length;
    const closedTrades = trades.filter(t => t.status === 'CLOSED').length;
    const winningTrades = trades.filter(t => t.netPnL > 0).length;
    const winRate = totalTrades > 0 ? (winningTrades / totalTrades) * 100 : 0;
    
    const totalPnL = trades.reduce((sum, t) => sum + t.netPnL, 0);
    const avgReturnPerTrade = totalTrades > 0 ? totalPnL / totalTrades : 0;
    
    const largestGain = Math.max(...trades.map(t => t.netPnL), 0);
    const largestLoss = Math.min(...trades.map(t => t.netPnL), 0);
    
    const totalCommissions = trades.reduce((sum, t) => sum + t.commission, 0);
    const totalVolume = trades.reduce((sum, t) => sum + t.positionSize, 0);

    return {
      userId,
      totalTrades,
      openTrades,
      closedTrades,
      winRate,
      avgReturnPerTrade,
      largestGain,
      largestLoss,
      netAccountGrowth: totalPnL,
      totalCommissions,
      totalVolume,
    };
  }

  async updateTradeStatus(tradeId: string, status: string, currentPrice?: number): Promise<void> {
    const updateData: any = { status };
    
    if (currentPrice) {
      updateData.currentPrice = currentPrice.toString();
    }
    
    if (status === 'CLOSED') {
      updateData.closedAt = new Date();
    }

    await db
      .update(paperTrades)
      .set(updateData)
      .where(eq(paperTrades.tradeId, tradeId));
  }
}

export const storage = new MemStorage();
