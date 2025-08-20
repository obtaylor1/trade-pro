import { useState, useRef, useEffect } from 'react';
import { X, Calendar, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { TradingOpportunity } from '@shared/schema';

interface OptionsTradeWindowProps {
  opportunity: TradingOpportunity;
  isOpen: boolean;
  onClose: () => void;
  onExecuteTrade: (opportunity: TradingOpportunity, duration: 'weekly' | 'monthly', contracts: number) => void;
  containerRef?: React.RefObject<HTMLElement>;
}

export default function OptionsTradeWindow({ 
  opportunity, 
  isOpen, 
  onClose, 
  onExecuteTrade,
  containerRef
}: OptionsTradeWindowProps) {
  const [selectedDuration, setSelectedDuration] = useState<'weekly' | 'monthly'>('weekly');
  const [contractCount, setContractCount] = useState(1);
  const [isExecuting, setIsExecuting] = useState(false);
  const [windowPosition, setWindowPosition] = useState({ left: 0, top: 0, width: 0 });

  useEffect(() => {
    if (isOpen && containerRef?.current) {
      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      
      // Position window to span from left of first card to right of second card
      // Assuming 3 cards in a grid, we want to cover the first 2 cards (66.67% width)
      const cardWidth = rect.width / 3;
      const windowWidth = cardWidth * 2;
      
      setWindowPosition({
        left: rect.left,
        top: rect.top + window.scrollY,
        width: windowWidth
      });
    }
  }, [isOpen, containerRef]);

  if (!isOpen) return null;

  // Calculate expiration dates
  const today = new Date();
  const weeklyExpiration = new Date(today);
  weeklyExpiration.setDate(today.getDate() + 7);
  
  const monthlyExpiration = new Date(today);
  monthlyExpiration.setMonth(today.getMonth() + 1);

  // Calculate pricing based on duration
  const basePremium = parseFloat(opportunity.entryPrice.replace('$', ''));
  const weeklyPremium = basePremium;
  const monthlyPremium = basePremium * 1.8;

  const selectedPremium = selectedDuration === 'weekly' ? weeklyPremium : monthlyPremium;
  const totalCost = selectedPremium * contractCount;
  const maxRisk = totalCost;
  const potentialGain = totalCost * (selectedDuration === 'weekly' ? 6 : 4);
  const netProfit = potentialGain - totalCost;

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const handleExecuteTrade = async () => {
    setIsExecuting(true);
    try {
      await onExecuteTrade(opportunity, selectedDuration, contractCount);
      onClose();
    } catch (error) {
      console.error('Trade execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50">
      <div 
        className="absolute bg-trading-card rounded-xl shadow-2xl border border-gray-600/50 overflow-y-auto max-h-[85vh]"
        style={{
          left: `${windowPosition.left}px`,
          top: `${windowPosition.top + 20}px`,
          width: `${windowPosition.width}px`,
          minWidth: '600px'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700 bg-gradient-to-r from-gray-800/80 to-gray-900/90">
          <div>
            <h2 className="text-2xl font-bold text-white mb-1">{opportunity.name}</h2>
            <p className="text-gray-300">{opportunity.type}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors hover:scale-110"
          >
            <X className="h-6 w-6 text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Option Details */}
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-800/60 to-indigo-800/80 p-4 rounded-lg border border-blue-600/30">
              <div className="text-blue-200 text-sm font-medium">Strike Price</div>
              <div className="text-white text-2xl font-bold">{opportunity.strikePrice}</div>
            </div>
            <div className="bg-gradient-to-br from-green-800/60 to-emerald-800/80 p-4 rounded-lg border border-green-600/30">
              <div className="text-green-200 text-sm font-medium">Current Price</div>
              <div className="text-white text-2xl font-bold">{opportunity.underlyingPrice}</div>
            </div>
          </div>

          {/* Duration Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Select Duration
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedDuration('weekly')}
                className={`p-4 rounded-lg border-2 transition-all transform hover:scale-105 ${
                  selectedDuration === 'weekly'
                    ? 'border-trading-blue bg-gradient-to-br from-blue-600/30 to-blue-800/50 text-white shadow-lg'
                    : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                }`}
              >
                <div className="text-center">
                  <div className="font-bold text-lg mb-1">Weekly</div>
                  <div className="text-sm text-gray-300 mb-2">Expires: {formatDate(weeklyExpiration)}</div>
                  <div className="text-sm mb-2">
                    <span className="text-green-400 font-semibold">Higher Risk/Reward</span>
                  </div>
                  <div className="text-xl font-bold text-green-300">${weeklyPremium.toFixed(2)}</div>
                </div>
              </button>
              
              <button
                onClick={() => setSelectedDuration('monthly')}
                className={`p-4 rounded-lg border-2 transition-all transform hover:scale-105 ${
                  selectedDuration === 'monthly'
                    ? 'border-trading-blue bg-gradient-to-br from-blue-600/30 to-blue-800/50 text-white shadow-lg'
                    : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                }`}
              >
                <div className="text-center">
                  <div className="font-bold text-lg mb-1">Monthly</div>
                  <div className="text-sm text-gray-300 mb-2">Expires: {formatDate(monthlyExpiration)}</div>
                  <div className="text-sm mb-2">
                    <span className="text-blue-400 font-semibold">More Time to Profit</span>
                  </div>
                  <div className="text-xl font-bold text-blue-300">${monthlyPremium.toFixed(2)}</div>
                </div>
              </button>
            </div>
          </div>

          {/* Contract Quantity */}
          <div className="mb-6">
            <h3 className="text-lg font-bold text-white mb-4">Number of Contracts</h3>
            <div className="flex items-center justify-center space-x-4">
              <button
                onClick={() => setContractCount(Math.max(1, contractCount - 1))}
                className="w-12 h-12 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-lg flex items-center justify-center text-white text-xl font-bold transition-all transform hover:scale-110 shadow-lg"
              >
                -
              </button>
              <div className="bg-gradient-to-br from-gray-700 to-gray-800 px-6 py-3 rounded-lg min-w-[80px] text-center border border-gray-600">
                <span className="text-white text-2xl font-bold">{contractCount}</span>
              </div>
              <button
                onClick={() => setContractCount(contractCount + 1)}
                className="w-12 h-12 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-lg flex items-center justify-center text-white text-xl font-bold transition-all transform hover:scale-110 shadow-lg"
              >
                +
              </button>
            </div>
            <div className="text-sm text-gray-300 mt-2 text-center">
              Each micro contract represents 1 share of the underlying stock
            </div>
          </div>

          {/* Trade Summary */}
          <div className="bg-gradient-to-br from-slate-800/70 to-gray-900/90 rounded-lg p-4 mb-6 border border-slate-600/40 backdrop-blur-sm">
            <h3 className="text-lg font-bold text-white mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2 text-yellow-400" />
              Trade Summary
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-2 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded">
                <span className="text-blue-200 font-medium">Premium per contract:</span>
                <span className="text-white font-bold">${selectedPremium.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gradient-to-r from-purple-900/30 to-violet-900/30 rounded">
                <span className="text-purple-200 font-medium">Total cost ({contractCount} contracts):</span>
                <span className="text-white font-bold">${totalCost.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-500/50 pt-2 mt-2">
                <div className="flex justify-between items-center p-2 bg-gradient-to-r from-red-900/40 to-red-800/40 rounded mb-1">
                  <span className="text-red-200 font-medium">Maximum risk:</span>
                  <span className="text-red-100 font-bold">-${maxRisk.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gradient-to-r from-green-900/40 to-emerald-800/40 rounded mb-1">
                  <span className="text-green-200 font-medium">Potential gain:</span>
                  <span className="text-green-100 font-bold">+${potentialGain.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gradient-to-r from-teal-800/60 to-cyan-800/60 rounded-lg border border-teal-600/30">
                  <span className="text-teal-100 font-bold">Net profit potential:</span>
                  <span className="text-teal-50 font-bold text-lg">+${netProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Info */}
          <div className={`rounded-lg p-4 mb-6 border backdrop-blur-sm ${
            opportunity.optionType === 'CALL' 
              ? 'bg-gradient-to-br from-green-800/50 to-emerald-900/70 border-green-600/40'
              : 'bg-gradient-to-br from-red-800/50 to-rose-900/70 border-red-600/40'
          }`}>
            <h4 className="text-white font-bold mb-2 flex items-center">
              {opportunity.optionType === 'CALL' ? (
                <TrendingUp className="h-4 w-4 mr-2 text-green-300" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-2 text-red-300" />
              )}
              {opportunity.optionType === 'CALL' ? 'Bullish Strategy' : 'Bearish Strategy'}
            </h4>
            <p className={`text-sm leading-relaxed ${
              opportunity.optionType === 'CALL' ? 'text-green-200' : 'text-red-200'
            }`}>
              {opportunity.optionType === 'CALL' 
                ? `This call option profits if ${opportunity.id.split('-')[1]?.toUpperCase()} moves above $${opportunity.strikePrice} before expiration.`
                : `This put option profits if ${opportunity.id.split('-')[1]?.toUpperCase()} moves below $${opportunity.strikePrice} before expiration.`
              }
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold rounded-lg transition-all duration-300 transform hover:scale-105 border border-gray-500/30 shadow-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteTrade}
              disabled={isExecuting}
              className={`flex-1 px-6 py-3 rounded-lg font-bold transition-all duration-300 transform hover:scale-105 shadow-lg ${
                opportunity.optionType === 'CALL'
                  ? 'bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white border border-green-500/30'
                  : 'bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white border border-red-500/30'
              } ${isExecuting ? 'opacity-50 cursor-not-allowed transform-none' : ''}`}
            >
              {isExecuting ? (
                <>
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                  Executing...
                </>
              ) : (
                `${opportunity.action} ${contractCount} Contract${contractCount > 1 ? 's' : ''}`
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}