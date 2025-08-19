import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { type SimulatorSetup, type Broker } from '@shared/schema';

interface SimulatorSetupProps {
  onSetupComplete: (setup: SimulatorSetup) => void;
  onCancel: () => void;
}

const SIMULATOR_BROKERS: Broker[] = [
  {
    id: 'td-ameritrade-sim',
    name: 'TD Ameritrade',
    assetClass: 'stocks',
    features: ['Commission-free stocks', 'Micro futures', 'Options'],
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
    id: 'interactive-brokers-sim',
    name: 'Interactive Brokers',
    assetClass: 'commodities',
    features: ['Low margins', 'Global markets', 'Advanced platform'],
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
    id: 'ninjatrader-sim',
    name: 'NinjaTrader',
    assetClass: 'commodities',
    features: ['Micro futures specialist', 'Professional charts', 'Low commissions'],
    rating: 4.2,
    fees: {
      stockCommission: 0,
      optionCommission: 0,
      futuresCommission: 0.53,
      cryptoFee: 0,
      marginRate: 0,
      inactivityFee: 0,
    }
  },
  {
    id: 'tastytrade-sim',
    name: 'tastytrade',
    assetClass: 'options',
    features: ['Options focused', 'Low fees', 'Educational platform'],
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
    id: 'coinbase-pro-sim',
    name: 'Coinbase Pro',
    assetClass: 'crypto',
    features: ['Crypto specialist', 'Low spread', 'Advanced trading'],
    rating: 4.1,
    fees: {
      stockCommission: 0,
      optionCommission: 0,
      futuresCommission: 0,
      cryptoFee: 0.50,
      marginRate: 0,
      inactivityFee: 0,
    }
  }
];

export default function SimulatorSetup({ onSetupComplete, onCancel }: SimulatorSetupProps) {
  const [formData, setFormData] = useState({
    userName: '',
    initialCapital: 100000,
    selectedBroker: '',
    accountType: 'individual' as const
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <i 
        key={i} 
        className={`fas fa-star text-xs ${i < Math.floor(rating) ? 'text-yellow-400' : 'text-gray-600'}`}
      />
    ));
  };

  const selectedBrokerData = SIMULATOR_BROKERS.find(b => b.id === formData.selectedBroker);

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!formData.userName.trim()) {
      newErrors.userName = 'Name is required';
    }

    if (formData.initialCapital < 100) {
      newErrors.initialCapital = 'Minimum starting balance is $100';
    }

    if (!formData.selectedBroker) {
      newErrors.selectedBroker = 'Please select a broker';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validateForm()) {
      onSetupComplete(formData);
    }
  };

  const handleCapitalChange = (value: string) => {
    const numValue = parseInt(value.replace(/[,$]/g, ''));
    if (!isNaN(numValue)) {
      setFormData(prev => ({ ...prev, initialCapital: numValue }));
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center p-4 z-50">
      <Card className="bg-gray-900 border-gray-700 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="text-white flex items-center gap-2">
            <i className="fas fa-chart-line text-blue-400"></i>
            Setup Trading Simulator
          </CardTitle>
          <p className="text-gray-400 text-sm">
            Configure your virtual trading environment with custom settings and broker selection
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* User Name */}
            <div className="space-y-2">
              <Label htmlFor="userName" className="text-white">Your Name</Label>
              <Input
                id="userName"
                value={formData.userName}
                onChange={(e) => setFormData(prev => ({ ...prev, userName: e.target.value }))}
                placeholder="Enter your name"
                className="bg-gray-800 border-gray-600 text-white"
              />
              {errors.userName && <p className="text-red-400 text-xs">{errors.userName}</p>}
            </div>

            {/* Initial Capital */}
            <div className="space-y-2">
              <Label htmlFor="initialCapital" className="text-white">Initial Capital</Label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400">$</span>
                <Input
                  id="initialCapital"
                  value={formData.initialCapital.toLocaleString()}
                  onChange={(e) => handleCapitalChange(e.target.value)}
                  placeholder="100,000"
                  className="bg-gray-800 border-gray-600 text-white pl-8"
                />
              </div>
              <p className="text-xs text-gray-500">Minimum: $100</p>
              {errors.initialCapital && <p className="text-red-400 text-xs">{errors.initialCapital}</p>}
            </div>

            {/* Account Type */}
            <div className="space-y-2">
              <Label className="text-white">Account Type</Label>
              <div className="flex gap-2">
                {['individual', 'joint', 'retirement'].map((type) => (
                  <button
                    key={type}
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, accountType: type as any }))}
                    className={`px-3 py-2 rounded-lg text-sm transition-colors ${
                      formData.accountType === type
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Broker Selection */}
            <div className="space-y-3">
              <Label className="text-white">Select Broker</Label>
              <p className="text-xs text-gray-400">
                Choose a broker to simulate realistic trading conditions including fees and commissions
              </p>
              
              <div className="space-y-2">
                {SIMULATOR_BROKERS.map((broker) => (
                  <div
                    key={broker.id}
                    onClick={() => setFormData(prev => ({ ...prev, selectedBroker: broker.id }))}
                    className={`p-4 rounded-lg border cursor-pointer transition-colors ${
                      formData.selectedBroker === broker.id
                        ? 'border-blue-500 bg-blue-500/10'
                        : 'border-gray-700 hover:border-gray-600 hover:bg-gray-800'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-medium text-white">{broker.name}</h3>
                        <Badge variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                          {broker.assetClass}
                        </Badge>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex gap-1">{renderStars(broker.rating)}</div>
                        <span className="text-xs text-gray-400">{broker.rating}</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2 mb-2 text-xs text-gray-400">
                      <div>Stock Commission: {formatCurrency(broker.fees.stockCommission)}</div>
                      <div>Futures Commission: {formatCurrency(broker.fees.futuresCommission)}</div>
                      <div>Option Commission: {formatCurrency(broker.fees.optionCommission)}</div>
                      <div>Crypto Fee: {broker.fees.cryptoFee}%</div>
                    </div>

                    <div className="flex flex-wrap gap-1">
                      {broker.features.slice(0, 3).map((feature, index) => (
                        <Badge key={index} variant="secondary" className="text-xs bg-gray-700 text-gray-300">
                          {feature}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
              {errors.selectedBroker && <p className="text-red-400 text-xs">{errors.selectedBroker}</p>}
            </div>

            {/* Fee Summary */}
            {selectedBrokerData && (
              <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                <h4 className="text-sm font-medium text-blue-300 mb-2">
                  Fee Structure - {selectedBrokerData.name}
                </h4>
                <div className="grid grid-cols-2 gap-2 text-xs text-blue-200">
                  <div>• Stock trades: {formatCurrency(selectedBrokerData.fees.stockCommission)}</div>
                  <div>• Futures: {formatCurrency(selectedBrokerData.fees.futuresCommission)}</div>
                  <div>• Options: {formatCurrency(selectedBrokerData.fees.optionCommission)}</div>
                  <div>• Crypto: {selectedBrokerData.fees.cryptoFee}% of trade value</div>
                </div>
                <p className="text-xs text-blue-300 mt-2">
                  All fees will be automatically calculated and deducted from your trades for realistic P&L tracking.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                type="button"
                variant="outline"
                onClick={onCancel}
                className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
              >
                Start Trading Simulator
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}