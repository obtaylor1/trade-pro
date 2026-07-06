import type { Express } from "express";
import { marketDataService } from "../marketDataService";
import { getLivePrices, getOptionsChain, getAllOptionsChains } from "../liveDataService";
import { getNews } from "../newsService";
import { tickerSchema } from "@shared/schema";

const VALID_MARKETS = ["stocks", "commodities", "crypto", "options", "forex"];
const VALID_NEWS_CATEGORIES = ["all", ...VALID_MARKETS];

export function registerMarketDataRoutes(app: Express) {
  app.get("/api/opportunities/:market", (req, res) => {
    const { market } = req.params;
    if (!VALID_MARKETS.includes(market)) {
      return res.status(400).json({ message: "Invalid market" });
    }
    const style = req.query.style as string | undefined;
    res.json(marketDataService.generateOpportunities(market, style));
  });

  app.get("/api/ai-signals", (_req, res) => {
    res.json(marketDataService.generateAISignals());
  });

  app.get("/api/prices/:ticker", (req, res) => {
    const ticker = tickerSchema.safeParse(req.params.ticker);
    if (!ticker.success) return res.status(400).json({ message: "Invalid ticker symbol" });
    res.json(marketDataService.getPrice(ticker.data));
  });

  app.get("/api/news", (req, res) => {
    const category = (req.query.category as string) || "all";
    if (!VALID_NEWS_CATEGORIES.includes(category)) {
      return res.status(400).json({ message: "Invalid category" });
    }
    res.json(getNews(category));
  });

  app.get("/api/live-prices", (_req, res) => {
    res.json(getLivePrices());
  });

  app.get("/api/options-chain/:symbol", (req, res) => {
    const symbol = tickerSchema.safeParse(req.params.symbol);
    if (!symbol.success) return res.status(400).json({ message: "Invalid symbol" });
    const chain = getOptionsChain(symbol.data);
    if (!chain) return res.status(404).json({ message: "No options chain for symbol" });
    res.json(chain);
  });

  app.get("/api/options-chains", (_req, res) => {
    res.json(getAllOptionsChains());
  });
}
