import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type TradingOpportunity, type TradeResult } from "@shared/schema";
import TradeCard from "./TradeCard";
import FuturesTradeCard from "./FuturesTradeCard";
import ForexBotCard from "./ForexBotCard";
import SimpleLiveChart from "./SimpleLiveChart";
import OptionsTradeWindow from "./OptionsTradeWindow";

interface TradingOpportunitiesProps {
  selectedMarket: string;
  onTradeExecuted: (result: TradeResult) => void;
  userProfile?: { id: string; selectedBroker?: string; isLiveTrading: boolean };
}

export default function TradingOpportunities({ selectedMarket, onTradeExecuted, userProfile }: TradingOpportunitiesProps) {
  const queryClient = useQueryClient();
  const [optionsTradeWindow, setOptionsTradeWindow] = useState<{ isOpen: boolean; opportunity: TradingOpportunity | null }>({
    isOpen: false,
    opportunity: null
  });
  
  const { data: opportunities, isLoading, error, isFetching } = useQuery<TradingOpportunity[]>({
    queryKey: ["/api/opportunities", selectedMarket],
    enabled: !!selectedMarket,
    staleTime: selectedMarket === 'stocks' ? 10 * 60 * 1000 : 5 * 60 * 1000, // 10 minutes for stocks due to API delays
    refetchInterval: selectedMarket === 'stocks' ? 10 * 60 * 1000 : 5 * 60 * 1000, // Longer interval for stocks
    gcTime: 15 * 60 * 1000, // Keep cached data for 15 minutes
    retry: 1, // Reduced retries for faster failure
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/opportunities", selectedMarket] });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400"></div>
        <div className="ml-4 text-gray-300">
          <div>Loading {selectedMarket} opportunities...</div>
          {selectedMarket === 'stocks' && (
            <div className="text-sm text-gray-500 mt-1">
              Fetching real-time market data - this may take up to 60 seconds
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-400 text-lg mb-2">Failed to load trading opportunities</div>
        <div className="text-gray-400">Please try again later</div>
      </div>
    );
  }

  if (!opportunities || opportunities.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-400 text-lg">No trading opportunities available</div>
        <div className="text-gray-500">Please select a different market</div>
      </div>
    );
  }

  const hasMicroTrades = opportunities?.some(opp => opp.isMicro);

  return (
    <div className="animate-fade-in">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-semibold text-white">
          {selectedMarket.charAt(0).toUpperCase() + selectedMarket.slice(1)} Trading Opportunities
          {isFetching && <i className="fas fa-spinner fa-spin ml-3 text-trading-light-blue"></i>}
        </h2>
        <div className="flex items-center space-x-4">
          <button
            onClick={handleRefresh}
            disabled={isLoading || isFetching}
            className="flex items-center text-sm text-trading-light-blue hover:text-blue-400 transition-colors disabled:opacity-50"
          >
            <i className={`fas fa-sync-alt mr-2 ${isFetching ? 'fa-spin' : ''}`}></i>
            Refresh Data
          </button>
          <div className="flex items-center text-sm text-gray-400">
            <i className="fas fa-wifi mr-2 text-trading-success"></i>
            <span>Live Data</span>
          </div>
        </div>
      </div>

      {selectedMarket === "commodities" && (
        <div className="bg-gradient-to-r from-amber-900/40 to-orange-900/50 border border-amber-500/40 rounded-xl p-6 mb-6">
          <div className="flex items-start space-x-4">
            <i className="fas fa-chart-line text-amber-400 text-2xl mt-1"></i>
            <div>
              <h3 className="text-white font-semibold text-lg mb-2">Professional Futures Trading</h3>
              <p className="text-gray-200 text-sm leading-relaxed mb-3">
                Trade standardized futures contracts on major exchanges (CME, NYMEX, CBOT, ICE) with full contract specifications. 
                Advanced strategies including trend following, supply-demand analysis, and seasonal patterns.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-amber-200">
                <span><i className="fas fa-shield-alt mr-2 text-green-400"></i>Professional risk management</span>
                <span><i className="fas fa-chart-bar mr-2 text-blue-400"></i>Real-time margin calculations</span>
                <span><i className="fas fa-bullseye mr-2 text-red-400"></i>Stop-loss & take-profit levels</span>
                <span><i className="fas fa-sync mr-2 text-purple-400"></i>Live market data integration</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedMarket === "crypto" && hasMicroTrades && (
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <i className="fab fa-bitcoin text-purple-400 text-xl mt-1"></i>
            <div>
              <h3 className="text-white font-semibold mb-2">Micro Crypto Futures Available</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Trade cryptocurrency futures with fractional contract sizes starting from $0.06. Micro Bitcoin (0.1 BTC) and Micro Ethereum (0.1 ETH) 
                contracts provide precise exposure to major cryptocurrencies with reduced capital requirements.
              </p>
              <div className="flex items-center space-x-4 mt-2 text-xs text-purple-300">
                <span><i className="fas fa-check-circle mr-1"></i>Fractional crypto exposure</span>
                <span><i className="fas fa-check-circle mr-1"></i>CME-style micro contracts</span>
                <span><i className="fas fa-check-circle mr-1"></i>Precise risk control</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {selectedMarket === "forex" && (
        <div className="bg-gradient-to-r from-blue-900/40 to-green-900/50 border border-blue-500/40 rounded-xl p-6 mb-6">
          <div className="flex items-start space-x-4">
            <i className="fas fa-robot text-blue-400 text-2xl mt-1"></i>
            <div>
              <h3 className="text-white font-semibold text-lg mb-2">Advanced Forex Trading Bots</h3>
              <p className="text-gray-200 text-sm leading-relaxed mb-3">
                Experience professional forex trading with advanced AI-powered bots featuring up to 93% win rates. 
                Automated risk management, smart position reversal, and session-optimized strategies from proven trading systems.
              </p>
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 text-xs text-blue-200">
                <span><i className="fas fa-chart-line mr-2 text-green-400"></i>93% Win Rate Automation</span>
                <span><i className="fas fa-brain mr-2 text-purple-400"></i>AI Reversal Logic</span>
                <span><i className="fas fa-shield-alt mr-2 text-blue-400"></i>Smart Risk Management</span>
                <span><i className="fas fa-clock mr-2 text-yellow-400"></i>Session Optimization</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Live Chart for Commodities */}
      {selectedMarket === "commodities" && (
        <div className="mb-8">
          <SimpleLiveChart market="commodities" />
        </div>
      )}

      {/* Live Chart for Crypto */}
      {selectedMarket === "crypto" && (
        <div className="mb-8">
          <SimpleLiveChart market="crypto" />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="trading-cards-container">
        {opportunities.map((opportunity, index) => {
          if (opportunity.market === 'commodities' && opportunity.strategy) {
            return (
              <FuturesTradeCard
                key={opportunity.id}
                opportunity={opportunity}
                onTradeExecuted={onTradeExecuted}
                animationDelay={index * 100}
                userProfile={userProfile}
              />
            );
          } else if (opportunity.market === 'forex') {
            return (
              <ForexBotCard
                key={opportunity.id}
                opportunity={opportunity}
              />
            );
          } else {
            return (
              <TradeCard
                key={opportunity.id}
                opportunity={opportunity}
                onTradeExecuted={onTradeExecuted}
                animationDelay={index * 100}
                userProfile={userProfile}
                onOpenOptionsWindow={(opp) => setOptionsTradeWindow({ isOpen: true, opportunity: opp })}
              />
            );
          }
        })}
      </div>

      {/* Options Trade Window */}
      {optionsTradeWindow.isOpen && optionsTradeWindow.opportunity && (
        <OptionsTradeWindow
          opportunity={optionsTradeWindow.opportunity}
          isOpen={optionsTradeWindow.isOpen}
          onClose={() => setOptionsTradeWindow({ isOpen: false, opportunity: null })}
          onExecuteTrade={async (opportunity, duration, contracts) => {
            // Handle the trade execution here
            console.log('Executing options trade:', opportunity, duration, contracts);
            setOptionsTradeWindow({ isOpen: false, opportunity: null });
          }}
          containerRef={{ current: document.getElementById('trading-cards-container') }}
        />
      )}
    </div>
  );
}
