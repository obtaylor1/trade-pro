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

  // Fetch real trading opportunities for AI signals from all markets
  const { data: stockOpportunities, isLoading: stocksLoading } = useQuery<TradingOpportunity[]>({
    queryKey: ["/api/opportunities", "stocks"],
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    retry: 1
  });

  const { data: commoditiesOpportunities, isLoading: commoditiesLoading } = useQuery<TradingOpportunity[]>({
    queryKey: ["/api/opportunities", "commodities"],
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1
  });

  const { data: cryptoOpportunities, isLoading: cryptoLoading } = useQuery<TradingOpportunity[]>({
    queryKey: ["/api/opportunities", "crypto"],
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1
  });

  const { data: optionsOpportunities, isLoading: optionsLoading } = useQuery<TradingOpportunity[]>({
    queryKey: ["/api/opportunities", "options"],
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1
  });

  const { data: forexOpportunities, isLoading: forexLoading } = useQuery<TradingOpportunity[]>({
    queryKey: ["/api/opportunities", "forex"],
    staleTime: 5 * 60 * 1000, // 5 minutes cache
    retry: 1
  });

  // Mock portfolio data - TODO: replace with real user portfolio API
  const portfolioValue = 10247.50;
  const todayChange = 127.50;
  const todayChangePercent = 1.26;

  // Get top AI signals from all five markets
  const topAISignals = [
    // Stocks
    stockOpportunities && stockOpportunities.length > 0 
      ? {
          market: "stocks",
          symbol: stockOpportunities[0].name.split(' ')[0] || stockOpportunities[0].id,
          companyName: stockOpportunities[0].name,
          reason: stockOpportunities[0].rationale,
          confidence: stockOpportunities[0].confidence,
          logo: companyLogos[stockOpportunities[0].name.split(' ')[0]] || "📈",
          color: "text-blue-400"
        }
      : stocksLoading 
      ? {
          market: "stocks",
          symbol: "AAPL",
          companyName: "Apple Inc.", 
          reason: "Loading AI analysis...",
          confidence: 85,
          logo: "🍎",
          color: "text-blue-400"
        }
      : {
          market: "stocks",
          symbol: "AAPL",
          companyName: "Apple Inc.", 
          reason: "Strong positive momentum detected ahead of earnings with bullish technical indicators",
          confidence: 85,
          logo: "🍎",
          color: "text-blue-400"
        },

    // Commodities
    commoditiesOpportunities && commoditiesOpportunities.length > 0 
      ? {
          market: "commodities",
          symbol: commoditiesOpportunities[0].name.split(' ')[0] || commoditiesOpportunities[0].id,
          companyName: commoditiesOpportunities[0].name,
          reason: commoditiesOpportunities[0].rationale,
          confidence: commoditiesOpportunities[0].confidence,
          logo: "🥇",
          color: "text-amber-400"
        }
      : commoditiesLoading 
      ? {
          market: "commodities",
          symbol: "GC",
          companyName: "Gold Futures", 
          reason: "Loading AI analysis...",
          confidence: 78,
          logo: "🥇",
          color: "text-amber-400"
        }
      : {
          market: "commodities",
          symbol: "GC",
          companyName: "Gold Futures", 
          reason: "Safe haven demand rising amid economic uncertainty",
          confidence: 78,
          logo: "🥇",
          color: "text-amber-400"
        },

    // Crypto
    cryptoOpportunities && cryptoOpportunities.length > 0 
      ? {
          market: "crypto",
          symbol: cryptoOpportunities[0].name.split(' ')[0] || cryptoOpportunities[0].id,
          companyName: cryptoOpportunities[0].name,
          reason: cryptoOpportunities[0].rationale,
          confidence: cryptoOpportunities[0].confidence,
          logo: "₿",
          color: "text-orange-400"
        }
      : cryptoLoading 
      ? {
          market: "crypto",
          symbol: "BTC",
          companyName: "Bitcoin", 
          reason: "Loading AI analysis...",
          confidence: 72,
          logo: "₿",
          color: "text-orange-400"
        }
      : {
          market: "crypto",
          symbol: "BTC",
          companyName: "Bitcoin", 
          reason: "Institutional adoption accelerating with positive momentum",
          confidence: 72,
          logo: "₿",
          color: "text-orange-400"
        },

    // Options
    optionsOpportunities && optionsOpportunities.length > 0 
      ? {
          market: "options",
          symbol: optionsOpportunities[0].name.split(' ')[0] || optionsOpportunities[0].id,
          companyName: optionsOpportunities[0].name,
          reason: optionsOpportunities[0].rationale,
          confidence: optionsOpportunities[0].confidence,
          logo: "📊",
          color: "text-purple-400"
        }
      : optionsLoading 
      ? {
          market: "options",
          symbol: "SPY",
          companyName: "S&P 500 Options", 
          reason: "Loading AI analysis...",
          confidence: 88,
          logo: "📊",
          color: "text-purple-400"
        }
      : {
          market: "options",
          symbol: "SPY",
          companyName: "S&P 500 Options", 
          reason: "High implied volatility creating profitable call opportunities",
          confidence: 88,
          logo: "📊",
          color: "text-purple-400"
        },

    // Forex
    forexOpportunities && forexOpportunities.length > 0 
      ? {
          market: "forex",
          symbol: forexOpportunities[0].name.split(' ')[0] || forexOpportunities[0].id,
          companyName: forexOpportunities[0].name,
          reason: forexOpportunities[0].rationale,
          confidence: forexOpportunities[0].confidence,
          logo: "💱",
          color: "text-green-400"
        }
      : forexLoading 
      ? {
          market: "forex",
          symbol: "EUR/USD",
          companyName: "Euro / US Dollar", 
          reason: "Loading AI analysis...",
          confidence: 76,
          logo: "💱",
          color: "text-green-400"
        }
      : {
          market: "forex",
          symbol: "EUR/USD",
          companyName: "Euro / US Dollar", 
          reason: "Central bank policy divergence creating strong trend opportunity",
          confidence: 76,
          logo: "💱",
          color: "text-green-400"
        }
  ];

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

        {/* Today's Top AI Signals - All Markets */}
        <div className="bg-gray-800 rounded-xl p-6 animate-fade-in">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-white">Today's Top AI Signals</h3>
            <button
              onClick={() => setLocation('/markets')}
              className="text-blue-600 hover:text-blue-500 transition-colors"
            >
              <ArrowRight className="h-5 w-5" />
            </button>
          </div>
          
          <div className="space-y-4">
            {topAISignals.map((signal, index) => (
              <div 
                key={signal.market}
                className="border border-gray-700 rounded-lg p-4 hover:bg-gray-700/50 transition-all cursor-pointer"
                onClick={handleAISignalClick}
                data-testid={`ai-signal-${signal.market}`}
              >
                <div className="flex items-center space-x-4">
                  <div className="text-2xl">{signal.logo}</div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-1">
                      <span className={`text-lg font-bold ${signal.color}`} data-testid={`signal-symbol-${signal.market}`}>
                        {signal.symbol}
                      </span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400 capitalize">{signal.market}</span>
                      <span className="text-xs text-gray-400">•</span>
                      <span className="text-xs text-gray-400" data-testid={`signal-company-${signal.market}`}>
                        {signal.companyName}
                      </span>
                    </div>
                    <p className="text-xs text-gray-300 mb-2" data-testid={`signal-reason-${signal.market}`}>
                      {signal.reason}
                    </p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">AI Confidence</span>
                      <div className="flex items-center space-x-2">
                        <div className="w-12 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              signal.market === 'stocks' ? 'bg-blue-600' :
                              signal.market === 'commodities' ? 'bg-amber-500' :
                              signal.market === 'crypto' ? 'bg-orange-500' :
                              signal.market === 'options' ? 'bg-purple-500' :
                              'bg-green-500'
                            }`}
                            style={{ width: `${signal.confidence}%` }}
                          />
                        </div>
                        <span className={`text-xs font-semibold ${signal.color}`} data-testid={`signal-confidence-${signal.market}`}>
                          {signal.confidence}%
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
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