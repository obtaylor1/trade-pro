import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type PortfolioPosition } from '@shared/schema';

interface PortfolioSummaryProps {
  positions: PortfolioPosition[];
  isLiveTrading: boolean;
  onViewHistory?: () => void;
  onViewPortfolio?: () => void;
}

export default function PortfolioSummary({ positions, isLiveTrading, onViewHistory, onViewPortfolio }: PortfolioSummaryProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatPercent = (percent: number) => {
    const sign = percent >= 0 ? '+' : '';
    return `${sign}${percent.toFixed(2)}%`;
  };

  const totalValue = positions.reduce((sum, pos) => sum + pos.marketValue, 0);
  const totalPnL = positions.reduce((sum, pos) => sum + pos.unrealizedPnL, 0);
  const totalPnLPercent = totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0;

  const getAssetClassColor = (assetClass: string) => {
    const colors = {
      stocks: 'bg-blue-500/20 text-blue-400',
      commodities: 'bg-yellow-500/20 text-yellow-400',
      crypto: 'bg-purple-500/20 text-purple-400',
      options: 'bg-green-500/20 text-green-400'
    };
    return colors[assetClass as keyof typeof colors] || colors.stocks;
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-white flex items-center gap-2">
            <i className="fas fa-chart-pie text-blue-400"></i>
            Portfolio Summary
            <Badge variant="outline" className={isLiveTrading ? 'border-red-500/30 text-red-400' : 'border-green-500/30 text-green-400'}>
              {isLiveTrading ? 'Live' : 'Simulated'}
            </Badge>
          </CardTitle>
          {!isLiveTrading && (onViewHistory || onViewPortfolio) && (
            <div className="flex gap-2">
              {onViewPortfolio && (
                <Button 
                  size="sm"
                  onClick={onViewPortfolio}
                  className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600 text-xs px-3 py-1"
                >
                  <i className="fas fa-chart-pie mr-1"></i>
                  Portfolio
                </Button>
              )}
              {onViewHistory && (
                <Button 
                  size="sm"
                  onClick={onViewHistory}
                  className="bg-gray-800 hover:bg-gray-700 text-white border-gray-600 text-xs px-3 py-1"
                >
                  <i className="fas fa-history mr-1"></i>
                  History
                </Button>
              )}
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="space-y-1">
            <div className="text-sm text-gray-400">Total Value</div>
            <div className="text-xl font-bold text-white">{formatCurrency(totalValue)}</div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm text-gray-400">Unrealized P&L</div>
            <div className={`text-xl font-bold ${totalPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatCurrency(totalPnL)}
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-sm text-gray-400">Return</div>
            <div className={`text-xl font-bold ${totalPnLPercent >= 0 ? 'text-green-400' : 'text-red-400'}`}>
              {formatPercent(totalPnLPercent)}
            </div>
          </div>
        </div>

        {positions.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <i className="fas fa-chart-line text-3xl mb-3"></i>
            <div className="text-lg mb-2">No positions yet</div>
            <div className="text-sm">Start trading to build your portfolio</div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="text-sm font-medium text-gray-300 mb-3">Current Positions</div>
            
            {positions.map((position) => (
              <div key={position.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center gap-3">
                  <div>
                    <div className="font-medium text-white">{position.symbol}</div>
                    <div className="text-sm text-gray-400">{position.name}</div>
                  </div>
                  <Badge variant="secondary" className={`text-xs ${getAssetClassColor(position.assetClass)}`}>
                    {position.assetClass}
                  </Badge>
                </div>

                <div className="text-right">
                  <div className="font-medium text-white">
                    {position.quantity} × {formatCurrency(position.currentPrice)}
                  </div>
                  <div className="text-sm text-gray-400">
                    Entry: {formatCurrency(position.entryPrice)}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-medium text-white">{formatCurrency(position.marketValue)}</div>
                  <div className={`text-sm ${position.unrealizedPnL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatCurrency(position.unrealizedPnL)} ({formatPercent(position.unrealizedPnLPercent)})
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}