import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, ReferenceLine } from "recharts";
import type { TradingOpportunity } from "@shared/schema";

type Period = "1D" | "1W" | "1M" | "3M" | "1Y";

interface SnapshotPoint {
  snapshotAt: string;
  balance: string;
}

function buildChartData(snapshots: SnapshotPoint[], balance: number) {
  if (!snapshots || snapshots.length < 2) {
    // Not enough history yet — render a flat line at the current balance so
    // the chart is stable across renders instead of random noise.
    const now = Date.now();
    return Array.from({ length: 7 }, (_, i) => ({
      t: new Date(now - (6 - i) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      v: balance,
    }));
  }
  return snapshots.map(s => ({
    t: new Date(s.snapshotAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    v: parseFloat(s.balance),
  }));
}

export default function HomePage() {
  const { user, token, updateBalance } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [, setLocation] = useLocation();
  const [period, setPeriod] = useState<Period>("1W");
  const periods: Period[] = ["1D", "1W", "1M", "3M", "1Y"];

  const balance = parseFloat(user?.paperBalance ?? "0");
  
  // Dialog state for "Why this trade" modal details
  const [activeReasoning, setActiveReasoning] = useState<string | null>(null);

  // Queries
  const { data: snapshots } = useQuery<any[]>({
    queryKey: ["/api/portfolio/snapshots"],
    queryFn: () => fetch("/api/portfolio/snapshots", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
  });

  const { data: signals = [], isLoading: signalsLoading } = useQuery<TradingOpportunity[]>({
    queryKey: ["/api/ai-signals"],
    queryFn: () => fetch("/api/ai-signals").then(r => r.json()),
    refetchInterval: 60000,
  });

  const { data: watchlistItems = [] } = useQuery<any[]>({
    queryKey: ["/api/watchlist"],
    queryFn: () => fetch("/api/watchlist", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
  });

  const { data: trades = [] } = useQuery<any[]>({
    queryKey: ["/api/trades"],
    queryFn: () => fetch("/api/trades", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
  });

  const { data: learnProgress = [] } = useQuery<any[]>({
    queryKey: ["/api/learn/progress"],
    queryFn: () => fetch("/api/learn/progress", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
  });

  // Count metrics
  const openTradesCount = trades.filter((t: any) => t.status === "OPEN").length;
  const completedLessons = learnProgress.filter((p: any) => p.completed).length;

  // Watchlist Add mutation
  const addToWatchlistMutation = useMutation({
    mutationFn: async ({ ticker, market }: { ticker: string; market: string }) => {
      const res = await fetch(`/api/watchlist/${ticker}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ market }),
      });
      if (!res.ok) throw new Error("Failed to add to watchlist");
      return res.json();
    },
    onSuccess: (_, variables) => {
      toast({ title: `Added ${variables.ticker} to Watchlist`, description: "Track asset details on the markets center." });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  // Watchlist Delete mutation
  const removeFromWatchlistMutation = useMutation({
    mutationFn: async (ticker: string) => {
      const res = await fetch(`/api/watchlist/${ticker}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to delete item");
      return res.json();
    },
    onSuccess: (_, ticker) => {
      toast({ title: `Removed ${ticker} from Watchlist` });
      queryClient.invalidateQueries({ queryKey: ["/api/watchlist"] });
    },
  });

  const chartData = buildChartData(snapshots ?? [], balance);
  // Derive the true starting balance from the earliest snapshot (set at signup/onboarding).
  const startingBalance = snapshots?.length ? parseFloat(snapshots[0].balance) : balance;
  const practicePnL = balance - startingBalance;
  const chartColor = balance >= startingBalance ? "#22c55e" : "#ef4444";

  // Best/worst single-day balance change derived from snapshot history.
  const dayChanges = chartData.slice(1).map((p, i) => p.v - chartData[i].v);
  const bestDay = dayChanges.length ? Math.max(...dayChanges, 0) : 0;
  const worstDay = dayChanges.length ? Math.min(...dayChanges, 0) : 0;

  // Today's result = balance now vs the last snapshot taken before today.
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const priorSnapshots = (snapshots ?? []).filter(s => new Date(s.snapshotAt) < todayStart);
  const dayStartBalance = priorSnapshots.length
    ? parseFloat(priorSnapshots[priorSnapshots.length - 1].balance)
    : startingBalance;
  const todayResult = balance - dayStartBalance;
  const fmtSigned = (v: number) => `${v >= 0 ? "+" : "-"}$${Math.abs(v).toFixed(2)}`;

  // Starter watchlist item defaults
  const starters = [
    { ticker: "BTC", market: "crypto" },
    { ticker: "AAPL", market: "stocks" },
    { ticker: "EUR/USD", market: "forex" },
    { ticker: "GOLD", market: "commodities" },
  ];

  return (
    <div className="select-none text-left pb-16">
      <div className="max-w-none">

        {/* 1. Top Greeting */}
        <div className="page-header select-none flex justify-between items-center flex-wrap gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="page-title text-32px font-extrabold text-white">
                Good morning, {user?.name?.split(" ")[0] || "Obie"} 👋
              </h1>
              <span className="status-pill green">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse"></span>
                Practice Mode Active
              </span>
            </div>
            <p className="page-subtitle text-[15px] text-slate-400 mt-1">
              Practice Mode Active — No real money is being used.
            </p>
          </div>
          
          <Link href="/account" className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-md">
            {user?.name?.[0]?.toUpperCase() || "O"}
          </Link>
        </div>

        {/* Outer Rows Cards Layout Grid */}
        <div className="flex flex-col gap-6">

          {/* ────────────────── Row 1: Summary Cards ────────────────── */}
          <div className="home-summary-grid">
            
            {/* Practice Balance Card */}
            <div className="account-card flex flex-col justify-between min-height-[180px]">
              <div>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Practice Balance</span>
                <strong className="text-3xl font-mono font-black text-white mt-1 block">
                  ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                </strong>
                <p className="text-[10px] text-slate-400 font-bold mt-1.5">
                  You are practicing with virtual money.
                </p>
              </div>
              <div className="border-t border-slate-900/60 pt-2 mt-2 flex flex-col gap-1 text-[10px] font-bold text-slate-400 select-none">
                <div className="flex justify-between">
                  <span>Starting Balance:</span>
                  <span className="text-white">${startingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between">
                  <span>Today's Result:</span>
                  <span className={todayResult >= 0 ? "text-green-500" : "text-red-400"}>{fmtSigned(todayResult)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Open Trades:</span>
                  <span className="text-white">{openTradesCount}</span>
                </div>
                <Link href="/my-trades" className="mt-2.5 h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black transition-all flex items-center justify-center cursor-pointer">
                  View My Trades
                </Link>
              </div>
            </div>

            {/* Today's Result Card */}
            <div className="account-card flex flex-col justify-between min-height-[180px]">
              <div>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Today's Result</span>
                <strong className={`text-3xl font-mono font-black mt-1 block ${todayResult >= 0 ? "text-green-400" : "text-red-400"}`}>
                  {fmtSigned(todayResult)}
                </strong>
                <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-relaxed">
                  How much your practice account changed today.
                </p>
              </div>
              <div className="text-[9px] text-slate-500 font-bold text-left mt-4 border-t border-slate-900/60 pt-2 select-none">
                ℹ️ Returns reset daily at market close.
              </div>
            </div>

            {/* Open Trades Card */}
            <div className="account-card flex flex-col justify-between min-height-[180px]">
              <div>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Open Trades</span>
                <strong className="text-3xl font-mono font-black text-white mt-1 block">
                  {openTradesCount}
                </strong>
                <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-relaxed">
                  Trades currently active.
                </p>
              </div>
              <div className="mt-4 border-t border-slate-900/60 pt-2 flex flex-col gap-1 select-none">
                <Link href="/markets" className="h-8 rounded-lg border border-slate-700 hover:bg-slate-750 text-white text-[10px] font-black transition-all flex items-center justify-center cursor-pointer">
                  Place New Trade
                </Link>
              </div>
            </div>

            {/* Learning Progress Card */}
            <div className="account-card flex flex-col justify-between min-height-[180px]">
              <div>
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Learning Progress</span>
                <strong className="text-3xl font-mono font-black text-blue-400 mt-1 block">
                  {completedLessons} / 5 lessons
                </strong>
                <p className="text-[10px] text-slate-400 font-bold mt-1.5 leading-relaxed">
                  Complete lessons before live trading.
                </p>
              </div>
              <div className="mt-4 border-t border-slate-900/60 pt-2 select-none">
                <Link href="/learn" className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black transition-all flex items-center justify-center cursor-pointer">
                  Start Lesson
                </Link>
              </div>
            </div>

          </div>

          {/* ────────────────── Row 2: Performance Chart ────────────────── */}
          <div className="account-card select-none">
            <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
              <div className="text-left">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                    <i className="fas fa-chart-line text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black text-white">Practice Account Performance</span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold mt-1">
                  This chart shows how your practice balance changes over time.
                </p>
              </div>

              {/* Time Periods */}
              <div className="flex gap-1 bg-slate-950/60 border border-slate-900 p-1 rounded-xl">
                {periods.map((p) => (
                  <button 
                    key={p} 
                    onClick={() => setPeriod(p)}
                    className={`text-[10px] px-3 py-1 rounded-lg font-black transition-all cursor-pointer ${
                      period === p 
                        ? "bg-[#2563eb] text-white shadow-sm" 
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {/* Subtitle helper description */}
            <div className="text-xs text-slate-400 font-semibold text-left mb-4 bg-slate-950/45 p-3 rounded-xl border border-slate-900">
              📊 Your practice account started at <strong className="text-white">${startingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong> and is now <strong className={practicePnL >= 0 ? "text-green-500" : "text-red-400"}>${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</strong>.
            </div>

            {/* Inner Grid layout: Chart on left, statistics on right */}
            <div className="home-chart-container text-left items-center mt-3">
              <div className="w-full">
                <ResponsiveContainer width="100%" height={165}>
                  <LineChart data={chartData} margin={{ left: -24, right: 4 }}>
                    <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" />
                    <YAxis domain={["auto", "auto"]} tick={{ fontSize: 10, fill: "#64748b" }} axisLine={false} tickLine={false}
                      tickFormatter={(v) => `$${(v / 1000).toFixed(1)}k`} />
                    <Tooltip
                      contentStyle={{ background: "#1a2332", border: "1px solid var(--color-border)", borderRadius: 8, fontSize: 12 }}
                      formatter={(v: any) => [`$${parseFloat(v).toLocaleString()}`, "Balance"]}
                    />
                    <ReferenceLine y={startingBalance} stroke="#3b82f6" strokeDasharray="3 3" />
                    <Line type="monotone" dataKey="v" stroke={chartColor} strokeWidth={2.5} dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>

              {/* Right Side Stats Panel */}
              <div className="flex flex-col gap-2.5 bg-slate-950/30 border border-slate-900/80 p-4 rounded-xl text-xs font-bold text-slate-300">
                <div className="flex justify-between pb-1.5 border-b border-slate-900/60">
                  <span className="text-slate-500">Current Balance:</span>
                  <span className="text-white font-mono font-black">${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-900/60">
                  <span className="text-slate-500">Total Change:</span>
                  <strong className={`font-mono ${practicePnL >= 0 ? "text-green-500" : "text-red-400"}`}>
                    {practicePnL >= 0 ? "+" : ""}${practicePnL.toFixed(2)}
                  </strong>
                </div>
                <div className="flex justify-between pb-1.5 border-b border-slate-900/60">
                  <span className="text-slate-500">Best Day:</span>
                  <span className="text-green-500 font-mono">+${bestDay.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Worst Day:</span>
                  <span className="text-red-400 font-mono">{worstDay < 0 ? "-" : ""}${Math.abs(worstDay).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          {/* ────────────────── Row 3: Recommended Next Step ────────────────── */}
          <div className="account-card select-none text-left">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 animate-pulse">
                    <i className="fas fa-graduation-cap text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black text-white">Recommended Next Step</span>
                </div>
                <p className="text-xs text-slate-300 font-bold leading-normal">
                  Review your best practice trade before placing another one.
                </p>
              </div>

              <div className="flex gap-3 w-full md:w-auto shrink-0 select-none">
                <Link href="/markets" className="flex-1 md:flex-none h-11 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  <i className="fas fa-chart-line"></i>
                  Choose a Trade
                </Link>
                <Link href="/learn" className="flex-1 md:flex-none h-11 px-5 rounded-xl border border-slate-700 hover:bg-slate-700/10 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer">
                  <i className="fas fa-book-open"></i>
                  Go to Learning Center
                </Link>
              </div>
            </div>
          </div>

          {/* ────────────────── Row 4: Best Match and Watchlist ────────────────── */}
          <div className="home-bottom-grid">
            
            {/* Best Match for You */}
            <div className="account-card flex flex-col justify-between text-left">
              <div>
                <div className="flex items-center justify-between mb-4 select-none">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-amber-500">
                      <i className="fas fa-star text-xs animate-bounce"></i>
                    </div>
                    <span className="text-[15px] font-black text-white">Best Match for You</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[9px] font-black uppercase bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/30">
                    Highest Score
                  </span>
                </div>

                <div className="flex items-start gap-4 mb-4 select-none">
                  <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-850 flex items-center justify-center text-amber-500 text-lg">
                    <i className="fab fa-btc"></i>
                  </div>
                  <div>
                    <h3 className="text-base font-black text-white">BTC — Bitcoin</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-0.5">
                      The app thinks Bitcoin may go up soon.
                    </p>
                  </div>
                </div>

                {/* Return calculations */}
                <div className="grid grid-cols-2 gap-3 bg-slate-950/45 p-3.5 rounded-xl border border-slate-900 text-xs font-bold text-slate-300 mb-4 select-none">
                  <div className="flex flex-col gap-1 border-r border-slate-900/80 pr-3">
                    <span className="text-[10px] text-slate-500 uppercase">Your investment:</span>
                    <strong className="text-white font-mono">$1.00</strong>
                  </div>
                  <div className="flex flex-col gap-1 pl-1">
                    <span className="text-[10px] text-slate-500 uppercase">If it wins:</span>
                    <strong className="text-green-500 font-mono">+$0.28</strong>
                  </div>
                  <div className="flex flex-col gap-1 border-r border-slate-900/80 pr-3 border-t border-slate-900/60 pt-2.5 mt-0.5">
                    <span className="text-[10px] text-slate-500 uppercase">If it loses:</span>
                    <strong className="text-red-400 font-mono">-$0.23</strong>
                  </div>
                  <div className="flex flex-col gap-1 pl-1 border-t border-slate-900/60 pt-2.5 mt-0.5">
                    <span className="text-[10px] text-slate-500 uppercase">Trade Score:</span>
                    <strong className="text-blue-400 font-mono">84 / 100</strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-2 select-none">
                <Link href="/markets" className="full-blue-button text-xs font-black w-full flex items-center justify-center gap-1.5 cursor-pointer h-10">
                  <i className="fas fa-magnifying-glass-chart"></i>
                  Review Best Trade
                </Link>
              </div>
            </div>

            {/* Watchlist */}
            <div className="account-card flex flex-col justify-between text-left">
              <div>
                <div className="flex items-center justify-between mb-3 select-none">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                      <i className="fas fa-eye text-xs"></i>
                    </div>
                    <span className="text-[15px] font-black text-white">Watchlist</span>
                  </div>
                  <Link href="/markets" className="text-[10px] text-blue-400 hover:text-blue-300 font-black cursor-pointer">
                    + Add
                  </Link>
                </div>

                {watchlistItems.length === 0 ? (
                  <div className="rounded-xl p-4 text-center bg-slate-950/20 border border-slate-900/80 mb-4 select-none">
                    <div className="text-xl mb-1 opacity-75">👀</div>
                    <strong className="block text-xs text-white">No saved trades yet.</strong>
                    <p className="text-[10px] text-slate-500 font-bold mt-1.5 leading-normal max-w-[280px] mx-auto">
                      Save trades you want to follow here. Your watchlist helps you track ideas before practicing them.
                    </p>
                    <button 
                      onClick={() => setLocation("/markets")}
                      className="mt-3 text-[10px] text-blue-400 hover:text-blue-300 font-black cursor-pointer bg-blue-500/10 border border-blue-500/20 px-3 py-1 rounded"
                    >
                      Browse Markets
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col gap-2 mb-4 max-h-[160px] overflow-y-auto pr-1">
                    {watchlistItems.map((item: any) => {
                      const change = parseFloat((Math.random() * 3.5 - 1.2).toFixed(2));
                      return (
                        <div key={item.id} className="flex items-center justify-between rounded-xl px-3.5 py-2.5 bg-slate-950/45 border border-slate-900/85">
                          <div className="text-left">
                            <strong className="block text-xs text-white">{item.ticker}</strong>
                            <span className="block text-[9px] text-slate-500 uppercase font-black tracking-wider mt-0.5">{item.market}</span>
                          </div>
                          
                          <div className="flex items-center gap-3">
                            <span className={`text-xs font-mono font-black ${change >= 0 ? "text-green-500" : "text-red-400"}`}>
                              {change >= 0 ? "+" : ""}{change}%
                            </span>
                            <button
                              onClick={() => removeFromWatchlistMutation.mutate(item.ticker)}
                              className="text-slate-600 hover:text-red-400 text-xs cursor-pointer p-1"
                              title="Remove"
                            >
                              <i className="fas fa-trash-can"></i>
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Starter suggested items list */}
              <div className="border-t border-slate-900/60 pt-3 select-none text-left">
                <span className="text-[9px] text-slate-500 font-black uppercase tracking-wider block mb-2">Suggested Starter Items:</span>
                <div className="flex flex-wrap gap-1.5">
                  {starters.map(st => {
                    const alreadyAdded = watchlistItems.some((w: any) => w.ticker === st.ticker);
                    return (
                      <button
                        key={st.ticker}
                        disabled={alreadyAdded || addToWatchlistMutation.isPending}
                        onClick={() => addToWatchlistMutation.mutate({ ticker: st.ticker, market: st.market })}
                        className={`px-2 py-1 rounded text-[9px] font-black uppercase border transition-all flex items-center gap-1 ${
                          alreadyAdded 
                            ? "bg-slate-950 border-slate-900 text-slate-500 cursor-not-allowed" 
                            : "bg-[#101d31]/80 hover:bg-slate-800 border-slate-800 text-slate-300 cursor-pointer"
                        }`}
                      >
                        {st.ticker}
                        {!alreadyAdded && <i className="fas fa-plus text-[8px] text-blue-400"></i>}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

          </div>

          {/* ────────────────── Row 5: Top Trade Ideas Grid ────────────────── */}
          <div>
            <div className="flex justify-between items-center mb-3 select-none pl-1">
              <div className="text-left">
                <div className="flex items-center gap-2.5">
                  <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                    <i className="fas fa-lightbulb text-xs"></i>
                  </div>
                  <span className="text-[17px] font-black text-white">Top Trade Ideas</span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold mt-1">
                  These are practice trade ideas ranked by the app. Review before trading.
                </p>
              </div>
              
              <Link href="/markets" className="text-[11px] text-blue-400 hover:text-blue-300 font-black cursor-pointer">
                See all →
              </Link>
            </div>

            {/* Desktop: 2 columns, Mobile: horizontal scroll */}
            <div className="grid md:grid-cols-2 gap-4 mt-3 select-none">
              {signalsLoading ? (
                Array(4).fill(0).map((_, i) => (
                  <div key={i} className="skeleton rounded-2xl" style={{ height: 190 }} />
                ))
              ) : (
                signals.slice(0, 6).map((opp) => {
                  const colors: Record<string, string> = {
                    stocks: "#3b82f6", crypto: "#f59e0b", options: "#8b5cf6", forex: "#22c55e", commodities: "#ef4444",
                  };
                  const marketColor = colors[opp.market] ?? "#64748b";
                  const signalTypeClass: Record<string, string> = {
                    BREAKOUT: "badge-breakout",
                    REVERSAL: "badge-reversal",
                    MOMENTUM: "badge-momentum",
                    MEAN_REVERSION: "badge-mean"
                  };
                  const signalTypeLabel: Record<string, string> = {
                    MEAN_REVERSION: "MEAN REV"
                  };

                  // Possible Returns Mock computations based on entry vs target
                  const profitAmt = (opp.targetPrice - opp.entryPrice) / opp.entryPrice;
                  const mockProfit = (1.0 * (1 + (profitAmt > 0 ? profitAmt : 0.28))).toFixed(2);
                  const mockLoss = (1.0 * 0.23).toFixed(2);

                  // Risk Level based on confidence
                  const riskLevel = opp.confidence >= 75 ? "Low" : opp.confidence >= 65 ? "Medium" : "High";

                  return (
                    <div 
                      key={opp.id} 
                      className="account-card flex flex-col justify-between text-left border border-slate-800/85 hover:border-blue-500/35"
                    >
                      <div>
                        {/* Tags list */}
                        <div className="flex items-center gap-1.5 mb-2.5 flex-wrap">
                          <span 
                            className="text-[9px] font-black px-2 py-0.5 rounded uppercase border"
                            style={{ background: `${marketColor}15`, color: marketColor, borderColor: `${marketColor}25` }}
                          >
                            {opp.market}
                          </span>
                          <span className={`text-[9px] font-black px-2 py-0.5 rounded uppercase ${signalTypeClass[opp.signalType] ?? "badge-breakout"}`}>
                            {signalTypeLabel[opp.signalType] ?? opp.signalType}
                          </span>
                          
                          <span className={`ml-auto text-[9px] font-black px-2 py-0.5 rounded uppercase ${
                            opp.action === "BUY" ? "bg-green-500/10 text-green-400 border border-green-500/20" : "bg-red-500/10 text-red-400 border border-red-500/20"
                          }`}>
                            {opp.action}
                          </span>
                        </div>

                        {/* Title details */}
                        <div className="flex justify-between items-baseline mb-2">
                          <div>
                            <strong className="text-base font-black text-white">{opp.ticker}</strong>
                            <span className="block text-[10px] text-slate-500 font-bold mt-0.5 leading-tight truncate max-w-[190px]">
                              {opp.name}
                            </span>
                          </div>
                          
                          {/* Score details */}
                          <div className="text-right">
                            <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block">Trade Score</span>
                            <strong className="text-sm font-black text-blue-400 font-mono mt-0.5 block">{opp.confidence} / 100</strong>
                          </div>
                        </div>

                        {/* Return parameters list */}
                        <div className="grid grid-cols-3 gap-2 bg-slate-950/40 p-2.5 rounded-lg border border-slate-900 text-[10px] font-bold text-slate-400 mb-3">
                          <div className="flex flex-col gap-0.5">
                            <span>Risk:</span>
                            <strong className={`font-mono ${riskLevel === "Low" ? "text-green-500" : riskLevel === "Medium" ? "text-amber-500" : "text-red-400"}`}>
                              {riskLevel}
                            </strong>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span>Possible Profit:</span>
                            <strong className="text-green-500 font-mono">+${mockProfit}</strong>
                          </div>
                          <div className="flex flex-col gap-0.5">
                            <span>Possible Loss:</span>
                            <strong className="text-red-400 font-mono">-${mockLoss}</strong>
                          </div>
                        </div>

                        <div className="text-[11px] text-slate-300 font-semibold leading-relaxed line-clamp-2 pl-1 mb-4">
                          💡 <strong className="text-slate-400">Why this trade:</strong> {opp.rationale}
                        </div>
                      </div>

                      <div className="flex items-center gap-3 select-none">
                        <button
                          onClick={() => setLocation("/markets")}
                          className="flex-1 h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black transition-all cursor-pointer flex items-center justify-center"
                        >
                          Review Trade
                        </button>
                        <button
                          onClick={() => setActiveReasoning(opp.rationale)}
                          className="text-[10px] text-blue-400 hover:text-blue-300 font-black cursor-pointer py-1"
                        >
                          Why this trade?
                        </button>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ────────────────── Quick Actions Footer ────────────────── */}
          <div>
            <div className="flex items-center gap-2.5 mb-2 select-none pl-1">
              <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                <i className="fas fa-bolt text-xs"></i>
              </div>
              <span className="text-[17px] font-black text-white">Quick Actions</span>
            </div>

            <div className="quick-actions-grid select-none">
              <Link href="/markets" className="account-card p-4 rounded-xl flex items-center gap-4 hover:border-blue-500/40 transition-all cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-blue-600/10 border border-blue-600/20 flex items-center justify-center text-blue-400">
                  <i className="fas fa-chart-line text-xs"></i>
                </div>
                <div className="text-left">
                  <strong className="block text-xs text-white">Choose a Trade</strong>
                  <span className="text-[9px] text-slate-500 font-bold mt-0.5">Browse available markets</span>
                </div>
              </Link>

              <Link href="/my-trades" className="account-card p-4 rounded-xl flex items-center gap-4 hover:border-blue-500/40 transition-all cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-green-500/10 border border-green-500/20 flex items-center justify-center text-green-400">
                  <i className="fas fa-briefcase text-xs"></i>
                </div>
                <div className="text-left">
                  <strong className="block text-xs text-white">View My Trades</strong>
                  <span className="text-[9px] text-slate-500 font-bold mt-0.5">Track your open positions</span>
                </div>
              </Link>

              <Link href="/learn" className="account-card p-4 rounded-xl flex items-center gap-4 hover:border-blue-500/40 transition-all cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                  <i className="fas fa-graduation-cap text-xs"></i>
                </div>
                <div className="text-left">
                  <strong className="block text-xs text-white">Learning Center</strong>
                  <span className="text-[9px] text-slate-500 font-bold mt-0.5">Browse Academy lessons</span>
                </div>
              </Link>

              <Link href="/connect-broker" className="account-card p-4 rounded-xl flex items-center gap-4 hover:border-blue-500/40 transition-all cursor-pointer">
                <div className="w-9 h-9 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500">
                  <i className="fas fa-link text-xs"></i>
                </div>
                <div className="text-left">
                  <strong className="block text-xs text-white">Connect Broker</strong>
                  <span className="text-[9px] text-slate-500 font-bold mt-0.5">Unlock live real trading</span>
                </div>
              </Link>
            </div>
          </div>

        </div>

      </div>

      {/* ─── Why This Trade reasoning modal popup ─── */}
      {activeReasoning && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4 animate-fade-in" style={{ background: "rgba(0,0,0,0.85)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 border bg-[#0b1624] border-blue-500/40 text-left relative">
            <button
              onClick={() => setActiveReasoning(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white text-sm outline-none cursor-pointer"
            >
              <i className="fas fa-times"></i>
            </button>
            <div className="text-sm font-black text-blue-400 mb-3 uppercase tracking-wider flex items-center gap-2">
              <i className="fas fa-circle-question"></i>
              Why this trade?
            </div>
            <p className="text-xs mb-5 text-slate-300 font-semibold leading-relaxed pl-1">
              {activeReasoning}
            </p>
            <div className="flex gap-3 justify-end select-none">
              <button
                onClick={() => setActiveReasoning(null)}
                className="h-10 px-5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all cursor-pointer"
              >
                Close Preview
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
