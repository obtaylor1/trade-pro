import { useState } from "react";
import { useLocation } from "wouter";
import { TrendingUp, ArrowRight, Building2, Star } from "lucide-react";
import PortfolioChart from "@/components/PortfolioChart";
import RadialProgress from "@/components/RadialProgress";
import BottomNavigation from "@/components/BottomNavigation";

// Mock data - in real app this would come from API
const watchlistData = [
  { 
    symbol: "AAPL", 
    name: "Apple Inc.", 
    price: 175.43, 
    change: 2.87, 
    changePercent: 1.66,
    logo: "🍎"
  },
  { 
    symbol: "GOOGL", 
    name: "Alphabet Inc.", 
    price: 139.69, 
    change: -1.22, 
    changePercent: -0.87,
    logo: "🔍"
  },
  { 
    symbol: "MSFT", 
    name: "Microsoft Corp.", 
    price: 378.85, 
    change: 4.12, 
    changePercent: 1.10,
    logo: "Ⓜ️"
  },
  { 
    symbol: "TSLA", 
    name: "Tesla Inc.", 
    price: 248.50, 
    change: -3.45, 
    changePercent: -1.37,
    logo: "⚡"
  }
];

const topAISignal = {
  symbol: "AAPL",
  companyName: "Apple Inc.",
  reason: "Strong positive momentum detected ahead of earnings with bullish technical indicators",
  confidence: 85,
  logo: "🍎"
};

export default function Home() {
  const [, setLocation] = useLocation();

  // Mock portfolio data - in real app this would come from API/auth
  const portfolioValue = 10247.50;
  const todayChange = 127.50;
  const todayChangePercent = 1.26;

  const handleAISignalClick = () => {
    setLocation('/ai-suggestion');
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-20">
      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* Portfolio Summary Card */}
        <PortfolioChart
          currentValue={portfolioValue}
          todayChange={todayChange}
          todayChangePercent={todayChangePercent}
          className="animate-fade-in"
          data-testid="portfolio-summary-card"
        />

        {/* Today's Top AI Signal Card */}
        <div 
          className="bg-gray-800 rounded-xl p-6 cursor-pointer transition-all hover:bg-gray-700 animate-fade-in"
          onClick={handleAISignalClick}
          data-testid="ai-signal-card"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-white">Today's Top AI Signal</h3>
            <ArrowRight className="h-5 w-5 text-blue-600" />
          </div>
          
          <div className="flex items-center space-x-4">
            <div className="text-3xl">{topAISignal.logo}</div>
            <div className="flex-1">
              <div className="flex items-center space-x-2 mb-1">
                <span className="text-xl font-bold text-white" data-testid="signal-symbol">
                  {topAISignal.symbol}
                </span>
                <span className="text-sm text-gray-400">•</span>
                <span className="text-sm text-gray-400" data-testid="signal-company">
                  {topAISignal.companyName}
                </span>
              </div>
              <p className="text-sm text-gray-300 mb-3" data-testid="signal-reason">
                {topAISignal.reason}
              </p>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-400">AI Confidence</span>
                <div className="flex items-center space-x-2">
                  <div className="w-16 h-2 bg-gray-700 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-blue-600 rounded-full transition-all duration-500"
                      style={{ width: `${topAISignal.confidence}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-blue-600" data-testid="signal-confidence">
                    {topAISignal.confidence}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Watchlist Card */}
        <div className="bg-gray-800 rounded-xl p-6 animate-fade-in" data-testid="watchlist-card">
          <h3 className="text-lg font-semibold text-white mb-4">Watchlist</h3>
          <div className="space-y-3">
            {watchlistData.map((stock) => {
              const isPositive = stock.change >= 0;
              return (
                <div 
                  key={stock.symbol}
                  className="flex items-center justify-between py-2 hover:bg-gray-700 rounded-lg px-2 transition-colors"
                  data-testid={`watchlist-${stock.symbol.toLowerCase()}`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="text-2xl">{stock.logo}</div>
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-semibold text-white">{stock.symbol}</span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-sm text-gray-400 truncate max-w-24">
                          {stock.name.split(' ')[0]}
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-white" data-testid={`${stock.symbol.toLowerCase()}-price`}>
                      ${stock.price}
                    </div>
                    <div 
                      className={`text-sm font-medium ${
                        isPositive ? 'text-emerald-500' : 'text-rose-500'
                      }`}
                      data-testid={`${stock.symbol.toLowerCase()}-change`}
                    >
                      {isPositive ? '+' : ''}{stock.change.toFixed(2)} ({isPositive ? '+' : ''}{stock.changePercent.toFixed(2)}%)
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-4">
          <button 
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2"
            data-testid="quick-trade-button"
            onClick={() => setLocation('/trade')}
          >
            <TrendingUp className="h-5 w-5" />
            <span>Quick Trade</span>
          </button>
          <button 
            className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2 border border-gray-700"
            data-testid="market-news-button"
            onClick={() => setLocation('/news')}
          >
            <Building2 className="h-5 w-5" />
            <span>Market News</span>
          </button>
        </div>
      </div>

      {/* Bottom Navigation */}
      <BottomNavigation />
    </div>
  );
}