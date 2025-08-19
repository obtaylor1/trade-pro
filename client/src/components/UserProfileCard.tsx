import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { type UserProfile } from '@shared/schema';

interface UserProfileCardProps {
  userProfile: UserProfile;
  onToggleTradingMode: (isLive: boolean) => void;
  onResetSimulator?: () => void;
}

export default function UserProfileCard({ userProfile, onToggleTradingMode, onResetSimulator }: UserProfileCardProps) {
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
              {formatCurrency(userProfile.isLiveTrading ? userProfile.availableFunds : userProfile.virtualFunds)}
            </div>
            <div className="text-xs text-gray-500">
              {userProfile.isLiveTrading ? 'Real Money' : 'Virtual Currency'}
            </div>
          </div>

          {!userProfile.isLiveTrading && (
            <div className="space-y-2">
              <h3 className="text-sm font-medium text-gray-400">Virtual Balance</h3>
              <div className="text-lg font-semibold text-green-400">
                {formatCurrency(userProfile.virtualFunds)}
              </div>
              <div className="text-xs text-gray-500">
                Practice trading funds
              </div>
            </div>
          )}
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

          {!userProfile.isLiveTrading && onResetSimulator && (
            <div className="mt-3 pt-3 border-t border-gray-700">
              <button
                onClick={onResetSimulator}
                className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1"
              >
                <i className="fas fa-cog"></i>
                Reconfigure Simulator
              </button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}