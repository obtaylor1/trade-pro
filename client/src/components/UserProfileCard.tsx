import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useUserBalance } from '@/hooks/useUserBalance';
import { type UserProfile, type Broker } from '@shared/schema';

interface UserProfileCardProps {
  userProfile: UserProfile;
  onToggleTradingMode: (isLive: boolean) => void;
  onResetSimulator?: () => void;
  onResetPortfolio?: () => void;
}

export default function UserProfileCard({ userProfile, onToggleTradingMode, onResetSimulator, onResetPortfolio }: UserProfileCardProps) {
  // Get real-time balance for authenticated users
  const { data: balanceData } = useUserBalance(userProfile.id, userProfile.id !== 'demo-user');
  const currentBalance = (balanceData as any)?.currentBalance ?? userProfile.availableFunds;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getAccountTypeBadge = (accountType: string) => {
    const colors = {
      individual: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
      joint: 'bg-green-500/20 text-green-400 border-green-500/30',
      retirement: 'bg-purple-500/20 text-purple-400 border-purple-500/30'
    };
    return colors[accountType as keyof typeof colors] || colors.individual;
  };

  // Get broker information based on selected broker ID
  const getBrokerInfo = (brokerId: string | undefined) => {
    const brokers: Record<string, { name: string; commission: string; specialty: string }> = {
      'td-ameritrade-sim': { 
        name: 'TD Ameritrade', 
        commission: '$2.25 futures', 
        specialty: 'Research & Education'
      },
      'interactive-brokers-sim': { 
        name: 'Interactive Brokers', 
        commission: '$0.85 futures', 
        specialty: 'Global Markets'
      },
      'ninjatrader-sim': { 
        name: 'NinjaTrader', 
        commission: '$0.53 futures', 
        specialty: 'Professional Platform'
      },
      'tastytrade-sim': { 
        name: 'tastytrade', 
        commission: '$1.25 futures', 
        specialty: 'Options Focus'
      },
      'coinbase-pro-sim': { 
        name: 'Coinbase Pro', 
        commission: '0.50% crypto', 
        specialty: 'Digital Assets'
      }
    };
    return brokers[brokerId || 'ninjatrader-sim'] || brokers['ninjatrader-sim'];
  };

  const brokerInfo = getBrokerInfo(userProfile.selectedBroker);

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold text-lg">
                {userProfile.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <CardTitle className="text-lg text-white">{userProfile.name}</CardTitle>
              <Badge 
                variant="outline" 
                className={`text-xs ${getAccountTypeBadge(userProfile.accountType)}`}
              >
                {userProfile.accountType.charAt(0).toUpperCase() + userProfile.accountType.slice(1)} Account
              </Badge>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className={`w-3 h-3 rounded-full ${userProfile.isLiveTrading ? 'bg-red-500' : 'bg-green-500'}`} />
            <span className="text-sm text-gray-400">
              {userProfile.isLiveTrading ? 'Live Trading' : 'Simulator'}
            </span>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-400">Available Funds</h3>
            <div className="text-2xl font-bold text-white">
              {formatCurrency(currentBalance)}
            </div>
            <div className="text-xs text-gray-500">
              {userProfile.isLiveTrading ? 'Real Money' : 'Paper Trading Balance'}
              {userProfile.id !== 'demo-user' && (
                <span className="ml-2 text-gray-600">
                  (Started: {formatCurrency(userProfile.virtualFunds)})
                </span>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h3 className="text-sm font-medium text-gray-400">Selected Broker</h3>
            <div className="flex items-center gap-2">
              <div className="text-lg font-semibold text-white">{brokerInfo.name}</div>
              <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                {brokerInfo.specialty}
              </Badge>
            </div>
            <div className="text-xs text-gray-500">
              Commission: {brokerInfo.commission}
            </div>
          </div>
        </div>

        <div className="border-t border-gray-700 pt-4">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <h3 className="text-sm font-medium text-white">Trading Mode</h3>
              <p className="text-xs text-gray-400">
                {userProfile.isLiveTrading 
                  ? 'Execute real trades with actual money'
                  : 'Practice trading with virtual funds'
                }
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <span className={`text-sm ${!userProfile.isLiveTrading ? 'text-green-400' : 'text-gray-400'}`}>
                Simulator
              </span>
              <button
                onClick={() => onToggleTradingMode(!userProfile.isLiveTrading)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 ${
                  userProfile.isLiveTrading ? 'bg-red-600' : 'bg-green-600'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    userProfile.isLiveTrading ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
              <span className={`text-sm ${userProfile.isLiveTrading ? 'text-red-400' : 'text-gray-400'}`}>
                Live
              </span>
            </div>
          </div>

          {userProfile.isLiveTrading && (
            <div className="mt-3 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
              <div className="flex items-start gap-2">
                <i className="fas fa-exclamation-triangle text-red-400 text-sm mt-0.5"></i>
                <div className="text-xs text-red-300">
                  <strong>Live Trading Active:</strong> All trades will use real money from your connected broker account.
                </div>
              </div>
            </div>
          )}

          {!userProfile.isLiveTrading && (
            <div className="mt-3 p-3 bg-green-500/10 border border-green-500/20 rounded-lg">
              <div className="flex items-center justify-between">
                <div className="flex items-start gap-2">
                  <i className="fas fa-chart-line text-green-400 text-sm mt-0.5"></i>
                  <div className="text-xs text-green-300">
                    <strong>Simulator Active:</strong> Trading with {brokerInfo.name} fee structure. 
                    All commissions ({brokerInfo.commission}) are calculated realistically.
                  </div>
                </div>
                <div className="flex gap-2">
                  {onResetSimulator && (
                    <button
                      onClick={onResetSimulator}
                      className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
                    >
                      <i className="fas fa-cog"></i>
                      Reconfigure
                    </button>
                  )}
                  {onResetPortfolio && (
                    <button
                      onClick={onResetPortfolio}
                      className="text-xs text-amber-400 hover:text-amber-300 flex items-center gap-1"
                    >
                      <i className="fas fa-undo"></i>
                      Reset Portfolio
                    </button>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}