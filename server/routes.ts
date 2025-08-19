import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
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
  
  // Setup WebSocket server for real-time price feeds
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });
  
  // Store connected clients and their subscriptions
  const clients = new Map<WebSocket, Set<string>>();
  
  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');
    clients.set(ws, new Set());
    
    ws.on('message', (message: Buffer) => {
      try {
        const data = JSON.parse(message.toString());
        
        if (data.action === 'subscribe' && data.symbol) {
          const subscriptions = clients.get(ws);
          if (subscriptions) {
            subscriptions.add(data.symbol);
            console.log(`Client subscribed to ${data.symbol}`);
          }
        } else if (data.action === 'unsubscribe' && data.symbol) {
          const subscriptions = clients.get(ws);
          if (subscriptions) {
            subscriptions.delete(data.symbol);
            console.log(`Client unsubscribed from ${data.symbol}`);
          }
        }
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });
    
    ws.on('close', () => {
      console.log('WebSocket client disconnected');
      clients.delete(ws);
    });
    
    ws.on('error', (error) => {
      console.error('WebSocket error:', error);
      clients.delete(ws);
    });
  });
  
  // Broadcast price updates to subscribed clients
  const broadcastPriceUpdate = (symbol: string, price: number) => {
    const message = JSON.stringify({
      type: 'price_update',
      symbol: symbol,
      price: price,
      timestamp: Date.now()
    });
    
    clients.forEach((subscriptions, ws) => {
      if (subscriptions.has(symbol) && ws.readyState === WebSocket.OPEN) {
        ws.send(message);
      }
    });
  };
  
  // Simulate real-time price updates for demo purposes
  const priceSimulation = () => {
    const symbols = ['MGC', 'MCL', 'MSI', 'NCP', 'NNG', 'MBT', 'MET'];
    const basePrices: Record<string, number> = {
      'MGC': 20.36,
      'MCL': 7.83,
      'MSI': 2.35,
      'NCP': 0.38,
      'NNG': 0.32,
      'MBT': 6847.50,
      'MET': 268.00
    };
    
    symbols.forEach(symbol => {
      if (basePrices[symbol]) {
        // Simulate price movement (±0.5% change)
        const change = (Math.random() - 0.5) * 0.01;
        const newPrice = basePrices[symbol] * (1 + change);
        basePrices[symbol] = newPrice;
        
        broadcastPriceUpdate(symbol, newPrice);
      }
    });
  };
  
  // Start price simulation every 2 seconds
  setInterval(priceSimulation, 2000);
  
  return httpServer;
}
