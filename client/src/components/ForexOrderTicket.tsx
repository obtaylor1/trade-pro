import { useState } from 'react';
import type { ForexUser } from '@shared/schema';

interface ForexQuote {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
}

interface ForexOrderTicketProps {
  symbol: string;
  currentQuote?: ForexQuote;
  account: ForexUser | null;
  onPlaceOrder: (orderData: any) => void;
}

const ORDER_TYPES = [
  { value: 'MARKET', label: 'Market Order' },
  { value: 'LIMIT', label: 'Limit Order' },
  { value: 'STOP', label: 'Stop Order' },
  { value: 'STOP_LIMIT', label: 'Stop Limit Order' }
];

const LOT_SIZES = [
  { value: 0.01, label: 'Micro Lot (0.01)' },
  { value: 0.1, label: 'Mini Lot (0.10)' },
  { value: 1.0, label: 'Standard Lot (1.00)' }
];

export default function ForexOrderTicket({ symbol, currentQuote, account, onPlaceOrder }: ForexOrderTicketProps) {
  const [orderType, setOrderType] = useState<'MARKET' | 'LIMIT' | 'STOP' | 'STOP_LIMIT'>('MARKET');
  const [side, setSide] = useState<'BUY' | 'SELL'>('BUY');
  const [lots, setLots] = useState(0.01);
  const [price, setPrice] = useState('');
  const [stopLoss, setStopLoss] = useState('');
  const [takeProfit, setTakeProfit] = useState('');
  const [riskBasedSizing, setRiskBasedSizing] = useState(false);
  const [riskAmount, setRiskAmount] = useState(50);

  const formatPrice = (price: number): string => {
    const decimals = symbol === 'USDJPY' || symbol === 'XAUUSD' ? 2 : 4;
    return price.toFixed(decimals);
  };

  const calculatePositionSize = () => {
    if (!account || !currentQuote || !stopLoss || !riskBasedSizing) return lots;
    
    const entryPrice = orderType === 'MARKET' 
      ? (side === 'BUY' ? currentQuote.ask : currentQuote.bid)
      : parseFloat(price) || currentQuote.ask;
    
    const stopPrice = parseFloat(stopLoss);
    const pipDifference = Math.abs(entryPrice - stopPrice);
    const pipValue = symbol === 'USDJPY' || symbol === 'XAUUSD' ? 
      pipDifference * 100 : 
      pipDifference * 10000;
    
    // Calculate lot size based on risk
    const contractSize = 100000; // Standard contract size
    const pipValueUSD = symbol === 'USDJPY' || symbol === 'XAUUSD' ? 
      contractSize * 0.01 : 
      contractSize * 0.0001;
    
    const calculatedLots = riskAmount / (pipValue * pipValueUSD / contractSize);
    return Math.min(Math.max(calculatedLots, 0.01), 100); // Min 0.01, Max 100 lots
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!account || !currentQuote) {
      alert('Account or quote data not available');
      return;
    }

    if (account.isLocked) {
      alert('Account is locked due to daily loss limit');
      return;
    }

    const finalLots = riskBasedSizing ? calculatePositionSize() : lots;
    
    const orderData = {
      symbol,
      side,
      type: orderType,
      lots: finalLots,
      price: (orderType !== 'MARKET' && price) ? parseFloat(price) : undefined,
      stopLoss: stopLoss ? parseFloat(stopLoss) : undefined,
      takeProfit: takeProfit ? parseFloat(takeProfit) : undefined
    };

    onPlaceOrder(orderData);

    // Reset form for market orders
    if (orderType === 'MARKET') {
      setPrice('');
      setStopLoss('');
      setTakeProfit('');
    }
  };

  const calculateMargin = () => {
    if (!currentQuote || !account) return 0;
    
    const entryPrice = orderType === 'MARKET' 
      ? (side === 'BUY' ? currentQuote.ask : currentQuote.bid)
      : parseFloat(price) || currentQuote.ask;
    
    const finalLots = riskBasedSizing ? calculatePositionSize() : lots;
    const contractSize = 100000;
    const notionalValue = contractSize * finalLots * entryPrice;
    return notionalValue / account.leverageMax;
  };

  const calculatePipValue = () => {
    const finalLots = riskBasedSizing ? calculatePositionSize() : lots;
    if (symbol === 'USDJPY' || symbol === 'XAUUSD') {
      return finalLots * 100 * 0.01; // For JPY pairs and Gold
    }
    return finalLots * 100000 * 0.0001; // For major pairs
  };

  return (
    <div className="bg-gray-900 border border-gray-700 rounded-lg p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-white">Order Ticket</h3>
        <div className="text-sm text-gray-400">{symbol}</div>
      </div>

      {currentQuote && (
        <div className="bg-gray-800 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="text-center">
              <div className="text-xs text-red-300 mb-1">BID</div>
              <div className="text-lg font-mono font-bold text-red-400">
                {formatPrice(currentQuote.bid)}
              </div>
            </div>
            <div className="text-center">
              <div className="text-xs text-blue-300 mb-1">ASK</div>
              <div className="text-lg font-mono font-bold text-blue-400">
                {formatPrice(currentQuote.ask)}
              </div>
            </div>
          </div>
          <div className="text-center mt-2 text-xs text-gray-400">
            Spread: {((currentQuote.ask - currentQuote.bid) * (symbol === 'USDJPY' || symbol === 'XAUUSD' ? 100 : 10000)).toFixed(1)} pips
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Buy/Sell Toggle */}
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setSide('BUY')}
            className={`py-3 px-4 rounded-lg font-semibold transition-colors ${
              side === 'BUY' 
                ? 'bg-blue-600 text-white border border-blue-500' 
                : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
            }`}
          >
            BUY {currentQuote ? formatPrice(currentQuote.ask) : ''}
          </button>
          <button
            type="button"
            onClick={() => setSide('SELL')}
            className={`py-3 px-4 rounded-lg font-semibold transition-colors ${
              side === 'SELL' 
                ? 'bg-red-600 text-white border border-red-500' 
                : 'bg-gray-700 text-gray-300 border border-gray-600 hover:bg-gray-600'
            }`}
          >
            SELL {currentQuote ? formatPrice(currentQuote.bid) : ''}
          </button>
        </div>

        {/* Order Type */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Order Type</label>
          <select
            value={orderType}
            onChange={(e) => setOrderType(e.target.value as any)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
          >
            {ORDER_TYPES.map(type => (
              <option key={type.value} value={type.value}>{type.label}</option>
            ))}
          </select>
        </div>

        {/* Price (for non-market orders) */}
        {orderType !== 'MARKET' && (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Price</label>
            <input
              type="number"
              step="0.0001"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder={currentQuote ? formatPrice(side === 'BUY' ? currentQuote.ask : currentQuote.bid) : ''}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              required
            />
          </div>
        )}

        {/* Risk-Based Position Sizing Toggle */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="risk-based"
            checked={riskBasedSizing}
            onChange={(e) => setRiskBasedSizing(e.target.checked)}
            className="w-4 h-4 text-blue-600 bg-gray-800 border-gray-600 rounded focus:ring-blue-500"
          />
          <label htmlFor="risk-based" className="text-sm text-gray-300">
            Risk-based position sizing
          </label>
        </div>

        {riskBasedSizing ? (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Risk Amount ($)</label>
            <input
              type="number"
              min="1"
              max="1000"
              value={riskAmount}
              onChange={(e) => setRiskAmount(parseFloat(e.target.value))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            />
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">Lot Size</label>
            <select
              value={lots}
              onChange={(e) => setLots(parseFloat(e.target.value))}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            >
              {LOT_SIZES.map(size => (
                <option key={size.value} value={size.value}>{size.label}</option>
              ))}
            </select>
            <input
              type="number"
              min="0.01"
              step="0.01"
              max="100"
              value={lots}
              onChange={(e) => setLots(parseFloat(e.target.value) || 0.01)}
              className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 mt-2"
              placeholder="Custom lot size"
            />
          </div>
        )}

        {/* Stop Loss */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Stop Loss (Optional)</label>
          <input
            type="number"
            step="0.0001"
            value={stopLoss}
            onChange={(e) => setStopLoss(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            placeholder="Stop loss price"
          />
        </div>

        {/* Take Profit */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Take Profit (Optional)</label>
          <input
            type="number"
            step="0.0001"
            value={takeProfit}
            onChange={(e) => setTakeProfit(e.target.value)}
            className="w-full bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
            placeholder="Take profit price"
          />
        </div>

        {/* Trade Summary */}
        <div className="bg-gray-800 rounded-lg p-3 space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Position Size:</span>
            <span className="text-white font-mono">
              {riskBasedSizing ? calculatePositionSize().toFixed(2) : lots.toFixed(2)} lots
            </span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Pip Value:</span>
            <span className="text-white font-mono">${calculatePipValue().toFixed(2)}</span>
          </div>
          <div className="flex justify-between text-sm">
            <span className="text-gray-400">Required Margin:</span>
            <span className="text-white font-mono">${calculateMargin().toFixed(2)}</span>
          </div>
          {account && (
            <div className="flex justify-between text-sm">
              <span className="text-gray-400">Free Margin:</span>
              <span className={`font-mono ${calculateMargin() > account.freeMargin ? 'text-red-400' : 'text-green-400'}`}>
                ${account.freeMargin.toFixed(2)}
              </span>
            </div>
          )}
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={!account || account.isLocked || (account && calculateMargin() > account.freeMargin)}
          className={`w-full py-3 px-4 rounded-lg font-bold text-white transition-colors ${
            side === 'BUY' 
              ? 'bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600' 
              : 'bg-red-600 hover:bg-red-700 disabled:bg-gray-600'
          } disabled:cursor-not-allowed`}
        >
          {account?.isLocked 
            ? 'Account Locked' 
            : !account 
            ? 'Account Loading...'
            : account && calculateMargin() > account.freeMargin
            ? 'Insufficient Margin'
            : `${side} ${symbol}`
          }
        </button>
      </form>
    </div>
  );
}