import { useState } from "react";
import OutcomeBox from "./OutcomeBox";
import TradeTimeline from "./TradeTimeline";
import TradeScoreGauge from "./TradeScoreGauge";
import AdvancedDetails from "./AdvancedDetails";
import { useTradingMode } from "@/contexts/TradingModeContext";
import type { TradeIdea } from "@/lib/types";
import FlagIcon from "@/components/shared/FlagIcon";

interface BestMatchTradeCardProps {
  trade: TradeIdea;
  amount: number;
  onTrade: (opp: TradeIdea, amount: number, liveP: number) => void;
  trading: boolean;
}

export default function BestMatchTradeCard({ trade, amount, onTrade, trading }: BestMatchTradeCardProps) {
  const { tradingMode } = useTradingMode();
  const [showAdvanced, setShowAdvanced] = useState(false);

  const {
    pair, description: desc, direction: action, score, status, whyThisTrade,
    openTime, closeTime, tradeLength, bestTime, sessionName, profitRate, lossRate,
  } = trade;

  // Outcome status color
  const statusColors: Record<string, string> = {
    Open: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    Win: "bg-green-500/10 text-green-400 border-green-500/20",
    Loss: "bg-red-500/10 text-red-400 border-red-500/20",
    Closed: "bg-slate-500/10 text-slate-400 border-slate-500/20",
  };

  const actionText = action === "BUY" ? "BUY ↑" : "SELL ↓";
  const actionColor = action === "BUY" ? "#22c55e" : "#ef4444";
  const actionBg = action === "BUY" ? "rgba(34, 197, 94, 0.15)" : "rgba(239, 68, 68, 0.15)";

  const plainExplanation = action === "BUY"
    ? `The app thinks the price of ${pair.split("/")[0]} may go up against the ${pair.split("/")[1]}.`
    : `The app thinks the price of ${pair.split("/")[0]} may go down against the ${pair.split("/")[1]}.`;

  const renderLargeFlags = () => {
    const [first = "EUR", second = "USD"] = pair.split("/");
    return (
      <div className="flex items-center relative w-24 h-[56px] select-none my-3">
        <FlagIcon code={first} size={52} className="absolute left-0 z-10 drop-shadow-md" />
        <FlagIcon code={second} size={52} className="absolute left-7 drop-shadow-md" />
      </div>
    );
  };

  return (
    <div
      className="best-match-card flex flex-col relative transition-all duration-300 select-none border-box"
      style={{
        background: "radial-gradient(circle at top left, rgba(0, 140, 80, 0.18), transparent 28%), linear-gradient(135deg, #07111f 0%, #081625 45%, #06101c 100%)",
        border: "1.5px solid #16a34a",
        borderRadius: "18px",
        boxShadow: "0 0 24px rgba(22, 163, 74, 0.18)",
        color: "var(--color-text)",
        padding: "28px 32px 28px 32px",
        minHeight: "380px",
      }}
    >
      {/* Top Banner Ribbon */}
      <div
        className="absolute top-0 left-0 text-[#03110a] font-extrabold tracking-wider uppercase flex items-center justify-center"
        style={{
          height: "36px",
          minWidth: "190px",
          padding: "0 28px",
          background: "linear-gradient(90deg, #22c55e, #15803d)",
          fontSize: "14px",
          borderBottomRightRadius: "18px",
        }}
      >
        Best Match for You
      </div>

      {/* Main 4-Column Grid */}
      <div
        className="best-match-grid grid gap-0 items-stretch flex-1"
      >
        {/* Column 1: Trade Identity */}
        <section className="best-match-column pr-[28px] flex flex-col justify-between text-left pt-5 border-r border-[rgba(51,85,120,0.55)]">
          <div>
            <div className="flex items-center gap-4">
              {/* Rank Circle */}
              <div
                className="rounded-full bg-[#16a34a] text-white font-extrabold flex items-center justify-center flex-shrink-0"
                style={{ width: "46px", height: "46px", fontSize: "22px" }}
              >
                #1
              </div>
              {renderLargeFlags()}
            </div>

            <div
              className="font-extrabold text-white leading-none mt-4"
              style={{ fontSize: "36px", letterSpacing: "-0.03em" }}
            >
              {pair}
            </div>
            <div className="text-[#cbd5e1] mt-2 font-medium" style={{ fontSize: "16px" }}>
              {desc}
            </div>

            {/* Action Badge */}
            <div className="flex items-center gap-2 mt-4">
              <span
                className="font-extrabold inline-block text-center rounded-[12px]"
                style={{
                  color: actionColor,
                  background: actionBg,
                  border: `1.5px solid ${actionColor}30`,
                  fontSize: "19px",
                  padding: "10px 22px",
                  lineHeight: "1",
                }}
              >
                {actionText}
              </span>
            </div>

            {/* Plain explanation */}
            <p
              className="text-[#dbeafe] leading-relaxed mt-4 font-semibold"
              style={{ fontSize: "14px", maxWidth: "250px" }}
            >
              {plainExplanation}
            </p>
          </div>

          {/* Outcome Status Pill */}
          <div className="outcome-pill-row mb-1">
            <span className="text-[13px] font-extrabold uppercase tracking-wider text-slate-500">
              Outcome if closed now:
            </span>
            <span className={`inline-block px-3 py-1.5 rounded-lg text-[13px] font-extrabold border ${statusColors[status] || statusColors.Open}`}>
              {status}
            </span>
          </div>
        </section>

        {/* Column 2: What Could Happen + Trade Timeline */}
        <section className="best-match-column px-[28px] flex flex-col justify-between text-left pt-5 border-r border-[rgba(51,85,120,0.55)]">
          <OutcomeBox amount={amount} profitRate={profitRate} lossRate={lossRate} riskLevel={trade.riskLevel} />
          <div className="border-t border-[rgba(51,85,120,0.55)] pt-4 timeline mb-1">
            <TradeTimeline openTime={openTime} closeTime={closeTime} tradeLength={tradeLength} />
          </div>
        </section>

        {/* Column 3: Trade Score */}
        <section className="best-match-column px-[28px] score-column flex flex-col justify-center items-center text-center pt-5 border-r border-[rgba(51,85,120,0.55)]">
          <TradeScoreGauge score={score} />
        </section>

        {/* Column 4: Best Time, Why, and Actions */}
        <section className="best-match-column pl-[28px] action-column flex flex-col justify-between text-left pt-5">
          {/* Best Time to Trade */}
          <div className="best-time-block">
            <div className="text-[14px] font-extrabold uppercase tracking-wider text-[#cbd5e1] flex items-center gap-1.5 mb-2">
              <i className="far fa-clock text-xs text-blue-400"></i>
              <span>Best Time to Trade</span>
            </div>
            <div className="best-time-value" style={{ fontSize: "20px" }}>{bestTime}</div>
            <div className="best-time-session" style={{ fontSize: "15px" }}>{sessionName}</div>
          </div>

          {/* Why This Trade */}
          <div className="why-block">
            <div className="text-[14px] font-extrabold uppercase tracking-wider text-[#cbd5e1] flex items-center gap-1.5 mb-2">
              <i className="fas fa-question-circle text-xs text-blue-400"></i>
              <span>Why this trade?</span>
            </div>
            <p className="why-text" style={{ fontSize: "15px" }}>
              {whyThisTrade}
            </p>
          </div>

          {/* Buttons Area */}
          <div className="flex flex-col gap-1 mt-auto pb-1">
            <button
              onClick={() => onTrade(trade, amount, trade.entryPrice || 1.0)}
              disabled={trading || amount < 0.10}
              className="outline-none border-none transition-all active:scale-[0.98] disabled:opacity-50 disabled:pointer-events-none"
              style={{
                width: "100%",
                height: "50px",
                borderRadius: "10px",
                background: "linear-gradient(180deg, #3b82f6, #1d4ed8)",
                color: "white",
                fontSize: "17px",
                fontWeight: 800,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "14px",
                cursor: "pointer",
              }}
            >
              {trading ? (
                <>
                  <i className="fas fa-spinner fa-spin"></i>
                  Executing...
                </>
              ) : (
                <>
                  {tradingMode === "live" ? "Review Sandbox Order" : "Practice This Trade"}
                  <i className="fas fa-arrow-right"></i>
                </>
              )}
            </button>

            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="show-options-link min-h-10 font-extrabold hover:text-blue-300 flex items-center justify-center gap-1.5 py-2 w-full transition-all outline-none"
            >
              {showAdvanced ? "Hide Advanced Details" : "Show other options"}
              <i className={`fas ${showAdvanced ? "fa-chevron-up" : "fa-chevron-down"} text-[10px]`}></i>
            </button>
          </div>
        </section>
      </div>

      {/* Expanded Advanced Details (Full-width underneath outside main columns grid) */}
      {showAdvanced && (
        <div className="mt-6 pt-5 border-t border-[rgba(51,85,120,0.55)] transition-all duration-300 w-full">
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
        </div>
      )}
    </div>
  );
}
