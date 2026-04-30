import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type TradingOpportunity, type TradeResult } from "@shared/schema";
import { BarChart3 } from "lucide-react";
import { useUser } from "@/contexts/UserContext";
import OptionsDetailsModal from './OptionsDetailsModal';
import OptionsTradeModal from './OptionsTradeModal';

interface TradeCardProps {
  opportunity: TradingOpportunity;
  onTradeExecuted: (result: TradeResult) => void;
  animationDelay: number;
  onOpenOptionsWindow?: (opportunity: TradingOpportunity) => void;
}

export default function TradeCard({ opportunity, onTradeExecuted, animationDelay, onOpenOptionsWindow }: TradeCardProps) {
  const queryClient = useQueryClient();
  const { user } = useUser();
  const [showChart, setShowChart] = useState(false);
  const [showTradeModal, setShowTradeModal] = useState(false);

  const invalidateUserBalance = () => {
    if (user?.id) {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/balance', user.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user', user.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/trades/history', user.id] });
    }
    queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
  };

  const executeTradeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/trades/execute", {
        opportunityId: opportunity.id,
        userId: user?.id || 'demo-user',
        selectedBroker: user?.selectedBroker || 'ninjatrader-sim',
        isLiveTrading: user?.isLiveTrading || false,
      });
      return response.json();
    },
    onSuccess: (result: TradeResult) => {
      onTradeExecuted(result);
      invalidateUserBalance();
    },
  });

  // FIX: useMutation must be at the top level — not inside a callback function
  const enhancedTradeMutation = useMutation({
    mutationFn: async (params: { duration: 'weekly' | 'monthly'; contracts: number }) => {
      const response = await apiRequest("POST", "/api/trades/execute", {
        opportunityId: opportunity.id,
        userId: user?.id || 'demo-user',
        selectedBroker: user?.selectedBroker || 'ninjatrader-sim',
        isLiveTrading: user?.isLiveTrading || false,
        duration: params.duration,
        contractCount: params.contracts,
        optionType: opportunity.optionType,
      });
      return response.json();
    },
    onSuccess: (result: TradeResult) => {
      onTradeExecuted(result);
      invalidateUserBalance();
    },
  });

  const handleExecuteTrade = () => {
    executeTradeMutation.mutate();
  };

  const handleTradeFromModal = async (_opp: TradingOpportunity) => {
    return new Promise<void>((resolve, reject) => {
      executeTradeMutation.mutate(undefined, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  };

  const handleOptionsTradeExecute = async (_opp: TradingOpportunity, duration: 'weekly' | 'monthly', contracts: number) => {
    return new Promise<void>((resolve, reject) => {
      enhancedTradeMutation.mutate({ duration, contracts }, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error),
      });
    });
  };

  const actionColor = opportunity.action === "BUY" ? "bg-trading-success" : "bg-trading-warning";
  const confidenceBarColor = opportunity.confidence >= 80 ? "bg-trading-success" : "bg-trading-warning";

  const cardClassName = opportunity.isMicro
    ? "trade-card bg-gradient-to-br from-trading-gray to-purple-900/20 rounded-xl shadow-xl border border-purple-500/30 overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-purple-400/50 animate-slide-up"
    : "trade-card bg-trading-gray rounded-xl shadow-xl border border-gray-700 overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-slide-up";

  const isExecuting = executeTradeMutation.isPending || enhancedTradeMutation.isPending;

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
                <span className="bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs px-2 py-1 rounded-full font-semibold animate-pulse">
                  {opportunity.type.includes("Nano") ? "NANO" : "MICRO"}
                </span>
              )}
            </div>
            <p className="text-gray-400 text-sm">{opportunity.type}</p>
            {opportunity.isMicro && opportunity.contractSize && (
              <p className="text-purple-300 text-xs mt-1">
                <i className="fas fa-atom mr-1"></i>
                Contract: {opportunity.contractSize}
              </p>
            )}
            {opportunity.market === "options" && (
              <div className="flex items-center space-x-3 mt-2">
                <span className={`px-2 py-1 rounded text-xs font-semibold ${
                  opportunity.optionType === "CALL"
                    ? "bg-green-500/20 text-green-400"
                    : "bg-red-500/20 text-red-400"
                }`}>
                  {opportunity.optionType}
                </span>
                <span className="text-gray-300 text-xs">Strike: {opportunity.strikePrice}</span>
                <span className="text-gray-300 text-xs">Exp: {opportunity.expirationDate?.split('-').slice(1).join('/')}</span>
              </div>
            )}
          </div>
          <div className={`${actionColor} text-white px-2 py-1 rounded-full text-xs font-semibold`}>
            <span>{opportunity.action}</span>
          </div>
        </div>

        <div className="space-y-3 mb-6 bg-gradient-to-br from-gray-800/70 to-gray-900/90 p-4 rounded-lg backdrop-blur-sm border border-gray-600/50">
          <div className="flex justify-between items-center p-2 bg-gradient-to-r from-blue-900/30 to-indigo-900/30 rounded">
            <span className="text-blue-200 font-medium">Entry Price:</span>
            <span className="text-white font-bold">{opportunity.entryPrice}</span>
          </div>
          {opportunity.isMicro && opportunity.minimumTrade && (
            <div className="flex justify-between items-center p-2 bg-gradient-to-r from-purple-900/30 to-pink-900/30 rounded">
              <span className="text-purple-200 font-medium">Min. Trade:</span>
              <span className="text-purple-100 font-bold">{opportunity.minimumTrade}</span>
            </div>
          )}
          {opportunity.market === "options" && opportunity.premium && (
            <div className="flex justify-between items-center p-2 bg-gradient-to-r from-cyan-900/30 to-blue-900/30 rounded">
              <span className="text-cyan-200 font-medium">Premium:</span>
              <span className="text-cyan-100 font-bold">{opportunity.premium}</span>
            </div>
          )}
          {opportunity.market === "options" && opportunity.underlyingPrice && (
            <div className="flex justify-between items-center p-2 bg-gradient-to-r from-indigo-900/30 to-purple-900/30 rounded">
              <span className="text-indigo-200 font-medium">Underlying:</span>
              <span className="text-indigo-100 font-bold">{opportunity.underlyingPrice}</span>
            </div>
          )}
          {opportunity.market === "options" && opportunity.impliedVolatility && (
            <div className="flex justify-between items-center p-2 bg-gradient-to-r from-violet-900/30 to-purple-900/30 rounded">
              <span className="text-violet-200 font-medium">IV:</span>
              <span className="text-violet-100 font-bold">{opportunity.impliedVolatility}</span>
            </div>
          )}
          <div className="flex justify-between items-center p-2 bg-gradient-to-r from-red-900/40 to-red-800/40 rounded">
            <span className="text-red-200 font-medium">Risk:</span>
            <span className="text-red-100 font-bold">{opportunity.risk}</span>
          </div>
          <div className="flex justify-between items-center p-2 bg-gradient-to-r from-green-900/40 to-emerald-800/40 rounded">
            <span className="text-green-200 font-medium">Potential Gain:</span>
            <span className="text-green-100 font-bold">{opportunity.potentialGain}</span>
          </div>
          <div className="border-t border-gray-500/50 pt-3 mt-3">
            <div className="flex justify-between items-center p-3 bg-gradient-to-r from-emerald-800/60 to-teal-800/60 rounded-lg border border-emerald-600/30">
              <span className="text-emerald-100 font-bold">Net Profit:</span>
              <span className="text-emerald-50 font-bold text-xl shadow-lg">{opportunity.netProfit}</span>
            </div>
          </div>
        </div>

        <div className="mb-4">
          <div className="flex justify-between text-sm text-gray-400 mb-1">
            <span>Confidence</span>
            <span>{opportunity.confidence}%</span>
          </div>
          <div className="w-full bg-gray-700 rounded-full h-2">
            <div
              className={`${confidenceBarColor} h-2 rounded-full transition-all duration-500`}
              style={{ width: `${opportunity.confidence}%` }}
            ></div>
          </div>
        </div>

        <div className="mb-6 p-4 bg-gradient-to-br from-blue-900/40 to-indigo-900/60 rounded-lg border border-blue-600/30 backdrop-blur-sm">
          <div className="flex items-start space-x-3">
            <i className="fas fa-lightbulb text-yellow-400 text-lg mt-1"></i>
            <div>
              <h4 className="text-lg font-bold text-blue-100 mb-2">Why Trade Now</h4>
              <p className="text-sm text-blue-200 leading-relaxed font-medium">{opportunity.rationale}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={opportunity.market === 'options' ? () => onOpenOptionsWindow?.(opportunity) : handleExecuteTrade}
            disabled={isExecuting}
            className="w-full bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white font-bold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg border border-blue-500/30"
          >
            {isExecuting ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Executing...
              </>
            ) : (
              <>
                <i className="fas fa-play mr-2"></i>
                {opportunity.market === 'options' ? 'Configure & Execute Trade' : 'Execute Trade'}
              </>
            )}
          </button>
        </div>

        {opportunity.market === 'options' && showChart && (
          <OptionsDetailsModal
            opportunity={opportunity}
            isOpen={showChart}
            onClose={() => setShowChart(false)}
            onExecuteTrade={handleTradeFromModal}
          />
        )}
        {opportunity.market === 'options' && showTradeModal && (
          <OptionsTradeModal
            opportunity={opportunity}
            isOpen={showTradeModal}
            onClose={() => setShowTradeModal(false)}
            onExecuteTrade={handleOptionsTradeExecute}
          />
        )}
      </div>
    </div>
  );
}
