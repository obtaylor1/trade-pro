import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { apiJson } from "@/lib/queryClient";
import { useLivePrices } from "@/hooks/useLivePrices";
import type { LearnProgress, Trade, TradingOpportunity } from "@shared/schema";

interface WatchlistItem { id: string; ticker: string; market: string }
interface SnapshotPoint { snapshotAt: string; balance: string }
type Period = "1D" | "1W" | "1M" | "3M" | "1Y";

function chartPoints(snapshots: SnapshotPoint[], balance: number) {
  if (snapshots.length > 1) return snapshots.map(s => ({ t: new Date(s.snapshotAt).toLocaleDateString("en-US", { month: "short", day: "numeric" }), v: Number(s.balance) }));
  const now = Date.now();
  return Array.from({ length: 7 }, (_, i) => ({ t: new Date(now - (6 - i) * 86400000).toLocaleDateString("en-US", { month: "short", day: "numeric" }), v: balance }));
}

export default function HomeCommandCenterPage() {
  const { user, token } = useAuth();
  const { toast } = useToast();
  const client = useQueryClient();
  const [, navigate] = useLocation();
  const { marketOpen } = useLivePrices();
  const [period, setPeriod] = useState<Period>("1W");
  const [reason, setReason] = useState<string | null>(null);
  const [queue, setQueue] = useState<string[]>([]);
  const periods: Period[] = ["1D", "1W", "1M", "3M", "1Y"];
  const balance = Number(user?.paperBalance || 0);

  const { data: snapshots = [] } = useQuery<SnapshotPoint[]>({ queryKey: ["/api/portfolio/snapshots"], queryFn: () => apiJson("/api/portfolio/snapshots"), enabled: !!token });
  const { data: signals = [], isLoading } = useQuery<TradingOpportunity[]>({ queryKey: ["/api/ai-signals"], queryFn: () => apiJson("/api/ai-signals"), refetchInterval: 60_000 });
  const { data: watchlist = [] } = useQuery<WatchlistItem[]>({ queryKey: ["/api/watchlist"], queryFn: () => apiJson("/api/watchlist"), enabled: !!token });
  const { data: trades = [] } = useQuery<Trade[]>({ queryKey: ["/api/trades"], queryFn: () => apiJson("/api/trades"), enabled: !!token });
  const { data: learning = [] } = useQuery<LearnProgress[]>({ queryKey: ["/api/learn/progress"], queryFn: () => apiJson("/api/learn/progress"), enabled: !!token });

  const addWatch = useMutation({
    mutationFn: async ({ ticker, market }: { ticker: string; market: string }) => {
      const response = await fetch(`/api/watchlist/${encodeURIComponent(ticker)}`, { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ market }) });
      if (!response.ok) throw new Error("Could not save this item");
      return response.json();
    },
    onSuccess: (_, item) => { toast({ title: `${item.ticker} added to your watchlist` }); client.invalidateQueries({ queryKey: ["/api/watchlist"] }); },
    onError: (error: Error) => toast({ title: "Watchlist not updated", description: error.message, variant: "destructive" }),
  });

  const removeWatch = useMutation({
    mutationFn: async (ticker: string) => {
      const response = await fetch(`/api/watchlist/${encodeURIComponent(ticker)}`, { method: "DELETE", headers: { Authorization: `Bearer ${token}` } });
      if (!response.ok) throw new Error("Could not remove this item");
    },
    onSuccess: () => client.invalidateQueries({ queryKey: ["/api/watchlist"] }),
  });

  const openTrades = trades.filter(t => t.status === "OPEN").length;
  const lessonsDone = learning.filter(l => l.completed).length;
  const points = chartPoints(snapshots, balance);
  const startBalance = snapshots.length ? Number(snapshots[0].balance) : balance;
  const totalChange = balance - startBalance;
  const changes = points.slice(1).map((point, index) => point.v - points[index].v);
  const bestDay = changes.length ? Math.max(0, ...changes) : 0;
  const worstDay = changes.length ? Math.min(0, ...changes) : 0;
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const prior = snapshots.filter(s => new Date(s.snapshotAt) < today);
  const todayResult = balance - (prior.length ? Number(prior[prior.length - 1].balance) : startBalance);
  const signed = (value: number) => `${value >= 0 ? "+" : "-"}$${Math.abs(value).toFixed(2)}`;
  const bestMatch = [...signals].sort((a, b) => b.confidence - a.confidence)[0];
  const starters = [{ ticker: "BTC", market: "crypto" }, { ticker: "AAPL", market: "stocks" }, { ticker: "EUR/USD", market: "forex" }, { ticker: "GOLD", market: "commodities" }];
  const panel = "rounded-2xl border border-cyan-400/20 bg-[#071426]/90 shadow-[inset_0_1px_0_rgba(255,255,255,.03),0_16px_40px_rgba(0,0,0,.22)]";
  const time = new Date().toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", timeZoneName: "short" });

  const addQueue = (ticker: string) => {
    setQueue(items => items.includes(ticker) ? items.filter(item => item !== ticker) : [...items, ticker]);
    toast({ title: queue.includes(ticker) ? `${ticker} removed from Auto Queue` : `${ticker} added to Auto Queue`, description: "Your practice queue is ready on Choose a Trade." });
  };

  return <div className="min-h-screen bg-[#030914] pb-12 text-slate-100 [background-image:radial-gradient(circle_at_30%_5%,rgba(0,174,255,.09),transparent_25%),linear-gradient(rgba(34,110,180,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(34,110,180,.035)_1px,transparent_1px)] [background-size:auto,32px_32px,32px_32px]">
    <div className="mx-auto max-w-[1540px] px-3 pt-5 sm:px-5 lg:px-7">
      <header className="mb-4 flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
        <div><div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-black tracking-tight text-white">Good morning, {user?.name?.split(" ")[0] || "Obie"} 👋</h1><span className="rounded-full border border-emerald-400/50 bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />Practice Mode Active</span></div><p className="mt-1 text-sm text-slate-400">Practice Mode Active — No real money is being used.</p></div>
        <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-wider"><span className={`rounded-full border px-3 py-1.5 ${marketOpen ? "border-emerald-400/30 bg-emerald-400/5 text-emerald-300" : "border-slate-600 text-slate-400"}`}>{marketOpen ? "US markets open" : "US markets closed"}</span><span className="text-slate-500">{time}</span><span className="rounded-full border border-blue-400/30 bg-blue-400/5 px-3 py-1.5 text-blue-300">Sandbox</span></div>
      </header>

      <section className={`${panel} command-scan relative mb-4 overflow-hidden border-blue-400/35 p-4 sm:p-5`}>
        <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
        <div className="grid items-center gap-5 lg:grid-cols-[220px_1fr] 2xl:grid-cols-[255px_1fr_300px]">
          <div className="relative mx-auto h-40 w-60"><div className="absolute inset-x-6 bottom-2 h-8 rounded-[50%] bg-cyan-400/15 blur-xl" /><img src="/trade-icons/ai-autopilot.png" alt="AI Auto Pilot assistant" className="relative h-full w-full object-contain drop-shadow-[0_0_22px_rgba(34,211,238,.45)]" /></div>
          <div><p className="text-[10px] font-black uppercase tracking-[.28em] text-cyan-300">Your safe practice co-pilot</p><h2 className="mt-1 text-2xl font-black uppercase tracking-[.06em] text-white sm:text-3xl">AI Auto Pilot Command Center</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">Your intelligent co-pilot is ready to help you practice, learn, and build confidence — safely.</p><div className="mt-4 grid grid-cols-2 gap-2 xl:grid-cols-4 2xl:grid-cols-2"><HeroStatus icon="fa-circle-check" label="Practice mode" value="Active" color="emerald" /><HeroStatus icon="fa-shield-halved" label="Auto-close" value="Ready" color="cyan" /><HeroStatus icon="fa-book-open" label="Learning path" value={`${lessonsDone} / 5`} color="violet" /><HeroStatus icon="fa-lock" label="Live trading" value="Locked" color="rose" /></div></div>
          <div className="grid gap-3 lg:col-span-2 lg:grid-cols-2 2xl:col-span-1 2xl:grid-cols-1"><Link href="/markets" className="flex min-h-14 items-center justify-center rounded-xl border border-blue-200 bg-blue-600 px-5 text-xs font-black uppercase tracking-[.12em] text-white shadow-[0_0_28px_rgba(37,99,235,.48)] hover:bg-blue-500"><i className="fas fa-play mr-3" />Start Auto Practice</Link><Link href="/markets" className="flex min-h-12 items-center justify-center rounded-xl border border-fuchsia-400/45 bg-fuchsia-500/10 px-5 text-xs font-black uppercase tracking-[.12em] text-fuchsia-100 hover:bg-fuchsia-500/20"><i className="fas fa-arrow-up-right-from-square mr-3" />Choose a Trade</Link></div>
        </div>
      </section>

      <section className="mb-4 grid gap-3 sm:grid-cols-2 2xl:grid-cols-4">
        <SummaryCard panel={panel} icon="fa-dollar-sign" tone="violet" label="Practice balance" value={`$${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} help="You are practicing with virtual money." action="View My Trades" href="/my-trades"><MiniRow label="Starting balance" value={`$${startBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} /><MiniRow label="Today’s result" value={signed(todayResult)} tone={todayResult >= 0 ? "text-emerald-300" : "text-rose-300"} /><MiniRow label="Open trades" value={String(openTrades)} /></SummaryCard>
        <SummaryCard panel={panel} icon="fa-chart-column" tone="emerald" label="Today’s result" value={signed(todayResult)} valueTone={todayResult >= 0 ? "text-emerald-300" : "text-rose-300"} help="How much your practice account changed today."><p className="mt-auto border-t border-slate-800 pt-3 text-[10px] text-slate-500"><i className="fas fa-circle-info mr-2" />Returns reset daily at market close.</p></SummaryCard>
        <SummaryCard panel={panel} icon="fa-bullseye" tone="cyan" label="Open trades" value={String(openTrades)} help="Trades currently active." action="Place New Trade" href="/markets" />
        <SummaryCard panel={panel} icon="fa-graduation-cap" tone="violet" label="Learning progress" value={`${lessonsDone} / 5 lessons`} valueTone="text-blue-300" help="Complete lessons before live trading." action="Start Lesson" href="/learn" />
      </section>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.55fr_1fr]">
        <section className={`${panel} p-4`}>
          <div className="flex flex-wrap items-start justify-between gap-3"><div><h2 className="text-sm font-black uppercase tracking-[.14em] text-white"><i className="fas fa-chart-line mr-2 text-violet-300" />Practice Performance Monitor</h2><p className="mt-1 text-xs text-slate-400">This chart shows how your practice balance changes over time.</p></div><div className="flex rounded-lg border border-slate-800 bg-slate-950/60 p-1">{periods.map(p => <button key={p} type="button" aria-pressed={period === p} onClick={() => setPeriod(p)} className={`rounded-md px-3 py-1 text-[9px] font-black ${period === p ? "bg-blue-600 text-white" : "text-slate-500 hover:text-white"}`}>{p}</button>)}</div></div>
          <p className="mt-3 rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2 text-[11px] text-slate-400">📊 Your practice account started at <strong className="text-white">${startBalance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong> and is now <strong className={totalChange >= 0 ? "text-emerald-300" : "text-rose-300"}>${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}</strong>.</p>
          <div className="mt-3 grid items-center gap-3 lg:grid-cols-[1fr_250px]"><div className="h-[190px]"><ResponsiveContainer width="100%" height="100%"><LineChart data={points} margin={{ left: -20, right: 8, top: 8 }}><XAxis dataKey="t" tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} interval="preserveStartEnd" /><YAxis domain={["auto", "auto"]} tick={{ fontSize: 9, fill: "#64748b" }} axisLine={false} tickLine={false} tickFormatter={value => `$${(value / 1000).toFixed(1)}k`} /><Tooltip contentStyle={{ background: "#071426", border: "1px solid #1e3a5f", borderRadius: 10, fontSize: 11 }} formatter={(value: number) => [`$${value.toLocaleString()}`, "Balance"]} /><ReferenceLine y={startBalance} stroke="#3b82f6" strokeDasharray="3 3" /><Line type="monotone" dataKey="v" stroke={totalChange >= 0 ? "#22c55e" : "#ef4444"} strokeWidth={3} dot={{ r: 3, fill: totalChange >= 0 ? "#22c55e" : "#ef4444", strokeWidth: 0 }} /></LineChart></ResponsiveContainer></div><div className="rounded-xl border border-blue-400/20 bg-slate-950/55 p-3"><MiniRow label="Current balance" value={`$${balance.toLocaleString(undefined, { minimumFractionDigits: 2 })}`} /><MiniRow label="Total change" value={signed(totalChange)} tone={totalChange >= 0 ? "text-emerald-300" : "text-rose-300"} /><MiniRow label="Best day" value={signed(bestDay)} tone="text-emerald-300" /><MiniRow label="Worst day" value={signed(worstDay)} tone="text-rose-300" /></div></div>
        </section>

        <section className={`${panel} relative overflow-hidden border-fuchsia-400/35 p-5`}><div className="pointer-events-none absolute -right-8 top-4 h-40 w-40 rounded-full border border-fuchsia-400/20 shadow-[0_0_40px_rgba(168,85,247,.18)]" /><div className="relative"><div className="flex items-center gap-3"><div className="flex h-11 w-11 items-center justify-center rounded-xl border border-fuchsia-400/35 bg-fuchsia-500/10 text-fuchsia-300"><i className="fas fa-bullseye text-lg" /></div><h2 className="text-sm font-black uppercase tracking-[.14em] text-white">Recommended Mission</h2></div><p className="mt-5 max-w-md text-sm leading-6 text-slate-300">Review your best practice trade before placing another one.</p><div className="mt-6 grid gap-2"><Link href="/markets" className="flex min-h-11 items-center justify-center rounded-lg bg-fuchsia-600 text-xs font-black uppercase tracking-wider text-white shadow-[0_0_20px_rgba(168,85,247,.28)] hover:bg-fuchsia-500">Launch Choose a Trade <i className="fas fa-arrow-right ml-2" /></Link><Link href="/learn" className="flex min-h-10 items-center justify-center rounded-lg border border-fuchsia-400/35 text-xs font-black uppercase tracking-wider text-fuchsia-200 hover:bg-fuchsia-500/10">Go to Learning Center</Link></div></div></section>
      </div>

      <div className="mb-4 grid gap-4 xl:grid-cols-[1.05fr_1fr]">
        <BestMatch panel={panel} trade={bestMatch} queued={bestMatch ? queue.includes(bestMatch.ticker) : false} onQueue={addQueue} />
        <section className={`${panel} p-4`}><div className="flex items-center justify-between"><h2 className="text-sm font-black uppercase tracking-[.14em] text-white"><i className="fas fa-binoculars mr-2 text-cyan-300" />Watchlist</h2><Link href="/markets" className="rounded-lg border border-blue-400/25 px-3 py-1 text-[9px] font-black uppercase text-blue-300">+ Add</Link></div>{watchlist.length === 0 ? <div className="py-8 text-center"><i className="fas fa-eye text-2xl text-slate-600" /><h3 className="mt-3 text-sm font-black text-white">No saved trades yet.</h3><p className="mx-auto mt-2 max-w-md text-xs leading-5 text-slate-500">Save trades you want to follow here. Your watchlist helps you track ideas before practicing them.</p><button type="button" onClick={() => navigate("/markets")} className="mt-4 rounded-lg border border-blue-400/30 bg-blue-500/10 px-4 py-2 text-[10px] font-black uppercase text-blue-200">Browse Markets</button></div> : <div className="my-4 grid gap-2 sm:grid-cols-2">{watchlist.slice(0, 4).map(item => <div key={item.id} className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2"><div><strong className="text-xs text-white">{item.ticker}</strong><span className="ml-2 text-[8px] font-black uppercase text-slate-500">{item.market}</span></div><button type="button" aria-label={`Remove ${item.ticker} from watchlist`} onClick={() => removeWatch.mutate(item.ticker)} className="text-slate-600 hover:text-rose-300"><i className="fas fa-xmark" /></button></div>)}</div>}<div className="border-t border-slate-800 pt-3"><span className="text-[9px] font-black uppercase tracking-wider text-slate-500">Suggested starter items:</span><div className="mt-2 flex flex-wrap gap-2">{starters.map(item => { const added = watchlist.some(saved => saved.ticker === item.ticker); return <button key={item.ticker} type="button" disabled={added || addWatch.isPending} onClick={() => addWatch.mutate(item)} className="rounded-lg border border-blue-400/25 bg-blue-500/5 px-3 py-1.5 text-[9px] font-black text-blue-200 disabled:opacity-40">{item.ticker} {!added && "+"}</button>; })}</div></div></section>
      </div>

      <section className={`${panel} mb-4 border-blue-400/35 p-4`}><div className="mb-4 flex items-start justify-between gap-4"><div><h2 className="text-sm font-black uppercase tracking-[.16em] text-white"><i className="fas fa-wand-magic-sparkles mr-2 text-cyan-300" />AI Picks Queue</h2><p className="mt-1 text-xs text-slate-500">Top practice trade ideas ranked by the AI. Trade ideas are not guaranteed.</p></div><Link href="/markets" className="shrink-0 text-[10px] font-black text-blue-300">See all picks →</Link></div><div className="grid gap-3 md:grid-cols-2 2xl:grid-cols-4">{isLoading ? Array.from({ length: 4 }, (_, i) => <div key={i} className="h-64 animate-pulse rounded-xl bg-slate-900" />) : signals.slice(0, 4).map(signal => <PickCard key={signal.id} trade={signal} queued={queue.includes(signal.ticker)} onQueue={addQueue} onReason={setReason} />)}</div></section>

      <section className={`${panel} p-4`}><div className="flex flex-col gap-4 xl:flex-row xl:items-center xl:justify-between"><div><h2 className="text-sm font-black uppercase tracking-[.14em] text-white">Quick Actions</h2><p className="mt-1 text-xs text-slate-500">Choose your next safe practice mission.</p></div><div className="grid flex-1 gap-2 sm:grid-cols-2 xl:max-w-4xl xl:grid-cols-4"><QuickLink href="/markets" icon="fa-play" label="Start Auto Practice" /><QuickLink href="/markets" icon="fa-chart-line" label="Choose a Trade" /><QuickLink href="/my-trades" icon="fa-briefcase" label="View My Trades" /><QuickLink href="/learn" icon="fa-graduation-cap" label="Learning Center" /></div></div><div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[10px] font-bold text-emerald-300"><i className="fas fa-shield-halved" />Practice Mode Active — All trades use virtual money. No real money is at risk.</div></section>
    </div>

    {reason && <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="why-title"><div className="w-full max-w-md rounded-2xl border border-blue-400/40 bg-[#071426] p-5"><div className="flex items-start justify-between"><h2 id="why-title" className="text-sm font-black uppercase tracking-wider text-blue-300">Why this trade?</h2><button type="button" onClick={() => setReason(null)} aria-label="Close trade explanation" className="h-8 w-8 rounded-lg border border-slate-700 text-slate-400"><i className="fas fa-xmark" /></button></div><p className="mt-4 text-sm leading-6 text-slate-300">{reason}</p><p className="mt-4 text-xs text-amber-200">This is an AI practice idea, not a guaranteed result.</p><button type="button" onClick={() => setReason(null)} className="mt-5 min-h-10 w-full rounded-lg bg-blue-600 text-xs font-black text-white">Close Preview</button></div></div>}
  </div>;
}

function HeroStatus({ icon, label, value, color }: { icon: string; label: string; value: string; color: "emerald" | "cyan" | "violet" | "rose" }) {
  const tones = { emerald: "border-emerald-400/30 bg-emerald-400/5 text-emerald-300", cyan: "border-cyan-400/30 bg-cyan-400/5 text-cyan-300", violet: "border-violet-400/30 bg-violet-400/5 text-violet-300", rose: "border-rose-400/30 bg-rose-400/5 text-rose-300" };
  return <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${tones[color]}`}><i className={`fas ${icon}`} /><div><p className="text-[8px] font-black uppercase tracking-wider text-slate-500">{label}</p><strong className="text-[11px] uppercase">{value}</strong></div></div>;
}

function SummaryCard({ panel, icon, tone, label, value, valueTone = "text-white", help, action, href, children }: { panel: string; icon: string; tone: "violet" | "emerald" | "cyan"; label: string; value: string; valueTone?: string; help: string; action?: string; href?: string; children?: React.ReactNode }) {
  const colors = { violet: "border-violet-400/30 bg-violet-500/10 text-violet-300", emerald: "border-emerald-400/30 bg-emerald-500/10 text-emerald-300", cyan: "border-cyan-400/30 bg-cyan-500/10 text-cyan-300" };
  return <article className={`${panel} flex min-h-[190px] flex-col p-4 transition hover:-translate-y-0.5 hover:border-blue-400/40`}><div className="flex gap-3"><div className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border text-lg ${colors[tone]}`}><i className={`fas ${icon}`} /></div><div><p className="text-[9px] font-black uppercase tracking-[.14em] text-slate-500">{label}</p><strong className={`mt-1 block text-2xl font-black ${valueTone}`}>{value}</strong><p className="mt-1 text-[10px] leading-4 text-slate-400">{help}</p></div></div><div className="mt-4 flex flex-1 flex-col gap-1">{children}</div>{action && href && <Link href={href} className="mt-3 flex min-h-9 items-center justify-center rounded-lg border border-blue-400/30 bg-blue-500/10 text-[9px] font-black uppercase tracking-wider text-blue-200 hover:bg-blue-500/20">{action}</Link>}</article>;
}

function MiniRow({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) { return <div className="flex justify-between border-b border-slate-800/70 py-1.5 text-[10px]"><span className="text-slate-500">{label}</span><strong className={tone}>{value}</strong></div>; }

function BestMatch({ panel, trade, queued, onQueue }: { panel: string; trade?: TradingOpportunity; queued: boolean; onQueue: (ticker: string) => void }) {
  const symbol = trade?.ticker || "BTC"; const name = trade?.name || "Bitcoin"; const score = trade?.confidence || 84;
  return <section className={`${panel} border-fuchsia-400/30 p-4`}><div className="flex items-center justify-between"><h2 className="text-sm font-black uppercase tracking-[.14em] text-white"><i className="fas fa-star mr-2 text-fuchsia-300" />AI Best Match for You</h2><span className="rounded-md border border-emerald-400/30 bg-emerald-400/10 px-2 py-1 text-[8px] font-black uppercase text-emerald-300">Highest score</span></div><div className="mt-4 flex items-center gap-3"><div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-400/30 bg-amber-400/10 text-xl text-amber-300"><i className={symbol.includes("BTC") ? "fab fa-btc" : "fas fa-chart-line"} /></div><div><h3 className="text-lg font-black text-white">{symbol} — {name}</h3><p className="text-xs text-slate-400">The app thinks this trade may move soon.</p></div></div><div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4"><Stat label="Your investment" value="$1.00" /><Stat label="If it wins" value="+$0.28" tone="text-emerald-300" /><Stat label="If it loses" value="-$0.23" tone="text-rose-300" /><Stat label="Trade score" value={`${score} / 100`} tone="text-blue-300" /></div><p className="mt-3 text-[10px] text-slate-500">Risk: <strong className="text-emerald-300">Low</strong> · Practice ideas are not guaranteed.</p><div className="mt-4 grid gap-2 sm:grid-cols-2"><Link href="/markets" className="flex min-h-10 items-center justify-center rounded-lg bg-fuchsia-600 text-[10px] font-black uppercase tracking-wider text-white">Review Best Trade</Link><button type="button" onClick={() => onQueue(symbol)} className={`min-h-10 rounded-lg border text-[10px] font-black uppercase tracking-wider ${queued ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-blue-400/35 text-blue-200"}`}>{queued ? "✓ In Auto Queue" : "+ Add to Auto Queue"}</button></div></section>;
}

function Stat({ label, value, tone = "text-white" }: { label: string; value: string; tone?: string }) { return <div className="rounded-lg border border-slate-800 bg-slate-950/50 p-2.5"><p className="text-[8px] font-black uppercase tracking-wider text-slate-500">{label}</p><strong className={`mt-1 block text-xs ${tone}`}>{value}</strong></div>; }

function PickCard({ trade, queued, onQueue, onReason }: { trade: TradingOpportunity; queued: boolean; onQueue: (ticker: string) => void; onReason: (reason: string) => void }) {
  const profit = Math.max(.28, ((trade.targetPrice - trade.entryPrice) / Math.max(trade.entryPrice, .01))).toFixed(2); const risk = trade.confidence >= 75 ? "Low" : trade.confidence >= 65 ? "Medium" : "High";
  return <article className="rounded-xl border border-slate-700 bg-slate-950/55 p-3 transition hover:-translate-y-1 hover:border-blue-400/45 hover:shadow-[0_14px_30px_rgba(0,0,0,.25)]"><div className="flex flex-wrap items-center gap-1.5"><span className="rounded bg-blue-500/10 px-2 py-1 text-[8px] font-black uppercase text-blue-300">{trade.market}</span><span className="rounded bg-fuchsia-500/10 px-2 py-1 text-[8px] font-black uppercase text-fuchsia-300">{trade.signalType.replace("_", " ")}</span><span className={`ml-auto rounded px-2 py-1 text-[8px] font-black ${trade.action === "BUY" ? "bg-emerald-500/10 text-emerald-300" : "bg-rose-500/10 text-rose-300"}`}>{trade.action}</span></div><div className="mt-3 flex items-start justify-between"><div><h3 className="text-lg font-black text-white">{trade.ticker}</h3><p className="max-w-[150px] truncate text-[10px] text-slate-500">{trade.name}</p></div><div className="text-right"><p className="text-[8px] font-black uppercase text-slate-500">Trade score</p><strong className="text-sm text-blue-300">{trade.confidence} / 100</strong></div></div><div className="mt-3 grid grid-cols-3 gap-1.5"><Stat label="Risk" value={risk} tone={risk === "Low" ? "text-emerald-300" : "text-amber-300"} /><Stat label="Can win" value={`+$${profit}`} tone="text-emerald-300" /><Stat label="Can lose" value="-$0.23" tone="text-rose-300" /></div><p className="mt-3 line-clamp-2 min-h-10 text-[10px] leading-5 text-slate-400"><strong className="text-slate-300">Why:</strong> {trade.rationale}</p><div className="mt-3 grid grid-cols-2 gap-2"><Link href="/markets" className="flex min-h-9 items-center justify-center rounded-lg bg-blue-600 text-[9px] font-black uppercase text-white">Review Trade</Link><button type="button" onClick={() => onReason(trade.rationale)} className="min-h-9 rounded-lg border border-slate-700 text-[9px] font-black text-slate-300">Why this trade?</button></div><button type="button" onClick={() => onQueue(trade.ticker)} className={`mt-2 min-h-9 w-full rounded-lg border text-[9px] font-black uppercase tracking-wider ${queued ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-fuchsia-400/35 bg-fuchsia-500/5 text-fuchsia-200"}`}>{queued ? "✓ In Auto Queue" : "+ Add to Auto Queue"}</button></article>;
}

function QuickLink({ href, icon, label }: { href: string; icon: string; label: string }) { return <Link href={href} className="flex min-h-11 items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/5 px-3 text-[9px] font-black uppercase tracking-wider text-blue-200 hover:border-blue-300 hover:bg-blue-500/15"><i className={`fas ${icon} mr-2`} />{label}</Link>; }
