import { useState } from "react";
import { TrendingUp } from "lucide-react";

interface PortfolioChartProps {
  currentValue: number;
  todayChange: number;
  todayChangePercent: number;
  className?: string;
}

type TimeFilter = "1D" | "1W" | "1M" | "3M" | "1Y";

export default function PortfolioChart({ 
  currentValue, 
  todayChange, 
  todayChangePercent, 
  className = "" 
}: PortfolioChartProps) {
  const [activeFilter, setActiveFilter] = useState<TimeFilter>("1D");

  // Mock data - in real app this would come from props or API
  const chartData = {
    "1D": [98.5, 99.2, 98.8, 100.1, 101.3, 100.8, 102.5],
    "1W": [95.0, 97.5, 98.2, 100.1, 99.8, 101.5, 102.5],
    "1M": [88.0, 90.5, 93.2, 96.8, 98.1, 100.2, 102.5],
    "3M": [82.0, 85.0, 88.5, 92.0, 96.5, 99.8, 102.5],
    "1Y": [70.0, 75.0, 80.0, 85.0, 90.0, 95.0, 102.5]
  };

  const timeFilters: TimeFilter[] = ["1D", "1W", "1M", "3M", "1Y"];
  
  const generatePath = (data: number[]) => {
    const width = 280;
    const height = 120;
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

  const isPositive = todayChange >= 0;

  return (
    <div className={`bg-gray-800 rounded-xl p-6 ${className}`} data-testid="portfolio-chart">
      {/* Portfolio value display */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold text-white mb-2">Portfolio Value</h3>
        <div className="flex items-center justify-between">
          <span className="text-4xl font-bold text-white" data-testid="portfolio-value">
            ${currentValue.toLocaleString()}
          </span>
          <div className="flex items-center">
            <TrendingUp className={`h-5 w-5 mr-1 ${isPositive ? 'text-emerald-500' : 'text-rose-500 transform rotate-180'}`} />
            <div className="text-right">
              <div className={`text-lg font-semibold ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`} data-testid="portfolio-change">
                {isPositive ? '+' : ''}${todayChange.toFixed(2)}
              </div>
              <div className={`text-sm ${isPositive ? 'text-emerald-500' : 'text-rose-500'}`} data-testid="portfolio-change-percent">
                {isPositive ? '+' : ''}{todayChangePercent.toFixed(2)}%
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Chart area */}
      <div className="mb-4">
        <svg width="100%" height="120" viewBox="0 0 280 120" className="w-full">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 20" fill="none" stroke="rgb(55 65 81)" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Chart line */}
          <path
            d={generatePath(chartData[activeFilter])}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="drop-shadow-sm"
          />
          
          {/* Gradient fill */}
          <defs>
            <linearGradient id="chartGradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.3"/>
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0"/>
            </linearGradient>
          </defs>
          <path
            d={`${generatePath(chartData[activeFilter])} L 260 100 L 20 100 Z`}
            fill="url(#chartGradient)"
          />
        </svg>
      </div>

      {/* Time filter buttons */}
      <div className="flex justify-center space-x-2">
        {timeFilters.map((filter) => (
          <button
            key={filter}
            onClick={() => setActiveFilter(filter)}
            className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
              activeFilter === filter
                ? 'bg-blue-600 text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
            data-testid={`filter-${filter.toLowerCase()}`}
          >
            {filter}
          </button>
        ))}
      </div>
    </div>
  );
}