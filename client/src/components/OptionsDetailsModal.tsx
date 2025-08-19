import { useState } from 'react';
import { X } from 'lucide-react';
import { TradingOpportunity } from '@shared/schema';
import OptionsChart from './OptionsChart';

interface OptionsDetailsModalProps {
  opportunity: TradingOpportunity;
  isOpen: boolean;
  onClose: () => void;
  onExecuteTrade: (opportunity: TradingOpportunity) => void;
}

export default function OptionsDetailsModal({ 
  opportunity, 
  isOpen, 
  onClose, 
  onExecuteTrade 
}: OptionsDetailsModalProps) {
  const [isExecuting, setIsExecuting] = useState(false);

  if (!isOpen) return null;

  const handleExecuteTrade = async () => {
    setIsExecuting(true);
    try {
      await onExecuteTrade(opportunity);
      onClose();
    } catch (error) {
      console.error('Trade execution failed:', error);
    } finally {
      setIsExecuting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-trading-card rounded-lg w-full max-w-6xl max-h-[90vh] overflow-y-auto">
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

        {/* Chart Section */}
        {opportunity.market === 'options' && (
          <div className="p-6">
            <OptionsChart
              optionId={opportunity.id}
              symbol={opportunity.id.split('-')[1]?.toUpperCase() || 'AAPL'}
              strikePrice={opportunity.strikePrice || '200'}
              optionType={opportunity.optionType as 'CALL' | 'PUT' || 'CALL'}
              expirationDate={opportunity.expirationDate || '2025-09-18'}
            />
          </div>
        )}

        {/* Details Section */}
        <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Option Details */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white mb-4">Option Details</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-gray-400 text-sm">Premium</div>
                <div className="text-white text-lg font-semibold">{opportunity.entryPrice}</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-gray-400 text-sm">Strike Price</div>
                <div className="text-white text-lg font-semibold">{opportunity.strikePrice}</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-gray-400 text-sm">Expiration</div>
                <div className="text-white text-lg font-semibold">{opportunity.expirationDate}</div>
              </div>
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-gray-400 text-sm">Implied Volatility</div>
                <div className="text-white text-lg font-semibold">{opportunity.impliedVolatility}</div>
              </div>
            </div>

            {opportunity.contractSize && (
              <div className="bg-gray-800 p-4 rounded-lg">
                <div className="text-gray-400 text-sm">Contract Size</div>
                <div className="text-white text-lg font-semibold">{opportunity.contractSize}</div>
              </div>
            )}
          </div>

          {/* Risk/Reward */}
          <div className="space-y-4">
            <h3 className="text-xl font-semibold text-white mb-4">Risk & Reward</h3>
            
            <div className="space-y-3">
              <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                <span className="text-gray-400">Entry Price</span>
                <span className="text-white font-semibold">{opportunity.entryPrice}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-red-900 bg-opacity-30 rounded-lg">
                <span className="text-gray-400">Maximum Risk</span>
                <span className="text-red-400 font-semibold">{opportunity.risk}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-green-900 bg-opacity-30 rounded-lg">
                <span className="text-gray-400">Potential Gain</span>
                <span className="text-green-400 font-semibold">{opportunity.potentialGain}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-blue-900 bg-opacity-30 rounded-lg">
                <span className="text-gray-400">Net Profit</span>
                <span className="text-blue-400 font-semibold">{opportunity.netProfit}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-gray-800 rounded-lg">
                <span className="text-gray-400">Confidence</span>
                <span className="text-white font-semibold">{opportunity.confidence}%</span>
              </div>
            </div>
          </div>
        </div>

        {/* Trading Rationale */}
        <div className="p-6 border-t border-gray-700">
          <h3 className="text-xl font-semibold text-white mb-4">Trading Rationale</h3>
          <div className="bg-gray-800 p-4 rounded-lg">
            <p className="text-gray-300 leading-relaxed">{opportunity.rationale}</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-6 border-t border-gray-700 flex justify-end space-x-4">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleExecuteTrade}
            disabled={isExecuting}
            className={`px-6 py-2 rounded-lg transition-colors ${
              opportunity.action === 'BUY'
                ? 'bg-green-600 hover:bg-green-700 text-white'
                : 'bg-red-600 hover:bg-red-700 text-white'
            } ${isExecuting ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            {isExecuting ? 'Executing...' : `${opportunity.action} Option`}
          </button>
        </div>
      </div>
    </div>
  );
}