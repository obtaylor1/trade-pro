import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, User, Settings, RotateCcw, Info, LogIn, LogOut, TrendingUp, TrendingDown } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
import { useQuery } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import CreateAccountModal from "@/components/CreateAccountModal";
import LoginModal from "@/components/LoginModal";

export default function Profile() {
  const [, setLocation] = useLocation();
  const [isLiveTrading, setIsLiveTrading] = useState(false);
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState(false);
  const { toast } = useToast();
  const { user, isLoggedIn, logout, updateUserFromRegistration } = useUser();

  // Fetch real trade history for logged-in users
  const { data: tradeHistory = [] } = useQuery<any[]>({
    queryKey: ['/api/trades/history', user?.id],
    enabled: isLoggedIn && !!user?.id,
  });

  // Demo user data fallback
  const demoUser = {
    name: "Demo User",
    accountType: "Individual",
    availableFunds: 10000.00,
    selectedBroker: {
      name: "NinjaTrader",
      specialty: "Professional Platform",
      commission: "$0.53 futures"
    }
  };

  // Use real user data if logged in, otherwise use demo data
  const displayUser = isLoggedIn && user ? {
    name: user.name,
    accountType: "Individual",
    availableFunds: user.currentBalance,
    selectedBroker: {
      name: user.selectedBroker,
      specialty: "Professional Platform",
      commission: "$0.53 futures"
    }
  } : demoUser;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleTradingModeToggle = () => {
    setIsLiveTrading(!isLiveTrading);
    toast({
      title: isLiveTrading ? "Switched to Simulator" : "Switched to Live Trading",
      description: isLiveTrading ? "Now using paper trading" : "Now using real money",
    });
  };

  const handleReconfigure = () => {
    // Open account configuration modal
    toast({
      title: "Configuration Modal",
      description: "Opening account settings...",
    });
    // TODO: Implement account configuration modal
    // This would allow users to change broker, account type, starting capital, etc.
  };

  const handleResetPortfolio = async () => {
    if (!user || user.id === 'demo-user') {
      toast({
        title: "Login Required",
        description: "Please log in to reset your portfolio",
        variant: "destructive"
      });
      return;
    }

    try {
      const response = await fetch(`/api/auth/reset-balance/${user.id}`, {
        method: 'POST'
      });
      
      if (!response.ok) {
        throw new Error('Failed to reset portfolio');
      }
      
      const data = await response.json();
      
      // Update the user context with new balance
      updateUserFromRegistration({
        ...user,
        currentBalance: user.startingCapital
      });
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ['/api/auth/user', user.id] });
      queryClient.invalidateQueries({ queryKey: ['/api/auth/balance', user.id] });
      
      toast({
        title: "Portfolio Reset Successfully",
        description: `Your balance has been reset to $${user.startingCapital.toLocaleString()}`
      });
    } catch (error) {
      console.error('Error resetting portfolio:', error);
      toast({
        title: "Reset Failed",
        description: "Unable to reset portfolio. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleCreateAccount = () => {
    setIsCreateAccountModalOpen(true);
  };

  const handleLogin = () => {
    setIsLoginModalOpen(true);
  };

  const handleLogout = () => {
    logout();
    toast({
      title: "Logged Out",
      description: "You have been logged out of your account.",
    });
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* Header with Back Button */}
        <div className="flex items-center space-x-4">
          <button
            onClick={() => setLocation('/')}
            className="p-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors"
            data-testid="back-button"
          >
            <ArrowLeft className="h-5 w-5 text-white" />
          </button>
          <h1 className="text-2xl font-bold text-white">Account Profile</h1>
        </div>

        {/* Authentication Banner */}
        {!isLoggedIn ? (
          <div className="bg-gradient-to-r from-purple-600 to-blue-600 rounded-2xl p-4 border border-purple-500/30">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <Info className="h-3 w-3 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold text-sm mb-1">Demo Mode</h3>
                <p className="text-white/90 text-sm leading-relaxed">
                  You're viewing the trading platform in demo mode. To save your trades and track performance,{" "}
                  <button
                    onClick={handleCreateAccount}
                    className="text-white underline hover:text-white/80 transition-colors font-medium"
                    data-testid="create-account-link"
                  >
                    create a free account
                  </button>
                  {" "}or{" "}
                  <button
                    onClick={handleLogin}
                    className="text-white underline hover:text-white/80 transition-colors font-medium"
                    data-testid="login-link"
                  >
                    sign in
                  </button>
                  .
                </p>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 rounded-2xl p-4 border border-green-500/30">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                <User className="h-3 w-3 text-white" />
              </div>
              <div className="flex-1">
                <h3 className="text-white font-semibold text-sm mb-1">Logged In</h3>
                <p className="text-white/90 text-sm leading-relaxed">
                  Welcome back, {user?.name}! Your trades and progress are being saved.{" "}
                  <button
                    onClick={handleLogout}
                    className="text-white underline hover:text-white/80 transition-colors font-medium"
                    data-testid="logout-link"
                  >
                    Log out
                  </button>
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Portfolio Summary Card */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white text-sm">📊</span>
              </div>
              <h2 className="text-lg font-semibold text-white">Portfolio Summary</h2>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full border border-green-500/30">
                Simulated
              </span>
              <span className="text-xs text-gray-400">Portfolio</span>
              <span className="text-xs text-gray-400">History</span>
            </div>
          </div>

          {/* Portfolio Metrics - real user data */}
          {isLoggedIn && user ? (
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Current Balance</div>
                <div className="text-lg font-bold text-white">{formatCurrency(user.currentBalance)}</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">P&L</div>
                <div className={`text-lg font-bold ${user.currentBalance >= user.startingCapital ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency(user.currentBalance - user.startingCapital)}
                </div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Return</div>
                <div className={`text-lg font-bold ${user.currentBalance >= user.startingCapital ? 'text-green-400' : 'text-red-400'}`}>
                  {user.startingCapital > 0
                    ? `${((user.currentBalance - user.startingCapital) / user.startingCapital * 100).toFixed(2)}%`
                    : '0.00%'}
                </div>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-3 gap-4 opacity-50">
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Current Balance</div>
                <div className="text-lg font-bold text-white">—</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">P&L</div>
                <div className="text-lg font-bold text-gray-400">—</div>
              </div>
              <div className="text-center">
                <div className="text-xs text-gray-400 mb-1">Return</div>
                <div className="text-lg font-bold text-gray-400">—</div>
              </div>
            </div>
          )}

          {/* Trade history — real data from API */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-white">
              Recent Activity
              {tradeHistory.length > 0 && (
                <span className="ml-2 text-xs text-gray-400 font-normal">
                  ({tradeHistory.length} trade{tradeHistory.length !== 1 ? 's' : ''})
                </span>
              )}
            </h3>

            {!isLoggedIn ? (
              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700 text-center">
                <div className="text-gray-400 text-sm mb-2">Sign in to view your trades</div>
                <button
                  onClick={handleLogin}
                  className="text-blue-400 text-xs underline hover:text-blue-300 transition-colors"
                >
                  Sign in now
                </button>
              </div>
            ) : tradeHistory.length === 0 ? (
              <div className="bg-gray-900/50 rounded-xl p-6 border border-gray-700 text-center">
                <div className="text-3xl mb-2">📊</div>
                <div className="text-white text-sm font-medium mb-1">No trades yet</div>
                <div className="text-gray-400 text-xs">
                  Head to the Markets tab to execute your first trade
                </div>
              </div>
            ) : (
              <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                {tradeHistory.slice(0, 10).map((trade: any) => {
                  const pnl = trade.netPnL ?? 0;
                  const isGain = pnl >= 0;
                  return (
                    <div
                      key={trade.id}
                      className="bg-gray-900/50 rounded-lg p-3 border border-gray-700 flex items-center justify-between"
                    >
                      <div className="flex items-center space-x-3">
                        <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                          trade.direction === 'BUY'
                            ? 'bg-green-500/20 text-green-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {trade.direction === 'BUY' ? '↑' : '↓'}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-white">{trade.symbol}</div>
                          <div className="text-xs text-gray-400 capitalize">{trade.assetClass}</div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-sm font-bold ${isGain ? 'text-green-400' : 'text-red-400'}`}>
                          {isGain ? '+' : ''}{formatCurrency(pnl)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(trade.executedAt).toLocaleDateString()}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Main Profile Card */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-6">
          
          {/* User Info Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Avatar - shows real user's first initial */}
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">
                  {(isLoggedIn && user?.name ? user.name : 'D').charAt(0).toUpperCase()}
                </span>
              </div>
              
              {/* User Details */}
              <div>
                <h2 className="text-xl font-semibold text-white">{displayUser.name}</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">{displayUser.accountType}</span>
                </div>
              </div>
            </div>

            {/* Status Indicator */}
            <div className="flex items-center space-x-2">
              <div className={`w-3 h-3 rounded-full ${isLiveTrading ? 'bg-red-500' : 'bg-green-500'}`} />
              <span className="text-sm font-medium text-white">
                {isLiveTrading ? 'Live' : 'Simulator'}
              </span>
            </div>
          </div>

          {/* Available Funds */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-400">Available Funds</h3>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(displayUser.availableFunds)}
            </div>
            <p className="text-sm text-gray-500">
              {isLiveTrading ? 'Real Money Balance' : 'Paper Trading Balance'}
            </p>
          </div>

          {/* Selected Broker */}
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-400">Selected Broker</h3>
            <div className="flex items-center justify-between">
              <div>
                <div className="text-lg font-semibold text-white">{displayUser.selectedBroker.name}</div>
                <div className="text-sm text-blue-400">{displayUser.selectedBroker.specialty}</div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Commission: {displayUser.selectedBroker.commission}
            </p>
          </div>

          {/* Trading Mode Section */}
          <div className="border-t border-gray-700 pt-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-white">Trading Mode</h3>
                <p className="text-xs text-gray-400 mt-1">
                  {isLiveTrading 
                    ? 'Execute real trades with actual money'
                    : 'Practice trading with virtual funds'
                  }
                </p>
              </div>
              
              <div className="flex items-center space-x-3">
                <span className={`text-sm ${!isLiveTrading ? 'text-green-400 font-medium' : 'text-gray-500'}`}>
                  Simulator
                </span>
                <button
                  onClick={handleTradingModeToggle}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-gray-800 ${
                    isLiveTrading ? 'bg-red-600' : 'bg-green-600'
                  }`}
                  data-testid="trading-mode-toggle"
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      isLiveTrading ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={`text-sm ${isLiveTrading ? 'text-red-400 font-medium' : 'text-gray-500'}`}>
                  Live
                </span>
              </div>
            </div>

            {/* Status Message */}
            {!isLiveTrading && (
              <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-start space-x-2">
                    <div className="w-2 h-2 bg-green-500 rounded-full mt-2" />
                    <div className="text-sm text-green-300">
                      <span className="font-medium">Simulator Active:</span> Trading with {displayUser.selectedBroker.name} fee structure. 
                      All commissions ({displayUser.selectedBroker.commission}) are calculated realistically.
                    </div>
                  </div>
                </div>
                
                {/* Action Buttons */}
                <div className="flex items-center justify-end space-x-4 mt-4">
                  <button
                    onClick={handleReconfigure}
                    className="flex items-center space-x-1 text-sm text-blue-400 hover:text-blue-300 transition-colors"
                    data-testid="reconfigure-button"
                  >
                    <Settings className="h-4 w-4" />
                    <span>Reconfigure</span>
                  </button>
                  <button
                    onClick={handleResetPortfolio}
                    className="flex items-center space-x-1 text-sm text-amber-400 hover:text-amber-300 transition-colors"
                    data-testid="reset-portfolio-button"
                  >
                    <RotateCcw className="h-4 w-4" />
                    <span>Reset Portfolio</span>
                  </button>
                </div>
              </div>
            )}

            {isLiveTrading && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <div className="w-2 h-2 bg-red-500 rounded-full mt-2" />
                  <div className="text-sm text-red-300">
                    <span className="font-medium">Live Trading Active:</span> All trades will use real money from your connected broker account.
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Create Account Modal */}
      <CreateAccountModal
        isOpen={isCreateAccountModalOpen}
        onClose={() => setIsCreateAccountModalOpen(false)}
      />

      {/* Login Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
      />
    </div>
  );
}