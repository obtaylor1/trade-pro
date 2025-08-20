import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SimpleLiveChartProps {
  symbol?: string;
  name?: string;
  isMicro?: boolean;
  market?: string;
}

interface CommodityOption {
  symbol: string;
  name: string;
  price: number;
  isMicro: boolean;
}

interface DataPoint {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

interface MovingAverages {
  ema9: number;
  ema21: number;
  sma200: number;
}

export default function SimpleLiveChart({ symbol: initialSymbol, name: initialName, isMicro: initialIsMicro = false, market = "commodities" }: SimpleLiveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [showVolume, setShowVolume] = useState(true);
  const [showMAs, setShowMAs] = useState(true);
  const [chartType, setChartType] = useState<'candlestick' | 'line'>('candlestick');
  // Available trading options based on market
  const getOptionsForMarket = (market: string): CommodityOption[] => {
    if (market === 'crypto') {
      return [
        { symbol: 'MBT', name: 'Micro Bitcoin (MBT)', price: 6847.50, isMicro: true },
        { symbol: 'MET', name: 'Micro Ethereum (MET)', price: 268.00, isMicro: true },
        { symbol: 'NSL', name: 'Nano Solana (NSL)', price: 2.15, isMicro: true },
        { symbol: 'NAV', name: 'Nano Avalanche (NAV)', price: 2.67, isMicro: true },
        { symbol: 'NPG', name: 'Nano Polygon (NPG)', price: 0.87, isMicro: true },
        { symbol: 'NDT', name: 'Nano Polkadot (NDT)', price: 0.64, isMicro: true }
      ];
    }
    // Default to commodities
    return [
      { symbol: 'MGC', name: 'Micro Gold (MGC)', price: 20.36, isMicro: true },
      { symbol: 'MCL', name: 'Micro Crude Oil (MCL)', price: 7.83, isMicro: true },
      { symbol: 'MSI', name: 'Micro Silver (MSI)', price: 2.35, isMicro: true },
      { symbol: 'NCP', name: 'Nano Copper (NCP)', price: 0.38, isMicro: true },
      { symbol: 'NNG', name: 'Nano Natural Gas (NNG)', price: 0.32, isMicro: true }
    ];
  };

  const tradingOptions = getOptionsForMarket(market);
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol || tradingOptions[0].symbol);
  const [timeFrame, setTimeFrame] = useState<'1m' | '5m' | '1h'>('1m');

  const currentAsset = tradingOptions.find((c: CommodityOption) => c.symbol === selectedSymbol) || tradingOptions[0];

  // Get base price for different symbols
  const getBasePrice = (symbol: string): number => {
    const prices: Record<string, number> = {
      'MGC': 20.36,  // Micro Gold
      'MCL': 7.83,   // Micro Crude Oil
      'MSI': 2.35,   // Micro Silver
      'NCP': 0.38,   // Nano Copper
      'NNG': 0.32,   // Nano Natural Gas
      'MBT': 6847.50, // Micro Bitcoin
      'MET': 268.00,  // Micro Ethereum
      'NSL': 2.15,    // Nano Solana
      'NAV': 2.67,    // Nano Avalanche
      'NPG': 0.87,    // Nano Polygon
      'NDT': 0.64     // Nano Polkadot
    };
    return prices[symbol] || 20.00;
  };

  // Generate initial historical data based on timeframe
  const generateInitialData = (basePrice: number, timeFrame: string): DataPoint[] => {
    const data: DataPoint[] = [];
    let price = basePrice;
    const now = Date.now();
    
    // Adjust interval and volatility based on timeframe
    const intervals = { '1m': 60000, '5m': 300000, '1h': 3600000 };
    const interval = intervals[timeFrame as keyof typeof intervals] || 60000;
    const dataPoints = timeFrame === '1h' ? 24 : 50; // 24 hours for 1h, 50 points for others
    const volatility = market === 'crypto' ? 0.025 : 0.015; // Higher volatility for crypto

    for (let i = dataPoints; i >= 0; i--) {
      const open = price;
      const change = (Math.random() - 0.5) * volatility;
      const close = price * (1 + change);
      
      // Generate realistic OHLC data
      const high = Math.max(open, close) * (1 + Math.random() * volatility * 0.5);
      const low = Math.min(open, close) * (1 - Math.random() * volatility * 0.5);
      const volume = Math.floor(Math.random() * 10000) + 1000; // Random volume between 1000-11000
      
      data.push({
        time: new Date(now - i * interval).toISOString(),
        open: parseFloat(open.toFixed(market === 'crypto' ? 4 : 2)),
        high: parseFloat(high.toFixed(market === 'crypto' ? 4 : 2)),
        low: parseFloat(low.toFixed(market === 'crypto' ? 4 : 2)),
        close: parseFloat(close.toFixed(market === 'crypto' ? 4 : 2)),
        volume
      });
      
      price = close;
    }

    return data;
  };

  // Calculate moving averages
  const calculateMovingAverages = (data: DataPoint[]): MovingAverages[] => {
    const result: MovingAverages[] = [];
    
    for (let i = 0; i < data.length; i++) {
      const ema9 = calculateEMA(data, i, 9);
      const ema21 = calculateEMA(data, i, 21);
      const sma200 = calculateSMA(data, i, 200);
      
      result.push({ ema9, ema21, sma200 });
    }
    
    return result;
  };

  const calculateEMA = (data: DataPoint[], index: number, period: number): number => {
    if (index < period - 1) return data[index].close;
    
    const multiplier = 2 / (period + 1);
    let ema = data[0].close;
    
    for (let i = 1; i <= index; i++) {
      ema = (data[i].close * multiplier) + (ema * (1 - multiplier));
    }
    
    return ema;
  };

  const calculateSMA = (data: DataPoint[], index: number, period: number): number => {
    const start = Math.max(0, index - period + 1);
    const slice = data.slice(start, index + 1);
    const sum = slice.reduce((acc, point) => acc + point.close, 0);
    return sum / slice.length;
  };

  // Draw the chart on canvas
  const drawChart = (canvas: HTMLCanvasElement, data: DataPoint[]) => {
    const ctx = canvas.getContext('2d');
    if (!ctx || data.length === 0) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * devicePixelRatio;
    canvas.height = rect.height * devicePixelRatio;
    ctx.scale(devicePixelRatio, devicePixelRatio);

    const width = rect.width;
    const chartHeight = showVolume ? rect.height * 0.75 : rect.height;
    const volumeHeight = showVolume ? rect.height * 0.25 : 0;

    // Clear canvas
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, rect.height);

    // Calculate price range
    const highs = data.map(d => d.high);
    const lows = data.map(d => d.low);
    const minPrice = Math.min(...lows);
    const maxPrice = Math.max(...highs);
    const priceRange = maxPrice - minPrice || 1;

    // Draw grid lines for price chart
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = (chartHeight / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical grid lines
    const gridCount = Math.min(10, data.length);
    for (let i = 0; i <= gridCount; i++) {
      const x = (width / gridCount) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, chartHeight);
      ctx.stroke();
    }

    // Calculate moving averages if enabled
    const movingAverages = showMAs ? calculateMovingAverages(data) : [];

    // Draw candlesticks or line chart
    if (chartType === 'candlestick') {
      data.forEach((point, index) => {
        const x = (index / (data.length - 1)) * width;
        const candleWidth = Math.max(2, width / data.length * 0.8);
        
        const openY = chartHeight - ((point.open - minPrice) / priceRange) * chartHeight;
        const closeY = chartHeight - ((point.close - minPrice) / priceRange) * chartHeight;
        const highY = chartHeight - ((point.high - minPrice) / priceRange) * chartHeight;
        const lowY = chartHeight - ((point.low - minPrice) / priceRange) * chartHeight;

        const isGreen = point.close >= point.open;
        
        // Draw wick (high-low line)
        ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Draw body (open-close rectangle)
        ctx.fillStyle = isGreen ? '#10b981' : '#ef4444';
        ctx.strokeStyle = isGreen ? '#10b981' : '#ef4444';
        ctx.lineWidth = 1;
        
        const bodyHeight = Math.abs(closeY - openY);
        const bodyY = Math.min(openY, closeY);
        
        if (isGreen) {
          ctx.fillRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight || 1);
        } else {
          ctx.strokeRect(x - candleWidth / 2, bodyY, candleWidth, bodyHeight || 1);
        }
      });
    } else {
      // Draw line chart
      ctx.strokeStyle = '#10b981';
      ctx.lineWidth = 2;
      ctx.beginPath();

      data.forEach((point, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = chartHeight - ((point.close - minPrice) / priceRange) * chartHeight;

        if (index === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      });

      ctx.stroke();
    }

    // Draw moving averages
    if (showMAs && movingAverages.length > 0) {
      // Draw 9 EMA (fast)
      ctx.strokeStyle = '#fbbf24'; // yellow
      ctx.lineWidth = 1;
      ctx.beginPath();
      movingAverages.forEach((ma, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = chartHeight - ((ma.ema9 - minPrice) / priceRange) * chartHeight;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw 21 EMA (medium)
      ctx.strokeStyle = '#8b5cf6'; // purple
      ctx.lineWidth = 1;
      ctx.beginPath();
      movingAverages.forEach((ma, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = chartHeight - ((ma.ema21 - minPrice) / priceRange) * chartHeight;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();

      // Draw 200 SMA (trend filter)
      ctx.strokeStyle = '#f97316'; // orange
      ctx.lineWidth = 2;
      ctx.beginPath();
      movingAverages.forEach((ma, index) => {
        const x = (index / (data.length - 1)) * width;
        const y = chartHeight - ((ma.sma200 - minPrice) / priceRange) * chartHeight;
        if (index === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.stroke();
    }

    // Draw volume bars if enabled
    if (showVolume) {
      const maxVolume = Math.max(...data.map(d => d.volume));
      const volumeY = chartHeight + 10;
      
      data.forEach((point, index) => {
        const x = (index / (data.length - 1)) * width;
        const barWidth = Math.max(1, width / data.length * 0.8);
        const barHeight = (point.volume / maxVolume) * (volumeHeight - 20);
        
        ctx.fillStyle = point.close >= point.open ? '#10b98150' : '#ef444450';
        ctx.fillRect(x - barWidth / 2, volumeY, barWidth, barHeight);
      });
    }

    // Draw price labels
    ctx.fillStyle = '#d1d5db';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange / 5) * (5 - i);
      const y = (chartHeight / 5) * i + 4;
      ctx.fillText(formatPrice(price), width - 5, y);
    }
  };

  const formatPrice = (price: number): string => {
    if (price < 1) return price.toFixed(4);
    if (price < 100) return price.toFixed(2);
    return price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const formatChange = (change: number): string => {
    const percentage = currentPrice ? (change / currentPrice) * 100 : 0;
    const sign = change >= 0 ? '+' : '';
    return `${sign}${formatPrice(Math.abs(change))} (${sign}${percentage.toFixed(2)}%)`;
  };

  useEffect(() => {
    const basePrice = getBasePrice(selectedSymbol);
    const initialData = generateInitialData(basePrice, timeFrame);
    setDataPoints(initialData);
    setCurrentPrice(initialData[initialData.length - 1].close);

    // Setup WebSocket connection
    const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    
    try {
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('WebSocket connected for chart:', selectedSymbol);
        setIsConnected(true);
        ws.send(JSON.stringify({ 
          action: 'subscribe', 
          symbol: selectedSymbol,
          type: 'price'
        }));
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          if (data.symbol === selectedSymbol && data.type === 'price_update') {
            const newPrice = data.price;
            const change = newPrice - (currentPrice || basePrice);
            
            setCurrentPrice(newPrice);
            setPriceChange(change);

            // Add new data point
            setDataPoints(prev => {
              const lastPoint = prev[prev.length - 1];
              const newPoint: DataPoint = {
                time: new Date().toISOString(),
                open: lastPoint?.close || newPrice,
                high: Math.max(lastPoint?.close || newPrice, newPrice),
                low: Math.min(lastPoint?.close || newPrice, newPrice),
                close: newPrice,
                volume: Math.floor(Math.random() * 5000) + 1000
              };
              const updated = [...prev.slice(1), newPoint]; // Keep last 51 points
              return updated;
            });
          }
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
      };

      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    } catch (error) {
      console.error('Failed to create WebSocket connection:', error);
    }

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [selectedSymbol]);

  // Simulate price updates if WebSocket is not connected
  useEffect(() => {
    if (isConnected || dataPoints.length === 0) return;

    const interval = setInterval(() => {
      const lastPrice = dataPoints[dataPoints.length - 1]?.close || getBasePrice(selectedSymbol);
      const change = (Math.random() - 0.5) * 0.01; // ±0.5% change
      const newPrice = lastPrice * (1 + change);
      const priceChange = newPrice - lastPrice;
      
      setCurrentPrice(newPrice);
      setPriceChange(priceChange);

      setDataPoints(prev => {
        const lastPoint = prev[prev.length - 1];
        const newPoint: DataPoint = {
          time: new Date().toISOString(),
          open: lastPrice,
          high: Math.max(lastPrice, newPrice),
          low: Math.min(lastPrice, newPrice),
          close: newPrice,
          volume: Math.floor(Math.random() * 5000) + 1000
        };
        return [...prev.slice(1), newPoint]; // Keep last 51 points
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isConnected, dataPoints, selectedSymbol]);

  // Update data when timeFrame changes
  useEffect(() => {
    const basePrice = getBasePrice(selectedSymbol);
    const newData = generateInitialData(basePrice, timeFrame);
    setDataPoints(newData);
    setCurrentPrice(newData[newData.length - 1].close);
  }, [timeFrame, selectedSymbol]);

  // Redraw chart when data changes
  useEffect(() => {
    if (canvasRef.current && dataPoints.length > 0) {
      drawChart(canvasRef.current, dataPoints);
    }
  }, [dataPoints]);

  return (
    <Card className="w-full bg-gray-900 border-gray-700">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <CardTitle className="text-xl text-white">Live Market Chart</CardTitle>
            <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-xs text-gray-400">
              {isConnected ? 'Live' : 'Simulated'}
            </span>
          </div>
        </div>

        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <select 
              value={selectedSymbol} 
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="w-[280px] bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {tradingOptions.map((option: CommodityOption) => (
                <option key={option.symbol} value={option.symbol}>
                  {option.name} {option.symbol.startsWith('N') ? '(NANO)' : '(MICRO)'}
                </option>
              ))}
            </select>
            
            <select 
              value={chartType} 
              onChange={(e) => setChartType(e.target.value as 'candlestick' | 'line')}
              className="bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="candlestick">Candlesticks</option>
              <option value="line">Line Chart</option>
            </select>
          </div>
          
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={showMAs}
                onChange={(e) => setShowMAs(e.target.checked)}
                className="rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500"
              />
              Moving Averages
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-300">
              <input
                type="checkbox"
                checked={showVolume}
                onChange={(e) => setShowVolume(e.target.checked)}
                className="rounded bg-gray-800 border-gray-600 text-blue-500 focus:ring-blue-500"
              />
              Volume
            </label>
          </div>
        </div>

        {/* Moving Averages Legend */}
        {showMAs && (
          <div className="flex items-center gap-4 mb-4 p-3 bg-gray-800 rounded-lg">
            <div className="text-sm text-gray-300">Indicators:</div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-yellow-400"></div>
              <span className="text-xs text-gray-300">9 EMA</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-0.5 bg-purple-400"></div>
              <span className="text-xs text-gray-300">21 EMA</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-3 h-1 bg-orange-500"></div>
              <span className="text-xs text-gray-300">200 SMA (Trend Filter)</span>
            </div>
          </div>
        )}

        {/* Time Frame Selector for Crypto */}
        {market === 'crypto' && (
          <div className="flex items-center gap-2 mb-4">
            <span className="text-sm text-gray-400">Timeframe:</span>
            <select 
              value={timeFrame} 
              onChange={(e) => setTimeFrame(e.target.value as '1m' | '5m' | '1h')}
              className="bg-gray-800 border border-gray-600 text-white rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="1m">1 Minute</option>
              <option value="5m">5 Minutes</option>
              <option value="1h">1 Hour</option>
            </select>
          </div>
        )}
        
        {currentPrice && (
          <div className="flex items-center gap-4">
            <span className="text-2xl font-bold text-white">
              ${formatPrice(currentPrice)}
            </span>
            <span className={`text-sm font-medium ${priceChange >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatChange(priceChange)}
            </span>
          </div>
        )}
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="relative w-full h-[400px] bg-gray-800">
          <canvas 
            ref={canvasRef}
            className="w-full h-full"
            style={{ width: '100%', height: '100%' }}
          />
        </div>
        
        <div className="p-4 border-t border-gray-700">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Symbol:</span>
              <span className="ml-2 text-white font-medium">{selectedSymbol}</span>
            </div>
            <div>
              <span className="text-gray-400">High:</span>
              <span className="ml-2 text-white">
                ${currentPrice ? formatPrice(currentPrice * 1.003) : '--'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Low:</span>
              <span className="ml-2 text-white">
                ${currentPrice ? formatPrice(currentPrice * 0.995) : '--'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Volume:</span>
              <span className="ml-2 text-white">
                {Math.floor(Math.random() * 10000 + 5000).toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}