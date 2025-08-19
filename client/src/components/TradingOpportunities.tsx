import { useQuery, useQueryClient } from "@tanstack/react-query";
import { type TradingOpportunity, type TradeResult } from "@shared/schema";
import TradeCard from "./TradeCard";

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
