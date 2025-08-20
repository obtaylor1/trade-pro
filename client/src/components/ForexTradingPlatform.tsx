import { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { ForexUser, ForexPosition, ForexOrder } from '@shared/schema';
import ForexOrderTicket from './ForexOrderTicket';
import ForexPositionsPanel from './ForexPositionsPanel';
import ForexAccountSummary from './ForexAccountSummary';
import ForexQuotesPanel from './ForexQuotesPanel';
import ForexChart from './ForexChart';

interface ForexTradingPlatformProps {
  userId?: string;
}

interface ForexQuote {
  symbol: string;
  bid: number;
  ask: number;
  spread: number;
  timestamp: number;
  change?: number;
}

export default function ForexTradingPlatform({ userId = 'demo-user' }: ForexTradingPlatformProps) {
  const [selectedSymbol, setSelectedSymbol] = useState('EURUSD');
  const [quotes, setQuotes] = useState<{ [symbol: string]: ForexQuote }>({});
  const [account, setAccount] = useState<ForexUser | null>(null);
  const [positions, setPositions] = useState<ForexPosition[]>([]);
  const [orders, setOrders] = useState<ForexOrder[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);

  // Initialize WebSocket connection with reconnection logic
  useEffect(() => {
    let reconnectTimeout: NodeJS.Timeout;
    let isUnmounted = false;

    const connectWebSocket = () => {
      if (isUnmounted) return;
      
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const wsUrl = `${protocol}//${window.location.host}/forex-ws`;
      
      const ws = new WebSocket(wsUrl);
      wsRef.current = ws;

      ws.onopen = () => {
        console.log('Forex WebSocket connected');
        setIsConnected(true);
        
        // Small delay before sending initial messages to ensure connection is stable
        setTimeout(() => {
          if (ws.readyState === WebSocket.OPEN && !isUnmounted) {
            // Subscribe to all major pairs
            ws.send(JSON.stringify({
              type: 'subscribe',
              symbols: ['EURUSD', 'GBPUSD', 'USDJPY', 'AUDUSD', 'USDCHF', 'NZDUSD', 'USDCAD', 'EURJPY', 'EURGBP', 'XAUUSD']
            }));

            // Request account data
            ws.send(JSON.stringify({
              type: 'get_account',
              userId: userId
            }));

            // Request positions
            ws.send(JSON.stringify({
              type: 'get_positions',
              userId: userId
            }));
          }
        }, 100);
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleWebSocketMessage(message);
        } catch (error) {
          console.error('Error parsing WebSocket message:', error);
        }
      };

      ws.onclose = (event) => {
        console.log('Forex WebSocket disconnected');
        setIsConnected(false);
        
        // Auto-reconnect after 2 seconds if not unmounted
        if (!isUnmounted && event.code !== 1000) { // 1000 is normal closure
          reconnectTimeout = setTimeout(() => {
            console.log('Attempting to reconnect...');
            connectWebSocket();
          }, 2000);
        }
      };

      ws.onerror = (error) => {
        console.error('Forex WebSocket error:', error);
        setIsConnected(false);
      };
    };

    // Initial connection
    connectWebSocket();

    return () => {
      isUnmounted = true;
      if (reconnectTimeout) {
        clearTimeout(reconnectTimeout);
      }
      if (wsRef.current) {
        wsRef.current.close(1000, 'Component unmounting');
      }
    };
  }, [userId]);

  const handleWebSocketMessage = (message: any) => {
    switch (message.type) {
      case 'initial_prices':
      case 'price_update':
        setQuotes(message.data);
        break;
      
      case 'account_data':
        setAccount(message.account);
        break;
      
      case 'positions_data':
        setPositions(message.positions);
        break;
      
      case 'account_update':
        if (message.userId === userId) {
          setAccount(message.account);
          setPositions(message.positions);
        }
        break;
      
      case 'order_placed':
        console.log('Order placed successfully:', message.order);
        // Refresh account and positions after order
        if (wsRef.current?.readyState === WebSocket.OPEN) {
          wsRef.current.send(JSON.stringify({
            type: 'get_account',
            userId: userId
          }));
          wsRef.current.send(JSON.stringify({
            type: 'get_positions',
            userId: userId
          }));
        }
        break;
      
      case 'order_error':
        console.error('Order error:', message.error);
        alert(`Order Error: ${message.error}`);
        break;
      
      default:
        console.log('Unknown message type:', message.type);
    }
  };

  const placeOrder = async (orderData: any) => {
    try {
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({
          type: 'place_order',
          orderData: {
            ...orderData,
            userId: userId
          }
        }));
      } else {
        // Fallback to REST API
        const response = await fetch('/api/forex/orders', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...orderData,
            userId: userId
          }),
        });

        if (response.ok) {
          const result = await response.json();
          console.log('Order placed successfully via REST:', result);
          
          // Refresh data after order
          setTimeout(async () => {
            const accountResponse = await fetch(`/api/forex/account/${userId}`);
            if (accountResponse.ok) {
              const accountData = await accountResponse.json();
              setAccount(accountData);
            }

            const positionsResponse = await fetch(`/api/forex/positions/${userId}`);
            if (positionsResponse.ok) {
              const positionsData = await positionsResponse.json();
              setPositions(positionsData);
            }
          }, 500);
        } else {
          const error = await response.json();
          alert(`Order Error: ${error.message}`);
        }
      }
    } catch (error) {
      console.error('Order placement error:', error);
      alert('Failed to place order');
    }
  };

  const closePosition = async (positionId: string, lots?: number) => {
    // This would be handled via WebSocket in a full implementation
    console.log('Close position:', positionId, lots);
  };

  // Fallback to REST API data fetching if WebSocket isn't working
  useEffect(() => {
    let intervalId: NodeJS.Timeout;

    const fetchDataViaREST = async () => {
      try {
        // Fetch quotes
        const quotesResponse = await fetch('/api/forex/quotes');
        if (quotesResponse.ok) {
          const quotesData = await quotesResponse.json();
          setQuotes(quotesData);
        }

        // Fetch account
        const accountResponse = await fetch(`/api/forex/account/${userId}`);
        if (accountResponse.ok) {
          const accountData = await accountResponse.json();
          setAccount(accountData);
        }

        // Fetch positions
        const positionsResponse = await fetch(`/api/forex/positions/${userId}`);
        if (positionsResponse.ok) {
          const positionsData = await positionsResponse.json();
          setPositions(positionsData);
        }

        // If we have data but no WebSocket connection, show we're connected via REST
        if (!isConnected && Object.keys(quotesData || {}).length > 0) {
          setIsConnected(true);
        }
      } catch (error) {
        console.error('REST API fetch error:', error);
      }
    };

    // Initial fetch
    fetchDataViaREST();

    // If WebSocket is struggling, fall back to polling
    if (!isConnected) {
      intervalId = setInterval(fetchDataViaREST, 2000);
    }

    return () => {
      if (intervalId) clearInterval(intervalId);
    };
  }, [userId, isConnected]);

  if (!isConnected && !account && Object.keys(quotes).length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[600px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto mb-4"></div>
          <div className="text-gray-300 text-lg">Loading Forex Trading Platform...</div>
          <div className="text-gray-500 text-sm mt-2">Initializing market data and account information</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Top Bar - Account Summary */}
      <div className="bg-gray-800 border-b border-gray-700 p-4">
        <ForexAccountSummary account={account} isConnected={isConnected} />
      </div>

      {/* Main Trading Interface */}
      <div className="flex h-[calc(100vh-80px)]">
        {/* Left Panel - Quotes */}
        <div className="w-80 bg-gray-800 border-r border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-white mb-2">Market Watch</h2>
            <div className="flex items-center space-x-2">
              <div className={`w-2 h-2 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
              <span className="text-sm text-gray-400">
                {isConnected ? 'Live Quotes' : 'Disconnected'}
              </span>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ForexQuotesPanel 
              quotes={quotes}
              selectedSymbol={selectedSymbol}
              onSymbolSelect={setSelectedSymbol}
            />
          </div>
        </div>

        {/* Center Panel - Chart and Order Ticket */}
        <div className="flex-1 flex flex-col">
          {/* Chart */}
          <div className="flex-1 bg-gray-900 p-4">
            <ForexChart 
              symbol={selectedSymbol}
              currentQuote={quotes[selectedSymbol]}
            />
          </div>
          
          {/* Order Ticket */}
          <div className="h-80 bg-gray-800 border-t border-gray-700 p-4">
            <ForexOrderTicket
              symbol={selectedSymbol}
              currentQuote={quotes[selectedSymbol]}
              account={account}
              onPlaceOrder={placeOrder}
            />
          </div>
        </div>

        {/* Right Panel - Positions */}
        <div className="w-96 bg-gray-800 border-l border-gray-700 flex flex-col">
          <div className="p-4 border-b border-gray-700">
            <h2 className="text-lg font-bold text-white">Open Positions</h2>
          </div>
          <div className="flex-1 overflow-y-auto">
            <ForexPositionsPanel
              positions={positions}
              quotes={quotes}
              onClosePosition={closePosition}
            />
          </div>
        </div>
      </div>
    </div>
  );
}