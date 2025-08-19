import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';
import { useToast } from '@/hooks/use-toast';
import { type UserRegistration, type UserLogin } from '@shared/schema';

interface UserAuthModalProps {
  isVisible: boolean;
  onUserAuthenticated: (user: any) => void;
  onClose: () => void;
}

interface AuthenticatedUser {
  id: string;
  name: string;
  email: string;
  startingCapital: number;
  currentBalance: number;
  selectedBroker: string;
  isLiveTrading: boolean;
}

export default function UserAuthModal({ isVisible, onUserAuthenticated, onClose }: UserAuthModalProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    startingCapital: 10000,
    selectedBroker: 'ninjatrader-sim'
  });
  const { toast } = useToast();

  const registerMutation = useMutation({
    mutationFn: async (data: UserRegistration) => {
      const response = await apiRequest('POST', '/api/auth/register', data);
      return response.json();
    },
    onSuccess: (user: AuthenticatedUser) => {
      toast({
        title: "Account Created Successfully",
        description: `Welcome ${user.name}! Your trading account is ready.`,
      });
      onUserAuthenticated(user);
    },
    onError: (error: any) => {
      toast({
        title: "Registration Failed",
        description: error.message || "Unable to create account. Please try again.",
        variant: "destructive",
      });
    }
  });

  const loginMutation = useMutation({
    mutationFn: async (data: UserLogin) => {
      const response = await apiRequest('POST', '/api/auth/login', data);
      return response.json();
    },
    onSuccess: (user: AuthenticatedUser) => {
      toast({
        title: "Welcome Back",
        description: `Hello ${user.name}! Your trading session has started.`,
      });
      onUserAuthenticated(user);
    },
    onError: (error: any) => {
      if (error.message.includes('User not found')) {
        toast({
          title: "Email Not Found",
          description: "No account found with this email. Would you like to create a new account?",
          variant: "destructive",
        });
        setMode('register');
      } else {
        toast({
          title: "Login Failed",
          description: error.message || "Unable to login. Please try again.",
          variant: "destructive",
        });
      }
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (mode === 'register') {
      if (!formData.name || !formData.email || formData.startingCapital < 100) {
        toast({
          title: "Invalid Input",
          description: "Please fill all fields. Minimum starting capital is $100.",
          variant: "destructive",
        });
        return;
      }
      
      registerMutation.mutate({
        name: formData.name,
        email: formData.email,
        startingCapital: formData.startingCapital,
        selectedBroker: formData.selectedBroker
      });
    } else {
      if (!formData.email) {
        toast({
          title: "Email Required",
          description: "Please enter your email address.",
          variant: "destructive",
        });
        return;
      }
      
      loginMutation.mutate({
        email: formData.email
      });
    }
  };

  if (!isVisible) return null;

  const brokers = [
    { value: 'ninjatrader-sim', label: 'NinjaTrader ($0.53/trade)', fee: '$0.53' },
    { value: 'interactive-brokers', label: 'Interactive Brokers ($0.85/trade)', fee: '$0.85' },
    { value: 'tastytrade', label: 'tastytrade ($1.25/trade)', fee: '$1.25' },
    { value: 'td-ameritrade', label: 'TD Ameritrade ($2.25/trade)', fee: '$2.25' },
  ];

  return (
    <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50">
      <Card className="bg-gray-900 border-gray-700 w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-white text-center">
            <i className="fas fa-user-circle text-blue-400 mr-2"></i>
            {mode === 'login' ? 'Welcome Back' : 'Create Trading Account'}
          </CardTitle>
          <p className="text-gray-400 text-center text-sm">
            {mode === 'login' 
              ? 'Enter your email to access your trading history and continue where you left off'
              : 'Create a free account to track your trades, save your progress, and access detailed performance analytics'
            }
          </p>
        </CardHeader>

        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'register' && (
              <div>
                <Label htmlFor="name" className="text-gray-300">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Enter your full name"
                  className="bg-gray-800 border-gray-600 text-white"
                  required
                />
              </div>
            )}

            <div>
              <Label htmlFor="email" className="text-gray-300">Email Address</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                placeholder="Enter your email"
                className="bg-gray-800 border-gray-600 text-white"
                required
              />
            </div>

            {mode === 'register' && (
              <>
                <div>
                  <Label htmlFor="capital" className="text-gray-300">Starting Capital</Label>
                  <Input
                    id="capital"
                    type="number"
                    min="100"
                    step="100"
                    value={formData.startingCapital}
                    onChange={(e) => setFormData({ ...formData, startingCapital: parseInt(e.target.value) || 100 })}
                    className="bg-gray-800 border-gray-600 text-white"
                  />
                  <p className="text-xs text-gray-500 mt-1">Minimum $100 required</p>
                </div>

                <div>
                  <Label htmlFor="broker" className="text-gray-300">Select Broker</Label>
                  <Select 
                    value={formData.selectedBroker} 
                    onValueChange={(value) => setFormData({ ...formData, selectedBroker: value })}
                  >
                    <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                      <SelectValue placeholder="Choose your broker" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-600">
                      {brokers.map((broker) => (
                        <SelectItem key={broker.value} value={broker.value}>
                          {broker.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-gray-500 mt-1">Commission fees will be deducted from profits</p>
                </div>
              </>
            )}

            <div className="flex gap-3 pt-4">
              <Button 
                type="submit" 
                className="flex-1 bg-blue-600 hover:bg-blue-700"
                disabled={registerMutation.isPending || loginMutation.isPending}
              >
                {registerMutation.isPending || loginMutation.isPending ? (
                  <i className="fas fa-spinner fa-spin mr-2"></i>
                ) : (
                  <i className={`fas ${mode === 'login' ? 'fa-sign-in-alt' : 'fa-user-plus'} mr-2`}></i>
                )}
                {mode === 'login' ? 'Login' : 'Create Account'}
              </Button>
              
              <Button 
                type="button" 
                variant="outline"
                onClick={onClose}
                className="border-gray-600 text-gray-300 hover:bg-gray-700"
              >
                Cancel
              </Button>
            </div>

            <div className="text-center pt-2">
              <button
                type="button"
                onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
                className="text-blue-400 hover:text-blue-300 text-sm underline"
              >
                {mode === 'login' 
                  ? "Don't have an account? Create one"
                  : "Already have an account? Login"
                }
              </button>
            </div>
          </form>

          {mode === 'register' && (
            <div className="mt-6 p-4 bg-gradient-to-r from-purple-900/30 to-blue-900/30 border border-purple-500/30 rounded-lg">
              <h4 className="text-white font-semibold mb-2 flex items-center">
                <i className="fas fa-info-circle text-blue-400 mr-2"></i>
                Paper Trading Benefits
              </h4>
              <ul className="text-sm text-gray-300 space-y-1">
                <li>• Risk-free trading with virtual money</li>
                <li>• Real market data and pricing</li>
                <li>• Track performance and improve skills</li>
                <li>• Persistent trade history and analytics</li>
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}