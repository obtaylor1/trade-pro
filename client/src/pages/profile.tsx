import { useState } from "react";
import { useLocation } from "wouter";
import { ArrowLeft, User, Settings, RotateCcw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function Profile() {
  const [, setLocation] = useLocation();
  const [isLiveTrading, setIsLiveTrading] = useState(false);
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
            <div className="text-3xl font-bold text-white">
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
    </div>
  );
}