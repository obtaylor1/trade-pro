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
        market: "stocks",
        rationale: "Strong Q4 earnings beat with iPhone 15 driving revenue growth. Technical analysis shows bullish momentum with RSI at 65 and breaking key resistance at $175. AI chip demand boosting services revenue."
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
        market: "stocks",
        rationale: "Azure cloud growth accelerating at 29% YoY, exceeding analyst expectations. Copilot AI integration driving enterprise adoption. Strong balance sheet with $130B cash provides stability in volatile market."
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
        market: "stocks",
        rationale: "Overvalued at current levels with P/E ratio at 65x. Recent delivery numbers missing targets and increasing competition from Ford/GM. Technical indicators showing bearish divergence."
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
        market: "commodities",
        rationale: "Federal Reserve signaling pause in rate hikes with inflation cooling to 3.2%. Geopolitical tensions in Eastern Europe creating safe-haven demand. Dollar weakening against major currencies supports gold rally."
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
        market: "commodities",
        rationale: "OPEC+ production cuts of 1.2M barrels/day taking effect. U.S. strategic petroleum reserve at lowest levels since 1983. Summer driving season approaching with refinery maintenance reducing supply."
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
        market: "commodities",
        rationale: "Industrial demand from solar panel production up 18% YoY. Silver-to-gold ratio at 85:1, historically high suggesting silver undervalued. Green energy transition driving long-term structural demand."
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
        market: "crypto",
        rationale: "Bitcoin ETF approval driving institutional adoption with $2.1B inflows this month. Halving event in April historically creates supply shock. Technical breakout above $42K resistance with strong volume confirmation."
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
        market: "crypto",
        rationale: "Ethereum 2.0 staking yields at 4.2% attracting institutional capital. Layer 2 scaling solutions reducing gas fees by 90%. DeFi total value locked growing 25% monthly indicating strong ecosystem growth."
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
        market: "crypto",
        rationale: "Chang hard fork implementing smart contract improvements launching Q2. Partnerships with African governments for digital identity solutions expanding. ADA staking participation at 71% showing strong community commitment."
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
