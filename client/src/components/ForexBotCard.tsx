import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';

interface ForexBotCardProps {
  opportunity: {
    id: string;
    name: string;
    type: string;
    entryPrice: string;
    risk: string;
    potentialGain: string;
    netProfit: string;
    confidence: number;
    action: string;
    rationale: string;
    minimumTrade: string;
    leverage: string;
    spread: string;
    strategy: string;
    lotSize: string;
    marginRequired: string;
    botStrategy?: string;
    botRiskLevel?: string;
    botAutomation?: string;
    botSession?: string;
  };
}

export default function ForexBotCard({ opportunity }: ForexBotCardProps) {
  const [isConfiguring, setIsConfiguring] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const executeTradeMutation = useMutation({
    mutationFn: async (tradeData: any) => {
      return apiRequest('/api/trades/execute', 'POST', tradeData);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/balance'] });
      queryClient.invalidateQueries({ queryKey: ['/api/opportunities/forex'] });
      
      toast({
        title: "Forex Bot Trade Executed",
        description: `${opportunity.strategy} bot executed ${opportunity.action} ${opportunity.name} successfully. Trade ID: ${result.id}`,
        variant: "default",
      });
      setIsConfiguring(false);
    },
    onError: (error: any) => {
      toast({
        title: "Trade Execution Failed",
        description: error.message || "Failed to execute forex bot trade",
        variant: "destructive",
      });
    },
  });

  const handleExecuteTrade = () => {
    const tradeAmount = parseFloat(opportunity.minimumTrade.replace('$', ''));
    
    executeTradeMutation.mutate({
      opportunityId: opportunity.id,
      market: 'forex',
      action: opportunity.action,
      amount: tradeAmount,
      entryPrice: parseFloat(opportunity.entryPrice),
      leverage: parseFloat(opportunity.leverage.split(':')[0]),
      strategy: opportunity.strategy
    });
  };

  const getStrategyColor = (strategy: string) => {
    if (strategy.includes('93% Win Rate')) return 'bg-green-500/20 text-green-400 border-green-500/30';
    if (strategy.includes('Scalping')) return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
    if (strategy.includes('AI Reversal')) return 'bg-purple-500/20 text-purple-400 border-purple-500/30';
    if (strategy.includes('Triple Strategy')) return 'bg-orange-500/20 text-orange-400 border-orange-500/30';
    if (strategy.includes('Stabilizer')) return 'bg-teal-500/20 text-teal-400 border-teal-500/30';
    return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getRiskLevelColor = (riskLevel?: string) => {
    switch (riskLevel) {
      case 'Low': return 'text-green-400';
      case 'Medium': return 'text-yellow-400';
      case 'High': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-700 hover:border-blue-500/50 transition-all">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-lg text-white">{opportunity.name}</CardTitle>
            <p className="text-sm text-gray-400">{opportunity.type}</p>
          </div>
          <div className="text-right">
            <div className="flex items-center gap-2 mb-1">
              <Badge variant="outline" className={getStrategyColor(opportunity.strategy)}>
                {opportunity.strategy}
              </Badge>
            </div>
            <div className="text-2xl font-bold text-white">{opportunity.entryPrice}</div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Bot Features */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Bot Features</h4>
          <div className="flex flex-wrap gap-1">
            <Badge variant="secondary" className="text-xs bg-gray-800 text-gray-300">
              High Win Rate Automation
            </Badge>
            <Badge variant="secondary" className="text-xs bg-gray-800 text-gray-300">
              Risk Management
            </Badge>
            <Badge variant="secondary" className="text-xs bg-gray-800 text-gray-300">
              Smart Execution
            </Badge>
          </div>
        </div>

        {/* Risk & Automation Info */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <span className="text-gray-400">Risk Level:</span>
            <div className={`font-medium ${getRiskLevelColor(opportunity.botRiskLevel || 'Medium')}`}>
              {opportunity.botRiskLevel || 'Medium'}
            </div>
          </div>
          <div>
            <span className="text-gray-400">Automation:</span>
            <div className="text-blue-400 font-medium">{opportunity.botAutomation || 'Full'}</div>
          </div>
          <div>
            <span className="text-gray-400">Session:</span>
            <div className="text-gray-300 font-medium">{opportunity.botSession || 'Global'}</div>
          </div>
          <div>
            <span className="text-gray-400">Confidence:</span>
            <div className="text-green-400 font-medium">{opportunity.confidence}%</div>
          </div>
        </div>

        {/* Profit/Loss */}
        <div className="grid grid-cols-3 gap-2 text-sm">
          <div className="bg-red-500/10 rounded-lg p-2 text-center">
            <div className="text-red-400 font-medium">{opportunity.risk}</div>
            <div className="text-xs text-gray-400">Max Risk</div>
          </div>
          <div className="bg-green-500/10 rounded-lg p-2 text-center">
            <div className="text-green-400 font-medium">{opportunity.potentialGain}</div>
            <div className="text-xs text-gray-400">Potential</div>
          </div>
          <div className="bg-blue-500/10 rounded-lg p-2 text-center">
            <div className="text-blue-400 font-medium">{opportunity.netProfit}</div>
            <div className="text-xs text-gray-400">Net Profit</div>
          </div>
        </div>

        {/* Trading Details */}
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-gray-400">Minimum Trade:</span>
            <span className="text-white font-medium">{opportunity.minimumTrade}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Leverage:</span>
            <span className="text-white font-medium">{opportunity.leverage}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Spread:</span>
            <span className="text-white font-medium">{opportunity.spread}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-400">Lot Size:</span>
            <span className="text-white font-medium">{opportunity.lotSize}</span>
          </div>
        </div>

        {/* Bot Strategy Rationale */}
        <div className="space-y-2">
          <h4 className="text-sm font-medium text-gray-300">Bot Analysis</h4>
          <p className="text-sm text-gray-400 leading-relaxed">{opportunity.rationale}</p>
        </div>

        {/* Action Button */}
        <Button
          onClick={handleExecuteTrade}
          disabled={executeTradeMutation.isPending}
          className={`w-full ${
            opportunity.action === 'BUY'
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-red-600 hover:bg-red-700 text-white'
          }`}
        >
          {executeTradeMutation.isPending ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
              Executing Bot Trade...
            </div>
          ) : (
            `Execute ${opportunity.action} • ${opportunity.minimumTrade}`
          )}
        </Button>
      </CardContent>
    </Card>
  );
}