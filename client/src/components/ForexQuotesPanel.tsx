interface ForexQuote {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
  change?: number;
}

interface ForexQuotesPanelProps {
  quotes: { [symbol: string]: ForexQuote };
  selectedSymbol: string;
  onSymbolSelect: (symbol: string) => void;
}

const SYMBOL_NAMES = {
  'EURUSD': 'EUR/USD',
  'GBPUSD': 'GBP/USD', 
  'USDJPY': 'USD/JPY',
  'AUDUSD': 'AUD/USD',
  'USDCHF': 'USD/CHF',
  'NZDUSD': 'NZD/USD',
  'USDCAD': 'USD/CAD',
  'EURJPY': 'EUR/JPY',
  'EURGBP': 'EUR/GBP',
  'XAUUSD': 'XAU/USD (Gold)'
};

const SYMBOL_FLAGS = {
  'EURUSD': '🇪🇺🇺🇸',
  'GBPUSD': '🇬🇧🇺🇸',
  'USDJPY': '🇺🇸🇯🇵',
  'AUDUSD': '🇦🇺🇺🇸',
  'USDCHF': '🇺🇸🇨🇭',
  'NZDUSD': '🇳🇿🇺🇸',
  'USDCAD': '🇺🇸🇨🇦',
  'EURJPY': '🇪🇺🇯🇵',
  'EURGBP': '🇪🇺🇬🇧',
  'XAUUSD': '🏅🇺🇸'
};

export default function ForexQuotesPanel({ quotes, selectedSymbol, onSymbolSelect }: ForexQuotesPanelProps) {
  const formatPrice = (price: number, symbol: string): string => {
    const decimals = symbol === 'USDJPY' || symbol === 'XAUUSD' ? 2 : 4;
    return price.toFixed(decimals);
  };

  const formatSpread = (spread: number, symbol: string): string => {
    const decimals = symbol === 'USDJPY' || symbol === 'XAUUSD' ? 1 : 1;
    const pips = symbol === 'USDJPY' || symbol === 'XAUUSD' ? 
      spread * 100 : 
      spread * 10000;
    return pips.toFixed(decimals);
  };

  return (
    <div className="space-y-1">
      {Object.entries(SYMBOL_NAMES).map(([symbol, name]) => {
        const quote = quotes[symbol];
        const isSelected = symbol === selectedSymbol;
        
        if (!quote) {
          return (
            <div key={symbol} className="p-3 bg-gray-700 rounded-lg opacity-50">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <span className="text-lg">{SYMBOL_FLAGS[symbol as keyof typeof SYMBOL_FLAGS]}</span>
                  <div>
                    <div className="text-sm font-semibold text-white">{name}</div>
                    <div className="text-xs text-gray-400">{symbol}</div>
                  </div>
                </div>
                <div className="text-gray-500">Loading...</div>
              </div>
            </div>
          );
        }

        return (
          <div
            key={symbol}
            onClick={() => onSymbolSelect(symbol)}
            className={`p-3 rounded-lg cursor-pointer transition-all duration-200 hover:bg-gray-700 ${
              isSelected ? 'bg-blue-600 border border-blue-400' : 'bg-gray-800 border border-gray-700'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <span className="text-lg">{SYMBOL_FLAGS[symbol as keyof typeof SYMBOL_FLAGS]}</span>
                <div>
                  <div className="text-sm font-semibold text-white">{name}</div>
                  <div className="text-xs text-gray-400">{symbol}</div>
                </div>
              </div>
              <div className="text-xs text-gray-400">
                {formatSpread(quote.spread, symbol)} pips
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {/* Bid */}
              <div className="bg-red-900/30 rounded p-2 text-center border border-red-700/30">
                <div className="text-xs text-red-300 mb-1">BID</div>
                <div className="text-sm font-mono font-bold text-red-400">
                  {formatPrice(quote.bid, symbol)}
                </div>
              </div>

              {/* Ask */}
              <div className="bg-blue-900/30 rounded p-2 text-center border border-blue-700/30">
                <div className="text-xs text-blue-300 mb-1">ASK</div>
                <div className="text-sm font-mono font-bold text-blue-400">
                  {formatPrice(quote.ask, symbol)}
                </div>
              </div>
            </div>

            {/* Quick Trade Buttons */}
            {isSelected && (
              <div className="grid grid-cols-2 gap-2 mt-2">
                <button 
                  className="bg-red-600 hover:bg-red-700 text-white text-xs py-1 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Quick sell logic would go here
                  }}
                >
                  SELL {formatPrice(quote.bid, symbol)}
                </button>
                <button 
                  className="bg-blue-600 hover:bg-blue-700 text-white text-xs py-1 rounded transition-colors"
                  onClick={(e) => {
                    e.stopPropagation();
                    // Quick buy logic would go here
                  }}
                >
                  BUY {formatPrice(quote.ask, symbol)}
                </button>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}