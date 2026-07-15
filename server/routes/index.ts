import type { Express } from "express";
import { createServer, type Server } from "http";
import { startLiveDataService } from "../liveDataService";
import { startNewsService } from "../newsService";
import { startAutoTradeWorker } from "../autoTradeWorker";
import { registerAuthRoutes } from "./auth";
import { registerTradeRoutes } from "./trades";
import { registerPortfolioRoutes } from "./portfolio";
import { registerMarketDataRoutes } from "./market-data";
import { registerAdminRoutes } from "./admin";
import { registerTradingRoutes } from "./trading";
import autoTradeRoutes from "./auto-trades";

export async function registerRoutes(app: Express): Promise<Server> {
  startLiveDataService();
  startNewsService();
  startAutoTradeWorker();

  registerAuthRoutes(app);
  registerMarketDataRoutes(app);
  registerTradeRoutes(app);
  registerPortfolioRoutes(app);
  registerAdminRoutes(app);
  registerTradingRoutes(app);
  app.use("/api/auto-trades", autoTradeRoutes);

  return createServer(app);
}

