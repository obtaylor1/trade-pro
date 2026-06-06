import type { TradingOpportunity } from "@shared/schema";

// ─── Base Mock Prices (updated every 60s with ±0.5% drift) ───────────────────

interface MockPrice {
  price: number;
  change24h: number;
  name: string;
}

const mockPrices: Record<string, MockPrice> = {
  // Stocks
  AAPL:  { price: 213.50, change24h: 1.2,  name: "Apple Inc." },
  MSFT:  { price: 441.00, change24h: 0.8,  name: "Microsoft Corp." },
  GOOGL: { price: 178.30, change24h: -0.4, name: "Alphabet Inc." },
  AMZN:  { price: 196.40, change24h: 1.5,  name: "Amazon.com Inc." },
  NVDA:  { price: 137.20, change24h: 3.1,  name: "NVIDIA Corp." },
  JNJ:   { price: 158.90, change24h: -0.2, name: "Johnson & Johnson" },
  PG:    { price: 171.60, change24h: 0.4,  name: "Procter & Gamble" },
  SPY:   { price: 524.80, change24h: 0.6,  name: "SPDR S&P 500 ETF" },
  QQQ:   { price: 452.30, change24h: 1.1,  name: "Invesco QQQ Trust" },
  // Crypto
  BTC:   { price: 98450,  change24h: 2.3,  name: "Bitcoin" },
  ETH:   { price: 3820,   change24h: 1.8,  name: "Ethereum" },
  SOL:   { price: 182.50, change24h: 4.2,  name: "Solana" },
  BNB:   { price: 634.20, change24h: 0.9,  name: "BNB" },
  ADA:   { price: 0.892,  change24h: -1.1, name: "Cardano" },
  AVAX:  { price: 41.30,  change24h: 3.5,  name: "Avalanche" },
  // Commodities
  GOLD:  { price: 3285.00, change24h: 0.3, name: "Gold (oz)" },
  OIL:   { price: 61.20,   change24h: -1.2,name: "Crude Oil (bbl)" },
  SILVER:{ price: 38.40,   change24h: 0.7, name: "Silver (oz)" },
  NATGAS:{ price: 3.82,    change24h: 2.1, name: "Natural Gas (MMBtu)" },
  // Forex (price = units of quote per 1 base)
  "EUR-USD": { price: 1.0845, change24h: 0.15, name: "EUR/USD" },
  "GBP-USD": { price: 1.2731, change24h: -0.22,name: "GBP/USD" },
  "USD-JPY": { price: 155.40, change24h: 0.31, name: "USD/JPY" },
  "AUD-USD": { price: 0.6412, change24h: 0.18, name: "AUD/USD" },
};

// Drift prices every 60 seconds
setInterval(() => {
  for (const key of Object.keys(mockPrices)) {
    const drift = (Math.random() - 0.5) * 0.01; // ±0.5%
    mockPrices[key].price = parseFloat((mockPrices[key].price * (1 + drift)).toFixed(key === "ADA" || key.includes("-") ? 4 : 2));
    mockPrices[key].change24h = parseFloat(((mockPrices[key].change24h + (Math.random() - 0.5) * 0.2)).toFixed(2));
  }
}, 60000);

export function getPrice(ticker: string): MockPrice {
  return mockPrices[ticker] ?? { price: 100, change24h: 0, name: ticker };
}

// ─── Signal generation helpers ────────────────────────────────────────────────

const SIGNAL_TYPES = ["BREAKOUT", "REVERSAL", "MOMENTUM", "MEAN_REVERSION"] as const;

function pickSignal(): typeof SIGNAL_TYPES[number] {
  return SIGNAL_TYPES[Math.floor(Math.random() * SIGNAL_TYPES.length)];
}

function confidence(base: number): number {
  return Math.min(97, Math.max(52, base + Math.floor((Math.random() - 0.5) * 14)));
}

function rsi(base: number): number {
  return Math.min(78, Math.max(22, base + Math.floor((Math.random() - 0.5) * 10)));
}

// ─── Rationales ───────────────────────────────────────────────────────────────

const stockRationales: Record<string, string> = {
  AAPL: "Apple's iPhone 17 cycle demand is strong with services revenue hitting record highs. AI features driving upgrade cycle. RSI pulling back to support after 3-week rally — ideal entry zone.",
  MSFT: "Azure AI cloud revenue growing 33% YoY. GitHub Copilot seats doubling quarterly. Price consolidating above 200-day MA, setting up for continuation move.",
  GOOGL: "Google's AI Overviews now in 100+ countries, boosting search engagement. YouTube ad revenue accelerating. Trading near key support at $175 — favorable risk/reward.",
  AMZN: "AWS market share stable at 32%. Prime membership at record. Advertising segment growing 21% YoY. Breakout above $190 resistance with volume confirmation.",
  NVDA: "AI chip demand outpacing supply through 2026. Blackwell GPU orders backlogged 12+ months. Strong momentum after earnings beat — RSI elevated but trend intact.",
  JNJ: "Defensive play as market volatility rises. Dividend aristocrat with 61-year payout streak. Trading at 52-week support — mean reversion setup with downside protection.",
  PG: "Consumer staples outperforming in risk-off environment. Pricing power maintained despite volume pressure. Approaching oversold on RSI — counter-trend bounce likely.",
  SPY: "S&P 500 holding above 200 SMA despite rate uncertainty. Breadth improving with small-caps joining rally. Momentum building — breakout above 520 resistance confirmed.",
  QQQ: "Tech sector leading as AI narrative strengthens. Nasdaq breadth expanding. MACD crossing bullish on daily chart — high-probability continuation setup.",
};

const cryptoRationales: Record<string, string> = {
  BTC: "Bitcoin spot ETF inflows hitting $500M/day. Halving supply shock still working through system. On-chain accumulation at exchange lows — classic pre-rally setup.",
  ETH: "Ethereum staking yield at 4.2% attracting institutional capital. Layer-2 activity surging. ETH/BTC ratio reversing from key support — altcoin rotation incoming.",
  SOL: "Solana DeFi TVL hitting all-time highs. Transaction fees 99% cheaper than ETH driving developer migration. Momentum accelerating — breakout from 2-week consolidation.",
  BNB: "Binance ecosystem tokens gaining as CEX volumes recover. BNB burn mechanism reducing supply monthly. Holding key $600 support with bullish divergence on RSI.",
  ADA: "Cardano's Chang hard fork enabling on-chain governance. Developer activity increasing 40% YoY. Deeply oversold vs. BTC — mean reversion trade with 3:1 risk/reward.",
  AVAX: "Avalanche subnet adoption accelerating in gaming and DeFi. Institutional validators joining. RSI at 45 — neither overbought nor oversold, ideal momentum entry.",
};

const commodityRationales: Record<string, string> = {
  GOLD: "Central bank gold buying at 55-year highs. Geopolitical uncertainty premium elevated. Dollar weakening as Fed rate cut expectations rise — gold's fundamental tailwinds strong.",
  OIL: "OPEC+ maintaining production cuts through Q3. Summer driving demand picking up. WTI holding $60 support — seasonal demand + supply discipline = upside catalyst.",
  SILVER: "Silver's industrial demand surging from solar panel manufacturing. Gold/silver ratio historically high, suggesting catch-up trade. Breakout above $38 resistance target $42.",
  NATGAS: "Natural gas storage deficit building ahead of summer cooling season. LNG export capacity expanding. RSI bouncing from oversold — contrarian entry with strong risk/reward.",
};

const forexRationales: Record<string, string> = {
  "EUR-USD": "ECB signaling slower rate cuts than Fed — euro gaining carry appeal. Eurozone PMI surprising to the upside 3 months running. Breakout above 1.08 resistance confirmed.",
  "GBP-USD": "UK inflation stickier than peers, delaying Bank of England cuts. GBP positioned for strength. Pullback to 1.27 support offering low-risk entry in prevailing uptrend.",
  "USD-JPY": "Bank of Japan finally tightening — yen strengthening trend emerging. USD/JPY rejection from 156 resistance. Reversal setup with tight stop above recent highs.",
  "AUD-USD": "Australia's commodity export revenues strong. China stimulus boosting AUD sentiment. AUD/USD bouncing from 0.64 support — range-bound with bullish bias.",
};

// ─── Generate Opportunities ───────────────────────────────────────────────────

export function generateOpportunities(market: string): TradingOpportunity[] {
  if (market === "stocks") return generateStocks();
  if (market === "crypto") return generateCrypto();
  if (market === "commodities") return generateCommodities();
  if (market === "options") return generateOptions();
  if (market === "forex") return generateForex();
  return [];
}

function generateStocks(): TradingOpportunity[] {
  const tickers = ["AAPL","MSFT","GOOGL","AMZN","NVDA","JNJ","PG","SPY","QQQ"];
  return tickers.map((ticker) => {
    const { price, change24h, name } = getPrice(ticker);
    const action = change24h > 0 ? "BUY" : change24h < -1 ? "SELL" : "BUY";
    const conf = confidence(ticker === "NVDA" ? 82 : ticker === "AAPL" ? 78 : 68);
    const target = parseFloat((price * 1.035).toFixed(2));
    const stop = parseFloat((price * 0.975).toFixed(2));
    return {
      id: `stock-${ticker.toLowerCase()}`,
      market: "stocks" as const,
      ticker, name, action: action as "BUY" | "SELL" | "HOLD",
      signalType: pickSignal(),
      entryPrice: price, targetPrice: target, stopLoss: stop,
      confidence: conf, change24h,
      rationale: stockRationales[ticker] ?? `${name} showing strong momentum.`,
      rsi: rsi(ticker === "NVDA" ? 68 : 52),
      macd: change24h > 0 ? "Bullish crossover" : "Bearish divergence",
      volume: "Above avg",
    };
  });
}

function generateCrypto(): TradingOpportunity[] {
  const tickers = ["BTC","ETH","SOL","BNB","ADA","AVAX"];
  return tickers.map((ticker) => {
    const { price, change24h, name } = getPrice(ticker);
    const action = change24h > 1 ? "BUY" : change24h < -1.5 ? "SELL" : "BUY";
    const conf = confidence(ticker === "BTC" ? 80 : ticker === "ETH" ? 74 : 65);
    const target = parseFloat((price * 1.06).toFixed(price < 1 ? 4 : 2));
    const stop = parseFloat((price * 0.96).toFixed(price < 1 ? 4 : 2));
    return {
      id: `crypto-${ticker.toLowerCase()}`,
      market: "crypto" as const,
      ticker, name, action: action as "BUY" | "SELL" | "HOLD",
      signalType: pickSignal(),
      entryPrice: price, targetPrice: target, stopLoss: stop,
      confidence: conf, change24h,
      rationale: cryptoRationales[ticker] ?? `${name} showing strong on-chain metrics.`,
      rsi: rsi(ticker === "BTC" ? 58 : 50),
      macd: change24h > 0 ? "Bullish momentum" : "Consolidating",
      volume: "High",
    };
  });
}

function generateCommodities(): TradingOpportunity[] {
  const tickers = ["GOLD","OIL","SILVER","NATGAS"];
  return tickers.map((ticker) => {
    const { price, change24h, name } = getPrice(ticker);
    const action = change24h > 0 ? "BUY" : "SELL";
    const conf = confidence(ticker === "GOLD" ? 77 : 65);
    const target = parseFloat((price * 1.04).toFixed(2));
    const stop = parseFloat((price * 0.97).toFixed(2));
    return {
      id: `commodity-${ticker.toLowerCase()}`,
      market: "commodities" as const,
      ticker, name, action: action as "BUY" | "SELL" | "HOLD",
      signalType: pickSignal(),
      entryPrice: price, targetPrice: target, stopLoss: stop,
      confidence: conf, change24h,
      rationale: commodityRationales[ticker] ?? `${name} driven by supply/demand imbalance.`,
      rsi: rsi(50),
      macd: "Neutral",
      volume: "Normal",
    };
  });
}

function generateOptions(): TradingOpportunity[] {
  const configs = [
    { ticker: "AAPL", underlying: "AAPL", type: "CALL" as const, volMult: 1.4 },
    { ticker: "TSLA", underlying: "TSLA", type: "PUT"  as const, volMult: 1.7 },
    { ticker: "SPY",  underlying: "SPY",  type: "CALL" as const, volMult: 1.1 },
    { ticker: "QQQ",  underlying: "QQQ",  type: "PUT"  as const, volMult: 1.2 },
    { ticker: "NVDA", underlying: "NVDA", type: "CALL" as const, volMult: 1.9 },
  ];
  const teslaMock = { price: 285.00, name: "Tesla Inc." };
  return configs.map((c) => {
    const underlying = c.ticker === "TSLA" ? teslaMock : getPrice(c.ticker);
    const iv = parseFloat((0.20 + Math.random() * 0.30).toFixed(2));
    const premium = parseFloat((iv * c.volMult * (c.ticker === "TSLA" ? 1.0 : 0.85)).toFixed(2));
    const strike = c.type === "CALL"
      ? parseFloat((underlying.price * 1.05).toFixed(0))
      : parseFloat((underlying.price * 0.95).toFixed(0));
    const expiry = new Date(); expiry.setDate(expiry.getDate() + 30);
    const expiryStr = expiry.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    const conf = confidence(c.ticker === "SPY" ? 76 : c.ticker === "AAPL" ? 73 : 65);
    return {
      id: `option-${c.ticker.toLowerCase()}-${c.type.toLowerCase()}`,
      market: "options" as const,
      ticker: c.ticker,
      name: `Micro ${underlying.name} ${c.type === "CALL" ? "Call" : "Put"}`,
      action: "BUY" as const,
      signalType: c.type === "CALL" ? "MOMENTUM" as const : "REVERSAL" as const,
      entryPrice: premium,
      targetPrice: parseFloat((premium * 6).toFixed(2)),
      stopLoss: 0,
      confidence: conf,
      rationale: stockRationales[c.ticker] ?? `${underlying.name} showing elevated implied volatility — premium selling opportunity.`,
      optionType: c.type,
      strikePrice: strike,
      premium,
      expiry: expiryStr,
      change24h: (Math.random() - 0.4) * 4,
      rsi: rsi(52),
    };
  });
}

function generateForex(): TradingOpportunity[] {
  const pairs = ["EUR-USD","GBP-USD","USD-JPY","AUD-USD"];
  return pairs.map((pair) => {
    const { price, change24h, name } = getPrice(pair);
    const isYen = pair === "USD-JPY";
    const action = change24h > 0 ? "BUY" : "SELL";
    const conf = confidence(68);
    const pip = isYen ? 0.01 : 0.0001;
    const target = parseFloat((price + pip * 50 * (action === "BUY" ? 1 : -1)).toFixed(isYen ? 2 : 4));
    const stop  = parseFloat((price - pip * 25 * (action === "BUY" ? 1 : -1)).toFixed(isYen ? 2 : 4));
    return {
      id: `forex-${pair.toLowerCase()}`,
      market: "forex" as const,
      ticker: pair, name, action: action as "BUY" | "SELL" | "HOLD",
      signalType: pickSignal(),
      entryPrice: price, targetPrice: target, stopLoss: stop,
      confidence: conf, change24h,
      rationale: forexRationales[pair] ?? `${name} forming technical setup on 4H chart.`,
      rsi: rsi(52),
      macd: change24h > 0 ? "Bullish" : "Bearish",
      volume: "High liquidity",
    };
  });
}

// AI Signal feed — combined cross-market signals
export function generateAISignals(): TradingOpportunity[] {
  return [
    ...generateStocks().slice(0, 3),
    ...generateCrypto().slice(0, 2),
    ...generateCommodities().slice(0, 1),
    ...generateForex().slice(0, 1),
    ...generateOptions().slice(0, 1),
  ].sort((a, b) => b.confidence - a.confidence);
}

export const marketDataService = { generateOpportunities, generateAISignals, getPrice };
