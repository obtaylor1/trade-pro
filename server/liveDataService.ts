import YahooFinanceLib from "yahoo-finance2";

// v3 default export is the class itself — must instantiate; suppress survey/notice spam
const yf: any = new (YahooFinanceLib as any)({ suppressNotices: ["yahooSurvey", "ripHistoricalRows"] });

// ─── Types ────────────────────────────────────────────────────────────────────

export interface LivePrice {
  price: number;
  change24h: number;
  marketOpen: boolean;
  lastUpdated: string;
  bid?: number;
  ask?: number;
  spread?: string;
  source: "live" | "cache";
}

export interface OptionContract {
  contractSymbol: string;
  strike: number;
  lastPrice: number;
  bid: number;
  ask: number;
  volume: number;
  impliedVolatility: number;
  inTheMoney: boolean;
  expiry: string;
  daysLeft: number;
}

export interface OptionsChainEntry {
  calls: OptionContract[];
  puts: OptionContract[];
  underlyingPrice: number;
  expiry: string;
  daysLeft: number;
  fetchedAt: number;
}

// ─── Initial Fallback Prices ──────────────────────────────────────────────────

const FALLBACK_STOCKS: Record<string, { price: number; change24h: number; name: string }> = {
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
  // Commodities (futures symbols)
  "GC=F": { price: 3285.00, change24h: 0.3,  name: "Gold Futures" },
  "CL=F": { price: 61.20,   change24h: -1.2, name: "Crude Oil Futures" },
  "SI=F": { price: 38.40,   change24h: 0.7,  name: "Silver Futures" },
  "NG=F": { price: 3.82,    change24h: 2.1,  name: "Natural Gas Futures" },
};

const FALLBACK_CRYPTO: Record<string, number> = {
  BTC: 98450, ETH: 3820, SOL: 182.50, BNB: 634.20, ADA: 0.892, AVAX: 41.30,
};

// ─── Cache ────────────────────────────────────────────────────────────────────

const priceCache: Record<string, LivePrice> = {};
const optionsCache: Record<string, OptionsChainEntry> = {};
let marketOpen = false;

function etTimeString(): string {
  return new Date().toLocaleTimeString("en-US", { timeZone: "America/New_York", hour: "2-digit", minute: "2-digit", second: "2-digit" });
}

function isMarketOpen(): boolean {
  const now = new Date();
  const et = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const day = et.getDay();
  if (day === 0 || day === 6) return false;
  const mins = et.getHours() * 60 + et.getMinutes();
  return mins >= 9 * 60 + 30 && mins < 16 * 60;
}

function nextFriday(): { label: string; daysLeft: number; date: Date } {
  const now = new Date();
  const day = now.getDay();
  let daysTo = (5 - day + 7) % 7;
  if (daysTo === 0) daysTo = 7;
  const d = new Date(now);
  d.setDate(now.getDate() + daysTo);
  return {
    label: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    daysLeft: daysTo,
    date: d,
  };
}

// ─── Initialize cache from fallback prices ────────────────────────────────────

function initCache() {
  const ts = etTimeString();
  const open = isMarketOpen();
  for (const [sym, data] of Object.entries(FALLBACK_STOCKS)) {
    priceCache[sym] = { price: data.price, change24h: data.change24h, marketOpen: open, lastUpdated: ts, source: "cache" };
  }
  for (const [sym, price] of Object.entries(FALLBACK_CRYPTO)) {
    priceCache[sym] = { price, change24h: 0, marketOpen: true, lastUpdated: ts, source: "cache" };
  }
  // Forex fallbacks
  const forexFallbacks: Record<string, number> = {
    "EUR-USD": 1.0845, "GBP-USD": 1.2731, "USD-JPY": 155.40, "USD-CHF": 0.9082,
    "USD-CAD": 1.3598, "AUD-USD": 0.6412, "NZD-USD": 0.6105, "EUR-GBP": 0.8532,
    "EUR-JPY": 168.45, "GBP-JPY": 197.85, "EUR-AUD": 1.7102, "GBP-AUD": 1.9845,
    "EUR-NZD": 1.7765, "USD-MXN": 17.15,  "USD-ZAR": 18.42,  "EUR-CHF": 0.9847,
    "USD-CNH": 7.2435, "USD-SGD": 1.3485, "USD-NOK": 10.6823,
  };
  for (const [pair, price] of Object.entries(forexFallbacks)) {
    priceCache[pair] = { price, change24h: 0, marketOpen: true, lastUpdated: ts, source: "cache" };
  }
  marketOpen = open;
}

// ─── Stocks + Commodities (yahoo-finance2) ────────────────────────────────────

const STOCK_SYMBOLS = ["AAPL","MSFT","GOOGL","AMZN","NVDA","TSLA","AMD","META","JNJ","PG","SPY","QQQ"];
const COMMODITY_SYMBOLS = ["GC=F","CL=F","SI=F","NG=F"];
let equityErrLogged = false;

async function refreshOneEquity(symbol: string, open: boolean, ts: string) {
  try {
    const q = await yf.quote(symbol);
    const price: number = (q as any).regularMarketPrice ?? 0;
    const change24h: number = (q as any).regularMarketChangePercent ?? priceCache[symbol]?.change24h ?? 0;
    if (price > 0) {
      priceCache[symbol] = { price, change24h: parseFloat(change24h.toFixed(2)), marketOpen: open, lastUpdated: ts, source: "live" };
    }
  } catch (err: any) {
    // Log actual error once so we know what's wrong
    if (!equityErrLogged) {
      console.log(`[liveData] equity fetch error (${symbol}): ${err?.message ?? err}`);
      equityErrLogged = true;
    }
  }
}

async function refreshEquities(symbols: string[]) {
  const open = isMarketOpen();
  marketOpen = open;
  const ts = etTimeString();
  // Update market-open status on cached entries even if fetch fails
  for (const sym of symbols) {
    if (priceCache[sym]) priceCache[sym].marketOpen = open;
  }
  // Fetch all symbols in parallel, each individually (more reliable than batch)
  await Promise.allSettled(symbols.map(sym => refreshOneEquity(sym, open, ts)));
}

// ─── Crypto (CoinGecko) ───────────────────────────────────────────────────────

const COIN_IDS: Record<string, string> = {
  BTC: "bitcoin", ETH: "ethereum", SOL: "solana",
  BNB: "binancecoin", ADA: "cardano", AVAX: "avalanche-2",
};

async function refreshCrypto() {
  const ids = Object.values(COIN_IDS).join(",");
  const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`CoinGecko ${res.status}`);
    const data = await res.json() as Record<string, { usd: number; usd_24h_change: number }>;
    const ts = etTimeString();
    for (const [sym, id] of Object.entries(COIN_IDS)) {
      const entry = data[id];
      if (entry?.usd) {
        priceCache[sym] = {
          price: entry.usd,
          change24h: parseFloat((entry.usd_24h_change ?? 0).toFixed(2)),
          marketOpen: true,
          lastUpdated: ts,
          source: "live",
        };
      }
    }
  } catch {
    console.log("[liveData] CoinGecko refresh failed, using cache");
  }
}

// ─── Forex (Frankfurter) ─────────────────────────────────────────────────────

let forexPrevRates: Record<string, number> = {};
let forexFirstFetch = true;

async function refreshForex() {
  try {
    const url = "https://api.frankfurter.app/latest?from=USD&to=EUR,GBP,JPY,CHF,CAD,AUD,NZD,MXN,ZAR,SGD,NOK,CNY";
    const res = await fetch(url, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) throw new Error(`Frankfurter ${res.status}`);
    const data = await res.json() as { rates: Record<string, number> };
    const r = data.rates;
    const ts = etTimeString();

    const derived: Record<string, number> = {
      "EUR-USD": 1 / r.EUR,
      "GBP-USD": 1 / r.GBP,
      "USD-JPY": r.JPY,
      "USD-CHF": r.CHF,
      "USD-CAD": r.CAD,
      "AUD-USD": 1 / r.AUD,
      "NZD-USD": 1 / r.NZD,
      "USD-MXN": r.MXN,
      "USD-ZAR": r.ZAR,
      "USD-SGD": r.SGD,
      "USD-NOK": r.NOK,
      "USD-CNH": r.CNY,
      // Crosses
      "EUR-GBP": r.GBP / r.EUR,
      "EUR-JPY": r.JPY / r.EUR,
      "EUR-AUD": r.AUD / r.EUR,
      "EUR-CHF": r.CHF / r.EUR,
      "EUR-NZD": r.NZD / r.EUR,
      "GBP-JPY": r.JPY / r.GBP,
      "GBP-AUD": r.AUD / r.GBP,
    };

    for (const [pair, price] of Object.entries(derived)) {
      const isYen = pair.includes("JPY");
      const isExotic = pair.includes("MXN") || pair.includes("ZAR") || pair.includes("NOK") || pair.includes("CNH") || pair.includes("SGD");
      const dp = isYen ? 3 : isExotic ? 4 : 5;
      const roundedPrice = parseFloat(price.toFixed(dp));

      // On first fetch use 0 change (no valid previous to compare to)
      const prev = forexPrevRates[pair];
      const change24h = (forexFirstFetch || !prev || prev <= 0)
        ? 0
        : parseFloat(((price - prev) / prev * 100).toFixed(3));

      // Realistic spread values
      const halfSpreadPips = isYen ? 0.04    // 0.04 pip each side (JPY)
        : isExotic ? 0.02                     // 200 points each side (exotic)
        : 0.00015;                            // 1.5 pip each side (majors)
      const halfSpread = halfSpreadPips * (isYen ? 1 : isExotic ? 1 : 1);
      const spreadStr = isYen ? "0.08 pips"
        : isExotic ? "2–5 pips"
        : `${(halfSpreadPips * 20000).toFixed(1)} pips`;

      priceCache[pair] = {
        price: roundedPrice,
        change24h,
        marketOpen: true,
        lastUpdated: ts,
        spread: spreadStr,
        bid: parseFloat((roundedPrice - halfSpread).toFixed(dp)),
        ask: parseFloat((roundedPrice + halfSpread).toFixed(dp)),
        source: "live",
      };
    }
    forexFirstFetch = false;
    forexPrevRates = { ...derived };
  } catch {
    console.log("[liveData] Frankfurter refresh failed, using cache");
  }
}

// ─── Options Chain (yahoo-finance2) ──────────────────────────────────────────

const OPTIONS_TICKERS = ["SPY","QQQ","AAPL","NVDA","TSLA","MSFT","AMD","META","AMZN","GOOGL"];

async function refreshOptionsChain(symbol: string): Promise<void> {
  // Check cache freshness (5 min TTL)
  const cached = optionsCache[symbol];
  if (cached && Date.now() - cached.fetchedAt < 5 * 60_000) return;

  try {
    const chain = await (yf as any).options(symbol);
    const underlyingPrice: number = chain?.quote?.regularMarketPrice
      ?? priceCache[symbol]?.price
      ?? FALLBACK_STOCKS[symbol]?.price
      ?? 100;

    // Use first available expiry (nearest weekly)
    const exp = chain?.options?.[0];
    if (!exp) return;

    const expiryDate = exp.expirationDate instanceof Date
      ? exp.expirationDate
      : new Date(exp.expirationDate * 1000);
    const daysLeft = Math.ceil((expiryDate.getTime() - Date.now()) / 86400000);
    const expiryLabel = expiryDate.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    // Find near-ATM options (2-5% OTM)
    const callTarget = underlyingPrice * 1.02;
    const putTarget = underlyingPrice * 0.98;

    const calls: OptionContract[] = (exp.calls ?? [])
      .filter((c: any) => c.strike >= underlyingPrice && c.strike <= underlyingPrice * 1.08 && (c.ask ?? 0) > 0)
      .slice(0, 5)
      .map((c: any) => ({
        contractSymbol: c.contractSymbol ?? "",
        strike: c.strike ?? 0,
        lastPrice: c.lastPrice ?? c.ask ?? 0,
        bid: c.bid ?? 0,
        ask: c.ask ?? 0,
        volume: c.volume ?? 0,
        impliedVolatility: c.impliedVolatility ?? 0.25,
        inTheMoney: c.inTheMoney ?? false,
        expiry: expiryLabel,
        daysLeft,
      }));

    const puts: OptionContract[] = (exp.puts ?? [])
      .filter((p: any) => p.strike <= underlyingPrice && p.strike >= underlyingPrice * 0.92 && (p.ask ?? 0) > 0)
      .slice(-5)
      .map((p: any) => ({
        contractSymbol: p.contractSymbol ?? "",
        strike: p.strike ?? 0,
        lastPrice: p.lastPrice ?? p.ask ?? 0,
        bid: p.bid ?? 0,
        ask: p.ask ?? 0,
        volume: p.volume ?? 0,
        impliedVolatility: p.impliedVolatility ?? 0.25,
        inTheMoney: p.inTheMoney ?? false,
        expiry: expiryLabel,
        daysLeft,
      }));

    optionsCache[symbol] = { calls, puts, underlyingPrice, expiry: expiryLabel, daysLeft, fetchedAt: Date.now() };
  } catch {
    console.log(`[liveData] options chain fetch failed for ${symbol}`);
  }
}

async function refreshAllOptionsChains() {
  for (const sym of OPTIONS_TICKERS) {
    await refreshOptionsChain(sym);
    await new Promise(r => setTimeout(r, 500)); // stagger requests
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function getLivePrices(): { prices: Record<string, LivePrice>; marketOpen: boolean } {
  return { prices: priceCache, marketOpen };
}

export function getLivePriceFor(ticker: string): LivePrice | null {
  return priceCache[ticker] ?? null;
}

export function getOptionsChain(symbol: string): OptionsChainEntry | null {
  return optionsCache[symbol] ?? null;
}

export function getAllOptionsChains(): Record<string, OptionsChainEntry> {
  return optionsCache;
}

// ─── Start Service ────────────────────────────────────────────────────────────

export function startLiveDataService() {
  console.log("[liveData] starting live data service...");
  initCache();

  // Initial fetches (non-blocking)
  refreshEquities(STOCK_SYMBOLS).catch(() => {});
  refreshEquities(COMMODITY_SYMBOLS).catch(() => {});
  refreshCrypto().catch(() => {});
  refreshForex().catch(() => {});
  refreshAllOptionsChains().catch(() => {});

  // Schedule refreshes
  setInterval(() => refreshEquities(STOCK_SYMBOLS).catch(() => {}), 15_000);
  setInterval(() => refreshEquities(COMMODITY_SYMBOLS).catch(() => {}), 15_000);
  setInterval(() => refreshCrypto().catch(() => {}), 30_000);
  setInterval(() => refreshForex().catch(() => {}), 60_000);
  setInterval(() => refreshAllOptionsChains().catch(() => {}), 5 * 60_000);

  console.log("[liveData] live data service started");
}
