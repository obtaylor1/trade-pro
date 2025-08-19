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
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-trading-card rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-700">
          <div>
            <h2 className="text-2xl font-bold text-white">{opportunity.name}</h2>
            <p className="text-gray-400">{opportunity.type}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X className="h-6 w-6 text-gray-400" />
          </button>
        </div>

        {/* Option Details */}
        <div className="p-6">
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-400 text-sm">Strike Price</div>
              <div className="text-white text-xl font-bold">{opportunity.strikePrice}</div>
            </div>
            <div className="bg-gray-800 p-4 rounded-lg">
              <div className="text-gray-400 text-sm">Current Price</div>
              <div className="text-white text-xl font-bold">{opportunity.underlyingPrice}</div>
            </div>
          </div>

          {/* Duration Selection */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <Calendar className="h-5 w-5 mr-2" />
              Select Duration
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setSelectedDuration('weekly')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedDuration === 'weekly'
                    ? 'border-trading-blue bg-trading-blue bg-opacity-20 text-white'
                    : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold text-lg">Weekly</div>
                  <div className="text-sm text-gray-400">Expires: {formatDate(weeklyExpiration)}</div>
                  <div className="text-sm mt-2">
                    <span className="text-green-400">Higher Risk/Reward</span>
                  </div>
                  <div className="text-lg font-bold mt-2">${weeklyPremium.toFixed(2)}</div>
                </div>
              </button>
              
              <button
                onClick={() => setSelectedDuration('monthly')}
                className={`p-4 rounded-lg border-2 transition-all ${
                  selectedDuration === 'monthly'
                    ? 'border-trading-blue bg-trading-blue bg-opacity-20 text-white'
                    : 'border-gray-600 bg-gray-800 text-gray-300 hover:border-gray-500'
                }`}
              >
                <div className="text-center">
                  <div className="font-semibold text-lg">Monthly</div>
                  <div className="text-sm text-gray-400">Expires: {formatDate(monthlyExpiration)}</div>
                  <div className="text-sm mt-2">
                    <span className="text-blue-400">More Time to Profit</span>
                  </div>
                  <div className="text-lg font-bold mt-2">${monthlyPremium.toFixed(2)}</div>
                </div>
              </button>
            </div>
          </div>

          {/* Contract Quantity */}
          <div className="mb-6">
            <h3 className="text-lg font-semibold text-white mb-4">Number of Contracts</h3>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setContractCount(Math.max(1, contractCount - 1))}
                className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white"
              >
                -
              </button>
              <div className="bg-gray-800 px-4 py-2 rounded-lg min-w-[80px] text-center">
                <span className="text-white text-lg font-semibold">{contractCount}</span>
              </div>
              <button
                onClick={() => setContractCount(contractCount + 1)}
                className="w-10 h-10 bg-gray-700 hover:bg-gray-600 rounded-lg flex items-center justify-center text-white"
              >
                +
              </button>
            </div>
            <div className="text-sm text-gray-400 mt-2">
              Each micro contract represents 1 share of the underlying stock
            </div>
          </div>

          {/* Trade Summary */}
          <div className="bg-gray-800 rounded-lg p-4 mb-6">
            <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
              <DollarSign className="h-5 w-5 mr-2" />
              Trade Summary
            </h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Premium per contract:</span>
                <span className="text-white font-semibold">${selectedPremium.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-400">Total cost ({contractCount} contracts):</span>
                <span className="text-white font-semibold">${totalCost.toFixed(2)}</span>
              </div>
              <div className="border-t border-gray-600 pt-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Maximum risk:</span>
                  <span className="text-red-400 font-semibold">-${maxRisk.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-gray-400">Potential gain:</span>
                  <span className="text-green-400 font-semibold">+${potentialGain.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center font-bold">
                  <span className="text-white">Net profit potential:</span>
                  <span className="text-trading-blue text-lg">+${netProfit.toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Strategy Info */}
          <div className="bg-blue-900 bg-opacity-30 rounded-lg p-4 mb-6">
            <h4 className="text-white font-semibold mb-2 flex items-center">
              {opportunity.optionType === 'CALL' ? (
                <TrendingUp className="h-4 w-4 mr-2 text-green-400" />
              ) : (
                <TrendingDown className="h-4 w-4 mr-2 text-red-400" />
              )}
              {opportunity.optionType === 'CALL' ? 'Bullish Strategy' : 'Bearish Strategy'}
            </h4>
            <p className="text-gray-300 text-sm">
              {opportunity.optionType === 'CALL' 
                ? `This call option profits if ${opportunity.id.split('-')[1]?.toUpperCase()} moves above $${opportunity.strikePrice} before expiration.`
                : `This put option profits if ${opportunity.id.split('-')[1]?.toUpperCase()} moves below $${opportunity.strikePrice} before expiration.`
              }
            </p>
            <div className="mt-2 text-xs text-gray-400">
              {selectedDuration === 'weekly' 
                ? 'Weekly options offer higher potential returns but require faster price movement.'
                : 'Monthly options provide more time for the trade to work but cost more premium.'
              }
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-4">
            <button
              onClick={onClose}
              className="flex-1 px-6 py-3 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleExecuteTrade}
              disabled={isExecuting}
              className={`flex-1 px-6 py-3 rounded-lg transition-colors ${
                opportunity.optionType === 'CALL'
                  ? 'bg-green-600 hover:bg-green-700 text-white'
                  : 'bg-red-600 hover:bg-red-700 text-white'
              } ${isExecuting ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              {isExecuting ? 'Executing...' : `${opportunity.action} ${contractCount} Contract${contractCount > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}