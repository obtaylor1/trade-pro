import { Request, Response } from 'express';

interface ChartDataPoint {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface OptionPricePoint {
  time: number;
  premium: number;
  impliedVolatility: number;
  delta: number;
  theta: number;
  gamma: number;
  vega: number;
}

export class ChartDataService {
  private stockCache = new Map<string, ChartDataPoint[]>();
  private optionCache = new Map<string, OptionPricePoint[]>();
  private lastUpdate = new Map<string, number>();

  // Generate realistic stock chart data
  generateStockChartData(symbol: string, timeframe: '30m' | '4h' | '1d'): ChartDataPoint[] {
    const cacheKey = `${symbol}-${timeframe}`;
    const now = Date.now();
    const lastUpdateTime = this.lastUpdate.get(cacheKey) || 0;

    // Return cached data if updated within last 30 seconds
    if (this.stockCache.has(cacheKey) && (now - lastUpdateTime) < 30000) {
      return this.stockCache.get(cacheKey)!;
    }

    const data: ChartDataPoint[] = [];
    const basePrices: Record<string, number> = {
      'AAPL': 195.25,
      'TSLA': 248.50,
      'MSFT': 420.80,
      'NVDA': 875.30,
      'SPY': 445.60
    };

    const basePrice = basePrices[symbol] || 100;
    let currentPrice = basePrice;

    // Generate different number of points based on timeframe
    const pointCounts = { '30m': 48, '4h': 24, '1d': 30 };
    const intervals = { '30m': 30 * 60 * 1000, '4h': 4 * 60 * 60 * 1000, '1d': 24 * 60 * 60 * 1000 };
    
    const pointCount = pointCounts[timeframe];
    const interval = intervals[timeframe];
    const startTime = now - (pointCount * interval);

    for (let i = 0; i < pointCount; i++) {
      const time = startTime + (i * interval);
      
      // Generate realistic price movement
      const volatility = symbol === 'NVDA' ? 0.03 : symbol === 'TSLA' ? 0.025 : 0.015;
      const change = (Math.random() - 0.5) * 2 * volatility;
      const newPrice = currentPrice * (1 + change);
      
      // Create OHLC data
      const open = currentPrice;
      const close = newPrice;
      const high = Math.max(open, close) * (1 + Math.random() * 0.01);
      const low = Math.min(open, close) * (1 - Math.random() * 0.01);
      const volume = Math.floor(Math.random() * 1000000) + 500000;

      data.push({
        time: Math.floor(time / 1000), // Convert to seconds for lightweight-charts
        open: Number(open.toFixed(2)),
        high: Number(high.toFixed(2)),
        low: Number(low.toFixed(2)),
        close: Number(close.toFixed(2)),
        volume
      });

      currentPrice = newPrice;
    }

    this.stockCache.set(cacheKey, data);
    this.lastUpdate.set(cacheKey, now);
    return data;
  }

  // Generate realistic option premium data
  generateOptionChartData(optionId: string, timeframe: '30m' | '4h' | '1d'): OptionPricePoint[] {
    const cacheKey = `${optionId}-${timeframe}`;
    const now = Date.now();
    const lastUpdateTime = this.lastUpdate.get(cacheKey) || 0;

    // Return cached data if updated within last 30 seconds
    if (this.optionCache.has(cacheKey) && (now - lastUpdateTime) < 30000) {
      return this.optionCache.get(cacheKey)!;
    }

    const data: OptionPricePoint[] = [];
    
    // Extract option details from ID (format: call-aapl-205 or put-tsla-236)
    const parts = optionId.split('-');
    const optionType = parts[0].toUpperCase();
    const symbol = parts[1].toUpperCase();
    
    // Base premiums for different options
    const basePremiums: Record<string, number> = {
      'call-aapl': 0.25,
      'put-aapl': 0.25,
      'call-tsla': 0.25,
      'put-tsla': 0.25,
      'call-msft': 0.25,
      'put-msft': 0.25,
      'call-nvda': 0.40,
      'call-spy': 0.25
    };

    const basePremium = basePremiums[`${optionType.toLowerCase()}-${symbol.toLowerCase()}`] || 0.30;
    let currentPremium = basePremium;

    // Base Greeks values
    let currentDelta = optionType === 'CALL' ? 0.45 : -0.35;
    let currentTheta = -0.02;
    let currentGamma = 0.015;
    let currentVega = 0.08;
    let currentIV = 0.25;

    const pointCounts = { '30m': 48, '4h': 24, '1d': 30 };
    const intervals = { '30m': 30 * 60 * 1000, '4h': 4 * 60 * 60 * 1000, '1d': 24 * 60 * 60 * 1000 };
    
    const pointCount = pointCounts[timeframe];
    const interval = intervals[timeframe];
    const startTime = now - (pointCount * interval);

    for (let i = 0; i < pointCount; i++) {
      const time = startTime + (i * interval);
      
      // Generate realistic premium movement (higher volatility than stock)
      const premiumChange = (Math.random() - 0.5) * 0.1; // ±5% movement
      currentPremium = Math.max(0.01, currentPremium * (1 + premiumChange));
      
      // Simulate Greeks changes
      currentDelta += (Math.random() - 0.5) * 0.02;
      currentTheta += (Math.random() - 0.5) * 0.001;
      currentGamma += (Math.random() - 0.5) * 0.001;
      currentVega += (Math.random() - 0.5) * 0.005;
      currentIV += (Math.random() - 0.5) * 0.01;

      // Keep Greeks within realistic bounds
      currentDelta = Math.max(-1, Math.min(1, currentDelta));
      currentTheta = Math.max(-0.05, Math.min(0, currentTheta));
      currentGamma = Math.max(0, Math.min(0.05, currentGamma));
      currentVega = Math.max(0, Math.min(0.2, currentVega));
      currentIV = Math.max(0.1, Math.min(0.6, currentIV));

      data.push({
        time: Math.floor(time / 1000),
        premium: Number(currentPremium.toFixed(3)),
        impliedVolatility: Number(currentIV.toFixed(3)),
        delta: Number(currentDelta.toFixed(3)),
        theta: Number(currentTheta.toFixed(4)),
        gamma: Number(currentGamma.toFixed(4)),
        vega: Number(currentVega.toFixed(3))
      });
    }

    this.optionCache.set(cacheKey, data);
    this.lastUpdate.set(cacheKey, now);
    return data;
  }

  // API endpoints
  getStockChart = (req: Request, res: Response) => {
    try {
      const { symbol, timeframe } = req.params;
      
      if (!['30m', '4h', '1d'].includes(timeframe)) {
        return res.status(400).json({ error: 'Invalid timeframe. Use 30m, 4h, or 1d' });
      }

      const data = this.generateStockChartData(symbol.toUpperCase(), timeframe as '30m' | '4h' | '1d');
      res.json(data);
    } catch (error) {
      console.error('Error generating stock chart data:', error);
      res.status(500).json({ error: 'Failed to generate chart data' });
    }
  };

  getOptionChart = (req: Request, res: Response) => {
    try {
      const { optionId, timeframe } = req.params;
      
      if (!['30m', '4h', '1d'].includes(timeframe)) {
        return res.status(400).json({ error: 'Invalid timeframe. Use 30m, 4h, or 1d' });
      }

      const data = this.generateOptionChartData(optionId, timeframe as '30m' | '4h' | '1d');
      res.json(data);
    } catch (error) {
      console.error('Error generating option chart data:', error);
      res.status(500).json({ error: 'Failed to generate chart data' });
    }
  };

  // Real-time data simulation (WebSocket support)
  getLatestStockPrice(symbol: string): ChartDataPoint | null {
    const data = this.generateStockChartData(symbol, '30m');
    return data.length > 0 ? data[data.length - 1] : null;
  }

  getLatestOptionPrice(optionId: string): OptionPricePoint | null {
    const data = this.generateOptionChartData(optionId, '30m');
    return data.length > 0 ? data[data.length - 1] : null;
  }
}

export const chartDataService = new ChartDataService();