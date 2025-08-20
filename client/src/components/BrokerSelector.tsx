import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { type Broker } from '@shared/schema';

interface BrokerSelectorProps {
  assetClass: 'stocks' | 'commodities' | 'crypto' | 'options' | 'forex';
  selectedBroker?: Broker;
  onBrokerSelect: (broker: Broker) => void;
  isLiveTrading: boolean;
}

const MOCK_BROKERS: Record<string, Broker[]> = {
  stocks: [
    {
      id: 'td-ameritrade',
      name: 'TD Ameritrade',
      assetClass: 'stocks',
      features: ['Commission-free stocks', 'Advanced research', 'Mobile app'],
      rating: 4.5,
      fees: {
        stockCommission: 0,
        optionCommission: 0.65,
        futuresCommission: 2.25,
        cryptoFee: 0,
        marginRate: 8.75,
        inactivityFee: 0,
      }
    },
    {
      id: 'charles-schwab',
      name: 'Charles Schwab',
      assetClass: 'stocks',
      features: ['No minimums', 'Fractional shares', '24/7 support'],
      rating: 4.7,
      fees: {
        stockCommission: 0,
        optionCommission: 0.65,
        futuresCommission: 2.25,
        cryptoFee: 0,
        marginRate: 7.75,
        inactivityFee: 0,
      }
    },
    {
      id: 'fidelity',
      name: 'Fidelity',
      assetClass: 'stocks',
      features: ['Zero expense ratio funds', 'Research tools', 'Educational resources'],
      rating: 4.6,
      fees: {
        stockCommission: 0,
        optionCommission: 0.65,
        futuresCommission: 2.25,
        cryptoFee: 0,
        marginRate: 8.25,
        inactivityFee: 0,
      }
    }
  ],
  commodities: [
    {
      id: 'interactive-brokers',
      name: 'Interactive Brokers',
      assetClass: 'commodities',
      features: ['Low commissions', 'Global markets', 'Micro futures'],
      rating: 4.4,
      fees: {
        stockCommission: 0.005,
        optionCommission: 0.70,
        futuresCommission: 0.85,
        cryptoFee: 0.20,
        marginRate: 6.83,
        inactivityFee: 20,
      }
    },
    {
      id: 'td-ameritrade-futures',
      name: 'TD Ameritrade Futures',
      assetClass: 'commodities',
      features: ['Futures trading', 'Options on futures', 'Advanced platform'],
      rating: 4.3,
      fees: {
        stockCommission: 0,
        optionCommission: 0.65,
        futuresCommission: 2.25,
        cryptoFee: 0,
        marginRate: 8.75,
        inactivityFee: 0,
      }
    },
    {
      id: 'ninjatrader',
      name: 'NinjaTrader',
      assetClass: 'commodities',
      features: ['Professional platform', 'Advanced charting', 'Low margins'],
      rating: 4.2,
      fees: {
        stockCommission: 0,
        optionCommission: 0,
        futuresCommission: 0.53,
        cryptoFee: 0,
        marginRate: 0,
        inactivityFee: 0,
      }
    }
  ],
  crypto: [
    {
      id: 'coinbase-pro',
      name: 'Coinbase Pro',
      assetClass: 'crypto',
      features: ['Institutional grade', 'Low fees', 'Advanced trading'],
      rating: 4.1,
      fees: {
        stockCommission: 0,
        optionCommission: 0,
        futuresCommission: 0,
        cryptoFee: 0.50,
        marginRate: 0,
        inactivityFee: 0,
      }
    },
    {
      id: 'kraken',
      name: 'Kraken',
      assetClass: 'crypto',
      features: ['Security focused', 'Margin trading', 'Staking rewards'],
      rating: 4.3,
      fees: {
        stockCommission: 0,
        optionCommission: 0,
        futuresCommission: 0,
        cryptoFee: 0.26,
        marginRate: 0,
        inactivityFee: 0,
      }
    },
    {
      id: 'binance-us',
      name: 'Binance.US',
      assetClass: 'crypto',
      features: ['Low trading fees', 'Large coin selection', 'Mobile app'],
      rating: 4.0,
      fees: {
        stockCommission: 0,
        optionCommission: 0,
        futuresCommission: 0,
        cryptoFee: 0.10,
        marginRate: 0,
        inactivityFee: 0,
      }
    }
  ],
  options: [
    {
      id: 'tastytrade',
      name: 'tastytrade',
      assetClass: 'options',
      features: ['Options focused', 'Low commissions', 'Education'],
      rating: 4.5,
      fees: {
        stockCommission: 0,
        optionCommission: 1.00,
        futuresCommission: 1.25,
        cryptoFee: 0,
        marginRate: 9.75,
        inactivityFee: 0,
      }
    },
    {
      id: 'etrade-options',
      name: 'E*TRADE Options',
      assetClass: 'options',
      features: ['Advanced platform', 'Research tools', 'Mobile trading'],
      rating: 4.2,
      fees: {
        stockCommission: 0,
        optionCommission: 0.65,
        futuresCommission: 1.50,
        cryptoFee: 0,
        marginRate: 9.25,
        inactivityFee: 0,
      }
    }
  ],
  forex: [
    {
      id: 'oanda',
      name: 'OANDA',
      assetClass: 'forex',
      features: ['Tight spreads', 'No minimum deposit', 'Advanced platform'],
      rating: 4.6,
      fees: {
        stockCommission: 0,
        optionCommission: 0,
        futuresCommission: 0,
        cryptoFee: 0,
        marginRate: 3.5,
        inactivityFee: 0,
      }
    },
    {
      id: 'ig-group',
      name: 'IG Group',
      assetClass: 'forex',
      features: ['Global leader', 'Low spreads', '17,000+ markets'],
      rating: 4.5,
      fees: {
        stockCommission: 0,
        optionCommission: 0,
        futuresCommission: 0,
        cryptoFee: 0,
        marginRate: 3.4,
        inactivityFee: 12,
      }
    },
    {
      id: 'forex-com',
      name: 'Forex.com',
      assetClass: 'forex',
      features: ['Institutional grade', 'MetaTrader platform', 'DMA access'],
      rating: 4.4,
      fees: {
        stockCommission: 0,
        optionCommission: 0,
        futuresCommission: 0,
        cryptoFee: 0,
        marginRate: 3.8,
        inactivityFee: 0,
      }
    },
    {
      id: 'fxpro',
      name: 'FxPro',
      assetClass: 'forex',
      features: ['ECN execution', 'Multiple platforms', 'Regulatory protection'],
      rating: 4.3,
      fees: {
        stockCommission: 0,
        optionCommission: 0,
        futuresCommission: 0,
        cryptoFee: 0,
        marginRate: 4.2,
        inactivityFee: 0,
      }
    },
    {
      id: 'pepperstone',
      name: 'Pepperstone',
      assetClass: 'forex',
      features: ['Raw spreads', 'cTrader platform', 'Razor execution'],
      rating: 4.5,
      fees: {
        stockCommission: 0,
        optionCommission: 0,
        futuresCommission: 0,
        cryptoFee: 0,
        marginRate: 2.9,
        inactivityFee: 0,
      }
    }
  ]
};

export default function BrokerSelector({ assetClass, selectedBroker, onBrokerSelect, isLiveTrading }: BrokerSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const brokers = MOCK_BROKERS[assetClass] || [];

  const handleBrokerSelect = (broker: Broker) => {
    onBrokerSelect(broker);
    setIsOpen(false);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <i 
        key={i} 
        className={`fas fa-star text-xs ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-600'}`}
      />
    ));
  };

  if (!isLiveTrading) {
    return (
      <div className="text-center py-4 text-gray-500 text-sm">
        <i className="fas fa-info-circle mr-2"></i>
        Broker selection available in live trading mode
      </div>
    );
  }

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm text-gray-300">
          {assetClass.charAt(0).toUpperCase() + assetClass.slice(1)} Broker
        </CardTitle>
      </CardHeader>
      
      <CardContent>
        {selectedBroker ? (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-medium text-white">{selectedBroker.name}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <div className="flex gap-1">{renderStars(selectedBroker.rating)}</div>
                  <span className="text-xs text-gray-400">{selectedBroker.rating}</span>
                </div>
              </div>
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500/30">
                Connected
              </Badge>
            </div>
            
            <div className="flex flex-wrap gap-1">
              {selectedBroker.features.slice(0, 2).map((feature, index) => (
                <Badge key={index} variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                  {feature}
                </Badge>
              ))}
            </div>

            <div className="relative">
              <Button 
                variant="outline" 
                size="sm" 
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-700"
                onClick={() => setIsOpen(!isOpen)}
              >
                Change Broker
              </Button>
              
              {isOpen && (
                <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                  <div className="p-3 border-b border-gray-700">
                    <h3 className="font-medium text-white">
                      Select {assetClass.charAt(0).toUpperCase() + assetClass.slice(1)} Broker
                    </h3>
                  </div>
                  
                  <div className="p-2 space-y-2">
                    {brokers.map((broker) => (
                      <div 
                        key={broker.id}
                        onClick={() => handleBrokerSelect(broker)}
                        className={`p-3 rounded-lg border cursor-pointer transition-colors ${
                          selectedBroker?.id === broker.id 
                            ? 'border-blue-500 bg-blue-500/10' 
                            : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="font-medium text-white">{broker.name}</h3>
                          <div className="flex items-center gap-2">
                            <div className="flex gap-1">{renderStars(broker.rating)}</div>
                            <span className="text-xs text-gray-400">{broker.rating}</span>
                          </div>
                        </div>
                        
                        <div className="flex flex-wrap gap-1">
                          {broker.features.map((feature, index) => (
                            <Badge key={index} variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                              {feature}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="relative">
            <Button 
              variant="outline" 
              className="w-full border-dashed border-gray-600 text-gray-400 hover:border-gray-500 hover:text-gray-300"
              onClick={() => setIsOpen(!isOpen)}
            >
              <i className="fas fa-plus mr-2"></i>
              Select Broker
            </Button>
            
            {isOpen && (
              <div className="absolute top-full left-0 right-0 z-50 mt-2 bg-gray-900 border border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                <div className="p-3 border-b border-gray-700">
                  <h3 className="font-medium text-white">
                    Select {assetClass.charAt(0).toUpperCase() + assetClass.slice(1)} Broker
                  </h3>
                </div>
                
                <div className="p-2 space-y-2">
                  {brokers.map((broker) => (
                    <div 
                      key={broker.id}
                      onClick={() => handleBrokerSelect(broker)}
                      className="p-3 rounded-lg border border-gray-700 hover:border-gray-600 hover:bg-gray-800 cursor-pointer transition-colors"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <h3 className="font-medium text-white">{broker.name}</h3>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-1">{renderStars(broker.rating)}</div>
                          <span className="text-xs text-gray-400">{broker.rating}</span>
                        </div>
                      </div>
                      
                      <div className="flex flex-wrap gap-1">
                        {broker.features.map((feature, index) => (
                          <Badge key={index} variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                            {feature}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}