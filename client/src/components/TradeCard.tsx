import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type TradingOpportunity, type TradeResult } from "@shared/schema";
import { BarChart3 } from "lucide-react";
import OptionsDetailsModal from './OptionsDetailsModal';

interface TradeCardProps {
  opportunity: TradingOpportunity;
  onTradeExecuted: (result: TradeResult) => void;
  animationDelay: number;
  userProfile?: { id: string; selectedBroker?: string; isLiveTrading: boolean };
}

export default function TradeCard({ opportunity, onTradeExecuted, animationDelay, userProfile }: TradeCardProps) {
  const queryClient = useQueryClient();
  const [showChart, setShowChart] = useState(false);
  
  const executeTradeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/trades/execute", {
        opportunityId: opportunity.id,
        userId: userProfile?.id || 'user-1',
        selectedBroker: userProfile?.selectedBroker || 'ninjatrader-sim',
        isLiveTrading: userProfile?.isLiveTrading || false,
      });
      return response.json();
    },
    onSuccess: (result: TradeResult) => {
      onTradeExecuted(result);
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
    },
  });

  const handleExecuteTrade = () => {
    executeTradeMutation.mutate();
  };

  const handleTradeFromModal = async (opportunity: TradingOpportunity) => {
    return new Promise<void>((resolve, reject) => {
      executeTradeMutation.mutate(undefined, {
        onSuccess: () => resolve(),
        onError: (error) => reject(error)
      });
    });
  };

  const actionColor = opportunity.action === "BUY" ? "bg-trading-success" : "bg-trading-warning";
  const confidenceBarColor = opportunity.confidence >= 80 ? "bg-trading-success" : "bg-trading-warning";

  const cardClassName = opportunity.isMicro 
    ? "trade-card bg-gradient-to-br from-trading-gray to-purple-900/20 rounded-xl shadow-xl border border-purple-500/30 overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl hover:border-purple-400/50 animate-slide-up"
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

        <div className="space-y-3 mb-6">
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Entry Price:</span>
            <span className="text-white font-semibold">{opportunity.entryPrice}</span>
          </div>
          {opportunity.isMicro && opportunity.minimumTrade && (
            <div className="flex justify-between items-center">
              <span className="text-purple-300 text-sm">Min. Trade:</span>
              <span className="text-purple-300 font-semibold text-sm">{opportunity.minimumTrade}</span>
            </div>
          )}
          {opportunity.market === "options" && opportunity.premium && (
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Premium:</span>
              <span className="text-white font-semibold">{opportunity.premium}</span>
            </div>
          )}
          {opportunity.market === "options" && opportunity.underlyingPrice && (
            <div className="flex justify-between items-center">
              <span className="text-gray-300">Underlying:</span>
              <span className="text-white font-semibold">{opportunity.underlyingPrice}</span>
            </div>
          )}
          {opportunity.market === "options" && opportunity.impliedVolatility && (
            <div className="flex justify-between items-center">
              <span className="text-gray-300">IV:</span>
              <span className="text-white font-semibold">{opportunity.impliedVolatility}</span>
            </div>
          )}
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Risk:</span>
            <span className="text-trading-error font-semibold">{opportunity.risk}</span>
          </div>
          <div className="flex justify-between items-center">
            <span className="text-gray-300">Potential Gain:</span>
            <span className="text-trading-success font-semibold">{opportunity.potentialGain}</span>
          </div>
          <div className="border-t border-gray-600 pt-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 font-medium">Net Profit:</span>
              <span className="text-trading-success font-bold text-lg">{opportunity.netProfit}</span>
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

        <div className="mb-6 p-3 bg-gray-800 rounded-lg border-l-4 border-trading-light-blue">
          <div className="flex items-start space-x-2">
            <i className="fas fa-lightbulb text-trading-light-blue text-sm mt-1"></i>
            <div>
              <h4 className="text-sm font-semibold text-white mb-1">Why Trade Now</h4>
              <p className="text-xs text-gray-300 leading-relaxed">{opportunity.rationale}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {opportunity.market === 'options' && (
            <button 
              onClick={() => setShowChart(true)}
              className="w-full bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-purple-500 flex items-center justify-center"
            >
              <BarChart3 className="h-4 w-4 mr-2" />
              View Real-Time Chart
            </button>
          )}
          
          <button 
            onClick={handleExecuteTrade}
            disabled={executeTradeMutation.isPending}
            className="w-full bg-trading-light-blue hover:bg-blue-600 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {executeTradeMutation.isPending ? (
              <>
                <i className="fas fa-spinner fa-spin mr-2"></i>
                Executing...
              </>
            ) : (
              <>
                <i className="fas fa-play mr-2"></i>
                Execute Trade
              </>
            )}
          </button>
        </div>
        
        {opportunity.market === 'options' && (
          <OptionsDetailsModal
            opportunity={opportunity}
            isOpen={showChart}
            onClose={() => setShowChart(false)}
            onExecuteTrade={handleTradeFromModal}
          />
        )}
      </div>
    </div>
  );
}
