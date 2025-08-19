import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { tradeExecutionSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get trading opportunities for a specific market
  app.get("/api/opportunities/:market", async (req, res) => {
    try {
      const { market } = req.params;
      
      if (!["stocks", "commodities", "crypto"].includes(market)) {
        return res.status(400).json({ message: "Invalid market type" });
      }

      const opportunities = await storage.getTradingOpportunities(market);
      res.json(opportunities);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch trading opportunities" });
    }
  });

  // Execute a trade
  app.post("/api/trades/execute", async (req, res) => {
    try {
      const validatedData = tradeExecutionSchema.parse(req.body);
      const result = await storage.executeTrade(validatedData.opportunityId);
      res.json(result);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      
      if (error instanceof Error) {
        return res.status(404).json({ message: error.message });
      }
      
      res.status(500).json({ message: "Failed to execute trade" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
