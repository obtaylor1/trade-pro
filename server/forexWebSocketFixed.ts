import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { forexEngine } from './forexEngineSimple';

// Simulated real-time price feeds
const PRICE_FEEDS = {
  'EURUSD': { basePrice: 1.0824, volatility: 0.0001 },
  'GBPUSD': { basePrice: 1.2644, volatility: 0.0001 },
  'USDJPY': { basePrice: 149.84, volatility: 0.01 },
  'AUDUSD': { basePrice: 0.6577, volatility: 0.0001 },
  'USDCHF': { basePrice: 0.8944, volatility: 0.0001 },
  'NZDUSD': { basePrice: 0.6235, volatility: 0.0001 },
  'USDCAD': { basePrice: 1.3457, volatility: 0.0001 },
  'EURJPY': { basePrice: 162.16, volatility: 0.01 },
  'EURGBP': { basePrice: 0.8557, volatility: 0.0001 },
  'XAUUSD': { basePrice: 2018.55, volatility: 0.20 }
};

export class ForexWebSocketService {
  private wss: WebSocketServer | null = null;
  private clients: Set<WebSocket> = new Set();
  private priceInterval: NodeJS.Timeout | null = null;
  private currentPrices: { [symbol: string]: { bid: number; ask: number; timestamp: number } } = {};

  initialize(server: Server) {
    this.wss = new WebSocketServer({ 
      server, 
      path: '/forex-ws'
    });

    this.wss.on('connection', (ws: WebSocket) => {
      console.log('Forex WebSocket client connected');
      this.clients.add(ws);

      // Send initial prices immediately
      ws.send(JSON.stringify({
        type: 'initial_prices',
        data: this.getCurrentPrices()
      }));

      ws.on('message', (message: Buffer) => {
        try {
          const data = JSON.parse(message.toString());
          this.handleMessage(ws, data);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      });

      ws.on('close', () => {
        console.log('Forex WebSocket client disconnected');
        this.clients.delete(ws);
      });

      ws.on('error', (error) => {
        console.error('Forex WebSocket error:', error);
        this.clients.delete(ws);
      });
    });

    // Start price simulation
    this.startPriceSimulation();
    console.log('Forex WebSocket server initialized on /forex-ws');
  }

  private handleMessage(ws: WebSocket, message: any) {
    switch (message.type) {
      case 'subscribe':
        if (message.symbols && Array.isArray(message.symbols)) {
          ws.send(JSON.stringify({
            type: 'subscription_confirmed',
            symbols: message.symbols
          }));
        }
        break;

      case 'get_account':
        this.handleAccountRequest(ws, message.userId);
        break;

      case 'get_positions':
        this.handlePositionsRequest(ws, message.userId);
        break;
      
      case 'place_order':
        this.handleOrderPlacement(ws, message.orderData);
        break;

      default:
        console.log('Unknown WebSocket message type:', message.type);
    }
  }

  private async handleAccountRequest(ws: WebSocket, userId: string) {
    try {
      const account = await forexEngine.getForexUser(userId);
      
      ws.send(JSON.stringify({
        type: 'account_data',
        account: account
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'account_error',
        error: error instanceof Error ? error.message : 'Failed to get account data'
      }));
    }
  }

  private async handlePositionsRequest(ws: WebSocket, userId: string) {
    try {
      const positions = await forexEngine.getUserPositions(userId);
      
      ws.send(JSON.stringify({
        type: 'positions_data',
        positions: positions
      }));
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'positions_error',
        error: error instanceof Error ? error.message : 'Failed to get positions data'
      }));
    }
  }

  private async handleOrderPlacement(ws: WebSocket, orderData: any) {
    try {
      const order = await forexEngine.placeOrder(orderData);
      
      ws.send(JSON.stringify({
        type: 'order_placed',
        order: order,
        success: true
      }));

      // Refresh account and positions data after order placement
      this.handleAccountRequest(ws, orderData.userId);
      this.handlePositionsRequest(ws, orderData.userId);
      
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'order_error',
        error: error instanceof Error ? error.message : 'Order placement failed',
        success: false
      }));
    }
  }

  private startPriceSimulation() {
    // Initialize current prices
    for (const [symbol, config] of Object.entries(PRICE_FEEDS)) {
      const spread = symbol === 'USDJPY' || symbol === 'XAUUSD' ? config.volatility * 2 : config.volatility * 20;
      this.currentPrices[symbol] = {
        bid: config.basePrice - spread / 2,
        ask: config.basePrice + spread / 2,
        timestamp: Date.now()
      };
    }

    // Update prices every 500ms for realistic but not overwhelming updates
    this.priceInterval = setInterval(() => {
      this.updatePrices();
      this.broadcastPrices();
    }, 500);
  }

  private updatePrices() {
    for (const [symbol, config] of Object.entries(PRICE_FEEDS)) {
      const currentPrice = this.currentPrices[symbol];
      
      // Generate realistic price movement
      const volatility = config.volatility;
      const change = (Math.random() - 0.5) * volatility * 4;
      const newMidPrice = (currentPrice.bid + currentPrice.ask) / 2 + change;
      
      // Keep prices within reasonable bounds (±2% from base price)
      const maxDeviation = config.basePrice * 0.02;
      const clampedPrice = Math.max(
        config.basePrice - maxDeviation, 
        Math.min(config.basePrice + maxDeviation, newMidPrice)
      );
      
      const spread = symbol === 'USDJPY' || symbol === 'XAUUSD' ? config.volatility * 2 : config.volatility * 20;
      
      this.currentPrices[symbol] = {
        bid: clampedPrice - spread / 2,
        ask: clampedPrice + spread / 2,
        timestamp: Date.now()
      };
    }

    // Update the forex engine with new prices
    forexEngine.updateLiveQuotes(this.currentPrices);
  }

  private broadcastPrices() {
    const message = JSON.stringify({
      type: 'price_update',
      data: this.getCurrentPrices()
    });

    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private getCurrentPrices() {
    const quotes: { [symbol: string]: { symbol: string; bid: number; ask: number; spread: number; timestamp: number } } = {};
    
    for (const [symbol, price] of Object.entries(this.currentPrices)) {
      quotes[symbol] = {
        symbol,
        bid: price.bid,
        ask: price.ask,
        spread: price.ask - price.bid,
        timestamp: price.timestamp
      };
    }
    
    return quotes;
  }

  stop() {
    if (this.priceInterval) {
      clearInterval(this.priceInterval);
    }
    
    if (this.wss) {
      this.wss.close();
    }
  }
}

export const forexWebSocket = new ForexWebSocketService();