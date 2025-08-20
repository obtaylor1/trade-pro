import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "../lib/queryClient";
import type { TradingOpportunity, TradeResult } from "@shared/schema";
import { TrendingUp, TrendingDown, BarChart3, Shield, Target, DollarSign } from "lucide-react";

interface FuturesTradeCardProps {
  opportunity: TradingOpportunity;
  onTradeExecuted: (result: TradeResult) => void;
  animationDelay: number;
  userProfile?: { id: string; selectedBroker?: string; isLiveTrading: boolean };
}

export default function FuturesTradeCard({ 
  opportunity, 
  onTradeExecuted, 
  animationDelay, 
  userProfile 
}: FuturesTradeCardProps) {
  const queryClient = useQueryClient();
  
  const executeTradeMutation = useMutation({
    mutationFn: async (tradeData: any) => {
      return apiRequest("/api/trades/execute", "POST", tradeData);
    },
    onSuccess: (result) => {
      onTradeExecuted(result);
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
    },
    onError: (error) => {
      console.error("Trade execution failed:", error);
    },
  });

  const handleExecuteTrade = async () => {
    try {
      await executeTradeMutation.mutateAsync({
        opportunityId: opportunity.id,
        amount: parseFloat(opportunity.marginRequired?.replace(/[$,]/g, '') || '1000'),
        isLiveTrading: userProfile?.isLiveTrading || false,
        selectedBroker: userProfile?.selectedBroker,
      });
    } catch (error) {
      console.error("Failed to execute trade:", error);
    }
  };

  const getExchangeColor = (type: string) => {
    if (type.includes('GC')) return 'text-yellow-400 border-yellow-400/30 bg-yellow-400/10';
    if (type.includes('CL')) return 'text-orange-400 border-orange-400/30 bg-orange-400/10';
    if (type.includes('NG')) return 'text-blue-400 border-blue-400/30 bg-blue-400/10';
    if (type.includes('KC')) return 'text-amber-600 border-amber-600/30 bg-amber-600/10';
    if (type.includes('C')) return 'text-green-400 border-green-400/30 bg-green-400/10';
    if (type.includes('ES')) return 'text-purple-400 border-purple-400/30 bg-purple-400/10';
    return 'text-gray-400 border-gray-400/30 bg-gray-400/10';
  };

  const actionColor = opportunity.action === "BUY" 
    ? "border-l-green-500 bg-gradient-to-r from-green-900/20 to-emerald-900/30" 
    : "border-l-red-500 bg-gradient-to-r from-red-900/20 to-rose-900/30";

  return (
    <div 
      className={`bg-trading-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105 hover:-translate-y-1 border-l-4 ${actionColor} animate-slide-up`}
      style={{ animationDelay: `${animationDelay}ms` }}
    >
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h3 className="text-xl font-bold text-white mb-1">{opportunity.name}</h3>
          <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${getExchangeColor(opportunity.type)}`}>
            <BarChart3 className="h-4 w-4 mr-1" />
            {opportunity.type}
          </div>
        </div>
        <div className="text-right">
          <div className="flex items-center mb-1">
            {opportunity.action === "BUY" ? (
              <TrendingUp className="h-5 w-5 text-green-400 mr-1" />
            ) : (
              <TrendingDown className="h-5 w-5 text-red-400 mr-1" />
            )}
            <span className={`font-bold text-lg ${
              opportunity.action === "BUY" ? "text-green-400" : "text-red-400"
            }`}>
              {opportunity.action}
            </span>
          </div>
          <div className="text-2xl font-bold text-white">{opportunity.entryPrice}</div>
        </div>
      </div>

      {/* Futures Contract Details */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="bg-gradient-to-br from-blue-800/40 to-indigo-800/60 p-3 rounded-lg border border-blue-600/30">
          <div className="text-blue-200 text-xs font-medium">Contract Size</div>
          <div className="text-white text-sm font-bold">{opportunity.contractSize}</div>
        </div>
        <div className="bg-gradient-to-br from-purple-800/40 to-violet-800/60 p-3 rounded-lg border border-purple-600/30">
          <div className="text-purple-200 text-xs font-medium">Margin Required</div>
          <div className="text-white text-sm font-bold">{opportunity.marginRequired}</div>
        </div>
        <div className="bg-gradient-to-br from-green-800/40 to-emerald-800/60 p-3 rounded-lg border border-green-600/30">
          <div className="text-green-200 text-xs font-medium">Leverage</div>
          <div className="text-white text-sm font-bold">{opportunity.leverage}</div>
        </div>
        <div className="bg-gradient-to-br from-orange-800/40 to-amber-800/60 p-3 rounded-lg border border-orange-600/30">
          <div className="text-orange-200 text-xs font-medium">Tick Value</div>
          <div className="text-white text-sm font-bold">{opportunity.tickValue}</div>
        </div>
      </div>

      {/* Strategy & Risk Management */}
      <div className="mb-4 p-3 bg-gradient-to-r from-slate-800/50 to-gray-800/70 rounded-lg border border-slate-600/30">
        <div className="flex items-center mb-2">
          <Shield className="h-4 w-4 text-cyan-400 mr-2" />
          <span className="text-cyan-200 text-sm font-medium">Strategy: {opportunity.strategy}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="flex items-center">
            <Target className="h-3 w-3 text-red-400 mr-1" />
            <span className="text-red-200">Stop: {opportunity.stopLoss}</span>
          </div>
          <div className="flex items-center">
            <Target className="h-3 w-3 text-green-400 mr-1" />
            <span className="text-green-200">Target: {opportunity.takeProfit}</span>
          </div>
        </div>
      </div>

      {/* Risk/Reward Analysis */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <div className="text-center p-2 bg-gradient-to-br from-red-800/50 to-red-900/70 rounded border border-red-600/40">
          <div className="text-red-200 text-xs">Max Risk</div>
          <div className="text-red-100 font-bold text-sm">{opportunity.risk}</div>
        </div>
        <div className="text-center p-2 bg-gradient-to-br from-green-800/50 to-emerald-900/70 rounded border border-green-600/40">
          <div className="text-green-200 text-xs">Potential Gain</div>
          <div className="text-green-100 font-bold text-sm">{opportunity.potentialGain}</div>
        </div>
        <div className="text-center p-2 bg-gradient-to-br from-cyan-800/60 to-teal-800/80 rounded border border-cyan-600/40">
          <div className="text-cyan-100 text-xs">Net Profit</div>
          <div className="text-cyan-50 font-bold text-sm">{opportunity.netProfit}</div>
        </div>
      </div>

      {/* Confidence & Expiration */}
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center">
          <div className="w-3 h-3 rounded-full bg-trading-success mr-2"></div>
          <span className="text-gray-300 text-sm">Confidence: </span>
          <span className="text-white font-bold ml-1">{opportunity.confidence}%</span>
        </div>
        <div className="text-right">
          <div className="text-gray-400 text-xs">Expires</div>
          <div className="text-white text-sm font-medium">{opportunity.expirationDate}</div>
        </div>
      </div>

      {/* Trading Rationale */}
      <div className="mb-6 p-3 bg-gradient-to-br from-gray-800/60 to-slate-900/80 rounded-lg border border-gray-600/40">
        <h4 className="text-white font-semibold mb-2 flex items-center">
          <DollarSign className="h-4 w-4 text-yellow-400 mr-2" />
          Market Analysis
        </h4>
        <p className="text-gray-300 text-sm leading-relaxed">{opportunity.rationale}</p>
      </div>

      {/* Execute Button */}
      <button 
        onClick={handleExecuteTrade}
        disabled={executeTradeMutation.isPending}
        className={`w-full font-bold py-4 px-6 rounded-lg transition-all duration-300 transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg border ${
          opportunity.action === "BUY"
            ? "bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white border-green-500/30"
            : "bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-700 hover:to-rose-800 text-white border-red-500/30"
        }`}
      >
        {executeTradeMutation.isPending ? (
          <>
            <i className="fas fa-spinner fa-spin mr-2"></i>
            Executing Trade...
          </>
        ) : (
          <>
            <i className="fas fa-chart-line mr-2"></i>
            {opportunity.action} Futures Contract
          </>
        )}
      </button>
    </div>
  );
}