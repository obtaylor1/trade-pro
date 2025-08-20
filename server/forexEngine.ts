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

}

    // Validate minimum lot size (0.01 for micro lots)
    if (orderData.lots < 0.01) throw new Error('Minimum lot size is 0.01');

    // Get current quote
    const quote = LIVE_QUOTES[orderData.symbol];
    if (!quote) throw new Error(`No quote available for ${orderData.symbol}`);

    // Calculate required margin
    const entryPrice = orderData.type === 'MARKET' 
      ? (orderData.side === 'BUY' ? quote.ask : quote.bid)
      : orderData.price || quote.ask;
      
    const requiredMargin = this.calculateMargin(orderData.symbol, orderData.lots, entryPrice, user.leverageMax);

    // Check margin requirements
    if (requiredMargin > user.freeMargin) {
      throw new Error(`Insufficient margin. Required: $${requiredMargin.toFixed(2)}, Available: $${user.freeMargin.toFixed(2)}`);
    }

    // Risk management check
    const pipValue = this.calculatePipValue(orderData.symbol, orderData.lots, user.baseCurrency);
    const stopLossDistance = orderData.stopLoss ? Math.abs(entryPrice - orderData.stopLoss) * Math.pow(10, CURRENCY_CONFIGS[orderData.symbol as keyof typeof CURRENCY_CONFIGS].pipPosition) : 0;
    const potentialLoss = stopLossDistance * pipValue;
    const maxRiskAllowed = user.balance * user.riskPerTrade;

    if (potentialLoss > maxRiskAllowed) {
      throw new Error(`Trade exceeds maximum risk per trade. Risk: $${potentialLoss.toFixed(2)}, Max allowed: $${maxRiskAllowed.toFixed(2)}`);
    }

    // Create order
    const orderId = nanoid();
    const now = new Date().toISOString();

    const newOrder = {
      id: orderId,
      userId: orderData.userId,
      symbol: orderData.symbol,
      side: orderData.side,
      type: orderData.type,
      lots: orderData.lots.toString(),
      price: orderData.price?.toString(),
      stopLoss: orderData.stopLoss?.toString(),
      takeProfit: orderData.takeProfit?.toString(),
      trailingPips: orderData.trailingPips,
      status: 'NEW',
      createdAt: now,
      updatedAt: now
    };

    await db.insert(forexOrders).values([newOrder]);

    // Execute market orders immediately
    if (orderData.type === 'MARKET') {
      await this.executeOrder(orderId);
    }

    return {
      ...newOrder,
      lots: orderData.lots,
      price: orderData.price,
      stopLoss: orderData.stopLoss,
      takeProfit: orderData.takeProfit,
      status: orderData.type === 'MARKET' ? 'FILLED' : 'NEW',
      createdAt: now,
      updatedAt: now
    } as ForexOrder;
  }

  // Execute an order (fill it)
  async executeOrder(orderId: string): Promise<void> {
    const [order] = await db.select().from(forexOrders).where(eq(forexOrders.id, orderId));
    if (!order) throw new Error('Order not found');

    const quote = LIVE_QUOTES[order.symbol];
    if (!quote) throw new Error(`No quote available for ${order.symbol}`);

    // Determine execution price with realistic slippage
    const slippage = (Math.random() - 0.5) * 0.0001; // ±0.5 pip slippage
    const executionPrice = order.side === 'BUY' ? quote.ask + slippage : quote.bid - slippage;

    // Calculate costs
    const lots = parseFloat(order.lots);
    const spread = quote.ask - quote.bid;
    const spreadCost = spread * this.calculatePipValue(order.symbol, lots) / Math.pow(10, CURRENCY_CONFIGS[order.symbol as keyof typeof CURRENCY_CONFIGS].pipPosition);
    const commission = lots * 0.5; // $0.50 per lot commission

    // Create fill record
    const fillId = nanoid();
    await db.insert(forexFills).values({
      id: fillId,
      orderId: orderId,
      userId: order.userId,
      symbol: order.symbol,
      side: order.side,
      lots: order.lots,
      price: executionPrice.toString(),
      commission: commission.toString(),
      spreadCost: spreadCost.toString(),
      slippage: slippage.toString()
    });

    // Update order status
    await db.update(forexOrders)
      .set({ 
        status: 'FILLED', 
        filledAt: new Date(),
        updatedAt: new Date()
      })
      .where(eq(forexOrders.id, orderId));

    // Create or update position
    await this.updatePosition(order.userId, order.symbol, order.side, lots, executionPrice, commission);

    // Update account balance
    await this.updateAccountBalance(order.userId);
  }

  // Update position after fill
  private async updatePosition(userId: string, symbol: string, side: string, lots: number, price: number, commission: number): Promise<void> {
    const positionSide = side === 'BUY' ? 'LONG' : 'SHORT';
    
    // Check if position already exists
    const [existingPosition] = await db.select()
      .from(forexPositions)
      .where(and(
        eq(forexPositions.userId, userId),
        eq(forexPositions.symbol, symbol),
        eq(forexPositions.side, positionSide)
      ));

    if (existingPosition) {
      // Update existing position (average price calculation)
      const currentLots = parseFloat(existingPosition.lots);
      const currentPrice = parseFloat(existingPosition.avgPrice);
      const currentCommission = parseFloat(existingPosition.commission);

      const newLots = currentLots + lots;
      const newAvgPrice = ((currentLots * currentPrice) + (lots * price)) / newLots;
      const newCommission = currentCommission + commission;

      await db.update(forexPositions)
        .set({
          lots: newLots.toString(),
          avgPrice: newAvgPrice.toString(),
          commission: newCommission.toString(),
          updatedAt: new Date()
        })
        .where(eq(forexPositions.id, existingPosition.id));
    } else {
      // Create new position
      const positionId = nanoid();
      await db.insert(forexPositions).values({
        id: positionId,
        userId: userId,
        symbol: symbol,
        side: positionSide,
        lots: lots.toString(),
        avgPrice: price.toString(),
        currentPrice: price.toString(),
        commission: commission.toString(),
        swap: '0',
        unrealizedPnL: '0',
        realizedPnL: '0'
      });
    }
  }

  // Update account balance and margin calculations
  private async updateAccountBalance(userId: string): Promise<void> {
    const user = await this.getForexUser(userId);
    if (!user) return;

    // Get all open positions
    const positions = await db.select()
      .from(forexPositions)
      .where(eq(forexPositions.userId, userId));

    let totalMargin = 0;
    let totalUnrealizedPnL = 0;

    // Calculate unrealized P/L for all positions
    for (const position of positions) {
      const quote = LIVE_QUOTES[position.symbol];
      if (quote) {
        const currentPrice = position.side === 'LONG' ? quote.bid : quote.ask;
        const lots = parseFloat(position.lots);
        const avgPrice = parseFloat(position.avgPrice);
        
        // Update current price in position
        await db.update(forexPositions)
          .set({ currentPrice: currentPrice.toString() })
          .where(eq(forexPositions.id, position.id));

        // Calculate unrealized P/L
        const priceDirection = position.side === 'LONG' ? 1 : -1;
        const priceDifference = (currentPrice - avgPrice) * priceDirection;
        const pipValue = this.calculatePipValue(position.symbol, lots, user.baseCurrency);
        const pips = priceDifference * Math.pow(10, CURRENCY_CONFIGS[position.symbol as keyof typeof CURRENCY_CONFIGS].pipPosition);
        const unrealizedPnL = pips * pipValue / Math.pow(10, CURRENCY_CONFIGS[position.symbol as keyof typeof CURRENCY_CONFIGS].pipPosition);

        // Update unrealized P/L in position
        await db.update(forexPositions)
          .set({ unrealizedPnL: unrealizedPnL.toString() })
          .where(eq(forexPositions.id, position.id));

        totalUnrealizedPnL += unrealizedPnL;
        
        // Calculate margin used
        totalMargin += this.calculateMargin(position.symbol, lots, currentPrice, user.leverageMax);
      }
    }

    // Update user account
    const newEquity = user.balance + totalUnrealizedPnL;
    const freeMargin = newEquity - totalMargin;
    const marginLevel = totalMargin > 0 ? (newEquity / totalMargin) * 100 : 0;

    await db.update(forexUsers)
      .set({
        equity: newEquity.toString(),
        margin: totalMargin.toString(),
        freeMargin: freeMargin.toString(),
        marginLevel: marginLevel.toString(),
        updatedAt: new Date()
      })
      .where(eq(forexUsers.id, userId));
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

  // Get user positions
  async getUserPositions(userId: string): Promise<ForexPosition[]> {
    const positions = await db.select()
      .from(forexPositions)
      .where(eq(forexPositions.userId, userId));

    return positions.map(position => ({
      id: position.id,
      userId: position.userId,
      symbol: position.symbol,
      side: position.side as 'LONG' | 'SHORT',
      lots: parseFloat(position.lots),
      avgPrice: parseFloat(position.avgPrice),
      currentPrice: parseFloat(position.currentPrice),
      commission: parseFloat(position.commission),
      swap: parseFloat(position.swap),
      unrealizedPnL: parseFloat(position.unrealizedPnL),
      realizedPnL: parseFloat(position.realizedPnL),
      openedAt: position.openedAt!.toISOString(),
      closedAt: position.closedAt?.toISOString(),
      stopLoss: position.stopLoss ? parseFloat(position.stopLoss) : undefined,
      takeProfit: position.takeProfit ? parseFloat(position.takeProfit) : undefined
    }));
  }

  // Close position
  async closePosition(positionId: string, lots?: number): Promise<void> {
    const [position] = await db.select()
      .from(forexPositions)
      .where(eq(forexPositions.id, positionId));

    if (!position) throw new Error('Position not found');

    const quote = LIVE_QUOTES[position.symbol];
    if (!quote) throw new Error(`No quote available for ${position.symbol}`);

    const closeLots = lots || parseFloat(position.lots);
    const closePrice = position.side === 'LONG' ? quote.bid : quote.ask;
    const commission = closeLots * 0.5; // Commission for closing

    // Calculate realized P/L
    const priceDirection = position.side === 'LONG' ? 1 : -1;
    const priceDifference = (closePrice - parseFloat(position.avgPrice)) * priceDirection;
    const pipValue = this.calculatePipValue(position.symbol, closeLots);
    const pips = priceDifference * Math.pow(10, CURRENCY_CONFIGS[position.symbol as keyof typeof CURRENCY_CONFIGS].pipPosition);
    const realizedPnL = pips * pipValue / Math.pow(10, CURRENCY_CONFIGS[position.symbol as keyof typeof CURRENCY_CONFIGS].pipPosition) - commission;

    if (closeLots >= parseFloat(position.lots)) {
      // Close entire position
      await db.update(forexPositions)
        .set({
          realizedPnL: realizedPnL.toString(),
          closedAt: new Date()
        })
        .where(eq(forexPositions.id, positionId));
    } else {
      // Partial close - update remaining lots
      const remainingLots = parseFloat(position.lots) - closeLots;
      await db.update(forexPositions)
        .set({
          lots: remainingLots.toString(),
          realizedPnL: (parseFloat(position.realizedPnL) + realizedPnL).toString()
        })
        .where(eq(forexPositions.id, positionId));
    }

    // Update user balance
    const user = await this.getForexUser(position.userId);
    if (user) {
      await db.update(forexUsers)
        .set({
          balance: (user.balance + realizedPnL).toString(),
          totalPnL: (user.totalPnL + realizedPnL).toString(),
          dailyPnL: (user.dailyPnL + realizedPnL).toString(),
          updatedAt: new Date()
        })
        .where(eq(forexUsers.id, position.userId));
    }

    // Update account balance and margin
    await this.updateAccountBalance(position.userId);
  }
}

export const forexEngine = new ForexTradingEngine();