import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

interface LiveOrderPreviewModalProps {
  previewId: string;
  orderData: {
    symbol: string;
    assetClass: string;
    side: "buy" | "sell";
    orderType: string;
    quantity: number;
    notionalAmount: number;
    estimatedPrice: number;
    estimatedCost: number;
    estimatedFees: number;
    estimatedTotal: number;
    tradeScore?: number;
    riskLevel?: string;
    reason?: string;
  };
  onClose: () => void;
  onSuccess: (order: any) => void;
}

export default function LiveOrderPreviewModal({
  previewId,
  orderData,
  onClose,
  onSuccess,
}: LiveOrderPreviewModalProps) {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [confirmSafety, setConfirmSafety] = useState(false);
  const [confirmRisk, setConfirmRisk] = useState(false);

  const canSubmit = confirmSafety && confirmRisk;

  // Placement mutation
  const placeMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/trading/orders/place", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ previewId })
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to place live order");
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trading/accounts"] });
      toast({
        title: "Live Order Executed",
        description: `Successfully filled live order for ${orderData.quantity.toFixed(4)} ${orderData.symbol}.`,
      });
      onSuccess(data);
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Order Placement Failed",
        description: err.message || "Could not execute live trade.",
      });
    }
  });

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[999] animate-fade-in select-none text-left">
      <div className="w-full max-w-md rounded-2xl border p-6" style={{ background: "var(--color-card-deep)", borderColor: "#e2e8f0" }}>
        
        {/* Header */}
        <h3 className="text-base font-black text-amber-500 flex items-center gap-2">
          <i className="fas fa-file-invoice-dollar text-lg"></i>
          Review Live Order Details
        </h3>
        <p className="text-[11px] text-slate-500 font-semibold mt-1">
          Review the order metrics and broker parameters before committing funds.
        </p>

        {/* Trade Details Block */}
        <div className="mt-4 rounded-xl border p-4 bg-slate-950/40 border-slate-900 flex flex-col gap-3">
          
          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Asset / Side</span>
            <span className="text-xs font-black text-white flex items-center gap-1.5">
              <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase ${
                orderData.side === "buy" ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
              }`}>
                {orderData.side}
              </span>
              {orderData.symbol}
            </span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Target Price</span>
            <span className="text-xs font-black text-white">${orderData.estimatedPrice.toFixed(4)}</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Order Size / Quantity</span>
            <span className="text-xs font-black text-white">{orderData.quantity.toFixed(4)} units</span>
          </div>

          <div className="flex items-center justify-between border-b border-slate-900 pb-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Broker Fees</span>
            <span className="text-xs font-black text-white">${orderData.estimatedFees.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-wider">Total Estimated Cost</span>
            <span className="text-sm font-black text-white">${orderData.estimatedTotal.toFixed(2)}</span>
          </div>
        </div>

        {/* Analysis Details */}
        {orderData.tradeScore && (
          <div className="mt-4 rounded-xl p-4 bg-blue-500/5 border border-blue-500/10 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Setup Score</span>
              <span className="text-xs font-extrabold text-blue-300">{orderData.tradeScore}/100</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-blue-400 uppercase tracking-wider">Risk Profile</span>
              <span className="text-xs font-extrabold text-blue-300 uppercase tracking-wider">{orderData.riskLevel}</span>
            </div>
            {orderData.reason && (
              <p className="text-[10px] text-slate-400 font-semibold mt-1 leading-relaxed border-t border-blue-500/10 pt-2">
                {orderData.reason}
              </p>
            )}
          </div>
        )}

        {/* Live Warning notice */}
        <div className="mt-4 rounded-xl bg-amber-500/5 border border-amber-500/10 p-3 text-[10px] text-amber-500 font-bold flex gap-2">
          <i className="fas fa-exclamation-circle text-xs mt-0.5"></i>
          <span>This order will be placed live. Beginner limits restrict single orders to a maximum of $100.</span>
        </div>

        {/* Validation Checkbox list */}
        <div className="mt-4 flex flex-col gap-2.5">
          <label className="flex items-start gap-2.5 cursor-pointer text-[10px] font-bold text-slate-400">
            <input
              type="checkbox"
              checked={confirmSafety}
              onChange={(e) => setConfirmSafety(e.target.checked)}
              className="mt-0.5"
            />
            <span>I understand this sandbox order is simulated and will not reach a real broker.</span>
          </label>
          <label className="flex items-start gap-2.5 cursor-pointer text-[10px] font-bold text-slate-400">
            <input
              type="checkbox"
              checked={confirmRisk}
              onChange={(e) => setConfirmRisk(e.target.checked)}
              className="mt-0.5"
            />
            <span>I accept the execution price and risk profile of this trade.</span>
          </label>
        </div>

        {/* Modal Actions */}
        <div className="flex gap-3 justify-end mt-6">
          <button
            onClick={onClose}
            className="h-10 px-4 rounded-xl text-xs font-extrabold text-slate-400 hover:text-white cursor-pointer"
          >
            Cancel
          </button>
          <button
            onClick={() => placeMutation.mutate()}
            disabled={!canSubmit || placeMutation.isPending}
            className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 disabled:opacity-40 text-slate-950 text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
          >
            {placeMutation.isPending ? "Executing..." : "Confirm & Place Live Order"}
          </button>
        </div>

      </div>
    </div>
  );
}
