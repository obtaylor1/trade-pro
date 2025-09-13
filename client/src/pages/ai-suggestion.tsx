import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, TrendingUp, Target } from "lucide-react";
import RadialProgress from "@/components/RadialProgress";
import Gauge from "@/components/Gauge";
import TradeExecutionModal from "@/components/TradeExecutionModal";
import type { TradingOpportunity } from "@shared/schema";

// Company logos for display
const companyLogos: Record<string, string> = {
  "AAPL": "🍎", "Apple": "🍎",
  "GOOGL": "🔍", "Alphabet": "🔍", "Google": "🔍",
  "MSFT": "Ⓜ️", "Microsoft": "Ⓜ️",
  "TSLA": "⚡", "Tesla": "⚡",
  "NVDA": "💾", "NVIDIA": "💾",
  "META": "📘", "Meta": "📘",
  "AMZN": "📦", "Amazon": "📦",
  "JNJ": "🏥", "Johnson": "🏥",
  "PG": "🧴", "Procter": "🧴",
  "KO": "🥤", "Coca-Cola": "🥤"
};

export default function AISuggestion() {
  const [, setLocation] = useLocation();
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);

  // Fetch real trading opportunities
  const { data: stockOpportunities, isLoading } = useQuery<TradingOpportunity[]>({
    queryKey: ["/api/opportunities", "stocks"],
    staleTime: 10 * 60 * 1000, // 10 minutes cache
    retry: 1
  });

  // Get the top AI suggestion from real data
  const topOpportunity = stockOpportunities?.[0];
  
  const aiSuggestionData = topOpportunity ? {
    symbol: topOpportunity.name.split(' ')[0] || topOpportunity.id.toUpperCase(),
    companyName: topOpportunity.name,
    logo: companyLogos[topOpportunity.name.split(' ')[0]] || companyLogos[topOpportunity.name] || "📈",
    currentPrice: parseFloat(topOpportunity.entryPrice.replace(/[^0-9.-]/g, '')) || 175.43,
    targetPrice: parseFloat(topOpportunity.entryPrice.replace(/[^0-9.-]/g, '')) * 1.1 || 185.00, // 10% target
    potentialGain: parseFloat(topOpportunity.potentialGain.replace(/[^0-9.-]/g, '')) || 5.45,
    aiConfidence: topOpportunity.confidence,
    riskLevel: (topOpportunity.riskLevel || topOpportunity.risk) as "Low" | "Moderate" | "High" || "Low",
    momentum: "Strong" as const, // TODO: derive from real data
    plainEnglishAnalysis: topOpportunity.rationale,
    keyMetrics: {
      rsi: 64, // TODO: fetch real technical indicators
      macd: "Bullish",
      volume: topOpportunity.volume || "Above Average", 
      support: (parseFloat(topOpportunity.entryPrice.replace(/[^0-9.-]/g, '')) * 0.95) || 172.50,
      resistance: (parseFloat(topOpportunity.entryPrice.replace(/[^0-9.-]/g, '')) * 1.05) || 180.00
    },
    chartData: [170, 172, 174, 173, 175, 176, 175] // TODO: replace with real chart data
  } : {
    // Fallback while loading
    symbol: "AAPL",
    companyName: "Apple Inc.",
    logo: "🍎",
    currentPrice: 175.43,
    targetPrice: 185.00,
    potentialGain: 5.45,
    aiConfidence: 85,
    riskLevel: "Low" as const,
    momentum: "Strong" as const,
    plainEnglishAnalysis: "Loading AI analysis...",
    keyMetrics: {
      rsi: 64,
      macd: "Bullish", 
      volume: "Above Average",
      support: 172.50,
      resistance: 180.00
    },
    chartData: [170, 172, 174, 173, 175, 176, 175]
  };

  const handleReviewTrade = () => {
    setIsTradeModalOpen(true);
  };

  const handleBack = () => {
    setLocation('/');
  };

  const generateChartPath = (data: number[]) => {
    const width = 320;
    const height = 150;
    const padding = 20;
    
    const minValue = Math.min(...data);
    const maxValue = Math.max(...data);
    const range = maxValue - minValue;
    
    const xStep = (width - padding * 2) / (data.length - 1);
    
    return data
      .map((value, index) => {
        const x = padding + index * xStep;
        const y = height - padding - ((value - minValue) / range) * (height - padding * 2);
        return `${index === 0 ? 'M' : 'L'} ${x} ${y}`;
      })
      .join(' ');
  };

  return (
    <div className="min-h-screen bg-gray-900 pb-32">
      {/* Header */}
      <div className="bg-gray-800 px-4 py-4 border-b border-gray-700">
        <div className="flex items-center justify-between">
          <button 
            onClick={handleBack}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            data-testid="back-button"
          >
            <ArrowLeft className="h-6 w-6 text-white" />
          </button>
          
          <div className="flex items-center space-x-3">
            <div className="text-3xl">{aiSuggestionData.logo}</div>
            <div className="text-center">
              <div className="text-xl font-bold text-white" data-testid="company-symbol">
                {aiSuggestionData.symbol}
              </div>
              <div className="text-sm text-gray-400" data-testid="company-name">
                {aiSuggestionData.companyName}
              </div>
            </div>
          </div>
          
          <div className="text-right">
            <div className="text-lg font-bold text-white" data-testid="current-price">
              ${aiSuggestionData.currentPrice}
            </div>
            <div className="text-sm text-emerald-500" data-testid="potential-gain">
              +{aiSuggestionData.potentialGain.toFixed(1)}% target
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-md mx-auto px-4 py-6 space-y-6">
        
        {/* AI Analysis in Plain English */}
        <div className="bg-gray-800 rounded-xl p-6" data-testid="ai-analysis-card">
          <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
            <div className="w-2 h-2 bg-blue-600 rounded-full mr-2 animate-pulse"></div>
            AI Analysis in Plain English
          </h3>
          <p className="text-gray-300 leading-relaxed" data-testid="analysis-text">
            {aiSuggestionData.plainEnglishAnalysis}
          </p>
        </div>

        {/* Key Metrics - Visualized */}
        <div className="bg-gray-800 rounded-xl p-6" data-testid="key-metrics-card">
          <h3 className="text-lg font-semibold text-white mb-6">Key Metrics</h3>
          
          <div className="grid grid-cols-3 gap-6 mb-6">
            {/* AI Confidence Score */}
            <div className="text-center">
              <RadialProgress 
                value={aiSuggestionData.aiConfidence}
                size={80}
                strokeWidth={6}
                label="AI Confidence"
                className="mb-2"
              />
            </div>
            
            {/* Risk Level */}
            <div className="text-center">
              <Gauge 
                value={aiSuggestionData.riskLevel}
                type="risk"
                size={80}
              />
            </div>
            
            {/* Momentum */}
            <div className="text-center">
              <Gauge 
                value={aiSuggestionData.momentum}
                type="momentum"
                size={80}
              />
            </div>
          </div>

          {/* Potential Gain/Loss */}
          <div className="bg-gray-900 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-400">Target Price</span>
              <span className="text-lg font-bold text-white" data-testid="target-price">
                ${aiSuggestionData.targetPrice.toFixed(2)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Potential Gain</span>
              <span className="text-lg font-bold text-emerald-500" data-testid="potential-gain-amount">
                +{aiSuggestionData.potentialGain.toFixed(1)}% (+${(aiSuggestionData.targetPrice - aiSuggestionData.currentPrice).toFixed(2)})
              </span>
            </div>
          </div>
        </div>

        {/* Price Chart */}
        <div className="bg-gray-800 rounded-xl p-6" data-testid="price-chart-card">
          <h3 className="text-lg font-semibold text-white mb-4">7-Day Price Movement</h3>
          <div className="relative">
            <svg width="100%" height="150" viewBox="0 0 320 150" className="w-full">
              {/* Grid lines */}
              <defs>
                <pattern id="chartGrid" width="40" height="25" patternUnits="userSpaceOnUse">
                  <path d="M 40 0 L 0 0 0 25" fill="none" stroke="rgb(75 85 99)" strokeWidth="0.5" opacity="0.3"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#chartGrid)" />
              
              {/* Price line */}
              <path
                d={generateChartPath(aiSuggestionData.chartData)}
                fill="none"
                stroke="#10b981"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="drop-shadow-sm"
              />
              
              {/* Gradient fill */}
              <defs>
                <linearGradient id="priceGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.3"/>
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0"/>
                </linearGradient>
              </defs>
              <path
                d={`${generateChartPath(aiSuggestionData.chartData)} L 300 130 L 20 130 Z`}
                fill="url(#priceGradient)"
              />
              
              {/* Current price marker */}
              <circle
                cx={300}
                cy={95}
                r="4"
                fill="#10b981"
                className="animate-pulse"
              />
            </svg>
            
            {/* Chart labels */}
            <div className="flex justify-between text-xs text-gray-400 mt-2">
              <span>7 days ago</span>
              <span className="flex items-center">
                <div className="w-2 h-2 bg-emerald-500 rounded-full mr-1"></div>
                Current: ${aiSuggestionData.currentPrice}
              </span>
              <span>Now</span>
            </div>
          </div>
        </div>

        {/* Additional Insights */}
        <div className="bg-gray-800 rounded-xl p-6" data-testid="insights-card">
          <h3 className="text-lg font-semibold text-white mb-4">Technical Insights</h3>
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">RSI (14)</span>
              <span className="text-white font-medium">{aiSuggestionData.keyMetrics.rsi}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">MACD Signal</span>
              <span className="text-emerald-500 font-medium">{aiSuggestionData.keyMetrics.macd}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Volume</span>
              <span className="text-white font-medium">{aiSuggestionData.keyMetrics.volume}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Support Level</span>
              <span className="text-white font-medium">${aiSuggestionData.keyMetrics.support}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Resistance Level</span>
              <span className="text-white font-medium">${aiSuggestionData.keyMetrics.resistance}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Fixed Bottom CTA */}
      <div className="fixed bottom-0 left-0 right-0 bg-gray-800 border-t border-gray-700 p-4">
        <div className="max-w-md mx-auto">
          <button
            onClick={handleReviewTrade}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-colors flex items-center justify-center space-x-2 text-lg"
            data-testid="review-trade-button"
          >
            <Target className="h-6 w-6" />
            <span>Review Trade</span>
          </button>
        </div>
      </div>

      {/* Trade Execution Modal */}
      <TradeExecutionModal
        isOpen={isTradeModalOpen}
        onClose={() => setIsTradeModalOpen(false)}
        symbol={aiSuggestionData.symbol}
        companyName={aiSuggestionData.companyName}
        currentPrice={aiSuggestionData.currentPrice}
        targetPrice={aiSuggestionData.targetPrice}
        opportunityId={topOpportunity?.id || "demo-opportunity"}
      />
    </div>
  );
}