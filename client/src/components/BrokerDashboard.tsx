import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import BrokerSelector from './BrokerSelector';
import { type Broker } from '@shared/schema';

interface BrokerDashboardProps {
  isLiveTrading: boolean;
}

export default function BrokerDashboard({ isLiveTrading }: BrokerDashboardProps) {
  const [selectedBrokers, setSelectedBrokers] = useState<Record<string, Broker>>({});

  const assetClasses = [
    { id: 'stocks', name: 'Stocks', icon: 'fas fa-chart-line', description: 'Equities & ETFs' },
    { id: 'commodities', name: 'Commodities', icon: 'fas fa-coins', description: 'Gold, Oil, Silver' },
    { id: 'crypto', name: 'Crypto', icon: 'fab fa-bitcoin', description: 'Digital Assets' },
    { id: 'options', name: 'Options', icon: 'fas fa-chart-bar', description: 'Derivatives' }
  ];

  const handleBrokerSelect = (assetClass: string, broker: Broker) => {
    setSelectedBrokers(prev => ({
      ...prev,
      [assetClass]: broker
    }));
  };

  return (
    <Card className="bg-gray-900 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <i className="fas fa-building text-blue-400"></i>
          Broker Connections
        </CardTitle>
        <p className="text-sm text-gray-400">
          {isLiveTrading 
            ? 'Select brokers for each asset class to execute live trades'
            : 'Broker connections are available in live trading mode'
          }
        </p>
      </CardHeader>

      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {assetClasses.map((assetClass) => (
            <div key={assetClass.id} className="space-y-3">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-8 h-8 bg-gray-800 rounded-lg flex items-center justify-center">
                  <i className={`${assetClass.icon} text-gray-400`}></i>
                </div>
                <div>
                  <h3 className="font-medium text-white">{assetClass.name}</h3>
                  <p className="text-xs text-gray-500">{assetClass.description}</p>
                </div>
              </div>

              <BrokerSelector
                assetClass={assetClass.id as 'stocks' | 'commodities' | 'crypto' | 'options'}
                selectedBroker={selectedBrokers[assetClass.id]}
                onBrokerSelect={(broker) => handleBrokerSelect(assetClass.id, broker)}
                isLiveTrading={isLiveTrading}
              />
            </div>
          ))}
        </div>

        {isLiveTrading && Object.keys(selectedBrokers).length > 0 && (
          <div className="mt-6 p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
            <div className="flex items-start gap-2">
              <i className="fas fa-shield-alt text-blue-400 text-sm mt-0.5"></i>
              <div className="text-sm text-blue-300">
                <strong>Security Notice:</strong> All broker connections use secure API authentication with 
                two-factor verification. Your trading credentials are encrypted and never stored on our servers.
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}