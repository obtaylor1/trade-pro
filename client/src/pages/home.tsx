import { useState } from "react";
import Header from "@/components/Header";
import MarketSelector from "@/components/MarketSelector";
import TradingOpportunities from "@/components/TradingOpportunities";
import TradeResultModal from "@/components/TradeResultModal";
import { type TradeResult } from "@shared/schema";

export default function Home() {
  const [selectedMarket, setSelectedMarket] = useState<"stocks" | "commodities" | "crypto">("stocks");
  const [tradeResult, setTradeResult] = useState<TradeResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTradeExecuted = (result: TradeResult) => {
    setTradeResult(result);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTradeResult(null);
  };

  return (
    <div className="bg-trading-dark text-white font-inter min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-6">Market Analysis Dashboard</h1>
          <MarketSelector 
            selectedMarket={selectedMarket} 
            onSelectMarket={setSelectedMarket} 
          />
        </div>

        <TradingOpportunities 
          selectedMarket={selectedMarket}
          onTradeExecuted={handleTradeExecuted}
        />
      </main>

      <TradeResultModal 
        isOpen={isModalOpen}
        tradeResult={tradeResult}
        onClose={handleCloseModal}
      />
    </div>
  );
}
