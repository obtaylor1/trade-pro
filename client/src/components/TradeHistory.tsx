import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { type PaperTrade, type TradeSummary } from '@shared/schema';

interface TradeHistoryProps {
  userId: string;
  isVisible: boolean;
  onClose: () => void;
}

export default function TradeHistory({ userId, isVisible, onClose }: TradeHistoryProps) {
  const [filter, setFilter] = useState<'all' | 'open' | 'closed'>('all');

  const { data: trades = [], isLoading: tradesLoading } = useQuery({
    queryKey: [`/api/trades/history/${userId}`],
    enabled: isVisible,
    refetchInterval: 10000, // Refresh every 10 seconds
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: [`/api/trades/summary/${userId}`],
    enabled: isVisible,
    refetchInterval: 10000,
  });

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'OPEN': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
      case 'CLOSED': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
      case 'PENDING': return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30';
      default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
    }
  };

  const getDirectionColor = (direction: string) => {
    return direction === 'BUY' 
      ? 'bg-green-500/20 text-green-400 border-green-500/30' 
      : 'bg-red-500/20 text-red-400 border-red-500/30';
  };

  const filteredTrades = (trades as PaperTrade[]).filter(trade => {
    if (filter === 'all') return true;
    return trade.status.toLowerCase() === filter;
  });

  if (!isVisible) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <Card className="bg-gray-900 border-gray-700 w-full max-w-6xl max-h-[90vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <i className="fas fa-history text-blue-400"></i>
              Paper Trading History
            </CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={onClose}
              className="border-gray-600 text-gray-300 hover:bg-gray-700"
            >
              <i className="fas fa-times"></i>
            </Button>
          </div>
        </CardHeader>

        <CardContent className="overflow-y-auto max-h-[calc(90vh-120px)]">
          {/* Trading Summary */}
          {summary && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6 p-4 bg-gray-800 rounded-lg">
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{(summary as TradeSummary).totalTrades}</div>
                <div className="text-xs text-gray-400">Total Trades</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${(summary as TradeSummary).winRate >= 50 ? 'text-green-400' : 'text-red-400'}`}>
                  {(summary as TradeSummary).winRate.toFixed(1)}%
                </div>
                <div className="text-xs text-gray-400">Win Rate</div>
              </div>
              <div className="text-center">
                <div className={`text-2xl font-bold ${(summary as TradeSummary).netAccountGrowth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {formatCurrency((summary as TradeSummary).netAccountGrowth)}
                </div>
                <div className="text-xs text-gray-400">Net P&L</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-white">{formatCurrency((summary as TradeSummary).totalCommissions)}</div>
                <div className="text-xs text-gray-400">Total Fees</div>
              </div>
            </div>
          )}

          {/* Filter Buttons */}
          <div className="flex gap-2 mb-4">
            {['all', 'open', 'closed'].map((filterType) => (
              <Button
                key={filterType}
                variant={filter === filterType ? "default" : "outline"}
                size="sm"
                onClick={() => setFilter(filterType as any)}
                className={filter === filterType ? 'bg-blue-600' : 'border-gray-600 text-gray-300'}
              >
                {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                {summary && (
                  <Badge variant="secondary" className="ml-2 bg-gray-700 text-gray-300">
                    {filterType === 'all' ? (summary as TradeSummary).totalTrades : 
                     filterType === 'open' ? (summary as TradeSummary).openTrades : (summary as TradeSummary).closedTrades}
                  </Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Trade List */}
          {tradesLoading ? (
            <div className="text-center py-8 text-gray-400">
              <i className="fas fa-spinner fa-spin text-2xl mb-2"></i>
              <div>Loading trade history...</div>
            </div>
          ) : filteredTrades.length === 0 ? (
            <div className="text-center py-8 text-gray-500">
              <i className="fas fa-chart-line text-3xl mb-3"></i>
              <div className="text-lg mb-2">No trades found</div>
              <div className="text-sm">Start trading to build your history</div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredTrades.map((trade) => (
                <div key={trade.id} className="p-4 bg-gray-800 rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="text-lg font-semibold text-white">{trade.symbol}</div>
                      <Badge variant="outline" className={getDirectionColor(trade.direction)}>
                        {trade.direction}
                      </Badge>
                      <Badge variant="outline" className={getStatusColor(trade.status)}>
                        {trade.status}
                      </Badge>
                      <div className="text-sm text-gray-400">{trade.broker}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-gray-400">{formatDate(trade.executedAt)}</div>
                      <div className={`font-semibold ${trade.netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(trade.netPnL)}
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-6 gap-4 text-sm">
                    <div>
                      <div className="text-gray-400">Asset</div>
                      <div className="text-white font-medium">{trade.assetName}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Quantity</div>
                      <div className="text-white">{trade.quantity}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Entry Price</div>
                      <div className="text-white">{formatCurrency(trade.entryPrice)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Position Size</div>
                      <div className="text-white">{formatCurrency(trade.positionSize)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Commission</div>
                      <div className="text-red-300">{formatCurrency(trade.commission)}</div>
                    </div>
                    <div>
                      <div className="text-gray-400">Gross P&L</div>
                      <div className={trade.grossPnL >= 0 ? 'text-green-400' : 'text-red-400'}>
                        {formatCurrency(trade.grossPnL)}
                      </div>
                    </div>
                  </div>

                  {trade.status === 'OPEN' && (
                    <div className="mt-3 pt-3 border-t border-gray-700">
                      <div className="flex items-center justify-between">
                        <div className="text-xs text-gray-400">
                          Current Price: {formatCurrency(trade.currentPrice)} | 
                          Margin: {formatCurrency(trade.margin)}
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="border-red-600 text-red-400 hover:bg-red-600/10"
                          >
                            Close Position
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}