import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type TradingOpportunity, type TradeResult } from "@shared/schema";
import TradeCard from "./TradeCard";
import SimpleLiveChart from "./SimpleLiveChart";

interface TradingOpportunitiesProps {
  selectedMarket: string;
  onTradeExecuted: (result: TradeResult) => void;
}

export default function TradingOpportunities({ selectedMarket, onTradeExecuted }: TradingOpportunitiesProps) {
  const queryClient = useQueryClient();
  
  const { data: opportunities, isLoading, error, isFetching } = useQuery<TradingOpportunity[]>({
    queryKey: ["/api/opportunities", selectedMarket],
    enabled: !!selectedMarket,
    staleTime: 5 * 60 * 1000, // 5 minutes
    refetchInterval: 5 * 60 * 1000, // Auto-refresh every 5 minutes
  });

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["/api/opportunities", selectedMarket] });
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-trading-light-blue"></div>
        <span className="ml-4 text-gray-300">Loading opportunities...</span>
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

      {selectedMarket === "commodities" && hasMicroTrades && (
        <div className="bg-gradient-to-r from-purple-900/30 to-pink-900/30 border border-purple-500/30 rounded-xl p-4 mb-6">
          <div className="flex items-start space-x-3">
            <i className="fas fa-atom text-purple-400 text-xl mt-1"></i>
            <div>
              <h3 className="text-white font-semibold mb-2">Micro & Nano Trading Available</h3>
              <p className="text-gray-300 text-sm leading-relaxed">
                Trade commodities with fractional contracts starting as low as $0.30. Micro contracts represent 1/10th to 1/250th of standard size, 
                enabling precise risk management and accessible entry points for all investors.
              </p>
              <div className="flex items-center space-x-4 mt-2 text-xs text-purple-300">
                <span><i className="fas fa-check-circle mr-1"></i>Lower capital requirements</span>
                <span><i className="fas fa-check-circle mr-1"></i>Precise position sizing</span>
                <span><i className="fas fa-check-circle mr-1"></i>Reduced risk exposure</span>
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

      {/* Live Chart for Commodities */}
      {selectedMarket === "commodities" && (
        <div className="mb-8">
          <SimpleLiveChart />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {opportunities.map((opportunity, index) => (
          <TradeCard
            key={opportunity.id}
            opportunity={opportunity}
            onTradeExecuted={onTradeExecuted}
            animationDelay={index * 100}
          />
        ))}
      </div>
    </div>
  );
}
