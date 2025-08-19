import { useState } from "react";
import Header from "@/components/Header";
import MarketSelector from "@/components/MarketSelector";
import TradingOpportunities from "@/components/TradingOpportunities";
import TradeResultModal from "@/components/TradeResultModal";
import UserProfileCard from "@/components/UserProfileCard";
import PortfolioSummary from "@/components/PortfolioSummary";
import BrokerDashboard from "@/components/BrokerDashboard";
import { type TradeResult, type UserProfile, type PortfolioPosition } from "@shared/schema";

export default function Home() {
  const [selectedMarket, setSelectedMarket] = useState<"stocks" | "commodities" | "crypto">("commodities");
  const [tradeResult, setTradeResult] = useState<TradeResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Mock user profile - in a real app this would come from authentication
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: "user-1",
    name: "Alex Thompson",
    accountType: "individual",
    availableFunds: 25000,
    virtualFunds: 100000,
    isLiveTrading: false
  });

  // Mock portfolio positions
  const [portfolioPositions] = useState<PortfolioPosition[]>([
    {
      id: "pos-1",
      symbol: "MGC",
      name: "Micro Gold Futures",
      quantity: 5,
      entryPrice: 20.15,
      currentPrice: 20.36,
      marketValue: 101.80,
      unrealizedPnL: 1.05,
      unrealizedPnLPercent: 1.04,
      assetClass: "commodities"
    },
    {
      id: "pos-2", 
      symbol: "MBT",
      name: "Micro Bitcoin Futures",
      quantity: 2,
      entryPrice: 6800.00,
      currentPrice: 6847.50,
      marketValue: 13695.00,
      unrealizedPnL: 95.00,
      unrealizedPnLPercent: 0.70,
      assetClass: "crypto"
    }
  ]);

  const handleTradeExecuted = (result: TradeResult) => {
    setTradeResult(result);
    setIsModalOpen(true);
  };

  const handleToggleTradingMode = (isLive: boolean) => {
    setUserProfile(prev => ({
      ...prev,
      isLiveTrading: isLive
    }));
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTradeResult(null);
  };

  return (
    <div className="bg-trading-dark text-white font-inter min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* User Profile and Trading Mode */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <UserProfileCard 
              userProfile={userProfile}
              onToggleTradingMode={handleToggleTradingMode}
            />
          </div>
          <div>
            <PortfolioSummary 
              positions={portfolioPositions}
              isLiveTrading={userProfile.isLiveTrading}
            />
          </div>
        </div>

        {/* Broker Dashboard - Only show in Live Trading */}
        {userProfile.isLiveTrading && (
          <div className="mb-8">
            <BrokerDashboard isLiveTrading={userProfile.isLiveTrading} />
          </div>
        )}

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
