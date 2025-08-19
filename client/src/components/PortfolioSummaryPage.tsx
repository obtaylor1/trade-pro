import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { type PaperTrade, type TradeSummary, type UserProfile } from '@shared/schema';

interface PortfolioSummaryPageProps {
  userProfile: UserProfile;
  isVisible: boolean;
  onClose: () => void;
}

export default function PortfolioSummaryPage({ userProfile, isVisible, onClose }: PortfolioSummaryPageProps) {
  const [historyFilter, setHistoryFilter] = useState<'all' | 'profitable' | 'loss'>('all');

  const { data: trades = [], isLoading: tradesLoading } = useQuery({
    queryKey: [`/api/trades/history/${userProfile.id}`],
    enabled: isVisible,
    refetchInterval: 10000,
  });

  const { data: summary, isLoading: summaryLoading } = useQuery({
    queryKey: [`/api/trades/summary/${userProfile.id}`],
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

  const calculatePerformanceMetrics = () => {
    const paperTrades = trades as PaperTrade[];
    const currentBalance = userProfile.availableFunds || userProfile.virtualFunds;
    const startingBalance = userProfile.availableFunds || userProfile.virtualFunds; // Use actual starting balance
    const totalPnL = paperTrades.reduce((sum, trade) => sum + trade.netPnL, 0);
    const actualCurrentBalance = startingBalance + totalPnL;
    const performancePercent = startingBalance > 0 ? ((actualCurrentBalance - startingBalance) / startingBalance) * 100 : 0;
    
    const profitableTrades = paperTrades.filter(t => t.netPnL > 0);
    const avgProfit = profitableTrades.length > 0 ? 
      profitableTrades.reduce((sum, t) => sum + t.netPnL, 0) / profitableTrades.length : 0;
    
    const lossTrades = paperTrades.filter(t => t.netPnL < 0);
    const avgLoss = lossTrades.length > 0 ? 
      Math.abs(lossTrades.reduce((sum, t) => sum + t.netPnL, 0)) / lossTrades.length : 0;
    
    const riskRewardRatio = avgLoss > 0 ? avgProfit / avgLoss : 0;

    return {
      currentBalance: actualCurrentBalance,
      startingBalance,
      totalPnL,
      performancePercent,
      avgProfit,
      avgLoss,
      riskRewardRatio
    };
  };

  const getAssetAllocation = () => {
    const paperTrades = trades as PaperTrade[];
    const openTrades = paperTrades.filter(t => t.status === 'OPEN');
    const allocation: { [key: string]: number } = {};
    
    openTrades.forEach(trade => {
      const asset = trade.assetClass;
      allocation[asset] = (allocation[asset] || 0) + trade.positionSize;
    });

    const totalValue = Object.values(allocation).reduce((sum, val) => sum + val, 0);
    return Object.entries(allocation).map(([asset, value]) => ({
      asset,
      value,
      percentage: totalValue > 0 ? (value / totalValue) * 100 : 0
    }));
  };

  const getSuccessPercentage = (trade: PaperTrade) => {
    if (trade.takeProfit && trade.stopLoss) {
      const targetDistance = Math.abs(trade.takeProfit - trade.entryPrice);
      const currentDistance = Math.abs(trade.currentPrice - trade.entryPrice);
      return Math.min(100, (currentDistance / targetDistance) * 100);
    }
    return 0;
  };

  const filteredHistoryTrades = (trades as PaperTrade[]).filter(trade => {
    if (historyFilter === 'all') return true;
    if (historyFilter === 'profitable') return trade.netPnL > 0;
    if (historyFilter === 'loss') return trade.netPnL < 0;
    return true;
  });

  if (!isVisible) return null;

  const metrics = calculatePerformanceMetrics();
  const assetAllocation = getAssetAllocation();
  const openTrades = (trades as PaperTrade[]).filter(t => t.status === 'OPEN');

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <Card className="bg-gray-900 border-gray-700 w-full max-w-7xl max-h-[95vh] overflow-hidden">
        <CardHeader className="pb-4">
          <div className="flex items-center justify-between">
            <CardTitle className="text-white flex items-center gap-2">
              <i className="fas fa-chart-pie text-blue-400"></i>
              Portfolio Summary - {userProfile.name}
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

        <CardContent className="overflow-y-auto max-h-[calc(95vh-120px)] space-y-6">
          {/* Header Section */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-2">Account Overview</h3>
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Current Balance:</span>
                    <span className="text-white font-bold">{formatCurrency(metrics.currentBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Starting Balance:</span>
                    <span className="text-gray-300">{formatCurrency(metrics.startingBalance)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Performance:</span>
                    <span className={`font-bold ${metrics.performancePercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {metrics.performancePercent >= 0 ? '+' : ''}{metrics.performancePercent.toFixed(2)}%
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-2">Net Profit/Loss</h3>
                <div className="space-y-2">
                  <div className="text-center">
                    <div className={`text-3xl font-bold ${metrics.totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(metrics.totalPnL)}
                    </div>
                    <div className="text-sm text-gray-400">After broker fees</div>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="p-4">
                <h3 className="text-white font-semibold mb-2">Selected Broker</h3>
                <div className="space-y-2">
                  <div className="text-white font-medium">{userProfile.selectedBroker || 'ninjatrader-sim'}</div>
                  <div className="text-sm text-gray-400">
                    Commission: {userProfile.selectedBroker === 'interactive-brokers' ? '$0.85/trade' :
                              userProfile.selectedBroker === 'ninjatrader-sim' ? '$0.53/trade' :
                              userProfile.selectedBroker === 'tastytrade' ? '$1.25/trade' :
                              userProfile.selectedBroker === 'td-ameritrade' ? '$2.25/trade' : '$0.53/trade'}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Key Metrics Panel */}
          {summary && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Trading Performance Metrics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
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
                    <div className="text-2xl font-bold text-white">{formatCurrency((summary as TradeSummary).avgReturnPerTrade)}</div>
                    <div className="text-xs text-gray-400">Avg Profit/Trade</div>
                  </div>
                  <div className="text-center">
                    <div className="text-lg font-bold text-green-400">{formatCurrency((summary as TradeSummary).largestGain)}</div>
                    <div className="text-lg font-bold text-red-400">{formatCurrency((summary as TradeSummary).largestLoss)}</div>
                    <div className="text-xs text-gray-400">Best / Worst</div>
                  </div>
                  <div className="text-center">
                    <div className="text-2xl font-bold text-white">{metrics.riskRewardRatio.toFixed(2)}</div>
                    <div className="text-xs text-gray-400">Risk/Reward</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Asset Allocation */}
          {assetAllocation.length > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Portfolio Allocation</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {assetAllocation.map((item, index) => (
                    <div key={item.asset} className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-4 h-4 rounded-full ${
                          index === 0 ? 'bg-blue-500' : 
                          index === 1 ? 'bg-green-500' : 
                          index === 2 ? 'bg-purple-500' : 'bg-yellow-500'
                        }`}></div>
                        <span className="text-white capitalize">{item.asset}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-white">{formatCurrency(item.value)}</div>
                        <div className="text-sm text-gray-400">{item.percentage.toFixed(1)}%</div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Open Positions Table */}
          {openTrades.length > 0 && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Open Positions</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-gray-700">
                        <th className="text-left text-gray-400 py-2">Asset</th>
                        <th className="text-left text-gray-400 py-2">Entry Price</th>
                        <th className="text-left text-gray-400 py-2">Current Price</th>
                        <th className="text-left text-gray-400 py-2">Position Size</th>
                        <th className="text-left text-gray-400 py-2">Gross P/L</th>
                        <th className="text-left text-gray-400 py-2">Net P/L</th>
                        <th className="text-left text-gray-400 py-2">Success %</th>
                        <th className="text-left text-gray-400 py-2">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {openTrades.map((trade) => (
                        <tr key={trade.id} className="border-b border-gray-700/50">
                          <td className="py-3">
                            <div>
                              <div className="text-white font-medium">{trade.symbol}</div>
                              <div className="text-xs text-gray-400">{trade.assetName}</div>
                            </div>
                          </td>
                          <td className="py-3 text-white">{formatCurrency(trade.entryPrice)}</td>
                          <td className="py-3 text-white">{formatCurrency(trade.currentPrice)}</td>
                          <td className="py-3 text-white">{formatCurrency(trade.positionSize)}</td>
                          <td className={`py-3 ${trade.grossPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(trade.grossPnL)}
                          </td>
                          <td className={`py-3 font-medium ${trade.netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                            {formatCurrency(trade.netPnL)}
                          </td>
                          <td className="py-3">
                            <div className="flex items-center gap-2">
                              <div className="w-16 bg-gray-700 rounded-full h-2">
                                <div 
                                  className="bg-blue-500 h-2 rounded-full" 
                                  style={{ width: `${Math.min(100, getSuccessPercentage(trade))}%` }}
                                ></div>
                              </div>
                              <span className="text-xs text-gray-400">{getSuccessPercentage(trade).toFixed(0)}%</span>
                            </div>
                          </td>
                          <td className="py-3">
                            <Badge variant="outline" className={getStatusColor(trade.status)}>
                              {trade.status}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Trade History Log */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">Trade History Log</CardTitle>
                <div className="flex gap-2">
                  {['all', 'profitable', 'loss'].map((filterType) => (
                    <Button
                      key={filterType}
                      variant={historyFilter === filterType ? "default" : "outline"}
                      size="sm"
                      onClick={() => setHistoryFilter(filterType as any)}
                      className={historyFilter === filterType ? 'bg-blue-600' : 'border-gray-600 text-gray-300'}
                    >
                      {filterType.charAt(0).toUpperCase() + filterType.slice(1)}
                    </Button>
                  ))}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3 max-h-64 overflow-y-auto">
                {filteredHistoryTrades.length === 0 ? (
                  <div className="text-center py-4 text-gray-500">
                    No trades found for selected filter
                  </div>
                ) : (
                  filteredHistoryTrades.map((trade) => (
                    <div key={trade.id} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg">
                      <div className="flex items-center gap-4">
                        <div>
                          <div className="text-white font-medium">{trade.tradeId.slice(0, 8)}...</div>
                          <div className="text-xs text-gray-400">{formatDate(trade.executedAt)}</div>
                        </div>
                        <div>
                          <div className="text-white">{trade.symbol}</div>
                          <div className="text-xs text-gray-400">{trade.direction}</div>
                        </div>
                        <div className="text-xs text-gray-400">
                          Fee: {formatCurrency(trade.commission)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`font-bold ${trade.netPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          {formatCurrency(trade.netPnL)}
                        </div>
                        <Badge variant="outline" className={getStatusColor(trade.status)}>
                          {trade.status}
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          {/* Insights & Recommendations */}
          {summary && (trades as PaperTrade[]).length > 0 && (
            <Card className="bg-gradient-to-r from-purple-900/30 to-blue-900/30 border-purple-500/30">
              <CardHeader>
                <CardTitle className="text-white flex items-center gap-2">
                  <i className="fas fa-lightbulb text-yellow-400"></i>
                  AI Trading Insights
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {(summary as TradeSummary).winRate > 60 && (
                    <div className="flex items-center gap-2 text-green-300">
                      <i className="fas fa-check-circle"></i>
                      <span>Excellent win rate of {(summary as TradeSummary).winRate.toFixed(1)}% - you're trading consistently!</span>
                    </div>
                  )}
                  {(summary as TradeSummary).totalCommissions > 100 && (
                    <div className="flex items-center gap-2 text-yellow-300">
                      <i className="fas fa-exclamation-triangle"></i>
                      <span>Broker fees have reduced profits by {formatCurrency((summary as TradeSummary).totalCommissions)} - consider trade frequency</span>
                    </div>
                  )}
                  {metrics.riskRewardRatio > 1.5 && (
                    <div className="flex items-center gap-2 text-blue-300">
                      <i className="fas fa-chart-line"></i>
                      <span>Strong risk/reward ratio of {metrics.riskRewardRatio.toFixed(2)} - maintaining good risk management</span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}
        </CardContent>
      </Card>
    </div>
  );
}