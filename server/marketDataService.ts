import type { TradingOpportunity } from "@shared/schema";

// ─── Base Mock Prices ─────────────────────────────────────────────────────────

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
  TSLA:  { price: 285.00, change24h: -1.3, name: "Tesla Inc." },
  AMD:   { price: 175.20, change24h: 2.1,  name: "Advanced Micro Devices" },
  META:  { price: 512.30, change24h: 1.7,  name: "Meta Platforms Inc." },
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
  GOLD:  { price: 3285.00, change24h: 0.3,  name: "Gold (oz)" },
  OIL:   { price: 61.20,   change24h: -1.2, name: "Crude Oil (bbl)" },
  SILVER:{ price: 38.40,   change24h: 0.7,  name: "Silver (oz)" },
  NATGAS:{ price: 3.82,    change24h: 2.1,  name: "Natural Gas (MMBtu)" },
  // Forex Majors
  "EUR-USD": { price: 1.0845, change24h: 0.15,  name: "EUR/USD" },
  "GBP-USD": { price: 1.2731, change24h: -0.22, name: "GBP/USD" },
  "USD-JPY": { price: 155.40, change24h: 0.31,  name: "USD/JPY" },
  "AUD-USD": { price: 0.6412, change24h: 0.18,  name: "AUD/USD" },
  "USD-CHF": { price: 0.9082, change24h: -0.12, name: "USD/CHF" },
  "USD-CAD": { price: 1.3598, change24h: 0.09,  name: "USD/CAD" },
  "NZD-USD": { price: 0.6105, change24h: 0.22,  name: "NZD/USD" },
  "EUR-GBP": { price: 0.8532, change24h: -0.08, name: "EUR/GBP" },
  "EUR-JPY": { price: 168.45, change24h: 0.41,  name: "EUR/JPY" },
  "GBP-JPY": { price: 197.85, change24h: 0.55,  name: "GBP/JPY" },
  // Forex Swing
  "EUR-AUD": { price: 1.7102, change24h: -0.19, name: "EUR/AUD" },
  "GBP-AUD": { price: 1.9845, change24h: -0.31, name: "GBP/AUD" },
  "EUR-NZD": { price: 1.7765, change24h: 0.14,  name: "EUR/NZD" },
  "USD-MXN": { price: 17.15,  change24h: 0.42,  name: "USD/MXN" },
  "USD-ZAR": { price: 18.42,  change24h: 0.78,  name: "USD/ZAR" },
  "EUR-CHF": { price: 0.9847, change24h: -0.05, name: "EUR/CHF" },
  // Forex Position
  "USD-CNH": { price: 7.2435, change24h: 0.11,  name: "USD/CNH" },
  "USD-SGD": { price: 1.3485, change24h: -0.07, name: "USD/SGD" },
  "USD-NOK": { price: 10.6823,change24h: 0.33,  name: "USD/NOK" },
};

// Drift prices every 60 seconds
setInterval(() => {
  for (const key of Object.keys(mockPrices)) {
    const drift = (Math.random() - 0.5) * 0.01;
    const decimals = key === "ADA" || key.startsWith("EUR-") || key.startsWith("GBP-") || key.startsWith("AUD-") || key.startsWith("NZD-") ? 4 : 2;
    mockPrices[key].price = parseFloat((mockPrices[key].price * (1 + drift)).toFixed(decimals));
    mockPrices[key].change24h = parseFloat(((mockPrices[key].change24h + (Math.random() - 0.5) * 0.2)).toFixed(2));
  }
}, 60000);

export function getPrice(ticker: string): MockPrice {
  return mockPrices[ticker] ?? { price: 100, change24h: 0, name: ticker };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

// Compute next Friday and days remaining
function getNextFriday(): { label: string; daysLeft: number } {
  const now = new Date();
  const day = now.getDay(); // 0=Sun, 5=Fri
  let daysToFriday = (5 - day + 7) % 7;
  if (daysToFriday === 0) daysToFriday = 7; // if today is Friday, go to next week
  const next = new Date(now);
  next.setDate(now.getDate() + daysToFriday);
  const label = next.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return { label, daysLeft: daysToFriday };
}

// ─── Rationales ───────────────────────────────────────────────────────────────

const stockRationales: Record<string, string> = {
  AAPL: "Apple's iPhone 17 cycle demand is strong with services revenue hitting record highs. AI features driving upgrade cycle. RSI pulling back to support after 3-week rally — ideal entry zone.",
  MSFT: "Azure AI cloud revenue growing 33% YoY. GitHub Copilot seats doubling quarterly. Price consolidating above 200-day MA, setting up for continuation move.",
  GOOGL: "Google's AI Overviews now in 100+ countries, boosting search engagement. YouTube ad revenue accelerating. Trading near key support at $175 — favorable risk/reward.",
  AMZN: "AWS market share stable at 32%. Prime membership at record. Advertising segment growing 21% YoY. Breakout above $190 resistance with volume confirmation.",
  NVDA: "AI chip demand outpacing supply through 2026. Blackwell GPU orders backlogged 12+ months. Strong momentum after earnings beat — RSI elevated but trend intact.",
  TSLA: "Tesla's Full Self-Driving miles increasing exponentially. Robotaxi launch imminent. Stock oversold after recent sell-off — reversal setup forming with high-probability bounce.",
  AMD: "AMD's AI GPU market share growing rapidly. MI300X chips gaining traction in data centers. Trading at key support — momentum building for next leg higher.",
  META: "Meta's AI ad targeting delivering record ROAS for advertisers. Reality Labs losses narrowing. Strong free cash flow supporting buybacks — momentum intact.",
  JNJ: "Defensive play as market volatility rises. Dividend aristocrat with 61-year payout streak. Trading at 52-week support — mean reversion setup with downside protection.",
  PG: "Consumer staples outperforming in risk-off environment. Pricing power maintained despite volume pressure. Approaching oversold on RSI — counter-trend bounce likely.",
  SPY: "S&P 500 holding above 200 SMA despite rate uncertainty. Breadth improving with small-caps joining rally. Momentum building — breakout above 520 resistance confirmed.",
  QQQ: "Tech sector leading as AI narrative strengthens. Nasdaq breadth expanding. MACD crossing bullish on daily chart — high-probability continuation setup.",
};

const weeklyRationales: Record<string, string> = {
  AAPL: "Earnings next week + iPhone supply chain data bullish. This week's call benefits from any positive news catalyst.",
  MSFT: "Azure cloud earnings catalyst this week. Call premium is cheap relative to expected move — good risk/reward.",
  GOOGL: "Ad spend data releases Thursday. Stock at key support, cheap weekly call ideal for breakout play.",
  AMZN: "Prime Day prep boosting sentiment. AWS growth story intact — this week's call targets 2% upside.",
  NVDA: "GPU shipment data due Friday. Stock in strong uptrend — weekly calls consistently profitable in momentum.",
  TSLA: "Robotaxi update expected. High implied volatility makes puts attractive as hedge against hype pullback.",
  AMD: "Server chip sales data this week. Strong risk/reward for weekly call at current support level.",
  META: "Ad revenue tracker data releases mid-week. Strong buy momentum supports weekly call setup.",
  SPY: "Market breadth positive. Weekly SPY calls benefit from any positive economic data this week.",
  QQQ: "Tech sector momentum strong. Low premium weekly calls ideal for capturing Nasdaq breakout.",
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

// ─── Stocks ───────────────────────────────────────────────────────────────────

function generateStocks(): TradingOpportunity[] {
  const tickers = ["AAPL","MSFT","GOOGL","AMZN","NVDA","JNJ","PG","SPY","QQQ"];
  return tickers.map((ticker) => {
    const { price, change24h, name } = getPrice(ticker);
    const action = change24h > 0 ? "BUY" : change24h < -1 ? "SELL" : "BUY";
    const conf = confidence(ticker === "NVDA" ? 82 : ticker === "AAPL" ? 78 : 68);
    return {
      id: `stock-${ticker.toLowerCase()}`,
      market: "stocks" as const,
      ticker, name, action: action as "BUY" | "SELL" | "HOLD",
      signalType: pickSignal(),
      entryPrice: price,
      targetPrice: parseFloat((price * 1.035).toFixed(2)),
      stopLoss: parseFloat((price * 0.975).toFixed(2)),
      confidence: conf, change24h,
      rationale: stockRationales[ticker] ?? `${name} showing strong momentum.`,
      rsi: rsi(ticker === "NVDA" ? 68 : 52),
      macd: change24h > 0 ? "Bullish crossover" : "Bearish divergence",
      volume: "Above avg",
    };
  });
}

// ─── Crypto ───────────────────────────────────────────────────────────────────

function generateCrypto(): TradingOpportunity[] {
  const tickers = ["BTC","ETH","SOL","BNB","ADA","AVAX"];
  return tickers.map((ticker) => {
    const { price, change24h, name } = getPrice(ticker);
    const action = change24h > 1 ? "BUY" : change24h < -1.5 ? "SELL" : "BUY";
    const conf = confidence(ticker === "BTC" ? 80 : ticker === "ETH" ? 74 : 65);
    return {
      id: `crypto-${ticker.toLowerCase()}`,
      market: "crypto" as const,
      ticker, name, action: action as "BUY" | "SELL" | "HOLD",
      signalType: pickSignal(),
      entryPrice: price,
      targetPrice: parseFloat((price * 1.06).toFixed(price < 1 ? 4 : 2)),
      stopLoss: parseFloat((price * 0.96).toFixed(price < 1 ? 4 : 2)),
      confidence: conf, change24h,
      rationale: cryptoRationales[ticker] ?? `${name} showing strong on-chain metrics.`,
      rsi: rsi(ticker === "BTC" ? 58 : 50),
      macd: change24h > 0 ? "Bullish momentum" : "Consolidating",
      volume: "High",
    };
  });
}

// ─── Commodities ──────────────────────────────────────────────────────────────

function generateCommodities(): TradingOpportunity[] {
  const tickers = ["GOLD","OIL","SILVER","NATGAS"];
  return tickers.map((ticker) => {
    const { price, change24h, name } = getPrice(ticker);
    return {
      id: `commodity-${ticker.toLowerCase()}`,
      market: "commodities" as const,
      ticker, name,
      action: (change24h > 0 ? "BUY" : "SELL") as "BUY" | "SELL" | "HOLD",
      signalType: pickSignal(),
      entryPrice: price,
      targetPrice: parseFloat((price * 1.04).toFixed(2)),
      stopLoss: parseFloat((price * 0.97).toFixed(2)),
      confidence: confidence(ticker === "GOLD" ? 77 : 65),
      change24h,
      rationale: commodityRationales[ticker] ?? `${name} driven by supply/demand imbalance.`,
      rsi: rsi(50),
      macd: "Neutral",
      volume: "Normal",
    };
  });
}

// ─── Weekly Options ───────────────────────────────────────────────────────────

function generateOptions(): TradingOpportunity[] {
  const { label: expiryLabel, daysLeft } = getNextFriday();

  const configs: Array<{
    ticker: string;
    type: "CALL" | "PUT";
    premium: number;
    baseConf: number;
    strikePct: number;   // how far OTM (positive = OTM call, negative = OTM put)
  }> = [
    { ticker: "SPY",  type: "CALL", premium: 0.35, baseConf: 78, strikePct: 0.015 },
    { ticker: "AAPL", type: "CALL", premium: 0.35, baseConf: 74, strikePct: 0.02  },
    { ticker: "NVDA", type: "CALL", premium: 0.72, baseConf: 76, strikePct: 0.025 },
    { ticker: "TSLA", type: "PUT",  premium: 0.85, baseConf: 68, strikePct: 0.02  },
    { ticker: "QQQ",  type: "CALL", premium: 0.42, baseConf: 72, strikePct: 0.015 },
    { ticker: "MSFT", type: "CALL", premium: 0.48, baseConf: 71, strikePct: 0.02  },
    { ticker: "AMD",  type: "CALL", premium: 0.62, baseConf: 67, strikePct: 0.025 },
    { ticker: "META", type: "CALL", premium: 0.65, baseConf: 70, strikePct: 0.02  },
    { ticker: "AMZN", type: "CALL", premium: 0.55, baseConf: 69, strikePct: 0.02  },
    { ticker: "GOOGL",type: "PUT",  premium: 0.40, baseConf: 65, strikePct: 0.02  },
  ];

  return configs.map((c) => {
    const { price, name } = getPrice(c.ticker);
    // Add a small random variance to premium so it feels live
    const premium = parseFloat((c.premium * (0.85 + Math.random() * 0.3)).toFixed(2));
    const strike = c.type === "CALL"
      ? parseFloat((price * (1 + c.strikePct)).toFixed(0))
      : parseFloat((price * (1 - c.strikePct)).toFixed(0));
    // Potential gain: if underlying moves 2-3%, option can 4-8x in a week
    const targetMultiple = 4 + Math.random() * 4;
    const conf = confidence(c.baseConf);

    return {
      id: `option-weekly-${c.ticker.toLowerCase()}-${c.type.toLowerCase()}`,
      market: "options" as const,
      ticker: c.ticker,
      name: `${name} Weekly ${c.type === "CALL" ? "Call" : "Put"}`,
      action: "BUY" as const,
      signalType: (c.type === "CALL" ? "MOMENTUM" : "REVERSAL") as "MOMENTUM" | "REVERSAL",
      entryPrice: premium,
      targetPrice: parseFloat((premium * targetMultiple).toFixed(2)),
      stopLoss: 0,
      confidence: conf,
      rationale: stockRationales[c.ticker] ?? `${name} showing elevated implied volatility this week.`,
      weeklyRationale: weeklyRationales[c.ticker] ?? `Weekly catalyst expected. Low premium makes this an affordable trade for any budget.`,
      optionType: c.type,
      strikePrice: strike,
      premium,
      expiry: expiryLabel,
      daysLeft,
      change24h: (Math.random() - 0.4) * 4,
      rsi: rsi(52),
      volume: "High",
    };
  });
}

// ─── Forex ────────────────────────────────────────────────────────────────────

interface ForexConfig {
  pair: string;
  fullName: string;
  pipTarget: number;
  stopPips: number;
  spread: string;
  bestTime: string;
  baseConf: number;
  timeframes: string;
  macroNote?: string;
}

const SCALP_PAIRS: ForexConfig[] = [
  { pair: "EUR-USD", fullName: "Euro / US Dollar",         pipTarget: 12, stopPips: 6,  spread: "0.8 pips",  bestTime: "London/NY overlap (8 AM–12 PM ET)", baseConf: 74, timeframes: "M1, M5, M15" },
  { pair: "GBP-USD", fullName: "British Pound / US Dollar",pipTarget: 15, stopPips: 8,  spread: "1.2 pips",  bestTime: "London open (3–8 AM ET)",            baseConf: 71, timeframes: "M5, M15" },
  { pair: "USD-JPY", fullName: "US Dollar / Japanese Yen", pipTarget: 10, stopPips: 5,  spread: "0.7 pips",  bestTime: "Tokyo/London overlap (3–5 AM ET)",   baseConf: 73, timeframes: "M1, M5, M15" },
  { pair: "USD-CHF", fullName: "US Dollar / Swiss Franc",  pipTarget: 10, stopPips: 6,  spread: "1.1 pips",  bestTime: "London/NY overlap (8 AM–12 PM ET)", baseConf: 68, timeframes: "M5, M15" },
  { pair: "EUR-GBP", fullName: "Euro / British Pound",     pipTarget: 8,  stopPips: 5,  spread: "1.0 pips",  bestTime: "London open (3–8 AM ET)",            baseConf: 66, timeframes: "M5, M15" },
  { pair: "AUD-USD", fullName: "Australian Dollar / USD",  pipTarget: 12, stopPips: 7,  spread: "1.1 pips",  bestTime: "Sydney/Tokyo overlap (7–9 PM ET)",   baseConf: 65, timeframes: "M5, M15" },
  { pair: "NZD-USD", fullName: "New Zealand Dollar / USD", pipTarget: 10, stopPips: 6,  spread: "1.5 pips",  bestTime: "Sydney open (5–7 PM ET)",            baseConf: 63, timeframes: "M5, M15" },
  { pair: "EUR-JPY", fullName: "Euro / Japanese Yen",      pipTarget: 15, stopPips: 8,  spread: "1.3 pips",  bestTime: "Tokyo/London overlap (3–5 AM ET)",   baseConf: 67, timeframes: "M5, M15" },
  { pair: "GBP-JPY", fullName: "British Pound / Yen",      pipTarget: 20, stopPips: 10, spread: "2.0 pips",  bestTime: "London open (3–8 AM ET)",            baseConf: 64, timeframes: "M5, M15" },
  { pair: "USD-CAD", fullName: "US Dollar / Canadian Dollar",pipTarget:12, stopPips: 7,  spread: "1.2 pips", bestTime: "NY open (8 AM–12 PM ET)",            baseConf: 67, timeframes: "M5, M15" },
];

const SWING_PAIRS: ForexConfig[] = [
  { pair: "EUR-USD", fullName: "Euro / US Dollar",          pipTarget: 120, stopPips: 60,  spread: "1.0 pips",  bestTime: "Any session, hold 2–5 days", baseConf: 72, timeframes: "H1, H4, D1" },
  { pair: "GBP-USD", fullName: "British Pound / US Dollar", pipTarget: 150, stopPips: 75,  spread: "1.5 pips",  bestTime: "UK/US sessions",             baseConf: 69, timeframes: "H4, D1" },
  { pair: "AUD-USD", fullName: "Australian Dollar / USD",   pipTarget: 100, stopPips: 50,  spread: "1.2 pips",  bestTime: "Asian/London sessions",      baseConf: 67, timeframes: "H4, D1" },
  { pair: "USD-CAD", fullName: "US Dollar / Canadian Dollar",pipTarget:130, stopPips: 65,  spread: "1.3 pips",  bestTime: "NY session, oil hours",      baseConf: 68, timeframes: "H4, D1" },
  { pair: "EUR-AUD", fullName: "Euro / Australian Dollar",  pipTarget: 180, stopPips: 90,  spread: "2.5 pips",  bestTime: "London open",                baseConf: 63, timeframes: "H4, D1" },
  { pair: "GBP-AUD", fullName: "British Pound / Aud Dollar",pipTarget: 200, stopPips: 100, spread: "3.0 pips",  bestTime: "London/Sydney overlap",      baseConf: 61, timeframes: "H4, D1" },
  { pair: "EUR-NZD", fullName: "Euro / New Zealand Dollar", pipTarget: 160, stopPips: 80,  spread: "3.5 pips",  bestTime: "London open",                baseConf: 60, timeframes: "H4, D1" },
  { pair: "USD-MXN", fullName: "US Dollar / Mexican Peso",  pipTarget: 500, stopPips: 250, spread: "4.0 pips",  bestTime: "NY session",                 baseConf: 59, timeframes: "H4, D1" },
  { pair: "USD-ZAR", fullName: "US Dollar / South African Rand",pipTarget:800,stopPips:400, spread:"8.0 pips", bestTime: "London/NY overlap",          baseConf: 57, timeframes: "H4, D1" },
  { pair: "EUR-CHF", fullName: "Euro / Swiss Franc",        pipTarget: 90,  stopPips: 45,  spread: "2.0 pips",  bestTime: "London/EU sessions",         baseConf: 64, timeframes: "H4, D1" },
];

const POSITION_PAIRS: ForexConfig[] = [
  { pair: "EUR-USD", fullName: "Euro / US Dollar",          pipTarget: 500,  stopPips: 200, spread: "1.0 pips",  bestTime: "Set & forget, review weekly", baseConf: 68, timeframes: "D1, W1, MN", macroNote: "ECB slower to cut than Fed → EUR strength building" },
  { pair: "USD-JPY", fullName: "US Dollar / Japanese Yen",  pipTarget: 800,  stopPips: 300, spread: "0.8 pips",  bestTime: "Review monthly",              baseConf: 70, timeframes: "D1, W1, MN", macroNote: "BoJ rate hikes emerging → JPY to strengthen long-term" },
  { pair: "GBP-USD", fullName: "British Pound / US Dollar", pipTarget: 600,  stopPips: 250, spread: "1.5 pips",  bestTime: "Review weekly",               baseConf: 66, timeframes: "D1, W1, MN", macroNote: "UK inflation sticky → BoE holds longer than expected" },
  { pair: "AUD-USD", fullName: "Australian Dollar / USD",   pipTarget: 450,  stopPips: 180, spread: "1.2 pips",  bestTime: "Review weekly",               baseConf: 64, timeframes: "D1, W1, MN", macroNote: "China stimulus boosting commodity exports → AUD upside" },
  { pair: "USD-CHF", fullName: "US Dollar / Swiss Franc",   pipTarget: 400,  stopPips: 160, spread: "1.1 pips",  bestTime: "Review monthly",              baseConf: 65, timeframes: "D1, W1, MN", macroNote: "SNB easing cycle vs Fed hold → USD/CHF upside" },
  { pair: "USD-CNH", fullName: "US Dollar / Chinese Yuan",  pipTarget: 1000, stopPips: 400, spread: "5.0 pips",  bestTime: "Review monthly",              baseConf: 61, timeframes: "D1, W1, MN", macroNote: "US-China trade dynamics → dollar strength vs yuan" },
  { pair: "EUR-GBP", fullName: "Euro / British Pound",      pipTarget: 350,  stopPips: 140, spread: "1.0 pips",  bestTime: "Review weekly",               baseConf: 63, timeframes: "D1, W1, MN", macroNote: "ECB cuts faster than BoE → bearish EUR/GBP" },
  { pair: "NZD-USD", fullName: "New Zealand Dollar / USD",  pipTarget: 400,  stopPips: 160, spread: "1.5 pips",  bestTime: "Review weekly",               baseConf: 62, timeframes: "D1, W1, MN", macroNote: "RBNZ rate cycle peaking → NZD recovery play" },
  { pair: "USD-SGD", fullName: "US Dollar / Singapore Dollar",pipTarget:300, stopPips:120, spread: "3.0 pips",   bestTime: "Review monthly",              baseConf: 60, timeframes: "D1, W1, MN", macroNote: "MAS manages SGD band — low volatility, steady returns" },
  { pair: "USD-NOK", fullName: "US Dollar / Norwegian Krone",pipTarget:800, stopPips:300, spread: "6.0 pips",   bestTime: "Review monthly",              baseConf: 58, timeframes: "D1, W1, MN", macroNote: "Oil price recovery supports NOK → bearish USD/NOK" },
];

function generateForex(style: string = "SCALP"): TradingOpportunity[] {
  const styleKey = style.toUpperCase() as "SCALP" | "SWING" | "POSITION";
  const pairConfigs = styleKey === "SWING" ? SWING_PAIRS : styleKey === "POSITION" ? POSITION_PAIRS : SCALP_PAIRS;
  const forexStyleEnum = styleKey === "SWING" ? "SWING" : styleKey === "POSITION" ? "POSITION" : "SCALP";

  return pairConfigs.map((cfg, i) => {
    const { price, change24h } = getPrice(cfg.pair);
    const isYen = cfg.pair.includes("JPY");
    const isMXN = cfg.pair.includes("MXN");
    const isZAR = cfg.pair.includes("ZAR");
    const isNOK = cfg.pair.includes("NOK");
    const isExotic = isMXN || isZAR || isNOK || cfg.pair.includes("CNH") || cfg.pair.includes("SGD");

    const action = change24h > 0 ? "BUY" : "SELL";
    const conf = confidence(cfg.baseConf);

    const pip = isYen ? 0.01 : isExotic ? 0.01 : 0.0001;
    const pipMulti = action === "BUY" ? 1 : -1;
    const target = parseFloat((price + pip * cfg.pipTarget * pipMulti).toFixed(isYen || isExotic ? 2 : 4));
    const stop  = parseFloat((price - pip * cfg.stopPips * pipMulti).toFixed(isYen || isExotic ? 2 : 4));

    const rationale = cfg.macroNote
      ? `${cfg.macroNote}. ${styleKey === "POSITION" ? "Long-term fundamental shift supports this multi-month trade." : ""}`
      : styleKey === "SCALP"
        ? `Tight spread and high liquidity make ${cfg.pair.replace("-","/")} ideal for quick scalps. Enter near support, take profit fast, always exit before day end.`
        : `${cfg.pair.replace("-","/")} setting up on ${cfg.timeframes} timeframe. Key level ${action === "BUY" ? "support" : "resistance"} holding — swing trade targets ${cfg.pipTarget} pips over ${styleKey === "SWING" ? "2–7 days" : "weeks to months"}.`;

    return {
      id: `forex-${styleKey.toLowerCase()}-${cfg.pair.toLowerCase()}-${i}`,
      market: "forex" as const,
      ticker: cfg.pair,
      name: cfg.pair.replace("-", "/"),
      fullName: cfg.fullName,
      action: action as "BUY" | "SELL" | "HOLD",
      signalType: pickSignal(),
      entryPrice: price,
      targetPrice: target,
      stopLoss: stop,
      confidence: conf,
      change24h,
      rationale,
      forexStyle: forexStyleEnum,
      pipTarget: cfg.pipTarget,
      stopPips: cfg.stopPips,
      spread: cfg.spread,
      bestTime: cfg.bestTime,
      timeframes: cfg.timeframes,
      rsi: rsi(52),
      macd: change24h > 0 ? "Bullish" : "Bearish",
      volume: "High liquidity",
    };
  });
}

// ─── Generate Opportunities ───────────────────────────────────────────────────

export function generateOpportunities(market: string, style?: string): TradingOpportunity[] {
  if (market === "stocks")      return generateStocks();
  if (market === "crypto")      return generateCrypto();
  if (market === "commodities") return generateCommodities();
  if (market === "options")     return generateOptions();
  if (market === "forex")       return generateForex(style);
  return [];
}

// AI Signal feed — combined cross-market signals
export function generateAISignals(): TradingOpportunity[] {
  return [
    ...generateStocks().slice(0, 3),
    ...generateCrypto().slice(0, 2),
    ...generateCommodities().slice(0, 1),
    ...generateForex("SCALP").slice(0, 1),
    ...generateOptions().slice(0, 1),
  ].sort((a, b) => b.confidence - a.confidence);
}

export const marketDataService = { generateOpportunities, generateAISignals, getPrice };
