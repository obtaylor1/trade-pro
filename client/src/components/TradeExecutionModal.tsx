import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Target, ArrowRight } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface TradeExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  companyName: string;
  currentPrice: number;
  targetPrice: number;
  opportunityId?: string; // Add opportunity ID for real trade execution
}

export default function TradeExecutionModal({
  isOpen,
  onClose,
  symbol,
  companyName,
  currentPrice,
  targetPrice,
  opportunityId = "default-opportunity"
}: TradeExecutionModalProps) {
  const [investmentAmount, setInvestmentAmount] = useState<string>("");
  const [isConfirming, setIsConfirming] = useState(false);
  const [swipeProgress, setSwipeProgress] = useState(0);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Trade execution mutation
  const executeTradeMutation = useMutation({
    mutationFn: async (tradeData: {
      opportunityId: string;
      amount: number;
      isLiveTrading: boolean;
      selectedBroker?: string;
    }) => {
      const response = await apiRequest('POST', '/api/trades/execute', tradeData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Trade Executed Successfully!",
        description: `Bought ${shares} shares of ${symbol} for $${investmentAmount}`,
      });
      
      // Invalidate relevant queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      
      onClose();
      setInvestmentAmount("");
    },
    onError: (error: any) => {
      toast({
        title: "Trade Failed",
        description: error.message || "Failed to execute trade. Please try again.",
        variant: "destructive",
      });
    }
  });

  if (!isOpen) return null;

  const quickAmounts = [50, 100, 500];
  const shares = investmentAmount ? (parseFloat(investmentAmount) / currentPrice).toFixed(2) : "0";

  const handleQuickAmount = (amount: number) => {
    setInvestmentAmount(amount.toString());
  };

  const handleSwipeStart = () => {
    setIsConfirming(true);
  };

  const handleSwipeComplete = () => {
    if (!investmentAmount || parseFloat(investmentAmount) <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid investment amount.",
        variant: "destructive",
      });
      return;
    }

    // Execute real trade via API
    executeTradeMutation.mutate({
      opportunityId,
      amount: parseFloat(investmentAmount),
      isLiveTrading: false, // Paper trading for demo
      selectedBroker: "Demo Broker"
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" data-testid="trade-execution-modal">
      {/* Background overlay */}
      <div 
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />
      
      {/* Modal sheet */}
      <div className="relative w-full max-w-md mx-auto bg-gray-800 rounded-t-2xl animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-700">
          <h2 className="text-xl font-bold text-white" data-testid="modal-title">
            Buy {symbol}
          </h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-700 rounded-lg transition-colors"
            data-testid="modal-close"
          >
            <X className="h-6 w-6 text-white" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Investment Amount Input */}
          <div>
            <label className="block text-sm font-medium text-gray-400 mb-2">
              Investment Amount
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 text-lg">$</span>
              <input
                type="number"
                value={investmentAmount}
                onChange={(e) => setInvestmentAmount(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg py-3 pl-8 pr-3 text-white text-lg focus:outline-none focus:border-blue-600"
                placeholder="0.00"
                data-testid="investment-amount-input"
              />
            </div>
          </div>

          {/* Quick Amount Buttons */}
          <div className="grid grid-cols-3 gap-3">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => handleQuickAmount(amount)}
                className={`py-2 px-4 rounded-lg font-medium transition-colors ${
                  investmentAmount === amount.toString()
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                }`}
                data-testid={`quick-amount-${amount}`}
              >
                ${amount}
              </button>
            ))}
          </div>

          {/* Trade Summary */}
          {investmentAmount && (
            <div className="bg-gray-900 rounded-lg p-4 space-y-3" data-testid="trade-summary">
              <h3 className="text-lg font-semibold text-white">Trade Summary</h3>
              
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-gray-400">Company</span>
                  <span className="text-white">{companyName}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Current Price</span>
                  <span className="text-white">${currentPrice.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Investment Amount</span>
                  <span className="text-white">${parseFloat(investmentAmount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Estimated Shares</span>
                  <span className="text-white font-semibold" data-testid="estimated-shares">
                    ~{shares} shares
                  </span>
                </div>
                <div className="flex justify-between pt-2 border-t border-gray-700">
                  <span className="text-gray-400">Target Price</span>
                  <span className="text-emerald-500 font-semibold">
                    ${targetPrice.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Swipe to Confirm */}
          {investmentAmount && parseFloat(investmentAmount) > 0 && (
            <div className="relative">
              <div 
                className="w-full bg-blue-600 rounded-xl py-4 px-6 text-white font-semibold text-center cursor-pointer select-none overflow-hidden relative"
                onMouseDown={handleSwipeStart}
                onMouseUp={handleSwipeComplete}
                onTouchStart={handleSwipeStart}
                onTouchEnd={handleSwipeComplete}
                data-testid="swipe-to-confirm"
              >
                <div className="flex items-center justify-center space-x-2">
                  <Target className="h-6 w-6" />
                  <span>Swipe to Confirm Trade</span>
                  <ArrowRight className="h-6 w-6" />
                </div>
                
                {/* Swipe progress indicator */}
                {isConfirming && (
                  <div className="absolute inset-0 bg-blue-700 transition-all duration-200" />
                )}
              </div>
              
              <p className="text-xs text-gray-400 text-center mt-2">
                Hold to confirm your trade
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}