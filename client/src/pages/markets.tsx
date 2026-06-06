import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TradingOpportunity } from "@shared/schema";

type Market = "stocks" | "crypto" | "options" | "forex" | "commodities";
type ForexStyle = "SCALP" | "SWING" | "POSITION";

const TABS = [
  { id: "stocks" as Market,      label: "Stocks",      emoji: "📈", min: 0.25 },
  { id: "crypto" as Market,      label: "Crypto",      emoji: "₿",  min: 0.01 },
  { id: "options" as Market,     label: "Options",     emoji: "🎯", min: 0.25 },
  { id: "forex" as Market,       label: "Forex",       emoji: "💱", min: 0.10 },
  { id: "commodities" as Market, label: "Commodities", emoji: "🪙", min: 0.50 },
];

const MCOLORS: Record<Market, string> = {
  stocks: "#3b82f6", crypto: "#f59e0b", options: "#8b5cf6", forex: "#22c55e", commodities: "#ef4444"
};

// ─── Live Prices Hook ─────────────────────────────────────────────────────────

interface LivePrice {
  price: number;
  change24h: number;
  marketOpen: boolean;
  lastUpdated: string;
  bid?: number;
  ask?: number;
  spread?: string;
  source: "live" | "cache";
}

function useLivePrices() {
  const { data } = useQuery<{ prices: Record<string, LivePrice>; marketOpen: boolean }>({
    queryKey: ["/api/live-prices"],
    queryFn: () => fetch("/api/live-prices").then(r => r.json()),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
  return { prices: data?.prices ?? {}, marketOpen: data?.marketOpen ?? false };
}

// Flash green when price ticks up, red when down
function usePriceFlash(price: number): "up" | "down" | null {
  const prevRef = useRef(price);
  const [flash, setFlash] = useState<"up" | "down" | null>(null);
  useEffect(() => {
    if (prevRef.current > 0 && prevRef.current !== price) {
      setFlash(price > prevRef.current ? "up" : "down");
      const t = setTimeout(() => setFlash(null), 900);
      prevRef.current = price;
      return () => clearTimeout(t);
    }
    prevRef.current = price;
  }, [price]);
  return flash;
}

// Real options chain from yahoo-finance2 (5-min refresh)
interface RealContract { strike: number; ask: number; bid: number; lastPrice: number; expiry: string; daysLeft: number; impliedVolatility: number; }
interface OptionsChainData { calls: RealContract[]; puts: RealContract[]; underlyingPrice: number; expiry: string; daysLeft: number; }
function useOptionsChain(symbol: string) {
  const { data } = useQuery<OptionsChainData | null>({
    queryKey: ["/api/options-chain", symbol],
    queryFn: () => fetch(`/api/options-chain/${symbol}`).then(r => r.json()),
    staleTime: 5 * 60_000,
    refetchInterval: 5 * 60_000,
    enabled: !!symbol,
  });
  return data ?? null;
}

// ─── Shared UI Components ─────────────────────────────────────────────────────

function LiveDot({ open, last }: { open: boolean; last: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-semibold" style={{ color: open ? "#22c55e" : "#64748b" }}>
      <span className={`inline-block w-1.5 h-1.5 rounded-full ${open ? "animate-pulse" : ""}`}
        style={{ background: open ? "#22c55e" : "#64748b" }} />
      {open ? "LIVE" : "CLOSED"} · {last}
    </span>
  );
}

function ConfBar({ val }: { val: number }) {
  const c = val >= 75 ? "#22c55e" : val >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "#243044" }}>
        <div className="h-1.5 rounded-full transition-all" style={{ width: `${val}%`, background: c }} />
      </div>
      <span className="text-xs font-semibold" style={{ color: c }}>{val}%</span>
    </div>
  );
}

function SBadge({ type }: { type: string }) {
  const cls: Record<string, string> = {
    BREAKOUT: "badge-breakout", REVERSAL: "badge-reversal",
    MOMENTUM: "badge-momentum", MEAN_REVERSION: "badge-mean"
  };
  const lbl: Record<string, string> = { MEAN_REVERSION: "MEAN REV" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls[type] ?? "badge-breakout"}`}>{lbl[type] ?? type}</span>;
}

function ABadge({ action }: { action: string }) {
  const c = action === "BUY" ? "#22c55e" : action === "SELL" ? "#ef4444" : "#64748b";
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
      style={{ background: `${c}22`, color: c, border: `1px solid ${c}55` }}>
      {action}
    </span>
  );
}

// ─── Standard Trade Card (Stocks / Crypto / Commodities) ─────────────────────

function TradeCard({ opp, budget, livePrice, onTrade, onWatchlist, trading }: {
  opp: TradingOpportunity; budget: number;
  livePrice?: LivePrice;
  onTrade: (o: TradingOpportunity, a: number, liveP: number) => void;
  onWatchlist: (o: TradingOpportunity) => void;
  trading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const price = livePrice?.price ?? opp.entryPrice;
  const open = livePrice?.marketOpen ?? true;
  const lastUp = livePrice?.lastUpdated ?? "";
  const units = budget / price;
  const potGain = (opp.targetPrice - price) * units;
  const maxRisk = (price - opp.stopLoss) * units;
  const dp = price < 1 ? 4 : price > 1000 ? 0 : 2;
  const pdisp = price.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  const udisp = units < 0.001 ? units.toFixed(6) : units < 1 ? units.toFixed(4) : units.toFixed(2);
  const changeColor = (livePrice?.change24h ?? opp.change24h ?? 0) >= 0 ? "#22c55e" : "#ef4444";
  const flash = usePriceFlash(price);
  const flashBorder = flash === "up" ? "1px solid rgba(34,197,94,0.6)" : flash === "down" ? "1px solid rgba(239,68,68,0.6)" : "1px solid #243044";
  const flashShadow = flash === "up" ? "0 0 12px rgba(34,197,94,0.2)" : flash === "down" ? "0 0 12px rgba(239,68,68,0.2)" : "none";
  const priceColor = flash === "up" ? "#4ade80" : flash === "down" ? "#f87171" : "#e2e8f0";

  return (
    <div className="rounded-2xl p-4 trade-card" style={{ background: "#1a2332", border: flashBorder, boxShadow: flashShadow, transition: "border-color 0.4s, box-shadow 0.4s" }}>
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-lg font-black">{opp.ticker}</span>
            <ABadge action={opp.action} />
            <SBadge type={opp.signalType} />
          </div>
          <div className="text-xs mb-1" style={{ color: "#64748b" }}>{opp.name}</div>
          <LiveDot open={open} last={lastUp} />
        </div>
        <div className="text-right ml-3">
          <div className="text-xl font-black" style={{ color: priceColor, transition: "color 0.4s" }}>${pdisp}</div>
          <div className="text-xs font-semibold" style={{ color: changeColor }}>
            {(livePrice?.change24h ?? opp.change24h ?? 0) >= 0 ? "+" : ""}{(livePrice?.change24h ?? opp.change24h ?? 0).toFixed(2)}%
          </div>
          {!open && <div className="text-[9px] font-bold mt-0.5" style={{ color: "#475569" }}>MARKET CLOSED</div>}
        </div>
        <button onClick={() => onWatchlist(opp)} className="ml-2 text-xl">⭐</button>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          { label: "Your Investment", val: `$${budget.toFixed(2)}` },
          { label: "Units You Get", val: udisp },
          { label: "Target Price", val: `$${opp.targetPrice.toLocaleString("en-US", { maximumFractionDigits: 2 })}` },
          { label: "Confidence", custom: <ConfBar val={opp.confidence} /> },
        ].map((item, i) => (
          <div key={i} className="rounded-xl p-2.5" style={{ background: "#0d1117" }}>
            <div className="text-xs mb-0.5" style={{ color: "#64748b" }}>{item.label}</div>
            {item.custom ?? <div className="text-sm font-bold">{item.val}</div>}
          </div>
        ))}
        <div className="rounded-xl p-2.5" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div className="text-xs mb-0.5" style={{ color: "#64748b" }}>Potential Gain</div>
          <div className="text-sm font-bold" style={{ color: "#22c55e" }}>+${potGain.toFixed(2)}</div>
        </div>
        <div className="rounded-xl p-2.5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="text-xs mb-0.5" style={{ color: "#64748b" }}>Max Risk</div>
          <div className="text-sm font-bold" style={{ color: "#ef4444" }}>-${Math.abs(maxRisk).toFixed(2)}</div>
        </div>
      </div>

      {(opp.rsi || opp.macd) && (
        <div className="flex gap-2 mb-3 flex-wrap">
          {opp.rsi && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#243044", color: opp.rsi > 70 ? "#ef4444" : opp.rsi < 30 ? "#22c55e" : "#94a3b8" }}>RSI {opp.rsi}</span>}
          {opp.macd && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#243044", color: "#94a3b8" }}>MACD: {opp.macd}</span>}
          {opp.volume && <span className="text-[10px] px-2 py-0.5 rounded-full" style={{ background: "#243044", color: "#94a3b8" }}>Vol: {opp.volume}</span>}
        </div>
      )}

      <button onClick={() => setExpanded(!expanded)} className="w-full text-left mb-2 flex items-center justify-between text-xs font-semibold py-1" style={{ color: "#f59e0b" }}>
        <span>💡 Why Trade Now</span><span>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && <div className="rounded-xl p-3 mb-3 text-xs leading-relaxed animate-fade-in" style={{ background: "#0d1117", color: "#94a3b8" }}>{opp.rationale}</div>}

      <button onClick={() => onTrade(opp, budget, price)} disabled={trading}
        className="w-full py-3 rounded-xl font-bold text-white text-sm"
        style={{ background: trading ? "#2563eb80" : "#3b82f6" }}>
        {trading ? "Executing..." : `⚡ Paper Trade $${budget.toFixed(2)}`}
      </button>
    </div>
  );
}

// ─── Weekly Options Card ──────────────────────────────────────────────────────

function WeeklyOptionsCard({ opp, budget, livePrice, onTrade, onWatchlist, trading }: {
  opp: TradingOpportunity; budget: number;
  livePrice?: LivePrice;
  onTrade: (o: TradingOpportunity, a: number, liveP: number) => void;
  onWatchlist: (o: TradingOpportunity) => void;
  trading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const isCall = opp.optionType === "CALL";

  // Pull real options chain when available
  const chain = useOptionsChain(opp.ticker);
  const realContracts = chain ? (isCall ? chain.calls : chain.puts) : null;
  const bestContract = realContracts?.[0] ?? null;

  const underlyingPrice = chain?.underlyingPrice ?? livePrice?.price ?? (opp.strikePrice ? opp.strikePrice * 0.96 : opp.entryPrice * 5);
  const premium = bestContract?.ask ?? opp.premium ?? opp.entryPrice;
  const strikePrice = bestContract?.strike ?? opp.strikePrice ?? 0;
  const expiryLabel = bestContract?.expiry ?? chain?.expiry ?? opp.expiry ?? "—";
  const daysLeft = bestContract?.daysLeft ?? chain?.daysLeft ?? opp.daysLeft ?? 5;
  const iv = bestContract ? Math.round((bestContract.impliedVolatility ?? 0) * 100) : null;

  const units = budget / premium;
  const moveNeeded = isCall
    ? (strikePrice > 0 ? ((strikePrice - underlyingPrice) / underlyingPrice * 100).toFixed(1) : "—")
    : (strikePrice > 0 ? ((underlyingPrice - strikePrice) / underlyingPrice * 100).toFixed(1) : "—");
  const potGain = premium * (opp.targetPrice / opp.entryPrice - 1) * units + budget;

  const open = livePrice?.marketOpen ?? true;
  const lastUp = livePrice?.lastUpdated ?? "";
  const typeColor = isCall ? "#22c55e" : "#ef4444";
  const daysColor = daysLeft <= 2 ? "#ef4444" : daysLeft <= 3 ? "#f59e0b" : "#3b82f6";
  const flash = usePriceFlash(premium);
  const flashBorder = flash === "up" ? `1px solid rgba(34,197,94,0.6)` : flash === "down" ? `1px solid rgba(239,68,68,0.6)` : `1px solid ${isCall ? "rgba(34,197,94,0.25)" : "rgba(239,68,68,0.25)"}`;
  const premiumColor = flash === "up" ? "#4ade80" : flash === "down" ? "#f87171" : "#e2e8f0";
  const isRealData = !!bestContract;

  return (
    <div className="rounded-2xl p-4 trade-card" style={{ background: "#1a2332", border: flashBorder, transition: "border-color 0.4s" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-1">
            <span className="text-lg font-black">{opp.ticker}</span>
            <span className="text-xs font-black px-2.5 py-0.5 rounded-full"
              style={{ background: `${typeColor}20`, color: typeColor, border: `1px solid ${typeColor}55` }}>
              Weekly {isCall ? "Call" : "Put"}
            </span>
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${daysColor}20`, color: daysColor }}>
              {daysLeft}d left
            </span>
          </div>
          <div className="text-xs mb-1" style={{ color: "#64748b" }}>{opp.name}</div>
          <LiveDot open={open} last={lastUp} />
        </div>
        <button onClick={() => onWatchlist(opp)} className="ml-2 text-xl">⭐</button>
      </div>

      {/* Key details */}
      <div className="grid grid-cols-3 gap-2 mb-3">
        <div className="rounded-xl p-2.5 col-span-1" style={{ background: "#0d1117" }}>
          <div className="text-[10px] mb-0.5 flex items-center gap-1" style={{ color: "#64748b" }}>
            Premium
            {isRealData && <span className="text-[8px] font-bold px-1 rounded" style={{ background: "rgba(34,197,94,0.2)", color: "#4ade80" }}>LIVE</span>}
          </div>
          <div className="text-base font-black" style={{ color: premiumColor, transition: "color 0.4s" }}>${premium.toFixed(2)}</div>
          <div className="text-[10px]" style={{ color: "#64748b" }}>per contract{iv !== null ? ` · IV ${iv}%` : ""}</div>
        </div>
        <div className="rounded-xl p-2.5 col-span-1" style={{ background: "#0d1117" }}>
          <div className="text-[10px] mb-0.5" style={{ color: "#64748b" }}>Strike</div>
          <div className="text-base font-black">${strikePrice > 0 ? strikePrice.toLocaleString() : (opp.strikePrice?.toLocaleString() ?? "—")}</div>
          <div className="text-[10px]" style={{ color: "#64748b" }}>exp {expiryLabel}</div>
        </div>
        <div className="rounded-xl p-2.5 col-span-1" style={{ background: "#0d1117" }}>
          <div className="text-[10px] mb-0.5" style={{ color: "#64748b" }}>Stock Now</div>
          <div className="text-base font-black">${underlyingPrice.toFixed(2)}</div>
          <div className="text-[10px]" style={{ color: "#64748b" }}>needs {moveNeeded}% {isCall ? "↑" : "↓"}</div>
        </div>
      </div>

      {/* Budget math */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl p-2.5" style={{ background: "#0d1117" }}>
          <div className="text-[10px] mb-0.5" style={{ color: "#64748b" }}>Your Budget</div>
          <div className="text-sm font-bold">${budget.toFixed(2)}</div>
        </div>
        <div className="rounded-xl p-2.5" style={{ background: "#0d1117" }}>
          <div className="text-[10px] mb-0.5" style={{ color: "#64748b" }}>Contracts</div>
          <div className="text-sm font-bold">{units.toFixed(2)}×</div>
        </div>
        <div className="rounded-xl p-2.5" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div className="text-[10px] mb-0.5" style={{ color: "#64748b" }}>Potential Gain</div>
          <div className="text-sm font-bold" style={{ color: "#22c55e" }}>+${potGain.toFixed(2)}</div>
        </div>
        <div className="rounded-xl p-2.5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="text-[10px] mb-0.5" style={{ color: "#64748b" }}>Max Loss</div>
          <div className="text-sm font-bold" style={{ color: "#ef4444" }}>-${budget.toFixed(2)}</div>
        </div>
      </div>

      {/* Confidence */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: "#64748b" }}>AI Confidence</span>
          <span className="font-bold">{opp.confidence}%</span>
        </div>
        <ConfBar val={opp.confidence} />
      </div>

      {/* Why this week */}
      <button onClick={() => setExpanded(!expanded)} className="w-full text-left mb-2 flex items-center justify-between text-xs font-semibold py-1" style={{ color: "#8b5cf6" }}>
        <span>📅 Why This Week</span><span>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && (
        <div className="animate-fade-in mb-3">
          {opp.weeklyRationale && (
            <div className="rounded-xl p-3 mb-2 text-xs leading-relaxed" style={{ background: "rgba(139,92,246,0.08)", border: "1px solid rgba(139,92,246,0.2)", color: "#c4b5fd" }}>
              {opp.weeklyRationale}
            </div>
          )}
          <div className="rounded-xl p-3 text-xs leading-relaxed" style={{ background: "#0d1117", color: "#94a3b8" }}>{opp.rationale}</div>
        </div>
      )}

      <button onClick={() => onTrade(opp, budget, premium)} disabled={trading}
        className="w-full py-3 rounded-xl font-bold text-white text-sm"
        style={{ background: trading ? "#7c3aed80" : "#7c3aed" }}>
        {trading ? "Executing..." : `⚡ Paper Trade ${isCall ? "Call" : "Put"} · $${budget.toFixed(2)}`}
      </button>
    </div>
  );
}

// ─── Forex Style Selector ─────────────────────────────────────────────────────

function ForexStyleSelector({ value, onChange }: { value: ForexStyle; onChange: (s: ForexStyle) => void }) {
  const styles: { id: ForexStyle; emoji: string; label: string; sub: string; timeframe: string }[] = [
    { id: "SCALP",    emoji: "⚡", label: "Scalping",       sub: "Seconds–hours",    timeframe: "M1·M5·M15" },
    { id: "SWING",    emoji: "📈", label: "Swing Trading",  sub: "Days–weeks",       timeframe: "H1·H4·D1" },
    { id: "POSITION", emoji: "🏦", label: "Position",       sub: "Months+",          timeframe: "D1·W1·MN" },
  ];
  return (
    <div className="rounded-2xl p-4 mb-4" style={{ background: "#1a2332", border: "1px solid #243044" }}>
      <div className="text-xs font-bold mb-3 uppercase" style={{ color: "#64748b" }}>Trading Style</div>
      <div className="grid grid-cols-3 gap-2">
        {styles.map(s => {
          const active = value === s.id;
          return (
            <button key={s.id} onClick={() => onChange(s.id)}
              className="rounded-xl p-3 text-left transition-all"
              style={{
                background: active ? "rgba(59,130,246,0.12)" : "#0d1117",
                border: `2px solid ${active ? "#3b82f6" : "#243044"}`,
              }}>
              <div className="text-xl mb-1">{s.emoji}</div>
              <div className="text-xs font-bold leading-tight">{s.label}</div>
              <div className="text-[10px] mt-0.5" style={{ color: "#64748b" }}>{s.sub}</div>
              <div className="text-[10px] mt-0.5 font-mono" style={{ color: active ? "#60a5fa" : "#475569" }}>{s.timeframe}</div>
            </button>
          );
        })}
      </div>
      {value === "SCALP" && <div className="mt-3 text-[11px] rounded-xl p-2.5" style={{ background: "rgba(34,197,94,0.08)", color: "#4ade80" }}>⚡ Close ALL positions before end of day — no overnight fees</div>}
      {value === "POSITION" && <div className="mt-3 text-[11px] rounded-xl p-2.5" style={{ background: "rgba(245,158,11,0.08)", color: "#fbbf24" }}>🏦 Based on macro fundamentals — review weekly, hold months</div>}
    </div>
  );
}

// ─── Forex Card ───────────────────────────────────────────────────────────────

function ForexCard({ opp, budget, livePrice, onTrade, onWatchlist, trading }: {
  opp: TradingOpportunity; budget: number;
  livePrice?: LivePrice;
  onTrade: (o: TradingOpportunity, a: number, liveP: number) => void;
  onWatchlist: (o: TradingOpportunity) => void;
  trading: boolean;
}) {
  const [expanded, setExpanded] = useState(false);
  const price = livePrice?.price ?? opp.entryPrice;
  const spread = livePrice?.spread ?? opp.spread ?? "—";
  const bid = livePrice?.bid;
  const ask = livePrice?.ask;
  const flash = usePriceFlash(price);
  const isYen = opp.ticker.includes("JPY");
  const isExotic = ["MXN","ZAR","NOK","CNH","SGD"].some(x => opp.ticker.includes(x));

  const isBuy = opp.action === "BUY";
  const pipTarget = opp.pipTarget ?? 20;
  const stopPips = opp.stopPips ?? 10;
  const pip = isYen ? 0.01 : isExotic ? 0.01 : 0.0001;
  const microLots = budget;
  const pipValuePerUnit = 0.10; // $0.10 per pip per $1 micro lot (educational approximation)
  const dollarPotential = pipTarget * pipValuePerUnit * microLots;
  const dollarRisk = stopPips * pipValuePerUnit * microLots;

  const styleColor = opp.forexStyle === "SCALP" ? "#22c55e" : opp.forexStyle === "SWING" ? "#3b82f6" : "#f59e0b";
  const styleLabel = opp.forexStyle === "SCALP" ? "SCALP" : opp.forexStyle === "SWING" ? "SWING" : "POSITION";
  const actionColor = isBuy ? "#22c55e" : "#ef4444";
  const dp = isYen || isExotic ? 3 : 5;
  const pdisp = price.toFixed(dp);

  const flashBorderFx = flash === "up" ? "1px solid rgba(34,197,94,0.6)" : flash === "down" ? "1px solid rgba(239,68,68,0.6)" : "1px solid #243044";
  const flashShadowFx = flash === "up" ? "0 0 12px rgba(34,197,94,0.2)" : flash === "down" ? "0 0 12px rgba(239,68,68,0.2)" : "none";
  const priceColorFx = flash === "up" ? "#4ade80" : flash === "down" ? "#f87171" : "#e2e8f0";

  return (
    <div className="rounded-2xl p-4 trade-card" style={{ background: "#1a2332", border: flashBorderFx, boxShadow: flashShadowFx, transition: "border-color 0.4s, box-shadow 0.4s" }}>
      {/* Header */}
      <div className="flex items-start justify-between mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap mb-0.5">
            <span className="text-lg font-black">{opp.ticker.replace("-", "/")}</span>
            <ABadge action={opp.action} />
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full"
              style={{ background: `${styleColor}20`, color: styleColor }}>{styleLabel}</span>
          </div>
          <div className="text-xs mb-1" style={{ color: "#64748b" }}>{opp.fullName ?? opp.name}</div>
          <LiveDot open={true} last={livePrice?.lastUpdated ?? ""} />
        </div>
        <button onClick={() => onWatchlist(opp)} className="ml-2 text-xl">⭐</button>
      </div>

      {/* Live price row */}
      <div className="rounded-xl p-3 mb-3" style={{ background: "#0d1117", border: "1px solid #243044" }}>
        <div className="flex items-center justify-between mb-1">
          <div>
            <div className="text-xl font-black" style={{ color: priceColorFx, transition: "color 0.4s" }}>{pdisp}</div>
            <div className="text-[10px]" style={{ color: "#64748b" }}>Spread: {spread}</div>
          </div>
          {bid && ask && (
            <div className="text-right">
              <div className="text-xs text-green-400">Ask {ask.toFixed(dp)}</div>
              <div className="text-xs text-red-400">Bid {bid.toFixed(dp)}</div>
            </div>
          )}
          <div className="text-right">
            <div className="text-xs font-semibold" style={{ color: (opp.change24h ?? 0) >= 0 ? "#22c55e" : "#ef4444" }}>
              {(opp.change24h ?? 0) >= 0 ? "+" : ""}{(opp.change24h ?? 0).toFixed(3)}%
            </div>
            <div className="text-[10px]" style={{ color: "#64748b" }}>{opp.timeframes ?? "—"}</div>
          </div>
        </div>
        <div className="flex gap-3 text-[11px]">
          <span style={{ color: isBuy ? "#22c55e" : "#ef4444" }}>
            {isBuy ? "▲" : "▼"} {isYen || isExotic ? pipTarget.toFixed(0) : pipTarget} pip target
          </span>
          <span style={{ color: "#94a3b8" }}>🛡 {stopPips} pip stop</span>
          <SBadge type={opp.signalType} />
        </div>
      </div>

      {/* Budget math */}
      <div className="grid grid-cols-2 gap-2 mb-3">
        <div className="rounded-xl p-2.5" style={{ background: "#0d1117" }}>
          <div className="text-[10px] mb-0.5" style={{ color: "#64748b" }}>Micro Lots</div>
          <div className="text-sm font-bold">{(budget * 0.01).toFixed(3)}</div>
          <div className="text-[10px]" style={{ color: "#64748b" }}>≈ ${(budget * 1000 * price).toFixed(0)} notional</div>
        </div>
        <div className="rounded-xl p-2.5" style={{ background: "#0d1117" }}>
          <div className="text-[10px] mb-0.5" style={{ color: "#64748b" }}>Best Time</div>
          <div className="text-[10px] font-semibold leading-tight">{opp.bestTime ?? "—"}</div>
        </div>
        <div className="rounded-xl p-2.5" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}>
          <div className="text-[10px] mb-0.5" style={{ color: "#64748b" }}>If Target Hit</div>
          <div className="text-sm font-bold" style={{ color: "#22c55e" }}>+${dollarPotential.toFixed(2)}</div>
        </div>
        <div className="rounded-xl p-2.5" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)" }}>
          <div className="text-[10px] mb-0.5" style={{ color: "#64748b" }}>If Stop Hit</div>
          <div className="text-sm font-bold" style={{ color: "#ef4444" }}>-${dollarRisk.toFixed(2)}</div>
        </div>
      </div>

      {/* Confidence */}
      <div className="mb-3">
        <div className="flex justify-between text-xs mb-1">
          <span style={{ color: "#64748b" }}>AI Confidence</span>
          <span className="font-bold">{opp.confidence}%</span>
        </div>
        <ConfBar val={opp.confidence} />
      </div>

      <button onClick={() => setExpanded(!expanded)} className="w-full text-left mb-2 flex items-center justify-between text-xs font-semibold py-1" style={{ color: "#f59e0b" }}>
        <span>💡 Analysis</span><span>{expanded ? "▲" : "▼"}</span>
      </button>
      {expanded && <div className="rounded-xl p-3 mb-3 text-xs leading-relaxed animate-fade-in" style={{ background: "#0d1117", color: "#94a3b8" }}>{opp.rationale}</div>}

      <button onClick={() => onTrade(opp, budget, price)} disabled={trading}
        className="w-full py-3 rounded-xl font-bold text-white text-sm"
        style={{ background: trading ? "#16a34a80" : "#16a34a" }}>
        {trading ? "Executing..." : `⚡ Paper Trade ${opp.action} ${opp.ticker.replace("-","/")} · $${budget.toFixed(2)}`}
      </button>
    </div>
  );
}

// ─── Markets Page ─────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const { token, updateBalance } = useAuth();
  const { toast } = useToast();
  const [activeMarket, setActiveMarket] = useState<Market>("stocks");
  const [budget, setBudget] = useState(0.25);
  const [budgetInput, setBudgetInput] = useState("0.25");
  const [forexStyle, setForexStyle] = useState<ForexStyle>("SCALP");
  const currentTab = TABS.find(t => t.id === activeMarket)!;

  const { prices: livePrices, marketOpen } = useLivePrices();

  // Market opportunities (from our AI signal service)
  const { data: opps, isLoading } = useQuery<TradingOpportunity[]>({
    queryKey: ["/api/opportunities", activeMarket, activeMarket === "forex" ? forexStyle : ""],
    queryFn: () => {
      const url = activeMarket === "forex"
        ? `/api/opportunities/forex?style=${forexStyle}`
        : `/api/opportunities/${activeMarket}`;
      return fetch(url).then(r => r.json());
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const tradeMutation = useMutation({
    mutationFn: async ({ opp, amount, liveP }: { opp: TradingOpportunity; amount: number; liveP: number }) => {
      const units = parseFloat((amount / liveP).toFixed(6));
      const potGain = opp.market === "options" ? liveP * 5 * units : (opp.targetPrice - liveP) * units;
      const res = await fetch("/api/trades/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          market: opp.market, ticker: opp.ticker, tickerName: opp.name,
          action: opp.action, entryPrice: liveP, units, investedAmount: amount,
          potentialGain: potGain,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      return res.json();
    },
    onSuccess: (data, vars) => {
      updateBalance(data.newBalance);
      toast({ title: "✅ Paper trade opened!", description: `Executed at $${vars.liveP.toFixed(vars.liveP < 1 ? 4 : 2)} · Balance: $${parseFloat(data.newBalance).toFixed(2)}` });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/snapshots"] });
    },
    onError: (e: any) => toast({ title: "Trade failed", description: e.message, variant: "destructive" }),
  });

  const watchMutation = useMutation({
    mutationFn: async (opp: TradingOpportunity) => {
      const res = await fetch(`/api/watchlist/${opp.ticker}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ market: opp.market }) });
      return res.json();
    },
    onSuccess: (_, opp) => { toast({ title: `⭐ ${opp.ticker} added to watchlist` }); queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] }); },
  });

  useEffect(() => {
    const m = Math.max(currentTab.min, 0.25);
    setBudget(m); setBudgetInput(String(m));
  }, [activeMarket]);

  // Map opp ticker → live price key
  function getLive(opp: TradingOpportunity): LivePrice | undefined {
    const t = opp.ticker;
    // Commodities use futures symbols
    if (opp.market === "commodities") {
      const map: Record<string, string> = { GOLD: "GC=F", OIL: "CL=F", SILVER: "SI=F", NATGAS: "NG=F" };
      return livePrices[map[t] ?? t];
    }
    return livePrices[t];
  }

  function handleTrade(opp: TradingOpportunity, amount: number, liveP: number) {
    tradeMutation.mutate({ opp, amount, liveP });
  }

  const isFetching = isLoading;

  return (
    <div className="page-container lg:pb-8 min-h-screen" style={{ background: "#0d1117" }}>
      <div className="px-4 lg:px-8 pt-6 max-w-none">
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-black">Markets</h1>
          <div className="flex items-center gap-1.5 text-[11px]" style={{ color: marketOpen ? "#22c55e" : "#64748b" }}>
            <span className={`w-2 h-2 rounded-full ${marketOpen ? "animate-pulse" : ""}`}
              style={{ background: marketOpen ? "#22c55e" : "#64748b" }} />
            {marketOpen ? "US Markets Open" : "US Markets Closed"}
          </div>
        </div>

        {/* Market tabs */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4 lg:mx-0 lg:px-0" style={{ scrollbarWidth: "none" }}>
          {TABS.map(tab => {
            const active = tab.id === activeMarket;
            const c = MCOLORS[tab.id];
            return (
              <button key={tab.id} onClick={() => setActiveMarket(tab.id)}
                className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-semibold transition-all"
                style={{ background: active ? `${c}22` : "#1a2332", color: active ? c : "#64748b", border: `2px solid ${active ? c : "#243044"}` }}>
                <span>{tab.emoji}</span><span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Forex style selector */}
        {activeMarket === "forex" && (
          <ForexStyleSelector value={forexStyle} onChange={setForexStyle} />
        )}

        {/* Budget bar */}
        <div className="sticky top-0 z-10 py-3 mb-4" style={{ background: "#0d1117" }}>
          <div className="rounded-2xl p-4 w-full" style={{ background: "#1a2332", border: "1px solid #243044" }}>
            <div className="text-xs font-semibold mb-2" style={{ color: "#64748b" }}>HOW MUCH DO YOU WANT TO INVEST?</div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2 flex-1 rounded-xl px-4 py-2.5" style={{ background: "#0d1117", border: "1px solid #243044" }}>
                <span className="font-bold" style={{ color: "#22c55e" }}>$</span>
                <input type="number" min={currentTab.min} step={0.01} value={budgetInput}
                  onChange={e => { setBudgetInput(e.target.value); const n = parseFloat(e.target.value); if (!isNaN(n) && n >= 0.01) setBudget(n); }}
                  className="flex-1 bg-transparent outline-none text-base font-bold" style={{ color: "#e2e8f0" }} />
              </div>
              <div className="text-xs whitespace-nowrap" style={{ color: "#64748b" }}>Min: ${currentTab.min.toFixed(2)}</div>
            </div>
            <div className="flex gap-2">
              {[0.25, 1, 5, 10, 25].map(v => (
                <button key={v} onClick={() => { setBudget(v); setBudgetInput(String(v)); }}
                  className="flex-1 py-1 rounded-lg text-xs font-semibold border transition-all"
                  style={{ background: budget === v ? "rgba(59,130,246,0.15)" : "transparent", borderColor: budget === v ? "#3b82f6" : "#243044", color: budget === v ? "#60a5fa" : "#64748b" }}>
                  ${v}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Trade cards */}
        {isFetching ? (
          <div className="grid lg:grid-cols-3 gap-4">
            {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton rounded-2xl" style={{ height: 320 }} />)}
          </div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-4">
            {(opps ?? []).map(opp => {
              const live = getLive(opp);
              const commonProps = {
                opp, budget, livePrice: live, trading: tradeMutation.isPending,
                onTrade: handleTrade, onWatchlist: (o: TradingOpportunity) => watchMutation.mutate(o),
              };
              if (opp.market === "options") return <WeeklyOptionsCard key={opp.id} {...commonProps} />;
              if (opp.market === "forex")   return <ForexCard key={opp.id} {...commonProps} />;
              return <TradeCard key={opp.id} {...commonProps} />;
            })}
            {(opps ?? []).length === 0 && (
              <div className="col-span-full text-center py-12">
                <div className="text-4xl mb-3">📭</div>
                <div className="font-semibold">No signals right now</div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
