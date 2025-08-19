import { type TradeResult } from "@shared/schema";

interface TradeResultModalProps {
  isOpen: boolean;
  tradeResult: TradeResult | null;
  onClose: () => void;
}

export default function TradeResultModal({ isOpen, tradeResult, onClose }: TradeResultModalProps) {
  if (!isOpen || !tradeResult) {
    return null;
  }

  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div 
        className="bg-trading-gray rounded-xl shadow-2xl border border-gray-700 p-8 max-w-md w-full mx-4 animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="mb-4">
            {tradeResult.success ? (
              <i className="fas fa-check-circle text-trading-success text-5xl"></i>
            ) : (
              <i className="fas fa-exclamation-circle text-trading-error text-5xl"></i>
            )}
          </div>
          <h3 className="text-2xl font-bold text-white mb-2">
            {tradeResult.success ? "Trade Executed Successfully!" : "Trade Failed"}
          </h3>
          <p className="text-gray-300 mb-6">
            {tradeResult.message}
            {tradeResult.success && tradeResult.expectedProfit && (
              <span className="block mt-2 text-trading-success font-semibold">
                Expected profit: {tradeResult.expectedProfit}
              </span>
            )}
          </p>
          <button 
            onClick={onClose}
            className="bg-trading-light-blue hover:bg-blue-600 text-white font-semibold py-2 px-6 rounded-lg transition-all duration-300"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
