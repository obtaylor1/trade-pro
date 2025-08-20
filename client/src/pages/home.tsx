import { useState } from "react";
import Header from "@/components/Header";
import MarketSelector from "@/components/MarketSelector";
import TradingOpportunities from "@/components/TradingOpportunities";
import TradeResultModal from "@/components/TradeResultModal";
import UserProfileCard from "@/components/UserProfileCard";
import PortfolioSummary from "@/components/PortfolioSummary";
import BrokerDashboard from "@/components/BrokerDashboard";
import SimulatorSetupModal from "@/components/SimulatorSetup";
import TradeHistory from "@/components/TradeHistory";
import PortfolioSummaryPage from "@/components/PortfolioSummaryPage";
import UserAuthModal from "@/components/UserAuthModal";
import { type TradeResult, type UserProfile, type PortfolioPosition, type SimulatorSetup } from "@shared/schema";

export default function Home() {
  const [selectedMarket, setSelectedMarket] = useState<"stocks" | "commodities" | "crypto" | "options" | "forex">("commodities");
  const [tradeResult, setTradeResult] = useState<TradeResult | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showSetup, setShowSetup] = useState(false);
  const [showTradeHistory, setShowTradeHistory] = useState(false);
  const [showPortfolioSummary, setShowPortfolioSummary] = useState(false);
  const [showAuth, setShowAuth] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);
  
  // User profile from authentication
  const [userProfile, setUserProfile] = useState<UserProfile>({
    id: "demo-user",
    name: "Demo User",
    accountType: "individual",
    availableFunds: 10000,
    virtualFunds: 10000,
    selectedBroker: "ninjatrader-sim",
    isLiveTrading: false
  });

  const handleUserAuthenticated = (authenticatedUser: any) => {
    setUserProfile({
      id: authenticatedUser.id,
      name: authenticatedUser.name,
      accountType: "individual",
      availableFunds: authenticatedUser.currentBalance,
      virtualFunds: authenticatedUser.startingCapital, // Store starting capital separately
      selectedBroker: authenticatedUser.selectedBroker,
      isLiveTrading: authenticatedUser.isLiveTrading
    });
    setIsAuthenticated(true);
    setShowAuth(false);
    setRequiresAuth(false);
  };

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
    // Check if user is authenticated for simulator mode
    if (!userProfile.isLiveTrading && !isAuthenticated) {
      setRequiresAuth(true);
      setShowAuth(true);
      return;
    }
    
    setTradeResult(result);
    setIsModalOpen(true);
    
    // Update user balance for simulation (for authenticated users, balance is updated server-side)
    if (!isAuthenticated && result.success) {
      const profitAmount = parseFloat(result.expectedProfit.replace(/[$,+-]/g, ''));
      setUserProfile(prev => ({
        ...prev,
        availableFunds: Math.max(0, prev.availableFunds + profitAmount)
      }));
    }
  };

  const handleToggleTradingMode = (isLive: boolean) => {
    // If switching to simulator mode and not authenticated, prompt for auth
    if (!isLive && !isAuthenticated) {
      setRequiresAuth(true);
      setShowAuth(true);
      return;
    }
    
    setUserProfile(prev => ({
      ...prev,
      isLiveTrading: isLive
    }));
  };

  const handleSimulatorSetup = (setup: SimulatorSetup) => {
    setUserProfile(prev => ({
      ...prev,
      name: setup.userName,
      virtualFunds: setup.initialCapital,
      selectedBroker: setup.selectedBroker,
      accountType: setup.accountType,
    }));
    setShowSetup(false);
  };

  const handleResetSimulator = () => {
    setShowSetup(true);
  };

  const handleResetPortfolio = async () => {
    if (isAuthenticated && userProfile.id !== 'demo-user') {
      // Reset authenticated user's balance to starting capital
      try {
        const response = await fetch(`/api/auth/reset-balance/${userProfile.id}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' }
        });
        if (response.ok) {
          const data = await response.json();
          setUserProfile(prev => ({
            ...prev,
            availableFunds: data.currentBalance
          }));
        }
      } catch (error) {
        console.error('Failed to reset portfolio:', error);
      }
    } else {
      // Reset demo user's balance to virtual funds
      setUserProfile(prev => ({
        ...prev,
        availableFunds: prev.virtualFunds
      }));
    }
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setTradeResult(null);
  };

  // Show demo message for unauthenticated users in simulator mode
  const showDemoMessage = !isAuthenticated && !userProfile.isLiveTrading;

  return (
    <div className="bg-trading-dark text-white font-inter min-h-screen">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Demo Notice for Unauthenticated Users */}
        {showDemoMessage && (
          <div className="mb-6 p-4 bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-3">
              <i className="fas fa-info-circle text-blue-400 text-xl"></i>
              <div>
                <h3 className="text-white font-semibold">Demo Mode</h3>
                <p className="text-gray-300 text-sm">
                  You're viewing the trading platform in demo mode. To save your trades and track performance, 
                  <button 
                    onClick={() => setShowAuth(true)} 
                    className="text-blue-400 hover:text-blue-300 underline ml-1"
                  >
                    create a free account
                  </button>.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* User Profile and Trading Mode */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <div className="lg:col-span-2">
            <UserProfileCard 
              userProfile={userProfile}
              onToggleTradingMode={handleToggleTradingMode}
              onResetSimulator={handleResetSimulator}
              onResetPortfolio={handleResetPortfolio}
            />
          </div>
          <div>
            <PortfolioSummary 
              positions={portfolioPositions}
              isLiveTrading={userProfile.isLiveTrading}
              onViewHistory={() => isAuthenticated ? setShowTradeHistory(true) : setShowAuth(true)}
              onViewPortfolio={() => isAuthenticated ? setShowPortfolioSummary(true) : setShowAuth(true)}
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
          userProfile={userProfile}
        />
      </main>

      <TradeResultModal 
        isOpen={isModalOpen}
        tradeResult={tradeResult}
        onClose={handleCloseModal}
      />

      {/* Simulator Setup Modal */}
      {showSetup && (
        <SimulatorSetupModal
          onSetupComplete={handleSimulatorSetup}
          onCancel={() => setShowSetup(false)}
        />
      )}

      {/* Trade History Modal */}
      <TradeHistory
        userId={userProfile.id}
        isVisible={showTradeHistory}
        onClose={() => setShowTradeHistory(false)}
      />

      {/* Portfolio Summary Page */}
      <PortfolioSummaryPage
        userProfile={userProfile}
        isVisible={showPortfolioSummary}
        onClose={() => setShowPortfolioSummary(false)}
      />

      {/* User Authentication Modal */}
      <UserAuthModal
        isVisible={showAuth && !isAuthenticated}
        onUserAuthenticated={handleUserAuthenticated}
        onClose={() => {
          setShowAuth(false);
          setRequiresAuth(false);
        }}
      />
    </div>
  );
}
