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
import { registerManagedInvestingRoutes } from "./managed-investing";
import { startManagedInvestingWorker } from "../managedInvestingWorker";
import { registerOperationsRoutes } from "./operations";
import { registerAlpacaRoutes } from "./alpaca";

export async function registerRoutes(app: Express): Promise<Server> {
  startLiveDataService();
  startNewsService();
  startAutoTradeWorker();
  startManagedInvestingWorker();

  registerAuthRoutes(app);
  registerMarketDataRoutes(app);
  registerTradeRoutes(app);
  registerPortfolioRoutes(app);
  registerAdminRoutes(app);
  registerTradingRoutes(app);
  registerManagedInvestingRoutes(app);
  registerOperationsRoutes(app);
  registerAlpacaRoutes(app);

  app.get("/api/health", (_req, res) => res.json({ status: "ok", service: "trade-pro", liveTrading: false, timestamp: new Date().toISOString() }));
  app.use("/api/auto-trades", autoTradeRoutes);

  return createServer(app);
}
