import type { ForexPosition } from '@shared/schema';

interface ForexQuote {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
}

interface ForexPositionsPanelProps {
  positions: ForexPosition[];
  quotes: { [symbol: string]: ForexQuote };
  onClosePosition: (positionId: string, lots?: number) => void;
}

export default function ForexPositionsPanel({ positions, quotes, onClosePosition }: ForexPositionsPanelProps) {
  const formatPrice = (price: number, symbol: string): string => {
    const decimals = symbol === 'USDJPY' || symbol === 'XAUUSD' ? 2 : 4;
    return price.toFixed(decimals);
  };

  const calculatePips = (position: ForexPosition, currentPrice: number): number => {
    const priceDiff = currentPrice - position.avgPrice;
    const direction = position.side === 'LONG' ? 1 : -1;
    const pipMultiplier = position.symbol === 'USDJPY' || position.symbol === 'XAUUSD' ? 100 : 10000;
    return (priceDiff * direction * pipMultiplier);
  };

  if (positions.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-gray-500">
        <div className="text-6xl mb-4">📊</div>
        <div className="text-lg font-semibold mb-2">No Open Positions</div>
        <div className="text-sm text-center">
          Open your first position using the order ticket to start trading
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3 p-4">
      {positions.map((position) => {
        const quote = quotes[position.symbol];
        const currentPrice = quote ? 
          (position.side === 'LONG' ? quote.bid : quote.ask) : 
          position.currentPrice;
        
        const pips = calculatePips(position, currentPrice);
        const isProfit = position.unrealizedPnL > 0;
        const pipsColor = pips >= 0 ? 'text-green-400' : 'text-red-400';
        const pnlColor = isProfit ? 'text-green-400' : 'text-red-400';

        return (
          <div key={position.id} className="bg-gray-800 border border-gray-700 rounded-lg p-4">
            {/* Position Header */}
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <div className={`px-2 py-1 rounded text-xs font-bold ${
                  position.side === 'LONG' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-red-600 text-white'
                }`}>
                  {position.side}
                </div>
                <div>
                  <div className="font-semibold text-white">{position.symbol}</div>
                  <div className="text-xs text-gray-400">{position.lots} lots</div>
                </div>
              </div>
              <div className="text-right">
                <div className={`text-lg font-bold ${pnlColor}`}>
                  {isProfit ? '+' : ''}${position.unrealizedPnL.toFixed(2)}
                </div>
                <div className={`text-sm ${pipsColor}`}>
                  {pips >= 0 ? '+' : ''}{pips.toFixed(1)} pips
                </div>
              </div>
            </div>

            {/* Position Details */}
            <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
              <div>
                <div className="text-gray-400 mb-1">Entry Price</div>
                <div className="font-mono text-white">
                  {formatPrice(position.avgPrice, position.symbol)}
                </div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">Current Price</div>
                <div className="font-mono text-white">
                  {formatPrice(currentPrice, position.symbol)}
                </div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">Commission</div>
                <div className="font-mono text-red-400">
                  -${position.commission.toFixed(2)}
                </div>
              </div>
              <div>
                <div className="text-gray-400 mb-1">Swap</div>
                <div className={`font-mono ${position.swap >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {position.swap >= 0 ? '+' : ''}${position.swap.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Stop Loss / Take Profit */}
            {(position.stopLoss || position.takeProfit) && (
              <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
                {position.stopLoss && (
                  <div>
                    <div className="text-gray-400 mb-1">Stop Loss</div>
                    <div className="font-mono text-red-400">
                      {formatPrice(position.stopLoss, position.symbol)}
                    </div>
                  </div>
                )}
                {position.takeProfit && (
                  <div>
                    <div className="text-gray-400 mb-1">Take Profit</div>
                    <div className="font-mono text-green-400">
                      {formatPrice(position.takeProfit, position.symbol)}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Position Time */}
            <div className="text-xs text-gray-500 mb-3">
              Opened: {new Date(position.openedAt).toLocaleString()}
            </div>

            {/* Action Buttons */}
            <div className="flex space-x-2">
              <button
                onClick={() => onClosePosition(position.id)}
                className="flex-1 bg-red-600 hover:bg-red-700 text-white py-2 px-3 rounded text-sm font-semibold transition-colors"
              >
                Close Position
              </button>
              <button
                onClick={() => {
                  const lots = prompt('Enter lots to close (partial close):', position.lots.toString());
                  if (lots && parseFloat(lots) > 0 && parseFloat(lots) <= position.lots) {
                    onClosePosition(position.id, parseFloat(lots));
                  }
                }}
                className="flex-1 bg-gray-600 hover:bg-gray-700 text-white py-2 px-3 rounded text-sm font-semibold transition-colors"
              >
                Partial Close
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}