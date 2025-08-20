import { useState, useRef, useEffect } from 'react';
import { Calculator, TrendingUp, TrendingDown, Shield, DollarSign, Target, BookOpen, CheckCircle, ArrowRight, Download, Home, ArrowLeft } from 'lucide-react';

// Strategy calculation functions
const longCall = (S: number, K: number, premium: number) => Math.max(S - K, 0) - premium;
const longPut = (S: number, K: number, premium: number) => Math.max(K - S, 0) - premium;
const coveredCall = (S: number, costBasis: number, K: number, credit: number) => {
  const stockPL = S - costBasis;
  const optionPL = Math.min(0, K - S) + credit;
  return stockPL + optionPL;
};
const cashSecuredPut = (S: number, K: number, credit: number) => {
  if (S >= K) return credit;
  return credit - (K - S);
};
const bullPutCredit = (S: number, Kshort: number, Klong: number, netCredit: number) => {
  if (S >= Kshort) return netCredit;
  if (S <= Klong) return netCredit - (Kshort - Klong);
  return netCredit - (Kshort - S);
};

interface Strategy {
  id: string;
  name: string;
  description: string;
  marketView: string;
  skillLevel: string;
  duration: string;
  riskLevel: number;
  rewardLevel: number;
  icon: any;
  color: string;
}

const strategies: Strategy[] = [
  {
    id: 'long-call',
    name: 'Long Call',
    description: 'Buy the right to purchase at a fixed price',
    marketView: 'Bullish',
    skillLevel: 'Beginner',
    duration: '15-45 DTE',
    riskLevel: 2,
    rewardLevel: 8,
    icon: TrendingUp,
    color: 'green'
  },
  {
    id: 'long-put',
    name: 'Long Put',
    description: 'Buy the right to sell at a fixed price',
    marketView: 'Bearish',
    skillLevel: 'Beginner',
    duration: '15-45 DTE',
    riskLevel: 2,
    rewardLevel: 8,
    icon: TrendingDown,
    color: 'red'
  },
  {
    id: 'covered-call',
    name: 'Covered Call',
    description: 'Generate income from owned shares',
    marketView: 'Neutral to Slightly Bullish',
    skillLevel: 'Beginner',
    duration: '30-45 DTE',
    riskLevel: 4,
    rewardLevel: 4,
    icon: Shield,
    color: 'blue'
  },
  {
    id: 'cash-secured-put',
    name: 'Cash-Secured Put',
    description: 'Get paid to potentially buy lower',
    marketView: 'Neutral to Slightly Bullish',
    skillLevel: 'Beginner',
    duration: '30-45 DTE',
    riskLevel: 4,
    rewardLevel: 4,
    icon: DollarSign,
    color: 'purple'
  },
  {
    id: 'vertical-spread',
    name: 'Bull Put Credit Spread',
    description: 'Defined risk income strategy',
    marketView: 'Neutral to Bullish',
    skillLevel: 'Intermediate',
    duration: '15-30 DTE',
    riskLevel: 3,
    rewardLevel: 5,
    icon: Target,
    color: 'orange'
  }
];

const glossaryTerms = [
  { term: 'Premium', definition: 'The price you pay to buy an option or receive when selling one' },
  { term: 'Strike Price', definition: 'The price at which you can buy (call) or sell (put) the underlying asset' },
  { term: 'Expiration', definition: 'When the option contract ends and becomes worthless if not exercised' },
  { term: 'Breakeven', definition: 'The underlying price where your trade neither makes nor loses money' },
  { term: 'POP', definition: 'Probability of Profit - estimated chance the trade will be profitable' },
  { term: 'IV', definition: 'Implied Volatility - market\'s expectation of future price movement' },
  { term: 'Assignment', definition: 'When you\'re required to fulfill your obligation as an option seller' }
];

export default function LearnOptions() {
  const [activeSection, setActiveSection] = useState('overview');
  const [selectedStrategy, setSelectedStrategy] = useState('long-call');
  const [underlyingPrice, setUnderlyingPrice] = useState([50]);
  const [calculatorStrategy, setCalculatorStrategy] = useState('long-call');
  const [quizAnswers, setQuizAnswers] = useState<{[key: string]: string}>({});
  const [quizScore, setQuizScore] = useState<number | null>(null);

  // Calculator inputs
  const [calcInputs, setCalcInputs] = useState({
    underlying: 50,
    strike1: 52.5,
    strike2: 45,
    premium1: 1.5,
    premium2: 0,
    costBasis: 50
  });

  const sectionRefs = {
    overview: useRef<HTMLDivElement>(null),
    'long-call': useRef<HTMLDivElement>(null),
    'long-put': useRef<HTMLDivElement>(null),
    'covered-call': useRef<HTMLDivElement>(null),
    'cash-secured-put': useRef<HTMLDivElement>(null),
    'vertical-spread': useRef<HTMLDivElement>(null),
    practice: useRef<HTMLDivElement>(null),
    quiz: useRef<HTMLDivElement>(null)
  };

  const scrollToSection = (section: string) => {
    const ref = sectionRefs[section as keyof typeof sectionRefs];
    if (ref.current) {
      ref.current.scrollIntoView({ behavior: 'smooth' });
      setActiveSection(section);
    }
  };

  const generatePayoffChart = (strategyId: string, strikes: number[], premiums: number[], range: [number, number]) => {
    const points: Array<{x: number, y: number}> = [];
    const step = (range[1] - range[0]) / 100;
    
    for (let price = range[0]; price <= range[1]; price += step) {
      let pnl = 0;
      
      switch (strategyId) {
        case 'long-call':
          pnl = longCall(price, strikes[0], premiums[0]);
          break;
        case 'long-put':
          pnl = longPut(price, strikes[0], premiums[0]);
          break;
        case 'covered-call':
          pnl = coveredCall(price, calcInputs.costBasis, strikes[0], premiums[0]);
          break;
        case 'cash-secured-put':
          pnl = cashSecuredPut(price, strikes[0], premiums[0]);
          break;
        case 'vertical-spread':
          pnl = bullPutCredit(price, strikes[0], strikes[1], premiums[0]);
          break;
      }
      
      points.push({ x: price, y: pnl });
    }
    
    return points;
  };

  const calculateCurrentPnL = (strategyId: string, currentPrice: number) => {
    switch (strategyId) {
      case 'long-call':
        return longCall(currentPrice, calcInputs.strike1, calcInputs.premium1);
      case 'long-put':
        return longPut(currentPrice, calcInputs.strike1, calcInputs.premium1);
      case 'covered-call':
        return coveredCall(currentPrice, calcInputs.costBasis, calcInputs.strike1, calcInputs.premium1);
      case 'cash-secured-put':
        return cashSecuredPut(currentPrice, calcInputs.strike1, calcInputs.premium1);
      case 'vertical-spread':
        return bullPutCredit(currentPrice, calcInputs.strike1, calcInputs.strike2, calcInputs.premium1);
      default:
        return 0;
    }
  };

  const PayoffChart = ({ strategyId, strikes, premiums, currentPrice }: {
    strategyId: string;
    strikes: number[];
    premiums: number[];
    currentPrice: number;
  }) => {
    const range: [number, number] = [Math.min(...strikes) * 0.7, Math.max(...strikes) * 1.3];
    const points = generatePayoffChart(strategyId, strikes, premiums, range);
    const currentPnL = calculateCurrentPnL(strategyId, currentPrice);
    
    const svgWidth = 400;
    const svgHeight = 300;
    const padding = 40;
    
    const xScale = (x: number) => padding + ((x - range[0]) / (range[1] - range[0])) * (svgWidth - 2 * padding);
    const yScale = (y: number) => {
      const minY = Math.min(...points.map(p => p.y));
      const maxY = Math.max(...points.map(p => p.y));
      const yRange = Math.max(maxY - minY, 1);
      return svgHeight - padding - ((y - minY) / yRange) * (svgHeight - 2 * padding);
    };
    
    const pathData = points.map((point, i) => 
      `${i === 0 ? 'M' : 'L'} ${xScale(point.x)} ${yScale(point.y)}`
    ).join(' ');
    
    return (
      <div className="w-full max-w-md mx-auto">
        <svg width={svgWidth} height={svgHeight} className="w-full h-auto">
          {/* Grid lines */}
          <defs>
            <pattern id="grid" width="40" height="30" patternUnits="userSpaceOnUse">
              <path d="M 40 0 L 0 0 0 30" fill="none" stroke="#374151" strokeWidth="0.5" opacity="0.3"/>
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#grid)" />
          
          {/* Zero line */}
          <line 
            x1={padding} 
            y1={yScale(0)} 
            x2={svgWidth - padding} 
            y2={yScale(0)} 
            stroke="#6B7280" 
            strokeWidth="1"
            strokeDasharray="5,5"
          />
          
          {/* Payoff curve */}
          <path
            d={pathData}
            fill="none"
            stroke="#10B981"
            strokeWidth="2"
          />
          
          {/* Current price indicator */}
          <line
            x1={xScale(currentPrice)}
            y1={padding}
            x2={xScale(currentPrice)}
            y2={svgHeight - padding}
            stroke="#EF4444"
            strokeWidth="2"
            strokeDasharray="3,3"
          />
          
          {/* Current P&L point */}
          <circle
            cx={xScale(currentPrice)}
            cy={yScale(currentPnL)}
            r="4"
            fill="#EF4444"
          />
          
          {/* Strike price markers */}
          {strikes.map((strike, i) => (
            <g key={i}>
              <line
                x1={xScale(strike)}
                y1={svgHeight - padding}
                x2={xScale(strike)}
                y2={svgHeight - padding + 10}
                stroke="#8B5CF6"
                strokeWidth="2"
              />
              <text
                x={xScale(strike)}
                y={svgHeight - padding + 25}
                textAnchor="middle"
                className="text-xs fill-purple-400"
              >
                ${strike}
              </text>
            </g>
          ))}
          
          {/* Axes labels */}
          <text
            x={svgWidth / 2}
            y={svgHeight - 5}
            textAnchor="middle"
            className="text-xs fill-gray-400"
          >
            Underlying Price at Expiration
          </text>
          
          <text
            x={15}
            y={svgHeight / 2}
            textAnchor="middle"
            transform={`rotate(-90 15 ${svgHeight / 2})`}
            className="text-xs fill-gray-400"
          >
            Profit/Loss
          </text>
        </svg>
        
        <div className="mt-4 p-3 bg-gray-800 rounded-lg">
          <div className="flex justify-between items-center">
            <span className="text-sm text-gray-300">Current P&L at ${currentPrice.toFixed(2)}:</span>
            <span className={`text-lg font-bold ${currentPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              ${currentPnL.toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    );
  };

  const StrategySection = ({ strategy }: { strategy: Strategy }) => {
    const Icon = strategy.icon;
    const currentPrice = underlyingPrice[0];
    
    const getStrategyDefaults = (strategyId: string) => {
      switch (strategyId) {
        case 'long-call':
          return { strikes: [52.5], premiums: [1.5], breakeven: 54.0 };
        case 'long-put':
          return { strikes: [47.5], premiums: [1.2], breakeven: 46.3 };
        case 'covered-call':
          return { strikes: [52.5], premiums: [1.0], breakeven: 49.0 };
        case 'cash-secured-put':
          return { strikes: [47.5], premiums: [1.2], breakeven: 46.3 };
        case 'vertical-spread':
          return { strikes: [47.5, 45.0], premiums: [0.6], breakeven: 46.9 };
        default:
          return { strikes: [50], premiums: [1], breakeven: 51 };
      }
    };
    
    const defaults = getStrategyDefaults(strategy.id);
    
    const getStrategyExplanation = (strategyId: string) => {
      switch (strategyId) {
        case 'long-call':
          return {
            what: "You buy the right to purchase 100 shares at the strike price before expiration.",
            profit: "Profit when the stock price rises above your breakeven (strike + premium paid).",
            loss: "Maximum loss is limited to the premium you paid if the stock stays below the strike.",
            breakeven: "Strike Price + Premium = $52.50 + $1.50 = $54.00"
          };
        case 'long-put':
          return {
            what: "You buy the right to sell 100 shares at the strike price before expiration.",
            profit: "Profit when the stock price falls below your breakeven (strike - premium paid).",
            loss: "Maximum loss is limited to the premium you paid if the stock stays above the strike.",
            breakeven: "Strike Price - Premium = $47.50 - $1.20 = $46.30"
          };
        case 'covered-call':
          return {
            what: "You own 100 shares and sell someone the right to buy them at the strike price.",
            profit: "Keep the premium received plus any stock appreciation up to the strike price.",
            loss: "If stock falls, you lose on shares but keep the premium as partial protection.",
            breakeven: "Cost Basis - Premium = $50.00 - $1.00 = $49.00"
          };
        case 'cash-secured-put':
          return {
            what: "You sell someone the right to sell you 100 shares at the strike price, holding cash to buy them.",
            profit: "Keep the premium if the stock stays above the strike price at expiration.",
            loss: "If assigned, you buy shares at strike price but keep the premium received.",
            breakeven: "Strike Price - Premium = $47.50 - $1.20 = $46.30"
          };
        case 'vertical-spread':
          return {
            what: "You sell a higher strike put and buy a lower strike put for protection.",
            profit: "Keep the net credit received if both puts expire worthless (stock above short strike).",
            loss: "Maximum loss is the spread width minus the credit received.",
            breakeven: "Short Strike - Net Credit = $47.50 - $0.60 = $46.90"
          };
        default:
          return { what: "", profit: "", loss: "", breakeven: "" };
      }
    };
    
    const explanation = getStrategyExplanation(strategy.id);
    
    return (
      <div className="mb-8 bg-gray-900 border border-gray-700 rounded-lg">
        <div className="p-6 border-b border-gray-700">
          <div className="flex items-center space-x-3">
            <div className={`p-2 rounded-lg bg-${strategy.color}-500/20`}>
              <Icon className={`h-6 w-6 text-${strategy.color}-400`} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">{strategy.name}</h2>
              <p className="text-gray-400">{strategy.description}</p>
            </div>
          </div>
        </div>
        
        <div className="p-6 space-y-6">
          {/* Snapshot */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 p-4 bg-gray-800 rounded-lg">
            <div>
              <div className="text-sm text-gray-400">Market View</div>
              <div className="font-medium text-white">{strategy.marketView}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Skill Level</div>
              <div className="font-medium text-white">{strategy.skillLevel}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Duration</div>
              <div className="font-medium text-white">{strategy.duration}</div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Risk Level</div>
              <div className="flex items-center space-x-1">
                {[...Array(5)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-3 h-3 rounded ${
                      i < strategy.riskLevel ? 'bg-red-500' : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-400">Reward Level</div>
              <div className="flex items-center space-x-1">
                {[...Array(10)].map((_, i) => (
                  <div
                    key={i}
                    className={`w-2 h-3 rounded ${
                      i < strategy.rewardLevel ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  />
                ))}
              </div>
            </div>
          </div>
          
          {/* Explanation */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">How It Works</h3>
            <div className="space-y-3 text-gray-300">
              <p><strong>What it is:</strong> {explanation.what}</p>
              <p><strong>How you profit:</strong> {explanation.profit}</p>
              <p><strong>How you lose:</strong> {explanation.loss}</p>
              <p><strong>Breakeven:</strong> {explanation.breakeven}</p>
            </div>
          </div>
          
          {/* Interactive Chart */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Payoff Chart</h3>
            <PayoffChart
              strategyId={strategy.id}
              strikes={defaults.strikes}
              premiums={defaults.premiums}
              currentPrice={currentPrice}
            />
            
            <div className="space-y-2">
              <label className="text-white block">
                Stock Price at Expiration: ${currentPrice.toFixed(2)}
              </label>
              <input
                type="range"
                min={20}
                max={80}
                step={0.5}
                value={currentPrice}
                onChange={(e) => setUnderlyingPrice([parseFloat(e.target.value)])}
                className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
              />
            </div>
          </div>
          
          {/* Market Examples */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold text-white">Examples Across Markets</h3>
            <div className="border border-gray-700 rounded-lg">
              <div className="grid grid-cols-4 border-b border-gray-700">
                {['stocks', 'futures', 'forex', 'crypto'].map((market) => (
                  <button
                    key={market}
                    className="p-3 text-center hover:bg-gray-800 transition-colors text-white border-r border-gray-700 last:border-r-0"
                  >
                    {market.charAt(0).toUpperCase() + market.slice(1)}
                  </button>
                ))}
              </div>
              
              <div className="p-4">
                <div className="space-y-2">
                  <div className="p-4 bg-gray-800 rounded-lg">
                    <h4 className="font-medium text-white mb-2">Apple Inc. (AAPL)</h4>
                    <p className="text-sm text-gray-300">
                      Stock at $150, buy 155 call for $3.50. Profit if AAPL rises above $158.50 by expiration.
                      Limited risk ($350) with unlimited upside potential.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
          
          {/* Safety Tips */}
          <div className="space-y-3 p-4 bg-yellow-900/20 border border-yellow-700 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-400 flex items-center">
              <Shield className="h-5 w-5 mr-2" />
              Safety & Common Mistakes
            </h3>
            <ul className="space-y-2 text-sm text-yellow-100">
              <li>• Don't risk more than you can afford to lose on any single trade</li>
              <li>• Consider taking profits at 30-50% of maximum potential</li>
              <li>• Be mindful of time decay - options lose value as expiration approaches</li>
              <li>• Exit rule: Consider closing around 21 days to expiration to avoid rapid time decay</li>
            </ul>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Sticky Header */}
      <header className="sticky top-0 z-50 bg-gray-900/95 backdrop-blur-sm border-b border-gray-700">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button 
                onClick={() => window.location.href = '/'}
                className="flex items-center space-x-2 text-gray-400 hover:text-white transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to Trading</span>
              </button>
              <div className="h-6 w-px bg-gray-600"></div>
              <h1 className="text-xl font-bold">Learn Options</h1>
            </div>
            
            <nav className="hidden md:flex items-center space-x-6">
              {['overview', 'long-call', 'long-put', 'covered-call', 'cash-secured-put', 'vertical-spread', 'practice', 'quiz'].map((section) => (
                <button
                  key={section}
                  onClick={() => scrollToSection(section)}
                  className={`text-sm hover:text-blue-400 transition-colors ${
                    activeSection === section ? 'text-blue-400' : 'text-gray-400'
                  }`}
                >
                  {section.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                </button>
              ))}
            </nav>
            
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => window.location.href = '/'}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 border border-blue-500 rounded-lg text-white transition-colors flex items-center space-x-2"
              >
                <Home className="h-4 w-4" />
                <span>Start Trading</span>
              </button>
              <button 
                onClick={() => window.print()}
                className="px-4 py-2 bg-gray-800 border border-gray-600 rounded-lg text-white hover:bg-gray-700 transition-colors flex items-center space-x-2"
              >
                <Download className="h-4 w-4" />
                <span>Download Notes</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8 space-y-12">
        {/* Overview Section */}
        <section ref={sectionRefs.overview} className="space-y-8">
          <div className="text-center space-y-4">
            <h1 className="text-4xl font-bold">Options Basics in 15 Minutes</h1>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto">
              Options give you rights, not obligations. Learn to buy time and leverage market movements 
              with defined risk strategies that work across stocks, futures, forex, and crypto.
            </p>
          </div>
          
          {/* Risk/Reward Spectrum */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Risk/Reward Spectrum</h2>
            <div className="flex items-center justify-between p-4 bg-gradient-to-r from-green-900/20 via-yellow-900/20 to-red-900/20 rounded-lg">
              <div className="text-center">
                <div className="text-green-400 font-semibold">Long Options</div>
                <div className="text-sm text-gray-400">Limited Risk, Unlimited Reward</div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
              <div className="text-center">
                <div className="text-yellow-400 font-semibold">Income Strategies</div>
                <div className="text-sm text-gray-400">Moderate Risk, Limited Reward</div>
              </div>
              <ArrowRight className="h-5 w-5 text-gray-400" />
              <div className="text-center">
                <div className="text-orange-400 font-semibold">Spreads</div>
                <div className="text-sm text-gray-400">Defined Risk, Defined Reward</div>
              </div>
            </div>
          </div>
          
          {/* Glossary */}
          <div className="bg-gray-800 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center">
              <BookOpen className="h-5 w-5 mr-2" />
              Essential Terms
            </h2>
            <div className="grid gap-3">
              {glossaryTerms.map((item, index) => (
                <details key={index} className="group">
                  <summary className="flex items-center justify-between w-full p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer list-none">
                    <span className="font-medium text-white">{item.term}</span>
                    <ArrowRight className="h-4 w-4 text-gray-400 transition-transform group-open:rotate-90" />
                  </summary>
                  <div className="p-3 text-gray-300 bg-gray-750 rounded-b-lg">
                    {item.definition}
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Strategy Sections */}
        {strategies.map((strategy) => (
          <section key={strategy.id} ref={sectionRefs[strategy.id as keyof typeof sectionRefs]}>
            <StrategySection strategy={strategy} />
          </section>
        ))}

        {/* Practice Zone */}
        <section ref={sectionRefs.practice} className="space-y-6">
          <div className="bg-gray-900 border border-gray-700 rounded-lg">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Practice Calculator
              </h2>
            </div>
            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div>
                    <label className="text-white block mb-2">Strategy</label>
                    <select 
                      value={calculatorStrategy} 
                      onChange={(e) => setCalculatorStrategy(e.target.value)}
                      className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                    >
                      {strategies.map((strategy) => (
                        <option key={strategy.id} value={strategy.id}>
                          {strategy.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-white block mb-2">Underlying Price</label>
                      <input
                        type="number"
                        value={calcInputs.underlying}
                        onChange={(e) => setCalcInputs(prev => ({...prev, underlying: parseFloat(e.target.value) || 0}))}
                        className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white block mb-2">Strike Price</label>
                      <input
                        type="number"
                        value={calcInputs.strike1}
                        onChange={(e) => setCalcInputs(prev => ({...prev, strike1: parseFloat(e.target.value) || 0}))}
                        className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                      />
                    </div>
                    <div>
                      <label className="text-white block mb-2">Premium</label>
                      <input
                        type="number"
                        step="0.01"
                        value={calcInputs.premium1}
                        onChange={(e) => setCalcInputs(prev => ({...prev, premium1: parseFloat(e.target.value) || 0}))}
                        className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                      />
                    </div>
                    {calculatorStrategy === 'vertical-spread' && (
                      <div>
                        <label className="text-white block mb-2">Long Strike</label>
                        <input
                          type="number"
                          value={calcInputs.strike2}
                          onChange={(e) => setCalcInputs(prev => ({...prev, strike2: parseFloat(e.target.value) || 0}))}
                          className="w-full p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                        />
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="space-y-4 p-4 bg-gray-800 rounded-lg">
                  <h3 className="font-semibold text-white">Results</h3>
                  <div className="space-y-2">
                    <div className="flex justify-between text-white">
                      <span>Breakeven:</span>
                      <span className="font-mono">
                        ${(() => {
                          switch (calculatorStrategy) {
                            case 'long-call':
                              return (calcInputs.strike1 + calcInputs.premium1).toFixed(2);
                            case 'long-put':
                              return (calcInputs.strike1 - calcInputs.premium1).toFixed(2);
                            case 'covered-call':
                              return (calcInputs.costBasis - calcInputs.premium1).toFixed(2);
                            case 'cash-secured-put':
                              return (calcInputs.strike1 - calcInputs.premium1).toFixed(2);
                            case 'vertical-spread':
                              return (calcInputs.strike1 - calcInputs.premium1).toFixed(2);
                            default:
                              return '0.00';
                          }
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white">Max Risk:</span>
                      <span className="font-mono text-red-400">
                        ${(() => {
                          switch (calculatorStrategy) {
                            case 'long-call':
                            case 'long-put':
                              return (calcInputs.premium1 * 100).toFixed(0);
                            case 'covered-call':
                              return 'Unlimited';
                            case 'cash-secured-put':
                              return ((calcInputs.strike1 - calcInputs.premium1) * 100).toFixed(0);
                            case 'vertical-spread':
                              return (((calcInputs.strike1 - calcInputs.strike2) - calcInputs.premium1) * 100).toFixed(0);
                            default:
                              return '0';
                          }
                        })()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-white">Max Reward:</span>
                      <span className="font-mono text-green-400">
                        {(() => {
                          switch (calculatorStrategy) {
                            case 'long-call':
                              return 'Unlimited';
                            case 'long-put':
                              return `$${((calcInputs.strike1 - calcInputs.premium1) * 100).toFixed(0)}`;
                            case 'covered-call':
                              return `$${((calcInputs.strike1 - calcInputs.costBasis + calcInputs.premium1) * 100).toFixed(0)}`;
                            case 'cash-secured-put':
                              return `$${(calcInputs.premium1 * 100).toFixed(0)}`;
                            case 'vertical-spread':
                              return `$${(calcInputs.premium1 * 100).toFixed(0)}`;
                            default:
                              return '$0';
                          }
                        })()}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
              
              <button 
                onClick={() => {
                  const tradePlan = `Strategy: ${strategies.find(s => s.id === calculatorStrategy)?.name}
Entry: ${calcInputs.underlying} -> ${calcInputs.strike1} @ $${calcInputs.premium1}
Profit Target: 30-50% of max gain
Time Stop: 21 DTE
Risk Management: Position size to risk only 1-2% of account`;
                  navigator.clipboard.writeText(tradePlan);
                }}
                className="w-full px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Copy Trade Plan
              </button>
            </div>
          </div>
        </section>

        {/* Quiz Section */}
        <section ref={sectionRefs.quiz} className="space-y-6">
          <div className="bg-gray-900 border border-gray-700 rounded-lg">
            <div className="p-6 border-b border-gray-700">
              <h2 className="text-xl font-bold text-white flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Knowledge Check Quiz
              </h2>
            </div>
            <div className="p-6 space-y-6">
              {[
                {
                  id: 'q1',
                  question: "When would you use a Long Call strategy?",
                  options: ["When bearish", "When bullish", "When neutral", "When uncertain"],
                  correct: 1,
                  explanation: "Long calls profit when the underlying asset rises above the breakeven price."
                },
                {
                  id: 'q2',
                  question: "What's the maximum risk in a Long Put?",
                  options: ["Unlimited", "Strike price", "Premium paid", "Current stock price"],
                  correct: 2,
                  explanation: "You can only lose the premium you paid for the put option, nothing more."
                },
                {
                  id: 'q3',
                  question: "Covered Calls work best when you're:",
                  options: ["Very bullish", "Very bearish", "Neutral to slightly bullish", "Expecting high volatility"],
                  correct: 2,
                  explanation: "Covered calls generate income when the stock stays below the strike price."
                },
                {
                  id: 'q4',
                  question: "Cash-Secured Puts require you to:",
                  options: ["Own the stock", "Have cash to buy the stock", "Sell the stock short", "Use margin"],
                  correct: 1,
                  explanation: "You must have enough cash to buy 100 shares at the strike price if assigned."
                },
                {
                  id: 'q5',
                  question: "In a Bull Put Credit Spread, your maximum profit is:",
                  options: ["Unlimited", "The credit received", "Strike difference", "Premium paid"],
                  correct: 1,
                  explanation: "You keep the full credit received if both puts expire worthless."
                }
              ].map((q, index) => (
                <div key={q.id} className="space-y-3">
                  <h3 className="font-semibold">
                    {index + 1}. {q.question}
                  </h3>
                  <div className="grid grid-cols-1 gap-2">
                    {q.options.map((option, optIndex) => (
                      <label
                        key={optIndex}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          quizAnswers[q.id] === optIndex.toString()
                            ? 'border-blue-500 bg-blue-500/20'
                            : 'border-gray-600 hover:border-gray-500'
                        }`}
                      >
                        <input
                          type="radio"
                          name={q.id}
                          value={optIndex}
                          checked={quizAnswers[q.id] === optIndex.toString()}
                          onChange={(e) => setQuizAnswers(prev => ({...prev, [q.id]: e.target.value}))}
                          className="sr-only"
                        />
                        {option}
                      </label>
                    ))}
                  </div>
                  {quizAnswers[q.id] && (
                    <div className={`p-3 rounded-lg ${
                      parseInt(quizAnswers[q.id]) === q.correct
                        ? 'bg-green-900/20 border border-green-700'
                        : 'bg-red-900/20 border border-red-700'
                    }`}>
                      <div className="flex items-center space-x-2">
                        <CheckCircle className={`h-4 w-4 ${
                          parseInt(quizAnswers[q.id]) === q.correct ? 'text-green-400' : 'text-red-400'
                        }`} />
                        <span className="text-sm">
                          {parseInt(quizAnswers[q.id]) === q.correct ? 'Correct!' : 'Incorrect.'}
                        </span>
                      </div>
                      <p className="text-sm text-gray-300 mt-1">{q.explanation}</p>
                    </div>
                  )}
                </div>
              ))}
              
              {Object.keys(quizAnswers).length === 5 && (
                <div className="text-center p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
                  <div className="text-2xl font-bold mb-2">
                    Quiz Complete! Score: {Object.entries(quizAnswers).reduce((score, [qId, answer]) => {
                      const questionIndex = parseInt(qId.substring(1)) - 1;
                      const correctAnswer = [1, 2, 2, 1, 1][questionIndex];
                      return score + (parseInt(answer) === correctAnswer ? 1 : 0);
                    }, 0)}/5
                  </div>
                  <div className="inline-flex items-center space-x-2 px-4 py-2 bg-blue-600 rounded-lg">
                    <CheckCircle className="h-5 w-5" />
                    <span>Options Basics Completed</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="pt-8 border-t border-gray-700 space-y-6">
          <div className="text-center text-sm text-gray-400">
            <p>
              This content is for educational purposes only and does not constitute financial advice. 
              Options trading involves risk and may not be suitable for all investors.
            </p>
          </div>
          
          <div className="flex flex-wrap justify-center gap-6 text-sm">
            <button className="text-blue-400 hover:text-blue-300">Position Sizing 101</button>
            <button className="text-blue-400 hover:text-blue-300">Greeks in 3 Minutes</button>
            <button className="text-blue-400 hover:text-blue-300">Managing Winners vs Losers</button>
          </div>
          
          <div className="flex justify-center">
            <div className="space-y-2">
              <label htmlFor="email" className="text-white block">Get more trading education:</label>
              <div className="flex space-x-2">
                <input
                  id="email"
                  type="email"
                  placeholder="your@email.com"
                  className="w-64 p-3 bg-gray-800 border border-gray-600 rounded-lg text-white"
                />
                <button className="px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
                  Subscribe
                </button>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}