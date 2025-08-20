import { useMutation } from '@tanstack/react-query';
import { queryClient } from '@/lib/queryClient';
import { apiRequest } from '@/lib/queryClient';
import { type TradingOpportunity, type TradeResult, type UserProfile } from '@shared/schema';

interface ForexTradeCardProps {
  opportunity: TradingOpportunity;
  userProfile?: UserProfile;
  onTradeExecuted: (result: TradeResult) => void;
  animationDelay?: number;
}

export default function ForexTradeCard({ opportunity, userProfile, onTradeExecuted, animationDelay = 0 }: ForexTradeCardProps) {
  const executeTradeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/trades/execute", {
        opportunityId: opportunity.id,
        amount: parseFloat(opportunity.entryPrice.replace(/[$,]/g, '')),
        userId: userProfile?.id || 'user-1',
        selectedBroker: userProfile?.selectedBroker || 'ninjatrader-sim',
        isLiveTrading: userProfile?.isLiveTrading || false,
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Trade execution failed');
      }

      return response.json();
    },
    onSuccess: (result) => {
      onTradeExecuted(result);
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      // Invalidate user balance to refresh portfolio
      if (userProfile?.id) {
        queryClient.invalidateQueries({ queryKey: [`/api/auth/balance/${userProfile.id}`] });
      }
    },
  });

  const handleExecuteTrade = () => {
    executeTradeMutation.mutate();
  };

  const actionColor = opportunity.action === "BUY" ? "bg-trading-success" : "bg-trading-warning";
  const confidenceBarColor = opportunity.confidence >= 80 ? "bg-trading-success" : "bg-trading-warning";

  const cardClassName = opportunity.isMicro 
    ? "trade-card bg-gradient-to-br from-trading-gray to-yellow-900/20 rounded-xl shadow-xl border border-yellow-500/30 overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-yellow-400/50 animate-slide-up"
    : "trade-card bg-trading-gray rounded-xl shadow-xl border border-gray-700 overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-slide-up";

  return (
    <div 
      className={cardClassName}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <div className="flex items-center space-x-2 mb-1">
              <h3 className="text-xl font-bold text-white">{opportunity.name}</h3>
              {opportunity.isMicro && (
                <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs rounded-full border border-yellow-500/30">
                  Micro/Nano
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm">{opportunity.type}</p>
          </div>
          <div className="text-right">
            <div className={`${actionColor} text-white px-3 py-1 rounded-full text-sm font-semibold`}>
              {opportunity.action}
            </div>
          </div>
        </div>

        {/* Forex-specific details */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">Entry Price</div>
            <div className="text-lg font-bold text-white">{opportunity.entryPrice}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Lot Size</div>
            <div className="text-sm font-semibold text-blue-400">{opportunity.lotSize}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Pip Value</div>
            <div className="text-sm font-semibold text-green-400">{opportunity.pipValue}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Spread</div>
            <div className="text-sm font-semibold text-yellow-400">{opportunity.spread}</div>
          </div>
        </div>

        {/* Target and Risk Management */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">Target</div>
            <div className="text-sm font-bold text-green-400">{opportunity.targetPips}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Stop Loss</div>
            <div className="text-sm font-bold text-red-400">{opportunity.stopLoss}</div>
          </div>
        </div>

        {/* Margin and Leverage */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <div className="text-xs text-gray-400 mb-1">Margin Required</div>
            <div className="text-sm font-semibold text-blue-400">{opportunity.marginRequired}</div>
          </div>
          <div>
            <div className="text-xs text-gray-400 mb-1">Leverage</div>
            <div className="text-sm font-semibold text-purple-400">{opportunity.leverage}</div>
          </div>
        </div>

        {/* Profit/Loss Analysis */}
        <div className="bg-gray-800/50 rounded-lg p-3 mb-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-xs text-gray-400 mb-1">Potential Gain</div>
              <div className="text-base font-bold text-green-400">{opportunity.potentialGain}</div>
            </div>
            <div>
              <div className="text-xs text-gray-400 mb-1">Risk</div>
              <div className="text-base font-bold text-red-400">{opportunity.risk}</div>
            </div>
          </div>
          <div className="mt-2 pt-2 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-xs text-gray-400">Net Profit</span>
              <span className="text-base font-bold text-green-400">{opportunity.netProfit}</span>
            </div>
          </div>
        </div>

        {/* Confidence and Execute */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-2">
            <span className="text-sm text-gray-400">Confidence</span>
            <span className="text-sm font-bold text-white">{opportunity.confidence}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div 
              className={`${confidenceBarColor} h-2 rounded-full transition-all duration-300`}
              style={{ width: `${opportunity.confidence}%` }}
            ></div>
          </div>
        </div>

        {/* Execute Trade Button */}
        <button
          onClick={handleExecuteTrade}
          disabled={executeTradeMutation.isPending}
          className={`w-full ${actionColor} hover:opacity-90 text-white font-bold py-3 px-4 rounded-lg transition-all duration-200 transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none`}
        >
          {executeTradeMutation.isPending ? (
            <div className="flex items-center justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              Executing...
            </div>
          ) : (
            <>
              <i className="fas fa-bolt mr-2"></i>
              {opportunity.action} {opportunity.lotSize}
            </>
          )}
        </button>

        {/* Trading Rationale */}
        <div className="mt-4 p-3 bg-gray-800/30 rounded-lg">
          <div className="text-xs text-gray-400 mb-1">Analysis</div>
          <p className="text-xs text-gray-300 leading-relaxed">{opportunity.rationale}</p>
        </div>
      </div>
    </div>
  );
}