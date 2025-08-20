import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { forexEngine } from './forexEngineSimple';

// Simulated real-time price feeds (would connect to real providers like Alpha Vantage, OANDA, etc.)
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

      // Send initial prices
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
        // Client subscribing to specific symbols
        if (message.symbols && Array.isArray(message.symbols)) {
          ws.send(JSON.stringify({
            type: 'subscription_confirmed',
            symbols: message.symbols
          }));
        }
        break;

      case 'get_account':
        // Send account data
        this.handleAccountRequest(ws, message.userId);
        break;

      case 'get_positions':
        // Send positions data
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
        break;
      
      case 'place_order':
        this.handleOrderPlacement(ws, message.orderData);
        break;

      case 'get_account':
        this.handleAccountRequest(ws, message.userId);
        break;

      case 'get_positions':
        this.handlePositionsRequest(ws, message.userId);
        break;

      default:
        console.log('Unknown message type:', message.type);
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

      // Broadcast account update to all clients for this user
      this.broadcastAccountUpdate(orderData.userId);
      
    } catch (error) {
      ws.send(JSON.stringify({
        type: 'order_error',
        error: error instanceof Error ? error.message : 'Order placement failed',
        success: false
      }));
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

    // Update prices every 200ms for realistic tick simulation
    this.priceInterval = setInterval(() => {
      this.updatePrices();
      this.broadcastPrices();
    }, 200);
  }

  private updatePrices() {
    for (const [symbol, config] of Object.entries(PRICE_FEEDS)) {
      const currentPrice = this.currentPrices[symbol];
      
      // Random walk with mean reversion
      const randomChange = (Math.random() - 0.5) * config.volatility * 2;
      const meanReversion = (config.basePrice - (currentPrice.bid + currentPrice.ask) / 2) * 0.001;
      const priceChange = randomChange + meanReversion;
      
      // Calculate new mid price
      const newMidPrice = (currentPrice.bid + currentPrice.ask) / 2 + priceChange;
      
      // Update spread (slightly random)
      const baseSpread = symbol === 'USDJPY' || symbol === 'XAUUSD' ? config.volatility * 2 : config.volatility * 20;
      const spreadVariation = (Math.random() - 0.5) * baseSpread * 0.2;
      const newSpread = baseSpread + spreadVariation;
      
      this.currentPrices[symbol] = {
        bid: newMidPrice - newSpread / 2,
        ask: newMidPrice + newSpread / 2,
        timestamp: Date.now()
      };
    }
  }

  private broadcastPrices() {
    if (this.clients.size === 0) return;

    const priceUpdate = {
      type: 'price_update',
      data: this.getCurrentPrices(),
      timestamp: Date.now()
    };

    const message = JSON.stringify(priceUpdate);
    
    this.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(message);
      }
    });
  }

  private async broadcastAccountUpdate(userId: string) {
    try {
      const account = await forexEngine.getForexUser(userId);
      const positions = await forexEngine.getUserPositions(userId);
      
      const update = {
        type: 'account_update',
        userId: userId,
        account: account,
        positions: positions
      };

      const message = JSON.stringify(update);
      
      this.clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
          client.send(message);
        }
      });
    } catch (error) {
      console.error('Error broadcasting account update:', error);
    }
  }

  getCurrentPrices() {
    const prices: { [symbol: string]: { bid: number; ask: number; spread: number; timestamp: number; change?: number } } = {};
    
    for (const [symbol, price] of Object.entries(this.currentPrices)) {
      prices[symbol] = {
        bid: parseFloat(price.bid.toFixed(symbol === 'USDJPY' || symbol === 'XAUUSD' ? 2 : 4)),
        ask: parseFloat(price.ask.toFixed(symbol === 'USDJPY' || symbol === 'XAUUSD' ? 2 : 4)),
        spread: parseFloat((price.ask - price.bid).toFixed(symbol === 'USDJPY' || symbol === 'XAUUSD' ? 2 : 4)),
        timestamp: price.timestamp
      };
    }
    
    return prices;
  }

  stop() {
    if (this.priceInterval) {
      clearInterval(this.priceInterval);
      this.priceInterval = null;
    }

    if (this.wss) {
      this.wss.close();
      this.wss = null;
    }

    this.clients.clear();
    console.log('Forex WebSocket service stopped');
  }
}

export const forexWebSocket = new ForexWebSocketService();