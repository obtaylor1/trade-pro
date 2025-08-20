// Simplified forex engine for demo purposes
// In production, this would integrate with real forex data providers

// Currency pair configurations
const CURRENCY_CONFIGS = {
  'EURUSD': { pipPosition: 4, contractSize: 100000, baseCurrency: 'EUR', quoteCurrency: 'USD' },
  'GBPUSD': { pipPosition: 4, contractSize: 100000, baseCurrency: 'GBP', quoteCurrency: 'USD' },
  'USDJPY': { pipPosition: 2, contractSize: 100000, baseCurrency: 'USD', quoteCurrency: 'JPY' },
  'AUDUSD': { pipPosition: 4, contractSize: 100000, baseCurrency: 'AUD', quoteCurrency: 'USD' },
  'USDCHF': { pipPosition: 4, contractSize: 100000, baseCurrency: 'USD', quoteCurrency: 'CHF' },
  'NZDUSD': { pipPosition: 4, contractSize: 100000, baseCurrency: 'NZD', quoteCurrency: 'USD' },
  'USDCAD': { pipPosition: 4, contractSize: 100000, baseCurrency: 'USD', quoteCurrency: 'CAD' },
  'EURJPY': { pipPosition: 2, contractSize: 100000, baseCurrency: 'EUR', quoteCurrency: 'JPY' },
  'EURGBP': { pipPosition: 4, contractSize: 100000, baseCurrency: 'EUR', quoteCurrency: 'GBP' },
  'XAUUSD': { pipPosition: 2, contractSize: 100, baseCurrency: 'XAU', quoteCurrency: 'USD' } // Gold
};

// Real-time quotes (would come from WebSocket feed in production)
let LIVE_QUOTES: { [symbol: string]: { bid: number; ask: number; timestamp: number } } = {
  'EURUSD': { bid: 1.0823, ask: 1.0825, timestamp: Date.now() },
  'GBPUSD': { bid: 1.2643, ask: 1.2645, timestamp: Date.now() },
  'USDJPY': { bid: 149.83, ask: 149.85, timestamp: Date.now() },
  'AUDUSD': { bid: 0.6576, ask: 0.6578, timestamp: Date.now() },
  'USDCHF': { bid: 0.8943, ask: 0.8945, timestamp: Date.now() },
  'NZDUSD': { bid: 0.6234, ask: 0.6236, timestamp: Date.now() },
  'USDCAD': { bid: 1.3456, ask: 1.3458, timestamp: Date.now() },
  'EURJPY': { bid: 162.15, ask: 162.17, timestamp: Date.now() },
  'EURGBP': { bid: 0.8556, ask: 0.8558, timestamp: Date.now() },
  'XAUUSD': { bid: 2018.45, ask: 2018.65, timestamp: Date.now() }
};

export class ForexTradingEngine {
  private users: Map<string, any> = new Map();
  private positions: Map<string, any[]> = new Map();
  private orders: Map<string, any[]> = new Map();

  // Create a demo forex user account (simplified for MVP)
  async createForexUser(userData: {
    name: string;
    baseCurrency?: string;
    startBalance: number;
    riskPerTrade?: number;
    dailyLossMax?: number;
    leverageMax?: number;
  }): Promise<any> {
    const userId = userData.name.replace(/\s+/g, '-').toLowerCase();
    const now = new Date().toISOString();
    
    const newUser = {
      id: userId,
      name: userData.name,
      baseCurrency: userData.baseCurrency || 'USD',
      startBalance: userData.startBalance,
      balance: userData.startBalance,
      equity: userData.startBalance,
      margin: 0,
      freeMargin: userData.startBalance,
      marginLevel: 0,
      riskPerTrade: userData.riskPerTrade || 0.01,
      dailyLossMax: userData.dailyLossMax || 0.05,
      leverageMax: userData.leverageMax || 30,
      dailyPnL: 0,
      totalPnL: 0,
      isLocked: false,
      createdAt: now,
      updatedAt: now
    };

    this.users.set(userId, newUser);
    this.positions.set(userId, []);
    this.orders.set(userId, []);
    
    return newUser;
  }

  // Get user account information (simplified for demo)
  async getForexUser(userId: string): Promise<any | null> {
    let user = this.users.get(userId);
    
    // Create demo user if doesn't exist
    if (!user) {
      user = await this.createForexUser({
        name: 'Demo Trader',
        startBalance: 10000,
        baseCurrency: 'USD',
        riskPerTrade: 0.02,
        dailyLossMax: 0.05,
        leverageMax: 50
      });
    }
    
    return user;
  }

  // Simplified place order method
  async placeOrder(orderData: any): Promise<any> {
    const user = await this.getForexUser(orderData.userId);
    if (!user) throw new Error('User not found');
    if (user.isLocked) throw new Error('Account is locked due to daily loss limit');

    // Get current quote
    const quote = LIVE_QUOTES[orderData.symbol];
    if (!quote) throw new Error(`No quote available for ${orderData.symbol}`);

    // Execute market order immediately
    const executionPrice = orderData.side === 'BUY' ? quote.ask : quote.bid;
    const lots = orderData.lots;
    const commission = lots * 0.5; // $0.50 per lot

    // Create position
    const positionId = `pos-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const position = {
      id: positionId,
      userId: orderData.userId,
      symbol: orderData.symbol,
      side: orderData.side === 'BUY' ? 'LONG' : 'SHORT',
      lots: lots,
      avgPrice: executionPrice,
      currentPrice: executionPrice,
      commission: commission,
      swap: 0,
      unrealizedPnL: 0,
      realizedPnL: 0,
      openedAt: new Date().toISOString(),
      stopLoss: orderData.stopLoss,
      takeProfit: orderData.takeProfit
    };

    // Add position to user's positions
    const userPositions = this.positions.get(orderData.userId) || [];
    userPositions.push(position);
    this.positions.set(orderData.userId, userPositions);

    // Update user balance (deduct commission)
    user.balance -= commission;
    user.equity = user.balance; // Simplified
    user.freeMargin = user.balance * 0.8; // Simplified margin calculation

    return {
      id: `order-${Date.now()}`,
      ...orderData,
      status: 'FILLED',
      filledAt: new Date().toISOString(),
      executionPrice: executionPrice
    };
  }

  // Get user positions
  async getUserPositions(userId: string): Promise<any[]> {
    const positions = this.positions.get(userId) || [];
    
    // Update unrealized P/L for each position
    return positions.map(position => {
      const quote = LIVE_QUOTES[position.symbol];
      if (quote) {
        const currentPrice = position.side === 'LONG' ? quote.bid : quote.ask;
        const priceDirection = position.side === 'LONG' ? 1 : -1;
        const priceDifference = (currentPrice - position.avgPrice) * priceDirection;
        const pipMultiplier = position.symbol === 'USDJPY' || position.symbol === 'XAUUSD' ? 100 : 10000;
        const pips = priceDifference * pipMultiplier;
        const pipValue = this.calculatePipValue(position.symbol, position.lots);
        const unrealizedPnL = pips * (pipValue / pipMultiplier);
        
        position.currentPrice = currentPrice;
        position.unrealizedPnL = unrealizedPnL;
      }
      return position;
    });
  }

  // Calculate pip value for a currency pair
  calculatePipValue(symbol: string, lots: number, accountCurrency: string = 'USD'): number {
    const config = CURRENCY_CONFIGS[symbol as keyof typeof CURRENCY_CONFIGS];
    if (!config) throw new Error(`Unknown currency pair: ${symbol}`);

    const contractSize = config.contractSize * lots;
    const pipMultiplier = Math.pow(10, -config.pipPosition);
    
    // For USD quote currencies, pip value is straightforward
    if (config.quoteCurrency === accountCurrency) {
      return contractSize * pipMultiplier;
    }
    
    // For non-USD quote currencies, need conversion (simplified for demo)
    const conversionRates: { [key: string]: number } = {
      'JPY': 0.0067, 'CHF': 1.12, 'CAD': 0.74, 'GBP': 1.26, 'EUR': 1.08
    };
    
    const baseValue = contractSize * pipMultiplier;
    const conversionRate = conversionRates[config.quoteCurrency] || 1;
    
    return baseValue * conversionRate;
  }

  // Get live quotes
  getLiveQuotes(): { [symbol: string]: { bid: number; ask: number; spread: number; timestamp: number } } {
    const quotes: { [symbol: string]: { bid: number; ask: number; spread: number; timestamp: number } } = {};
    
    for (const [symbol, quote] of Object.entries(LIVE_QUOTES)) {
      quotes[symbol] = {
        ...quote,
        spread: quote.ask - quote.bid
      };
    }
    
    return quotes;
  }

  // Update live quotes (for simulation)
  updateLiveQuotes(newQuotes: { [symbol: string]: { bid: number; ask: number } }): void {
    for (const [symbol, quote] of Object.entries(newQuotes)) {
      if (LIVE_QUOTES[symbol]) {
        LIVE_QUOTES[symbol] = {
          ...quote,
          timestamp: Date.now()
        };
      }
    }
  }

  // Close position
  async closePosition(positionId: string, lots?: number): Promise<void> {
    // Find the position across all users
    for (const [userId, positions] of this.positions.entries()) {
      const positionIndex = positions.findIndex(p => p.id === positionId);
      if (positionIndex !== -1) {
        const position = positions[positionIndex];
        const quote = LIVE_QUOTES[position.symbol];
        if (!quote) throw new Error(`No quote available for ${position.symbol}`);

        const closeLots = lots || position.lots;
        const closePrice = position.side === 'LONG' ? quote.bid : quote.ask;
        const commission = closeLots * 0.5;

        // Calculate realized P/L
        const priceDirection = position.side === 'LONG' ? 1 : -1;
        const priceDifference = (closePrice - position.avgPrice) * priceDirection;
        const pipMultiplier = position.symbol === 'USDJPY' || position.symbol === 'XAUUSD' ? 100 : 10000;
        const pips = priceDifference * pipMultiplier;
        const pipValue = this.calculatePipValue(position.symbol, closeLots);
        const realizedPnL = pips * (pipValue / pipMultiplier) - commission;

        // Update user balance
        const user = await this.getForexUser(userId);
        if (user) {
          user.balance += realizedPnL;
          user.totalPnL += realizedPnL;
          user.dailyPnL += realizedPnL;
          user.equity = user.balance;
          user.freeMargin = user.balance * 0.8;
        }

        // Remove or update position
        if (closeLots >= position.lots) {
          // Close entire position
          positions.splice(positionIndex, 1);
        } else {
          // Partial close
          position.lots -= closeLots;
          position.realizedPnL += realizedPnL;
        }

        return;
      }
    }
    throw new Error('Position not found');
  }
}

export const forexEngine = new ForexTradingEngine();