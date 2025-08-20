import type { ForexUser } from '@shared/schema';

interface ForexAccountSummaryProps {
  account: ForexUser | null;
  isConnected: boolean;
}

export default function ForexAccountSummary({ account, isConnected }: ForexAccountSummaryProps) {
  if (!account) {
    return (
      <div className="flex items-center justify-center">
        <div className="text-gray-400">Loading account data...</div>
      </div>
    );
  }

  const marginLevel = account.marginLevel;
  const marginLevelColor = 
    marginLevel > 200 ? 'text-green-400' : 
    marginLevel > 100 ? 'text-yellow-400' : 
    'text-red-400';

  const dailyPnLColor = account.dailyPnL >= 0 ? 'text-green-400' : 'text-red-400';
  const totalPnLColor = account.totalPnL >= 0 ? 'text-green-400' : 'text-red-400';

  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center space-x-8">
        {/* Account Info */}
        <div>
          <div className="text-sm text-gray-400">Account</div>
          <div className="text-lg font-bold text-white">{account.name}</div>
          <div className="text-xs text-gray-500">{account.baseCurrency} Account</div>
        </div>

        {/* Balance */}
        <div>
          <div className="text-sm text-gray-400">Balance</div>
          <div className="text-xl font-bold text-white">
            ${account.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Equity */}
        <div>
          <div className="text-sm text-gray-400">Equity</div>
          <div className="text-xl font-bold text-blue-400">
            ${account.equity.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Free Margin */}
        <div>
          <div className="text-sm text-gray-400">Free Margin</div>
          <div className="text-lg font-bold text-green-400">
            ${account.freeMargin.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Margin Level */}
        <div>
          <div className="text-sm text-gray-400">Margin Level</div>
          <div className={`text-lg font-bold ${marginLevelColor}`}>
            {marginLevel.toFixed(1)}%
          </div>
        </div>
      </div>

      <div className="flex items-center space-x-8">
        {/* Daily P/L */}
        <div className="text-right">
          <div className="text-sm text-gray-400">Daily P/L</div>
          <div className={`text-lg font-bold ${dailyPnLColor}`}>
            {account.dailyPnL >= 0 ? '+' : ''}${account.dailyPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Total P/L */}
        <div className="text-right">
          <div className="text-sm text-gray-400">Total P/L</div>
          <div className={`text-lg font-bold ${totalPnLColor}`}>
            {account.totalPnL >= 0 ? '+' : ''}${account.totalPnL.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
        </div>

        {/* Risk Settings */}
        <div className="text-right">
          <div className="text-sm text-gray-400">Max Risk/Trade</div>
          <div className="text-lg font-bold text-purple-400">
            {(account.riskPerTrade * 100).toFixed(1)}%
          </div>
        </div>

        {/* Connection Status */}
        <div className="flex items-center space-x-2">
          <div className={`w-3 h-3 rounded-full ${isConnected ? 'bg-green-400' : 'bg-red-400'}`}></div>
          <div className="text-sm text-gray-400">
            {isConnected ? 'Connected' : 'Disconnected'}
          </div>
        </div>

        {/* Account Status */}
        {account.isLocked && (
          <div className="bg-red-600 text-white px-3 py-1 rounded-full text-sm font-semibold">
            LOCKED
          </div>
        )}
      </div>
    </div>
  );
}