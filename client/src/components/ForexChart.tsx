import { useEffect, useRef } from 'react';

interface ForexQuote {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
}

interface ForexChartProps {
  symbol: string;
  currentQuote?: ForexQuote;
}

export default function ForexChart({ symbol, currentQuote }: ForexChartProps) {
  const chartRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // This would integrate with lightweight-charts or similar charting library
    // For now, showing a placeholder that displays current quote information
  }, [symbol, currentQuote]);

  const formatPrice = (price: number): string => {
    const decimals = symbol === 'USDJPY' || symbol === 'XAUUSD' ? 2 : 4;
    return price.toFixed(decimals);
  };

  return (
    <div className="h-full bg-gray-900 border border-gray-700 rounded-lg overflow-hidden">
      <div className="bg-gray-800 px-4 py-2 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h3 className="text-lg font-bold text-white">{symbol}</h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-400">Timeframe:</span>
              <select className="bg-gray-700 text-white text-sm rounded px-2 py-1 border border-gray-600" defaultValue="1h">
                <option value="1m">1 Minute</option>
                <option value="5m">5 Minutes</option>
                <option value="15m">15 Minutes</option>
                <option value="1h">1 Hour</option>
                <option value="4h">4 Hours</option>
                <option value="1d">1 Day</option>
              </select>
            </div>
          </div>
          
          {currentQuote && (
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm text-gray-400">BID</div>
                <div className="text-lg font-mono font-bold text-red-400">
                  {formatPrice(currentQuote.bid)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">ASK</div>
                <div className="text-lg font-mono font-bold text-blue-400">
                  {formatPrice(currentQuote.ask)}
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm text-gray-400">SPREAD</div>
                <div className="text-lg font-mono font-bold text-yellow-400">
                  {((currentQuote.ask - currentQuote.bid) * (symbol === 'USDJPY' || symbol === 'XAUUSD' ? 100 : 10000)).toFixed(1)}
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div ref={chartRef} className="h-full flex items-center justify-center">
        {/* Chart Placeholder - would integrate with lightweight-charts */}
        <div className="text-center text-gray-500">
          <div className="text-6xl mb-4">📈</div>
          <div className="text-xl font-semibold mb-2">{symbol} Chart</div>
          <div className="text-sm">
            Professional charting integration would be implemented here
          </div>
          <div className="text-xs mt-2">
            Real-time candlestick charts with technical indicators
          </div>
          
          {currentQuote && (
            <div className="mt-8 p-6 bg-gray-800 rounded-lg border border-gray-700 inline-block">
              <div className="text-lg font-semibold text-white mb-4">Live Quote</div>
              <div className="grid grid-cols-3 gap-6">
                <div className="text-center">
                  <div className="text-sm text-red-300 mb-2">BID</div>
                  <div className="text-2xl font-mono font-bold text-red-400">
                    {formatPrice(currentQuote.bid)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-blue-300 mb-2">ASK</div>
                  <div className="text-2xl font-mono font-bold text-blue-400">
                    {formatPrice(currentQuote.ask)}
                  </div>
                </div>
                <div className="text-center">
                  <div className="text-sm text-yellow-300 mb-2">SPREAD</div>
                  <div className="text-2xl font-mono font-bold text-yellow-400">
                    {((currentQuote.ask - currentQuote.bid) * (symbol === 'USDJPY' || symbol === 'XAUUSD' ? 100 : 10000)).toFixed(1)} pips
                  </div>
                </div>
              </div>
              <div className="text-xs text-gray-400 mt-4">
                Last updated: {new Date(currentQuote.timestamp).toLocaleTimeString()}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}