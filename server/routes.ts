import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { marketDataService } from "./marketDataService";
import { tradeExecutionSchema, userRegistrationSchema, userLoginSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Get trading opportunities for a specific market
  // In-memory cache for stock data to avoid repeated API calls
  const stockCache = new Map<string, { data: any[], timestamp: number }>();
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes for stocks

  app.get("/api/opportunities/:market", async (req, res) => {
    try {
      const { market } = req.params;
      
      if (!["stocks", "commodities", "crypto", "options"].includes(market)) {
        return res.status(400).json({ message: "Invalid market type" });
      }

      // Check cache first for stocks to avoid long wait times
      if (market === 'stocks') {
        const cached = stockCache.get(market);
        if (cached && (Date.now() - cached.timestamp) < CACHE_DURATION) {
          console.log(`Using cached data for ${market}`);
          return res.json(cached.data);
        }
      }
      
      console.log(`Fetching fresh data for ${market}`);
      
      const opportunities = await marketDataService.generateTradingOpportunities(market);
      
      // Cache stock data
      if (market === 'stocks') {
        stockCache.set(market, { data: opportunities, timestamp: Date.now() });
      }
      
      res.json(opportunities);
    } catch (error) {
      console.error('Error fetching opportunities:', error);
      res.status(500).json({ message: "Failed to fetch trading opportunities" });
    }
  });

  // Execute a trade
  app.post("/api/trades/execute", async (req, res) => {
    try {
      const validatedData = tradeExecutionSchema.parse(req.body);
      const result = await storage.executeTrade(
        validatedData.opportunityId, 
        validatedData.amount || 1000,
        validatedData.isLiveTrading || false,
        validatedData.selectedBroker,
        req.body.userId || 'user-1' // Default user ID for demo
      );
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

  // Get user's trade history
  app.get("/api/trades/history/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit as string) : 50;
      const trades = await storage.getUserTrades(userId, limit);
      res.json(trades);
    } catch (error) {
      console.error('Error fetching trade history:', error);
      res.status(500).json({ message: "Failed to fetch trade history" });
    }
  });

  // Get user's trade summary statistics
  app.get("/api/trades/summary/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const summary = await storage.getTradeSummary(userId);
      res.json(summary);
    } catch (error) {
      console.error('Error fetching trade summary:', error);
      res.status(500).json({ message: "Failed to fetch trade summary" });
    }
  });

  // Update trade status (for closing positions)
  app.patch("/api/trades/:tradeId/status", async (req, res) => {
    try {
      const { tradeId } = req.params;
      const { status, currentPrice } = req.body;
      await storage.updateTradeStatus(tradeId, status, currentPrice);
      res.json({ message: "Trade status updated successfully" });
    } catch (error) {
      console.error('Error updating trade status:', error);
      res.status(500).json({ message: "Failed to update trade status" });
    }
  });

  // User registration
  app.post("/api/auth/register", async (req, res) => {
    try {
      const validatedData = userRegistrationSchema.parse(req.body);
      
      // Check if user already exists
      const existingUser = await storage.getUserByEmail(validatedData.email);
      if (existingUser) {
        return res.status(409).json({ message: "User with this email already exists" });
      }
      
      const newUser = await storage.registerUser(validatedData);
      res.status(201).json({
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        startingCapital: parseFloat(newUser.startingCapital),
        currentBalance: parseFloat(newUser.currentBalance),
        selectedBroker: newUser.selectedBroker,
        isLiveTrading: newUser.isLiveTrading,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error('Error registering user:', error);
      res.status(500).json({ message: "Failed to register user" });
    }
  });

  // User login
  app.post("/api/auth/login", async (req, res) => {
    try {
      const validatedData = userLoginSchema.parse(req.body);
      const user = await storage.loginUser(validatedData.email);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        startingCapital: parseFloat(user.startingCapital),
        currentBalance: parseFloat(user.currentBalance),
        selectedBroker: user.selectedBroker,
        isLiveTrading: user.isLiveTrading,
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Invalid request data", errors: error.errors });
      }
      console.error('Error logging in user:', error);
      res.status(500).json({ message: "Failed to login user" });
    }
  });

  // Get user profile with calculated current balance
  app.get("/api/auth/user/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const user = await storage.getUserById(userId);
      
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      
      // Calculate real-time current balance based on trades
      const currentBalance = await storage.calculateUserCurrentBalance(userId);
      
      res.json({
        id: user.id,
        name: user.name,
        email: user.email,
        startingCapital: parseFloat(user.startingCapital),
        currentBalance: currentBalance,
        selectedBroker: user.selectedBroker,
        isLiveTrading: user.isLiveTrading,
      });
    } catch (error) {
      console.error('Error fetching user profile:', error);
      res.status(500).json({ message: "Failed to fetch user profile" });
    }
  });

  // Get user's current balance (real-time calculation)
  app.get("/api/auth/balance/:userId", async (req, res) => {
    try {
      const { userId } = req.params;
      const currentBalance = await storage.calculateUserCurrentBalance(userId);
      res.json({ currentBalance });
    } catch (error) {
      console.error('Error calculating user balance:', error);
      res.status(500).json({ message: "Failed to calculate balance" });
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
    const symbols = ['MGC', 'MCL', 'MSI', 'NCP', 'NNG', 'MBT', 'MET', 'NSL', 'NAV', 'NPG', 'NDT'];
    const basePrices: Record<string, number> = {
      // Commodities
      'MGC': 20.36,
      'MCL': 7.83,
      'MSI': 2.35,
      'NCP': 0.38,
      'NNG': 0.32,
      // Crypto
      'MBT': 6847.50,
      'MET': 268.00,
      'NSL': 2.15,
      'NAV': 2.67,
      'NPG': 0.87,
      'NDT': 0.64
    };
    
    symbols.forEach(symbol => {
      if (basePrices[symbol]) {
        // Higher volatility for crypto symbols
        const isCrypto = ['MBT', 'MET', 'NSL', 'NAV', 'NPG', 'NDT'].includes(symbol);
        const volatility = isCrypto ? 0.015 : 0.005; // 1.5% for crypto, 0.5% for commodities
        
        const change = (Math.random() - 0.5) * volatility;
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
