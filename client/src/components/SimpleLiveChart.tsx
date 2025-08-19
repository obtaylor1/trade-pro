import { useEffect, useRef, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface SimpleLiveChartProps {
  symbol?: string;
  name?: string;
  isMicro?: boolean;
}

interface CommodityOption {
  symbol: string;
  name: string;
  price: number;
  isMicro: boolean;
}

interface DataPoint {
  time: string;
  price: number;
}

export default function SimpleLiveChart({ symbol: initialSymbol = "MGC", name: initialName, isMicro: initialIsMicro = false }: SimpleLiveChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [currentPrice, setCurrentPrice] = useState<number | null>(null);
  const [priceChange, setPriceChange] = useState<number>(0);
  const [dataPoints, setDataPoints] = useState<DataPoint[]>([]);
  const [selectedSymbol, setSelectedSymbol] = useState(initialSymbol);

  // Available commodity options
  const commodityOptions: CommodityOption[] = [
    { symbol: 'MGC', name: 'Micro Gold (MGC)', price: 20.36, isMicro: true },
    { symbol: 'MCL', name: 'Micro Crude Oil (MCL)', price: 7.83, isMicro: true },
    { symbol: 'MSI', name: 'Micro Silver (MSI)', price: 2.35, isMicro: true },
    { symbol: 'NCP', name: 'Nano Copper (NCP)', price: 0.38, isMicro: true },
    { symbol: 'NNG', name: 'Nano Natural Gas (NNG)', price: 0.32, isMicro: true }
  ];

  const currentCommodity = commodityOptions.find(c => c.symbol === selectedSymbol) || commodityOptions[0];

  // Get base price for different symbols
  const getBasePrice = (symbol: string): number => {
    const prices: Record<string, number> = {
      'MGC': 20.36,  // Micro Gold
      'MCL': 7.83,   // Micro Crude Oil
      'MSI': 2.35,   // Micro Silver
      'NCP': 0.38,   // Nano Copper
      'NNG': 0.32,   // Nano Natural Gas
      'MBT': 6847.50, // Micro Bitcoin
      'MET': 268.00   // Micro Ethereum
    };
    return prices[symbol] || 20.00;
  };

  // Generate initial historical data
  const generateInitialData = (basePrice: number): DataPoint[] => {
    const data: DataPoint[] = [];
    let price = basePrice;
    const now = Date.now();

    for (let i = 50; i >= 0; i--) {
      const change = (Math.random() - 0.5) * 0.02; // ±1% change
      price = price * (1 + change);
      
      data.push({
        time: new Date(now - i * 60000).toISOString(), // 1 minute intervals
        price: parseFloat(price.toFixed(4))
      });
    }

    return data;
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
    const height = rect.height;

    // Clear canvas
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    // Calculate price range
    const prices = data.map(d => d.price);
    const minPrice = Math.min(...prices);
    const maxPrice = Math.max(...prices);
    const priceRange = maxPrice - minPrice || 1;

    // Draw grid lines
    ctx.strokeStyle = '#374151';
    ctx.lineWidth = 1;
    
    // Horizontal grid lines
    for (let i = 0; i <= 5; i++) {
      const y = (height / 5) * i;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }

    // Vertical grid lines
    for (let i = 0; i <= 10; i++) {
      const x = (width / 10) * i;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    // Draw price line
    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 2;
    ctx.beginPath();

    data.forEach((point, index) => {
      const x = (index / (data.length - 1)) * width;
      const y = height - ((point.price - minPrice) / priceRange) * height;

      if (index === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });

    ctx.stroke();

    // Draw price labels
    ctx.fillStyle = '#d1d5db';
    ctx.font = '12px Arial';
    ctx.textAlign = 'right';

    for (let i = 0; i <= 5; i++) {
      const price = minPrice + (priceRange / 5) * (5 - i);
      const y = (height / 5) * i + 4;
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
    const initialData = generateInitialData(basePrice);
    setDataPoints(initialData);
    setCurrentPrice(initialData[initialData.length - 1].price);

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
              const newPoint: DataPoint = {
                time: new Date().toISOString(),
                price: newPrice
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
      const lastPrice = dataPoints[dataPoints.length - 1]?.price || getBasePrice(selectedSymbol);
      const change = (Math.random() - 0.5) * 0.01; // ±0.5% change
      const newPrice = lastPrice * (1 + change);
      const priceChange = newPrice - lastPrice;
      
      setCurrentPrice(newPrice);
      setPriceChange(priceChange);

      setDataPoints(prev => {
        const newPoint: DataPoint = {
          time: new Date().toISOString(),
          price: newPrice
        };
        return [...prev.slice(1), newPoint]; // Keep last 51 points
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isConnected, dataPoints, selectedSymbol]);

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

        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <select 
              value={selectedSymbol} 
              onChange={(e) => setSelectedSymbol(e.target.value)}
              className="w-[280px] bg-gray-800 border border-gray-600 text-white rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {commodityOptions.map((commodity) => (
                <option key={commodity.symbol} value={commodity.symbol}>
                  {commodity.name} {commodity.symbol.startsWith('N') ? '(NANO)' : '(MICRO)'}
                </option>
              ))}
            </select>
          </div>
        </div>
        
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