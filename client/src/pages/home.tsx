import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { TradingOpportunity } from "@shared/schema";

type Period = "1D" | "1W" | "1M" | "3M" | "1Y";

function ConfBar({ val }: { val: number }) {
  const color = val >= 75 ? "#22c55e" : val >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <div className="flex items-center gap-2 mt-1">
      <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(40,56,81,1)" }}>
        <div className="h-1.5 rounded-full conf-bar-fill" style={{ width: `${val}%` }} />
      </div>
      <span className="text-xs font-semibold" style={{ color }}>{val}%</span>
    </div>
  );
}

function SignalBadge({ type }: { type: string }) {
  const cls: Record<string, string> = {
    BREAKOUT: "badge-breakout", REVERSAL: "badge-reversal",
    MOMENTUM: "badge-momentum", MEAN_REVERSION: "badge-mean",
  };
  const label: Record<string, string> = { MEAN_REVERSION: "MEAN REV" };
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls[type] ?? "badge-breakout"}`}>{label[type] ?? type}</span>;
}

function MarketBadge({ market }: { market: string }) {
  const colors: Record<string, string> = {
    stocks: "#3b82f6", crypto: "#f59e0b", options: "#8b5cf6", forex: "#22c55e", commodities: "#ef4444",
  };
  const c = colors[market] ?? "#64748b";
  return (
    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
      style={{ background: `${c}22`, color: c, border: `1px solid ${c}44` }}>
      {market}
    </span>
  );
}

function buildChartData(snapshots: any[], balance: number) {
  if (!snapshots || snapshots.length < 2) {
    const now = Date.now();
    return Array.from({ length: 7 }, (_, i) => ({
      t: new Date(now - (6 - i) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      v: parseFloat((balance * (0.994 + Math.random() * 0.012)).toFixed(2)),
    }));
  }
  return snapshots.map((s: any) => ({
    t: new Date(s.snapshotAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    v: parseFloat(s.balance),
  }));
}

export default function HomePage() {
  const { user, token, updateBalance } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<Period>("1W");
  const periods: Period[] = ["1D", "1W", "1M", "3M", "1Y"];

  const balance = parseFloat(String(user?.paperBalance ?? 10000));
  const startBal = 10000;
  const todayPnL = parseFloat((balance - startBal).toFixed(2));
  const todayPnLPct = ((todayPnL / startBal) * 100).toFixed(2);

  const { data: snapshots } = useQuery<any[]>({
    queryKey: ["/api/portfolio/snapshots"],
    queryFn: () =>
      fetch("/api/portfolio/snapshots", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    enabled: !!token,
  });

  const { data: signals, isLoading: signalsLoading } = useQuery<TradingOpportunity[]>({
    queryKey: ["/api/ai-signals"],
    queryFn: () => fetch("/api/ai-signals").then((r) => r.json()),
    refetchInterval: 60000,
  });

  const { data: watchlistItems } = useQuery<any[]>({
    queryKey: ["/api/watchlist"],
    queryFn: () =>
      fetch("/api/watchlist", { headers: { Authorization: `Bearer ${token}` } }).then((r) => r.json()),
    enabled: !!token,
  });

  const tradeMutation = useMutation({
    mutationFn: async (opp: TradingOpportunity) => {
      const invested = 1.0;
      const units = parseFloat((invested / opp.entryPrice).toFixed(6));
      const res = await fetch("/api/trades/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          market: opp.market, ticker: opp.ticker, tickerName: opp.name,
          action: opp.action, entryPrice: opp.entryPrice, units, investedAmount: invested,
          potentialGain: opp.targetPrice,
        }),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      return res.json();
    },
    onSuccess: (data, opp) => {
      updateBalance(data.newBalance);
      const p = opp.entryPrice;
      const fmt = p < 1 ? p.toFixed(4) : p.toFixed(2);
      toast({ title: "⚡ Trade Executed", description: `Trade executed at $${fmt} (market price at time of order) · Balance: $${parseFloat(data.newBalance).toFixed(2)}` });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/snapshots"] });
    },
    onError: (e: any) => toast({ title: "Trade failed", description: e.message, variant: "destructive" }),
  });

  const chartData = buildChartData(snapshots ?? [], balance);
  const chartColor = balance >= startBal ? "#22c55e" : "#ef4444";

  return (
    <div className="page-container page-glow lg:pb-8 min-h-screen" style={{ background: "#0d1117" }}>
      <div className="px-4 lg:px-8 pt-6 max-w-none" style={{ position: "relative", zIndex: 1 }}>

        {/* Header */}
        <div className="flex items-center justify-between mb-5">
          <div>
            <div className="text-xs font-medium" style={{ color: "#64748b" }}>Good morning,</div>
            <div className="text-xl font-bold">{user?.name?.split(" ")[0]} 👋</div>
          </div>
          <button
            onClick={() => setLocation("/account")}
            className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white"
            style={{ background: "#3b82f6" }}>
            {user?.name?.[0]?.toUpperCase()}
          </button>
        </div>

        {/* Balance + Chart — full width */}
        <div className="rounded-2xl p-5 mb-4 glass-card">
          <div className="text-xs font-semibold mb-1 tracking-wider" style={{ color: "#64748b" }}>PAPER BALANCE</div>
          <div className="text-4xl font-black mb-1">
            ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold" style={{ color: todayPnL >= 0 ? "#22c55e" : "#ef4444" }}>
              {todayPnL >= 0 ? "+" : ""}${Math.abs(todayPnL).toFixed(2)} ({todayPnL >= 0 ? "+" : ""}{todayPnLPct}%)
            </span>
            <span className="text-xs" style={{ color: "#64748b" }}>all time</span>
          </div>
        </div>

        {/* Chart — full width */}
        <div className="rounded-2xl p-4 mb-6 glass-card">
          <div className="flex gap-1 mb-3 justify-end">
            {periods.map((p) => (
              <button key={p} onClick={() => setPeriod(p)}
                className="text-xs px-2.5 py-1 rounded-lg font-medium transition-all"
                style={{
                  background: period === p ? "#3b82f620" : "transparent",
                  color: period === p ? "#60a5fa" : "#64748b",
                }}>
                {p}
              </button>
            ))}
          </div>
          <ResponsiveContainer width="100%" height={160}>
            <LineChart data={chartData} margin={{ left: -24, right: 4 }}>
              <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
              <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false}
                tickFormatter={(v) => `$${(v / 1000).toFixed(0)}k`} />
              <Tooltip
                contentStyle={{ background: "#1a2332", border: "1px solid #243044", borderRadius: 8, fontSize: 12 }}
                formatter={(v: any) => [`$${parseFloat(v).toLocaleString()}`, "Balance"]}
              />
              <ReferenceLine y={startBal} stroke="#243044" strokeDasharray="4 4" />
              <Line type="monotone" dataKey="v" stroke={chartColor} strokeWidth={2} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Signals + Watchlist — side by side on desktop */}
        <div className="lg:flex lg:gap-6 mb-6">

          {/* AI Signals — 60% on desktop */}
          <div className="lg:flex-[3] mb-4 lg:mb-0">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-sm">🤖 Top AI Signals</div>
              <button onClick={() => setLocation("/ai-signal")} className="text-xs font-medium" style={{ color: "#3b82f6" }}>
                See all →
              </button>
            </div>
            {/* Mobile: horizontal scroll. Desktop: 2-col grid */}
            <div className="lg:hidden flex gap-3 overflow-x-auto pb-2 -mx-4 px-4" style={{ scrollbarWidth: "none" }}>
              {signalsLoading
                ? Array(4).fill(0).map((_, i) => (
                    <div key={i} className="skeleton rounded-2xl flex-shrink-0" style={{ width: 190, height: 150 }} />
                  ))
                : (signals ?? []).slice(0, 6).map((opp) => (
                    <SignalCard key={opp.id} opp={opp} onTrade={() => tradeMutation.mutate(opp)} trading={tradeMutation.isPending} />
                  ))}
            </div>
            <div className="hidden lg:grid lg:grid-cols-2 gap-3">
              {signalsLoading
                ? Array(4).fill(0).map((_, i) => (
                    <div key={i} className="skeleton rounded-2xl" style={{ height: 170 }} />
                  ))
                : (signals ?? []).slice(0, 6).map((opp) => (
                    <SignalCard key={opp.id} opp={opp} onTrade={() => tradeMutation.mutate(opp)} trading={tradeMutation.isPending} />
                  ))}
            </div>
          </div>

          {/* Watchlist — 40% on desktop */}
          <div className="lg:flex-[2]">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold text-sm">👀 Watchlist</div>
              <button onClick={() => setLocation("/markets")} className="text-xs font-medium" style={{ color: "#3b82f6" }}>
                + Add
              </button>
            </div>
            {!watchlistItems || watchlistItems.length === 0 ? (
              <div className="rounded-2xl p-5 text-center glass-card">
                <div className="text-2xl mb-1">👀</div>
                <div className="text-sm mb-2" style={{ color: "#64748b" }}>No tickers yet</div>
                <button onClick={() => setLocation("/markets")} className="text-xs font-semibold" style={{ color: "#3b82f6" }}>
                  Browse markets →
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {watchlistItems.map((item: any) => {
                  const ch = parseFloat((Math.random() * 4 - 1.5).toFixed(2));
                  return (
                    <div key={item.id} className="flex items-center justify-between rounded-xl px-4 py-3 glass-card">
                      <div>
                        <div className="font-bold text-sm">{item.ticker}</div>
                        <div className="text-xs capitalize" style={{ color: "#64748b" }}>{item.market}</div>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: ch >= 0 ? "#22c55e" : "#ef4444" }}>
                        {ch >= 0 ? "+" : ""}{ch}%
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Quick actions */}
        <div className="flex gap-3 mb-6">
          <button onClick={() => setLocation("/markets")}
            className="btn-execute flex-1 py-3 text-sm">
            ⚡ Quick Trade
          </button>
          <button onClick={() => setLocation("/account")}
            className="flex-1 py-3 rounded-2xl font-semibold text-sm glass-card">
            👤 Account
          </button>
        </div>
      </div>
    </div>
  );
}

function SignalCard({ opp, onTrade, trading }: { opp: TradingOpportunity; onTrade: () => void; trading: boolean }) {
  const colors: Record<string, string> = {
    stocks: "#3b82f6", crypto: "#f59e0b", options: "#8b5cf6", forex: "#22c55e", commodities: "#ef4444",
  };
  const mc = colors[opp.market] ?? "#64748b";
  const cc = opp.confidence >= 75 ? "#22c55e" : opp.confidence >= 60 ? "#f59e0b" : "#ef4444";
  const cls: Record<string, string> = { BREAKOUT: "badge-breakout", REVERSAL: "badge-reversal", MOMENTUM: "badge-momentum", MEAN_REVERSION: "badge-mean" };
  const lbl: Record<string, string> = { MEAN_REVERSION: "MEAN REV" };
  return (
    <div className="rounded-2xl p-4 trade-card glass-card">
      <div className="flex items-center gap-1.5 mb-2 flex-wrap">
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full uppercase"
          style={{ background: `${mc}22`, color: mc, border: `1px solid ${mc}44` }}>{opp.market}</span>
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls[opp.signalType] ?? "badge-breakout"}`}>
          {lbl[opp.signalType] ?? opp.signalType}
        </span>
      </div>
      <div className="text-lg font-black">{opp.ticker}</div>
      <div className="text-xs mb-2 truncate" style={{ color: "#64748b" }}>{opp.name}</div>
      <div className="flex items-center gap-2 mb-2">
        <div className="flex-1 h-1.5 rounded-full" style={{ background: "rgba(40,56,81,1)" }}>
          <div className="h-1.5 rounded-full conf-bar-fill" style={{ width: `${opp.confidence}%` }} />
        </div>
        <span className="text-xs font-semibold" style={{ color: cc }}>{opp.confidence}%</span>
      </div>
      <div className="text-xs leading-tight line-clamp-2 mb-3" style={{ color: "#94a3b8" }}>
        {opp.rationale.slice(0, 65)}…
      </div>
      <button onClick={onTrade} disabled={trading}
        className="w-full py-1.5 rounded-xl text-xs font-bold text-white"
        style={{ background: "#3b82f6" }}>
        Trade This ($1)
      </button>
    </div>
  );
}
