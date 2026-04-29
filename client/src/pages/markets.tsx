import { useState } from "react";
import MarketSelector from "@/components/MarketSelector";
import TradingOpportunities from "@/components/TradingOpportunities";
import { TradeResult } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";

export default function Markets() {
  const [selectedMarket, setSelectedMarket] = useState<"stocks" | "commodities" | "crypto" | "options" | "forex">("stocks");
  const { toast } = useToast();
  const { user } = useUser();

  const handleTradeExecuted = (result: TradeResult) => {
    toast({
      title: "Trade Executed Successfully!",
      description: `Trade completed in ${selectedMarket} market`,
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="max-w-7xl mx-auto px-4 py-6 space-y-8">

        <div className="text-center">
          <h1 className="text-3xl font-bold text-white mb-2" data-testid="market-analysis-title">
            Market Analysis Dashboard
          </h1>
          <p className="text-gray-400">
            Select a market to view real-time trading opportunities
          </p>
        </div>

        <div className="animate-fade-in">
          <MarketSelector
            selectedMarket={selectedMarket}
            onSelectMarket={setSelectedMarket}
          />
        </div>

        <div className="animate-fade-in">
          <TradingOpportunities
            selectedMarket={selectedMarket}
            onTradeExecuted={handleTradeExecuted}
            userProfile={{
              id: user?.id || 'demo-user',
              selectedBroker: user?.selectedBroker || 'ninjatrader-sim',
              isLiveTrading: user?.isLiveTrading || false,
            }}
          />
        </div>

      </div>
    </div>
  );
}
