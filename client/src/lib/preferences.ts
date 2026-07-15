export const SETTINGS_STORAGE_KEY = "trade-pro-settings";

export interface SavedTradeDefaults {
  market: "forex" | "stocks" | "crypto" | "options" | "commodities";
  amount: number;
  duration: "quick" | "shortTerm" | "longTerm";
}

export function readSavedTradeDefaults(): SavedTradeDefaults {
  const fallback: SavedTradeDefaults = { market: "forex", amount: 0.25, duration: "quick" };
  try {
    const saved = JSON.parse(localStorage.getItem(SETTINGS_STORAGE_KEY) || "null");
    if (!saved) return fallback;
    const markets = new Set(["forex", "stocks", "crypto", "options", "commodities"]);
    const durations: Record<string, SavedTradeDefaults["duration"]> = {
      quick: "quick", short: "shortTerm", shortTerm: "shortTerm",
      long: "longTerm", longTerm: "longTerm",
    };
    const amount = Number(saved.defaultTradeAmount);
    return {
      market: markets.has(saved.defaultMarket) ? saved.defaultMarket : fallback.market,
      amount: Number.isFinite(amount) && amount > 0 ? amount : fallback.amount,
      duration: durations[saved.defaultTradeDuration] ?? fallback.duration,
    };
  } catch {
    return fallback;
  }
}
