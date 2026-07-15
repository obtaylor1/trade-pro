import { useState } from "react";
import AdvancedDetails from "./AdvancedDetails";
import { useTradingMode } from "@/contexts/TradingModeContext";
import type { TradeIdea } from "@/lib/types";
import FlagIcon from "@/components/shared/FlagIcon";

interface SmallTradeCardProps {
  trade: TradeIdea;
  rank: number;
  amount: number;
  onTrade: (opp: TradeIdea, amount: number, liveP: number) => void;
  trading: boolean;
}

export default function SmallTradeCard({ trade, rank, amount, onTrade, trading }: SmallTradeCardProps) {
  const { tradingMode } = useTradingMode();
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [showWhy, setShowWhy] = useState(false);

  const { pair, description: desc, direction: action, status, riskLevel, openTime, closeTime, bestTime, whyThisTrade, profitRate, lossRate } = trade;

  // Dynamic profit/loss based on amount
  const projectedProfit = amount * profitRate;
  const projectedLoss = amount * lossRate;
  const totalReturn = status === "Loss" ? Math.max(0, amount - projectedLoss) : (amount + projectedProfit);

  // Formatting helper
  const format = (val: number) => {
    return val.toLocaleString("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2 });
  };

  // Status Badge Colors
  const statusColors: Record<string, string> = {
    Open: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Win: "bg-green-500/10 text-green-400 border-green-500/20",
    Loss: "bg-red-500/10 text-red-400 border-red-500/20",
    Closed: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  // Risk Badge Colors
  const riskColors: Record<string, string> = {
    Low: "bg-green-500/10 text-green-400 border-green-500/20",
    Medium: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    High: "bg-red-500/10 text-red-400 border-red-500/20",
  };

  const actionText = action === "BUY" ? "BUY ↑" : "SELL ↓";
  const actionColor = action === "BUY" ? "#22c55e" : "#ef4444";
  const actionBg = action === "BUY" ? "rgba(34, 197, 94, 0.1)" : "rgba(239, 68, 68, 0.1)";

  // Overlapping flags helper
  const renderFlags = () => {
    const [first = "USD", second = "JPY"] = pair.split("/");
    return (
      <div className="flex items-center relative w-12 h-8 select-none">
        <FlagIcon code={first} size={28} className="absolute left-0 z-10 drop-shadow-sm" />
        <FlagIcon code={second} size={28} className="absolute left-4 drop-shadow-sm" />
      </div>
    );
  };

  return (
    <div
      className="rounded-2xl border p-4 flex flex-col gap-3.5"
      style={{
        background: "var(--color-card-deep)",
        borderColor: "var(--color-border-strong)",
      }}
    >
      {/* Header Info */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          {/* Rank Badge */}
          <div className="w-6 h-6 rounded-full bg-blue-600/10 border border-blue-600/30 flex items-center justify-center text-blue-400 text-xs font-black">
            #{rank}
          </div>
          <div>
            <div className="text-sm font-black text-white">{pair}</div>
            <div className="text-[10px] text-slate-500 font-bold leading-tight">{desc}</div>
          </div>
        </div>

        {/* Favorite Icon */}
        <button aria-label={`Add ${pair} to watchlist`} className="w-10 h-10 flex items-center justify-center text-slate-600 hover:text-yellow-500 transition-colors">
          <i className="far fa-star text-xs" aria-hidden="true"></i>
        </button>
      </div>

      {/* Flag and Action row */}
      <div className="flex items-center justify-between gap-2 border-b border-[#1e3555]/30 pb-2.5">
        {renderFlags()}

        <div className="flex items-center gap-2">
          {/* Action */}
          <div
            className="px-2 py-0.5 rounded text-[10px] font-extrabold"
            style={{ color: actionColor, background: actionBg, border: `1px solid ${actionColor}20` }}
          >
            {actionText}
          </div>

          {/* Risk Level */}
          <div className={`px-2 py-0.5 rounded text-[10px] font-extrabold border ${riskColors[riskLevel] || riskColors.Medium}`}>
            {riskLevel} Risk
          </div>
        </div>
      </div>

      {/* Timeline details */}
      <div className="grid grid-cols-2 gap-2 text-[10px]">
        <div>
          <span className="text-slate-500 font-bold block uppercase tracking-wider">Opened</span>
          <span className="text-white font-extrabold">{openTime}</span>
        </div>
        <div>
          <span className="text-slate-500 font-bold block uppercase tracking-wider">Closes by</span>
          <span className="text-white font-extrabold">{closeTime}</span>
        </div>
      </div>

      {/* Projections block */}
      <div className="grid grid-cols-3 gap-2 bg-[#101d2f]/50 p-2 rounded-xl border border-[#1e3555]/30 text-center">
        <div>
          <span className="text-[9px] text-slate-500 font-extrabold block uppercase tracking-wider">Trade Amount</span>
          <span className="text-xs font-black text-white">{format(amount)}</span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 font-extrabold block uppercase tracking-wider">
            {status === "Loss" ? "Loss" : "Profit"}
          </span>
          <span className={`text-xs font-black ${status === "Loss" ? "text-red-400" : "text-green-400"}`}>
            {status === "Loss" ? `-${format(projectedLoss)}` : `+${format(projectedProfit)}`}
          </span>
        </div>
        <div>
          <span className="text-[9px] text-slate-500 font-extrabold block uppercase tracking-wider">Total Return</span>
          <span className="text-xs font-black text-white">{format(totalReturn)}</span>
        </div>
      </div>

      {/* Best time tag */}
      <div className="flex items-center gap-1.5 text-[9px] text-slate-500 font-bold">
        <i className="far fa-clock"></i>
        <span>Best time: <span className="text-yellow-500">{bestTime}</span></span>
      </div>

      {/* Status Indicators */}
      <div className="flex items-center justify-between">
        <div className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${statusColors[status] || statusColors.Open}`}>
          Status: {status}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2 pt-2 border-t border-[#1e3555]/30">
        <div className="flex items-center gap-2">
          <button
            onClick={() => onTrade(trade, amount, trade.entryPrice || 1.0)}
            disabled={trading || amount < 0.10}
            className="flex-1 min-h-10 bg-blue-600/80 hover:bg-blue-600 text-white text-[10px] font-extrabold py-2 px-3 rounded-lg transition-all disabled:opacity-50 disabled:pointer-events-none"
          >
            {trading ? "Executing..." : (tradingMode === "live" ? "Review Sandbox Order" : "Practice Trade")}
          </button>

          <button
            onClick={() => setShowWhy(!showWhy)}
            className="min-h-10 text-[10px] font-bold text-slate-400 hover:text-slate-300 py-2 px-2 flex items-center gap-1 transition-all"
          >
            Why?
            <i className={`fas ${showWhy ? "fa-chevron-up" : "fa-chevron-down"} text-[8px]`}></i>
          </button>

          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="min-h-10 text-[10px] font-bold text-blue-400 hover:text-blue-300 py-2 px-2 flex items-center gap-1 transition-all"
            title="Advanced details"
          >
            Details
          </button>
        </div>

        {/* Collapsible Why explanation */}
        {showWhy && (
          <p className="text-[10px] text-slate-400 font-semibold bg-[#101d2f]/50 p-2.5 rounded-lg border border-[#1e3555]/20 leading-relaxed text-left">
            {whyThisTrade}
          </p>
        )}

        {/* Collapsible Advanced details */}
        {showAdvanced && (
          <AdvancedDetails
            currentPrice={trade.entryPrice || 1.0}
            direction={action}
            tradingCost={trade.market === "options" ? "$0.00" : "$0.01 (Spread)"}
            profitGoal={trade.profitGoal || "+0.0050 (+50 pips)"}
            safetyStop={trade.safetyStop || "-0.0025 (-25 pips)"}
            tradeSize={trade.tradeSize || "0.01 Micro Lots"}
            timeframe={trade.timeframe || "5 Minute (M5)"}
            signalType={trade.signalType || "Momentum Breakdown"}
          />
        )}
      </div>
    </div>
  );
}
