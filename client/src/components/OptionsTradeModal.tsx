import { useState } from 'react';
import { X, Calendar, DollarSign, TrendingUp, TrendingDown } from 'lucide-react';
import { TradingOpportunity } from '@shared/schema';

interface OptionsTradeModalProps {
  opportunity: TradingOpportunity;
  isOpen: boolean;
  onClose: () => void;
  onExecuteTrade: (opportunity: TradingOpportunity, duration: 'weekly' | 'monthly', contracts: number) => void;
}

export default function OptionsTradeModal({ 
  opportunity, 
  isOpen, 
  onClose, 
  onExecuteTrade 
}: OptionsTradeModalProps) {
  const [selectedDuration, setSelectedDuration] = useState<'weekly' | 'monthly'>('weekly');
  const [contractCount, setContractCount] = useState(1);
  const [isExecuting, setIsExecuting] = useState(false);

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
  const monthlyPremium = basePremium * 1.8; // Monthly options typically cost more

  const selectedPremium = selectedDuration === 'weekly' ? weeklyPremium : monthlyPremium;
  const totalCost = selectedPremium * contractCount;
  const maxRisk = totalCost;
  const potentialGain = totalCost * (selectedDuration === 'weekly' ? 6 : 4); // Weekly has higher risk/reward
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
    <div className="fixed inset-0 bg-black bg-opacity-70 z-50">
      <div 
        className="absolute bg-trading-card rounded-xl shadow-2xl border border-gray-600/50 overflow-y-auto max-h-[90vh]"
        style={{
          left: 'max(1rem, calc((100vw - min(1280px, 100vw - 8rem)) / 2))',
          top: '50%',
          transform: 'translateY(-50%)',
          width: 'min(calc(66.666% - 1rem), 800px)', // Width spanning from left of first card to right of second card
          maxWidth: '800px'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-8 border-b border-gray-700 bg-gradient-to-r from-gray-800/80 to-gray-900/90">
          <div>
            <h2 className="text-3xl font-bold text-white mb-2">{opportunity.name}</h2>
            <p className="text-gray-300 text-lg">{opportunity.type}</p>
          </div>
          <button
            onClick={onClose}
            className="p-3 hover:bg-gray-700 rounded-lg transition-colors hover:scale-110"
          >
            <X className="h-8 w-8 text-gray-400" />
          </button>
        </div>

        {/* Option Details */}
        <div className="p-8">
          <div className="grid grid-cols-2 gap-6 mb-8">
            <div className="bg-gradient-to-br from-blue-800/60 to-indigo-800/80 p-6 rounded-xl border border-blue-600/30">
              <div className="text-blue-200 text-lg font-medium">Strike Price</div>
              <div className="text-white text-3xl font-bold">{opportunity.strikePrice}</div>
            </div>
            <div className="bg-gradient-to-br from-green-800/60 to-emerald-800/80 p-6 rounded-xl border border-green-600/30">
              <div className="text-green-200 text-lg font-medium">Current Price</div>
              <div className="text-white text-3xl font-bold">{opportunity.underlyingPrice}</div>
            </div>
          </div>

          {/* Duration Selection */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-6 flex items-center">
              <Calendar className="h-7 w-7 mr-3" />
              Select Duration
            </h3>
            <div className="grid grid-cols-2 gap-6">
              <button
                onClick={() => setSelectedDuration('weekly')}
                className={`p-8 rounded-xl border-3 transition-all transform hover:scale-105 ${
                  selectedDuration === 'weekly'
                    ? 'border-trading-blue bg-gradient-to-br from-blue-600/30 to-blue-800/50 text-white shadow-lg'
                    : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                }`}
              >
                <div className="text-center">
                  <div className="font-bold text-2xl mb-2">Weekly</div>
                  <div className="text-lg text-gray-300 mb-3">Expires: {formatDate(weeklyExpiration)}</div>
                  <div className="text-lg mb-4">
                    <span className="text-green-400 font-semibold">Higher Risk/Reward</span>
                  </div>
                  <div className="text-3xl font-bold text-green-300">${weeklyPremium.toFixed(2)}</div>
                </div>
              </button>
              
              <button
                onClick={() => setSelectedDuration('monthly')}
                className={`p-8 rounded-xl border-3 transition-all transform hover:scale-105 ${
                  selectedDuration === 'monthly'
                    ? 'border-trading-blue bg-gradient-to-br from-blue-600/30 to-blue-800/50 text-white shadow-lg'
                    : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500 hover:bg-gray-700'
                }`}
              >
                <div className="text-center">
                  <div className="font-bold text-2xl mb-2">Monthly</div>
                  <div className="text-lg text-gray-300 mb-3">Expires: {formatDate(monthlyExpiration)}</div>
                  <div className="text-lg mb-4">
                    <span className="text-blue-400 font-semibold">More Time to Profit</span>
                  </div>
                  <div className="text-3xl font-bold text-blue-300">${monthlyPremium.toFixed(2)}</div>
                </div>
              </button>
            </div>
          </div>

          {/* Contract Quantity */}
          <div className="mb-8">
            <h3 className="text-2xl font-bold text-white mb-6">Number of Contracts</h3>
            <div className="flex items-center justify-center space-x-6">
              <button
                onClick={() => setContractCount(Math.max(1, contractCount - 1))}
                className="w-16 h-16 bg-gradient-to-br from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 rounded-xl flex items-center justify-center text-white text-3xl font-bold transition-all transform hover:scale-110 shadow-lg"
              >
                -
              </button>
              <div className="bg-gradient-to-br from-gray-700 to-gray-800 px-8 py-4 rounded-xl min-w-[120px] text-center border border-gray-600">
                <span className="text-white text-3xl font-bold">{contractCount}</span>
              </div>
              <button
                onClick={() => setContractCount(contractCount + 1)}
                className="w-16 h-16 bg-gradient-to-br from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 rounded-xl flex items-center justify-center text-white text-3xl font-bold transition-all transform hover:scale-110 shadow-lg"
              >
                +
              </button>
            </div>
            <div className="text-lg text-gray-300 mt-4 text-center font-medium">
              Each micro contract represents 1 share of the underlying stock
            </div>
          </div>

          {/* Trade Summary */}
          <div className="bg-gradient-to-br from-slate-800/70 to-gray-900/90 rounded-lg p-5 mb-6 border border-slate-600/40 backdrop-blur-sm">
            <h3 className="text-xl font-bold text-white mb-4 flex items-center">
              <DollarSign className="h-6 w-6 mr-2 text-yellow-400" />
              Trade Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center p-2 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded">
                <span className="text-blue-200 font-medium">Premium per contract:</span>
                <span className="text-white font-bold">${selectedPremium.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center p-2 bg-gradient-to-r from-purple-900/30 to-violet-900/30 rounded">
                <span className="text-purple-200 font-medium">Total cost ({contractCount} contracts):</span>
                <span className="text-white font-bold">${totalCost.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-500/50 pt-3 mt-3">
                <div className="flex justify-between items-center p-2 bg-gradient-to-r from-red-900/40 to-red-800/40 rounded mb-2">
                  <span className="text-red-200 font-medium">Maximum risk:</span>
                  <span className="text-red-100 font-bold">-${maxRisk.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-2 bg-gradient-to-r from-green-900/40 to-emerald-800/40 rounded mb-2">
                  <span className="text-green-200 font-medium">Potential gain:</span>
                  <span className="text-green-100 font-bold">+${potentialGain.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gradient-to-r from-teal-800/60 to-cyan-800/60 rounded-lg border border-teal-600/30">
                  <span className="text-teal-100 font-bold">Net profit potential:</span>
                  <span className="text-teal-50 font-bold text-xl">+${netProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Info */}
          <div className={`rounded-lg p-5 mb-6 border backdrop-blur-sm ${
            opportunity.optionType === 'CALL' 
              ? 'bg-gradient-to-br from-green-800/50 to-emerald-900/70 border-green-600/40'
              : 'bg-gradient-to-br from-red-800/50 to-rose-900/70 border-red-600/40'
          }`}>
            <h4 className="text-white font-bold text-lg mb-3 flex items-center">
              {opportunity.optionType === 'CALL' ? (
                <TrendingUp className="h-5 w-5 mr-2 text-green-300" />
              ) : (
                <TrendingDown className="h-5 w-5 mr-2 text-red-300" />
              )}
              {opportunity.optionType === 'CALL' ? 'Bullish Strategy' : 'Bearish Strategy'}
            </h4>
            <p className={`text-sm font-medium leading-relaxed ${
              opportunity.optionType === 'CALL' ? 'text-green-200' : 'text-red-200'
            }`}>
              {opportunity.optionType === 'CALL' 
                ? `This call option profits if ${opportunity.id.split('-')[1]?.toUpperCase()} moves above ${opportunity.strikePrice} before expiration.`
                : `This put option profits if ${opportunity.id.split('-')[1]?.toUpperCase()} moves below ${opportunity.strikePrice} before expiration.`
              }
            </p>
            <div className={`mt-3 text-sm p-2 rounded ${
              selectedDuration === 'weekly' 
                ? 'bg-yellow-900/40 text-yellow-200'
                : 'bg-blue-900/40 text-blue-200'
            }`}>
              {selectedDuration === 'weekly' 
                ? 'Weekly options offer higher potential returns but require faster price movement.'
                : 'Monthly options provide more time for the trade to work but cost more premium.'
              }
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-6 mt-8">
            <button
              onClick={onClose}
              className="flex-1 px-8 py-4 bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 text-white font-bold text-xl rounded-xl transition-all duration-300 transform hover:scale-105 border border-gray-500/30 shadow-lg"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteTrade}
              disabled={isExecuting}
              className={`flex-1 px-8 py-5 rounded-xl font-bold text-xl transition-all duration-300 transform hover:scale-105 shadow-xl ${
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