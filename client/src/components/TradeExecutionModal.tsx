import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { X, Target, CheckCircle } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";

interface TradeExecutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  symbol: string;
  companyName: string;
  currentPrice: number;
  targetPrice: number;
  opportunityId?: string;
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
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { user } = useUser();

  const executeTradeMutation = useMutation({
    mutationFn: async (tradeData: {
      opportunityId: string;
      amount: number;
      isLiveTrading: boolean;
      selectedBroker?: string;
      userId?: string;
    }) => {
      const response = await apiRequest('POST', '/api/trades/execute', tradeData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Trade Executed Successfully!",
        description: `Bought ${shares} shares of ${symbol} for $${parseFloat(investmentAmount).toFixed(2)}`,
      });

      // Fix: use array-format query keys so cache invalidation works correctly
      queryClient.invalidateQueries({ queryKey: ["/api/opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      if (user?.id) {
        queryClient.invalidateQueries({ queryKey: ['/api/auth/balance', user.id] });
        queryClient.invalidateQueries({ queryKey: ['/api/auth/user', user.id] });
      }

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
  const shares = investmentAmount && currentPrice > 0
    ? (parseFloat(investmentAmount) / currentPrice).toFixed(4)
    : "0";

  const handleConfirmTrade = () => {
    const amount = parseFloat(investmentAmount);
    if (!investmentAmount || isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid investment amount.",
        variant: "destructive",
      });
      return;
    }

    executeTradeMutation.mutate({
      opportunityId,
      amount,
      isLiveTrading: user?.isLiveTrading || false,
      selectedBroker: user?.selectedBroker || "ninjatrader-sim",
      userId: user?.id || 'demo-user',
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end" data-testid="trade-execution-modal">
      <div
        className="absolute inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md mx-auto bg-gray-800 rounded-t-2xl animate-slide-up">
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

        <div className="p-6 space-y-6">
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
                min="1"
                data-testid="investment-amount-input"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {quickAmounts.map((amount) => (
              <button
                key={amount}
                onClick={() => setInvestmentAmount(amount.toString())}
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

          {investmentAmount && parseFloat(investmentAmount) > 0 && (
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

          {/* Confirm Trade button — clear, unambiguous action */}
          <button
            onClick={handleConfirmTrade}
            disabled={!investmentAmount || parseFloat(investmentAmount) <= 0 || executeTradeMutation.isPending}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-semibold py-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            data-testid="confirm-trade-button"
          >
            {executeTradeMutation.isPending ? (
              <>
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Executing Trade...</span>
              </>
            ) : (
              <>
                <CheckCircle className="h-5 w-5" />
                <span>Confirm Trade</span>
              </>
            )}
          </button>

          {!user && (
            <p className="text-xs text-amber-400 text-center">
              You're trading in demo mode. Create an account to save your trades.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
