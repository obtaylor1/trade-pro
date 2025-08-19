import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { createChart, ColorType, IChartApi, ISeriesApi } from 'lightweight-charts';

interface OptionsChartProps {
  optionId: string;
  symbol: string;
  strikePrice: string;
  optionType: 'CALL' | 'PUT';
  expirationDate: string;
}

interface ChartData {
  time: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume?: number;
}

interface OptionsPriceData {
  time: number;
  premium: number;
  impliedVolatility: number;
  delta: number;
  theta: number;
  gamma: number;
  vega: number;
}

export default function OptionsChart({ optionId, symbol, strikePrice, optionType, expirationDate }: OptionsChartProps) {
  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const stockSeriesRef = useRef<ISeriesApi<'Candlestick'> | null>(null);
  const optionSeriesRef = useRef<ISeriesApi<'Line'> | null>(null);
  const [timeframe, setTimeframe] = useState<'30m' | '4h' | '1d'>('30m');
  const [showGreeks, setShowGreeks] = useState(false);

  // Fetch real-time stock data
  const { data: stockData } = useQuery({
    queryKey: ['/api/charts/stock', symbol, timeframe],
    refetchInterval: timeframe === '30m' ? 30000 : timeframe === '4h' ? 240000 : 900000, // 30s, 4m, 15m
  });

  // Fetch real-time option premium data
  const { data: optionData } = useQuery({
    queryKey: ['/api/charts/option', optionId, timeframe],
    refetchInterval: timeframe === '30m' ? 30000 : timeframe === '4h' ? 240000 : 900000,
  });

  // Initialize chart
  useEffect(() => {
    if (!chartContainerRef.current) return;

    const chart = createChart(chartContainerRef.current, {
      layout: {
        background: { type: ColorType.Solid, color: '#1a1b23' },
        textColor: '#d1d4dc',
      },
      grid: {
        vertLines: { color: '#2B2B43' },
        horzLines: { color: '#2B2B43' },
      },
      crosshair: {
        mode: 1,
      },
      rightPriceScale: {
        borderColor: '#485158',
        scaleMargins: {
          top: 0.05,
          bottom: 0.25,
        },
      },
      timeScale: {
        borderColor: '#485158',
        timeVisible: true,
        secondsVisible: timeframe === '30m',
      },
      width: chartContainerRef.current.clientWidth,
      height: 400,
    });

    // Stock price candlestick series
    const stockSeries = chart.addCandlestickSeries({
      upColor: '#00ff88',
      downColor: '#ff4757',
      borderDownColor: '#ff4757',
      borderUpColor: '#00ff88',
      wickDownColor: '#ff4757',
      wickUpColor: '#00ff88',
      priceScaleId: 'left',
    });

    // Option premium line series
    const optionSeries = chart.addLineSeries({
      color: '#6c5ce7',
      lineWidth: 3,
      priceScaleId: 'right',
      title: `${symbol} ${strikePrice} ${optionType}`,
    });

    // Add left price scale for stock
    chart.priceScale('left').applyOptions({
      borderColor: '#485158',
      scaleMargins: {
        top: 0.05,
        bottom: 0.25,
      },
    });

    chartRef.current = chart;
    stockSeriesRef.current = stockSeries;
    optionSeriesRef.current = optionSeries;

    const handleResize = () => {
      if (chartContainerRef.current) {
        chart.applyOptions({ width: chartContainerRef.current.clientWidth });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      chart.remove();
    };
  }, [symbol, strikePrice, optionType, timeframe]);

  // Update stock data
  useEffect(() => {
    if (stockSeriesRef.current && stockData) {
      stockSeriesRef.current.setData(stockData);
    }
  }, [stockData]);

  // Update option data
  useEffect(() => {
    if (optionSeriesRef.current && optionData) {
      const premiumData = optionData.map((item: OptionsPriceData) => ({
        time: item.time,
        value: item.premium,
      }));
      optionSeriesRef.current.setData(premiumData);
    }
  }, [optionData]);

  const timeframeLabels = {
    '30m': '30 Minutes',
    '4h': '4 Hours',
    '1d': 'Daily'
  };

  const getCurrentPrice = () => {
    if (!optionData || optionData.length === 0) return null;
    return optionData[optionData.length - 1];
  };

  const currentPrice = getCurrentPrice();

  return (
    <div className="bg-trading-card rounded-lg p-6">
      {/* Chart Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h3 className="text-xl font-semibold text-white">
            {symbol} {strikePrice} {optionType} • {expirationDate}
          </h3>
          <div className="flex items-center space-x-4 mt-2">
            {currentPrice && (
              <>
                <span className="text-2xl font-bold text-trading-blue">
                  ${currentPrice.premium.toFixed(2)}
                </span>
                <span className="text-sm text-gray-400">
                  IV: {(currentPrice.impliedVolatility * 100).toFixed(1)}%
                </span>
              </>
            )}
          </div>
        </div>
        
        <div className="flex items-center space-x-4">
          {/* Greeks Toggle */}
          <button
            onClick={() => setShowGreeks(!showGreeks)}
            className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
              showGreeks 
                ? 'bg-trading-blue text-white' 
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Greeks
          </button>
          
          {/* Timeframe Selector */}
          <div className="flex bg-gray-800 rounded-lg p-1">
            {(['30m', '4h', '1d'] as const).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeframe(tf)}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                  timeframe === tf
                    ? 'bg-trading-blue text-white'
                    : 'text-gray-300 hover:text-white'
                }`}
              >
                {timeframeLabels[tf]}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Greeks Panel */}
      {showGreeks && currentPrice && (
        <div className="grid grid-cols-4 gap-4 mb-4 p-4 bg-gray-800 rounded-lg">
          <div className="text-center">
            <div className="text-sm text-gray-400">Delta</div>
            <div className="text-lg font-semibold text-white">
              {currentPrice.delta.toFixed(3)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Theta</div>
            <div className="text-lg font-semibold text-red-400">
              {currentPrice.theta.toFixed(3)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Gamma</div>
            <div className="text-lg font-semibold text-white">
              {currentPrice.gamma.toFixed(4)}
            </div>
          </div>
          <div className="text-center">
            <div className="text-sm text-gray-400">Vega</div>
            <div className="text-lg font-semibold text-white">
              {currentPrice.vega.toFixed(3)}
            </div>
          </div>
        </div>
      )}

      {/* Chart Container */}
      <div className="relative">
        <div ref={chartContainerRef} className="w-full" />
        
        {/* Chart Legend */}
        <div className="absolute top-4 left-4 bg-gray-900 bg-opacity-80 rounded-lg p-3">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-sm text-white">{symbol} Price</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-500 rounded"></div>
              <span className="text-sm text-white">Option Premium</span>
            </div>
          </div>
        </div>
      </div>

      {/* Chart Info */}
      <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
        <div>
          <span className="text-gray-400">Strike:</span>
          <span className="ml-2 text-white font-medium">${strikePrice}</span>
        </div>
        <div>
          <span className="text-gray-400">Type:</span>
          <span className={`ml-2 font-medium ${optionType === 'CALL' ? 'text-green-400' : 'text-red-400'}`}>
            {optionType}
          </span>
        </div>
        <div>
          <span className="text-gray-400">Expires:</span>
          <span className="ml-2 text-white font-medium">{expirationDate}</span>
        </div>
        <div>
          <span className="text-gray-400">Timeframe:</span>
          <span className="ml-2 text-white font-medium">{timeframeLabels[timeframe]}</span>
        </div>
      </div>
    </div>
  );
}