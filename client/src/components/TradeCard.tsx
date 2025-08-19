import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { type TradingOpportunity, type TradeResult } from "@shared/schema";

interface TradeCardProps {
  opportunity: TradingOpportunity;
  onTradeExecuted: (result: TradeResult) => void;
  animationDelay: number;
}

export default function TradeCard({ opportunity, onTradeExecuted, animationDelay }: TradeCardProps) {
  const queryClient = useQueryClient();
  
  const executeTradeMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/trades/execute", {
        opportunityId: opportunity.id,
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

  const actionColor = opportunity.action === "BUY" ? "bg-trading-success" : "bg-trading-warning";
  const confidenceBarColor = opportunity.confidence >= 80 ? "bg-trading-success" : "bg-trading-warning";

  return (
    <div 
      className="trade-card bg-trading-gray rounded-xl shadow-xl border border-gray-700 overflow-hidden transform transition-all duration-300 hover:scale-105 hover:shadow-2xl animate-slide-up"
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      <div className="p-6">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-xl font-bold text-white">{opportunity.name}</h3>
            <p className="text-gray-400 text-sm">{opportunity.type}</p>
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
    </div>
  );
}
