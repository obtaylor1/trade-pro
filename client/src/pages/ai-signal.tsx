import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TradingOpportunity } from "@shared/schema";

function ConfBar({ val }: { val: number }) {
  const c = val >= 75 ? "#22c55e" : val >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 rounded-full" style={{ background: "#243044" }}>
        <div className="h-2 rounded-full transition-all" style={{ width: `${val}%`, background: c }} />
      </div>
      <span className="text-sm font-bold" style={{ color: c }}>{val}%</span>
    </div>
  );
}
function SBadge({ type }: { type: string }) {
  const cls: Record<string, string> = { BREAKOUT: "badge-breakout", REVERSAL: "badge-reversal", MOMENTUM: "badge-momentum", MEAN_REVERSION: "badge-mean" };
  const lbl: Record<string, string> = { MEAN_REVERSION: "MEAN REV" };
  return <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${cls[type] ?? "badge-breakout"}`}>{lbl[type] ?? type}</span>;
}
function MBadge({ market }: { market: string }) {
  const c: Record<string, string> = { stocks: "#3b82f6", crypto: "#f59e0b", options: "#8b5cf6", forex: "#22c55e", commodities: "#ef4444" };
  const col = c[market] ?? "#64748b";
  return <span className="text-xs font-bold px-2.5 py-1 rounded-full uppercase" style={{ background: `${col}22`, color: col, border: `1px solid ${col}44` }}>{market}</span>;
}
function StrengthBars({ val }: { val: number }) {
  const bars = 5; const filled = Math.round((val / 100) * bars);
  return (
    <div className="flex gap-1">
      {Array.from({ length: bars }, (_, i) => (
        <div key={i} className="h-4 w-1.5 rounded-sm" style={{ background: i < filled ? "#3b82f6" : "#243044" }} />
      ))}
    </div>
  );
}

function SignalModal({ opp, onClose, onTrade, trading }: { opp: TradingOpportunity; onClose: () => void; onTrade: () => void; trading: boolean }) {
  const rr = opp.stopLoss > 0 ? ((opp.targetPrice - opp.entryPrice) / (opp.entryPrice - opp.stopLoss)).toFixed(1) : "N/A";
  return (
    <div className="fixed inset-0 z-50 flex items-end lg:items-center justify-center" style={{ background: "rgba(0,0,0,0.7)" }}>
      <div className="w-full max-w-lg rounded-t-3xl lg:rounded-3xl p-6 animate-fade-in"
        style={{ background: "#1a2332", border: "1px solid #243044", maxHeight: "90vh", overflowY: "auto" }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2"><MBadge market={opp.market} /><SBadge type={opp.signalType} /></div>
          <button onClick={onClose} className="text-xl" style={{ color: "#64748b" }}>✕</button>
        </div>
        <div className="text-2xl font-black mb-1">{opp.ticker}</div>
        <div className="text-sm mb-4" style={{ color: "#64748b" }}>{opp.name}</div>
        <div className="mb-4">
          <div className="text-xs font-semibold mb-2" style={{ color: "#64748b" }}>CONFIDENCE</div>
          <ConfBar val={opp.confidence} />
        </div>
        <div className="grid grid-cols-3 gap-3 mb-4">
          {[
            { label: "Entry", val: `$${opp.entryPrice < 10 ? opp.entryPrice.toFixed(4) : opp.entryPrice.toLocaleString()}` },
            { label: "Target", val: `$${opp.targetPrice < 10 ? opp.targetPrice.toFixed(4) : opp.targetPrice.toLocaleString()}`, green: true },
            { label: "Stop Loss", val: `$${opp.stopLoss < 10 ? opp.stopLoss.toFixed(4) : opp.stopLoss.toLocaleString()}`, red: true },
          ].map(item => (
            <div key={item.label} className="rounded-xl p-3 text-center" style={{ background: "#0d1117" }}>
              <div className="text-xs mb-1" style={{ color: "#64748b" }}>{item.label}</div>
              <div className="text-sm font-bold" style={{ color: item.green ? "#22c55e" : item.red ? "#ef4444" : "#e2e8f0" }}>{item.val}</div>
            </div>
          ))}
        </div>
        <div className="rounded-xl p-4 mb-4" style={{ background: "#0d1117" }}>
          <div className="flex justify-between mb-2">
            <span className="text-xs" style={{ color: "#64748b" }}>Risk/Reward Ratio</span>
            <span className="text-sm font-bold" style={{ color: "#f59e0b" }}>1:{rr}</span>
          </div>
          <div className="flex gap-2 flex-wrap">
            {opp.rsi && <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{ background: "#243044", color: opp.rsi > 70 ? "#ef4444" : opp.rsi < 30 ? "#22c55e" : "#94a3b8" }}>RSI {opp.rsi}</span>}
            {opp.macd && <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{ background: "#243044", color: "#94a3b8" }}>MACD: {opp.macd}</span>}
            {opp.volume && <span className="text-xs px-2 py-1 rounded-lg font-semibold" style={{ background: "#243044", color: "#94a3b8" }}>Vol: {opp.volume}</span>}
          </div>
        </div>
        <div className="rounded-xl p-4 mb-4" style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.2)" }}>
          <div className="text-xs font-bold mb-2" style={{ color: "#f59e0b" }}>💡 AI Analysis</div>
          <div className="text-sm leading-relaxed" style={{ color: "#94a3b8" }}>{opp.rationale}</div>
        </div>
        <div className="rounded-xl p-3 mb-4" style={{ background: "#0d1117" }}>
          <div className="text-xs" style={{ color: "#64748b" }}>Expected timeline: <span className="text-white font-medium">1–5 trading days</span></div>
        </div>
        <button onClick={onTrade} disabled={trading} className="w-full py-3 rounded-xl font-bold text-white text-base" style={{ background: trading ? "#2563eb80" : "#3b82f6" }}>
          {trading ? "Executing..." : "⚡ Execute Paper Trade ($1.00)"}
        </button>
      </div>
    </div>
  );
}

const MARKETS = ["all", "stocks", "crypto", "options", "forex", "commodities"];
const SIGNAL_TYPES = ["all", "BREAKOUT", "REVERSAL", "MOMENTUM", "MEAN_REVERSION"];

export default function AISignalPage() {
  const { token, updateBalance } = useAuth();
  const { toast } = useToast();
  const [marketFilter, setMarketFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [minConf, setMinConf] = useState(0);
  const [selected, setSelected] = useState<TradingOpportunity | null>(null);

  const { data: signals, isLoading, dataUpdatedAt } = useQuery<TradingOpportunity[]>({
    queryKey: ["/api/ai-signals"],
    queryFn: () => fetch("/api/ai-signals").then(r => r.json()),
    refetchInterval: 60000,
  });

  const tradeMutation = useMutation({
    mutationFn: async (opp: TradingOpportunity) => {
      const res = await fetch("/api/trades/execute", {
        method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ market: opp.market, ticker: opp.ticker, tickerName: opp.name, action: opp.action, entryPrice: opp.entryPrice, units: parseFloat((1 / opp.entryPrice).toFixed(6)), investedAmount: 1, potentialGain: opp.targetPrice })
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      return res.json();
    },
    onSuccess: (data) => { updateBalance(data.newBalance); toast({ title: "✅ Paper trade opened!" }); setSelected(null); queryClient.invalidateQueries({ queryKey: ["/api/trades"] }); },
    onError: (e: any) => toast({ title: "Trade failed", description: e.message, variant: "destructive" }),
  });

  const filtered = (signals ?? [])
    .filter(s => marketFilter === "all" || s.market === marketFilter)
    .filter(s => typeFilter === "all" || s.signalType === typeFilter)
    .filter(s => s.confidence >= minConf)
    .sort((a, b) => b.confidence - a.confidence);

  const lastUpdate = dataUpdatedAt ? new Date(dataUpdatedAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }) : "--:--";

  return (
    <div className="page-container lg:pb-8 min-h-screen" style={{ background: "#0d1117" }}>
      <div className="px-4 lg:px-8 pt-6 max-w-none">
        <div className="flex items-center justify-between mb-5">
          <div>
            <h1 className="text-xl font-black">🤖 AI Signal</h1>
            <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>Updated {lastUpdate} · Auto-refreshes every 60s</div>
          </div>
        </div>

        {/* Filters */}
        <div className="rounded-2xl p-4 mb-4" style={{ background: "#1a2332", border: "1px solid #243044" }}>
          <div className="lg:flex lg:gap-8">
            <div className="flex-1 mb-3 lg:mb-0">
              <div className="text-xs font-semibold mb-2" style={{ color: "#64748b" }}>MARKET</div>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {MARKETS.map(m => (
                  <button key={m} onClick={() => setMarketFilter(m)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
                    style={{ background: marketFilter === m ? "#3b82f620" : "transparent", color: marketFilter === m ? "#60a5fa" : "#64748b", border: `1px solid ${marketFilter === m ? "#3b82f6" : "#243044"}` }}>
                    {m}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 mb-3 lg:mb-0">
              <div className="text-xs font-semibold mb-2" style={{ color: "#64748b" }}>SIGNAL TYPE</div>
              <div className="flex gap-2 overflow-x-auto pb-1" style={{ scrollbarWidth: "none" }}>
                {SIGNAL_TYPES.map(t => (
                  <button key={t} onClick={() => setTypeFilter(t)}
                    className="flex-shrink-0 px-3 py-1.5 rounded-xl text-xs font-semibold capitalize transition-all"
                    style={{ background: typeFilter === t ? "#3b82f620" : "transparent", color: typeFilter === t ? "#60a5fa" : "#64748b", border: `1px solid ${typeFilter === t ? "#3b82f6" : "#243044"}` }}>
                    {t === "all" ? "All Types" : t.replace("_", " ")}
                  </button>
                ))}
              </div>
            </div>
            <div className="lg:w-48">
              <div className="text-xs font-semibold mb-2" style={{ color: "#64748b" }}>MIN CONFIDENCE: <span style={{ color: "#60a5fa" }}>{minConf}%</span></div>
              <input type="range" min={0} max={90} step={5} value={minConf} onChange={e => setMinConf(Number(e.target.value))} className="w-full accent-blue-500" />
            </div>
          </div>
        </div>

        <div className="text-xs mb-3" style={{ color: "#64748b" }}>{filtered.length} signal{filtered.length !== 1 ? "s" : ""} found</div>

        {/* Cards — 2-3 col grid on desktop */}
        {isLoading ? (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {Array(6).fill(0).map((_, i) => <div key={i} className="skeleton rounded-2xl" style={{ height: 200 }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">🔍</div>
            <div className="font-semibold mb-1">No signals match your filters</div>
            <div className="text-sm" style={{ color: "#64748b" }}>Try lowering the minimum confidence or changing filters</div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map(opp => {
              const rr = opp.stopLoss > 0 ? ((opp.targetPrice - opp.entryPrice) / (opp.entryPrice - opp.stopLoss)).toFixed(1) : "N/A";
              return (
                <div key={opp.id} className="rounded-2xl p-4 trade-card cursor-pointer" style={{ background: "#1a2332", border: "1px solid #243044" }}
                  onClick={() => setSelected(opp)}>
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <MBadge market={opp.market} /><SBadge type={opp.signalType} />
                    </div>
                    <StrengthBars val={opp.confidence} />
                  </div>
                  <div className="flex items-center justify-between mb-2">
                    <div>
                      <div className="text-xl font-black">{opp.ticker}</div>
                      <div className="text-xs" style={{ color: "#64748b" }}>{opp.name}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs" style={{ color: "#64748b" }}>R/R</div>
                      <div className="text-sm font-bold" style={{ color: "#f59e0b" }}>1:{rr}</div>
                    </div>
                  </div>
                  <ConfBar val={opp.confidence} />
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    <div className="text-center"><div className="text-xs" style={{ color: "#64748b" }}>Entry</div><div className="text-xs font-bold">${opp.entryPrice < 10 ? opp.entryPrice.toFixed(4) : opp.entryPrice.toLocaleString()}</div></div>
                    <div className="text-center"><div className="text-xs" style={{ color: "#64748b" }}>Target</div><div className="text-xs font-bold" style={{ color: "#22c55e" }}>${opp.targetPrice < 10 ? opp.targetPrice.toFixed(4) : opp.targetPrice.toLocaleString()}</div></div>
                    <div className="text-center"><div className="text-xs" style={{ color: "#64748b" }}>Stop</div><div className="text-xs font-bold" style={{ color: "#ef4444" }}>${opp.stopLoss < 10 ? opp.stopLoss.toFixed(4) : opp.stopLoss.toLocaleString()}</div></div>
                  </div>
                  <div className="mt-3 flex gap-2">
                    <button onClick={e => { e.stopPropagation(); tradeMutation.mutate(opp); }} disabled={tradeMutation.isPending}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white" style={{ background: "#3b82f6" }}>
                      ⚡ Paper Trade
                    </button>
                    <button onClick={e => { e.stopPropagation(); setSelected(opp); }} className="px-4 py-2 rounded-xl text-xs font-semibold" style={{ background: "#243044", color: "#94a3b8" }}>
                      Details
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {selected && (
        <SignalModal opp={selected} onClose={() => setSelected(null)}
          onTrade={() => tradeMutation.mutate(selected)} trading={tradeMutation.isPending} />
      )}
    </div>
  );
}
