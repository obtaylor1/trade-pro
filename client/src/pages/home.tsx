import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { TrendingUp, ArrowRight, User, Star } from "lucide-react";
import PortfolioChart from "@/components/PortfolioChart";
import RadialProgress from "@/components/RadialProgress";
import type { TradingOpportunity } from "@shared/schema";

// Company logos for display
const companyLogos: Record<string, string> = {
  "AAPL": "🍎",
  "GOOGL": "🔍", 
  "ALPHABET": "🔍",
  "MSFT": "Ⓜ️",
  "TSLA": "⚡",
  "NVDA": "💾",
  "META": "📘",
  "AMZN": "📦",
  "NFLX": "🎬",
  "JNJ": "🏥",
  "PG": "🧴",
  "KO": "🥤",
  "VYM": "💰",
  "USMV": "📊"
};

export default function Home() {
  const [, setLocation] = useLocation();

  // Fetch real trading opportunities for AI signal and watchlist
  const { data: stockOpportunities, isLoading: stocksLoading } = useQuery<TradingOpportunity[]>({
    queryKey: ["/api/opportunities", "stocks"],
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    retry: 1
  });

  // Mock portfolio data - TODO: replace with real user portfolio API
  const portfolioValue = 10247.50;
  const todayChange = 127.50;
  const todayChangePercent = 1.26;

  // Get top AI signal from stock opportunities  
  const topAISignal = stockOpportunities && stockOpportunities.length > 0 
    ? {
        symbol: stockOpportunities[0].name.split(' ')[0] || stockOpportunities[0].id,
        companyName: stockOpportunities[0].name,
        reason: stockOpportunities[0].rationale,
        confidence: stockOpportunities[0].confidence,
        logo: companyLogos[stockOpportunities[0].name.split(' ')[0]] || "📈"
      }
    : stocksLoading 
    ? {
        symbol: "AAPL",
        companyName: "Apple Inc.", 
        reason: "Loading AI analysis...",
        confidence: 85,
        logo: "🍎"
      }
    : {
        symbol: "AAPL",
        companyName: "Apple Inc.", 
        reason: "Strong positive momentum detected ahead of earnings with bullish technical indicators",
        confidence: 85,
        logo: "🍎"
      };

  // Create watchlist from top 4 stock opportunities
  const watchlistData = stockOpportunities?.slice(0, 4).map((opportunity, index) => {
    const symbol = opportunity.name.split(' ')[0] || opportunity.id;
    const price = parseFloat(opportunity.entryPrice.replace(/[^0-9.-]/g, ''));
    
    // Generate realistic price changes (mock until we have real price data)
    const changePercents = [1.66, -0.87, 1.10, -1.37];
    const changePercent = changePercents[index] || (Math.random() - 0.5) * 4;
    const change = (price * changePercent) / 100;
    
    return {
      symbol,
      name: opportunity.name,
      price: price || 100,
      change: change,
      changePercent: changePercent,
      logo: companyLogos[symbol] || "📈"
    };
  }) || [];

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
            onClick={() => setLocation('/ai-suggestion')}
          >
            <TrendingUp className="h-5 w-5" />
            <span>Quick Trade</span>
          </button>
          <button 
            className="bg-gray-800 hover:bg-gray-700 text-white font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center space-x-2 border border-gray-700"
            data-testid="profile-button"
            onClick={() => setLocation('/profile')}
          >
            <User className="h-5 w-5" />
            <span>Account</span>
          </button>
        </div>
      </div>
    </div>
  );
}