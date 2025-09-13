import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, User, Settings, RotateCcw, Info } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import CreateAccountModal from "@/components/CreateAccountModal";

export default function Profile() {
  const [, setLocation] = useLocation();
  const [isLiveTrading, setIsLiveTrading] = useState(false);
  const [isCreateAccountModalOpen, setIsCreateAccountModalOpen] = useState(false);
  const { toast } = useToast();

  // Demo user data (matches your screenshot design)
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
    toast({
      title: "Reconfigure Account",
      description: "Account configuration options would open here",
    });
  };

  const handleResetPortfolio = () => {
    toast({
      title: "Portfolio Reset",
      description: "Portfolio balance reset to $10,000.00",
    });
  };

  const handleCreateAccount = () => {
    setIsCreateAccountModalOpen(true);
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

        {/* Demo Mode Banner */}
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
                .
              </p>
            </div>
          </div>
        </div>

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

          {/* Portfolio Metrics */}
          <div className="grid grid-cols-3 gap-4">
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Total Value</div>
              <div className="text-lg font-bold text-white">$13,796.80</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Unrealized P&L</div>
              <div className="text-lg font-bold text-green-400">$196.05</div>
            </div>
            <div className="text-center">
              <div className="text-xs text-gray-400 mb-1">Return</div>
              <div className="text-lg font-bold text-green-400">+1.44%</div>
            </div>
          </div>

          {/* Current Positions */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-white">Current Positions</h3>
            
            {/* Position 1 - MGC */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-lg font-bold text-white">MGC</div>
                  <div className="text-xs space-y-1">
                    <div className="text-gray-400">Micro</div>
                    <div className="text-amber-400 bg-amber-400/20 px-2 py-0.5 rounded text-xs">commodities</div>
                    <div className="text-gray-400">Futures</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span className="text-white">5 x</span>
                    <span className="text-white font-semibold">$20.36</span>
                    <div className="text-green-400 font-bold">$101.80</div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Entry: $20.15 <span className="text-green-400">(+1.04%)</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Position 2 - MBT */}
            <div className="bg-gray-900/50 rounded-xl p-4 border border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="text-lg font-bold text-white">MBT</div>
                  <div className="text-xs space-y-1">
                    <div className="text-gray-400">Micro</div>
                    <div className="text-purple-400 bg-purple-400/20 px-2 py-0.5 rounded text-xs">crypto</div>
                    <div className="text-gray-400">Bitcoin</div>
                    <div className="text-gray-400">Futures</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex items-center space-x-2">
                    <span className="text-white">2 x</span>
                    <span className="text-white font-semibold">$6,847.50</span>
                    <div className="text-green-400 font-bold">$13,695.00</div>
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    Entry: $6,800.00 <span className="text-green-400">$95.00</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Profile Card */}
        <div className="bg-gray-800 rounded-2xl border border-gray-700 p-6 space-y-6">
          
          {/* User Info Section */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {/* Avatar */}
              <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                <span className="text-white font-bold text-lg">D</span>
              </div>
              
              {/* User Details */}
              <div>
                <h2 className="text-xl font-semibold text-white">{demoUser.name}</h2>
                <div className="flex items-center space-x-2">
                  <span className="text-sm text-gray-400">{demoUser.accountType}</span>
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
              {formatCurrency(demoUser.availableFunds)}
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
                <div className="text-lg font-semibold text-white">{demoUser.selectedBroker.name}</div>
                <div className="text-sm text-blue-400">{demoUser.selectedBroker.specialty}</div>
              </div>
            </div>
            <p className="text-xs text-gray-500">
              Commission: {demoUser.selectedBroker.commission}
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
                      <span className="font-medium">Simulator Active:</span> Trading with {demoUser.selectedBroker.name} fee structure. 
                      All commissions ({demoUser.selectedBroker.commission}) are calculated realistically.
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
    </div>
  );
}