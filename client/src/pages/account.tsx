import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface LivePrice {
  price: number;
  change24h: number;
  marketOpen: boolean;
  lastUpdated: string;
  source: "live" | "cache";
}

function useLivePrices() {
  const { data } = useQuery<{ prices: Record<string, LivePrice>; marketOpen: boolean }>({
    queryKey: ["/api/live-prices"],
    queryFn: () => fetch("/api/live-prices").then(r => r.json()),
    refetchInterval: 10_000,
    staleTime: 5_000,
  });
  return data?.prices ?? {};
}

function LivePnL({ trade, livePrices }: { trade: any; livePrices: Record<string, LivePrice> }) {
  const isOpen = trade.status === "OPEN";
  const pnl = parseFloat(trade.pnl ?? 0);

  if (!isOpen) {
    return (
      <span className="font-bold" style={{ color: pnl >= 0 ? "#22c55e" : "#ef4444" }}>
        {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
      </span>
    );
  }

  // Map trade ticker to live price key
  const market = trade.market;
  const ticker = trade.ticker;
  const commodityMap: Record<string, string> = { GOLD: "GC=F", OIL: "CL=F", SILVER: "SI=F", NATGAS: "NG=F", CORN: "ZC=F", COPPER: "HG=F", WHEAT: "ZW=F" };
  const priceKey = market === "commodities" ? (commodityMap[ticker] ?? ticker) : ticker;

  const liveData = livePrices[priceKey];
  const livePrice = liveData?.price;
  const invested = parseFloat(trade.investedAmount);
  const units = parseFloat(trade.units);
  const entry = parseFloat(trade.entryPrice);

  if (!livePrice || livePrice <= 0) {
    return <span style={{ color: "#64748b" }}>—</span>;
  }

  const currentValue = livePrice * units;
  const livePnl = currentValue - invested;
  const livePct = invested > 0 ? (livePnl / invested) * 100 : 0;
  const isLive = liveData?.source === "live";

  return (
    <div className="flex flex-col items-end">
      <div className="flex items-center gap-1">
        {isLive && <span className="w-1.5 h-1.5 rounded-full animate-pulse inline-block" style={{ background: livePnl >= 0 ? "#22c55e" : "#ef4444" }} />}
        <span className="font-bold" style={{ color: livePnl >= 0 ? "#22c55e" : "#ef4444" }}>
          {livePnl >= 0 ? "+" : ""}${livePnl.toFixed(2)}
        </span>
      </div>
      <span className="text-[10px]" style={{ color: livePnl >= 0 ? "#4ade80" : "#f87171" }}>
        {livePct >= 0 ? "+" : ""}{livePct.toFixed(1)}%
      </span>
    </div>
  );
}

export default function AccountPage() {
  const { user, token, logout, updateBalance } = useAuth();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [showReset, setShowReset] = useState(false);

  const livePrices = useLivePrices();

  const { data: trades, isLoading } = useQuery<any[]>({
    queryKey: ["/api/trades"],
    queryFn: () => fetch("/api/trades", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
  });

  const closeMutation = useMutation({
    mutationFn: async (tradeId: string) => {
      const res = await fetch(`/api/trades/${tradeId}/close`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      return res.json();
    },
    onSuccess: (data) => {
      updateBalance(parseFloat(user?.paperBalance ?? "10000") + data.pnl);
      toast({ title: `Trade closed`, description: `P&L: ${data.pnl >= 0 ? "+" : ""}$${parseFloat(data.pnl).toFixed(2)}` });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/snapshots"] });
    },
    onError: (e: any) => toast({ title: "Close failed", description: e.message, variant: "destructive" }),
  });

  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/portfolio/reset", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    onSuccess: () => {
      updateBalance(10000);
      toast({ title: "✅ Portfolio reset to $10,000" });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/snapshots"] });
      setShowReset(false);
    },
  });

  const balance = parseFloat(String(user?.paperBalance ?? 10000));
  const allTrades = trades ?? [];
  const closedTrades = allTrades.filter((t: any) => t.status === "CLOSED");
  const openTrades = allTrades.filter((t: any) => t.status === "OPEN");
  const totalPnL = closedTrades.reduce((s: number, t: any) => s + parseFloat(t.pnl ?? 0), 0);
  const winRate = closedTrades.length > 0
    ? Math.round(closedTrades.filter((t: any) => parseFloat(t.pnl ?? 0) > 0).length / closedTrades.length * 100)
    : 0;
  const bestTrade = closedTrades.length > 0 ? Math.max(...closedTrades.map((t: any) => parseFloat(t.pnl ?? 0))) : 0;
  const worstTrade = closedTrades.length > 0 ? Math.min(...closedTrades.map((t: any) => parseFloat(t.pnl ?? 0))) : 0;
  const initials = (user?.name ?? "U").split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <div className="page-container lg:pb-8 min-h-screen" style={{ background: "#0d1117" }}>
      <div className="px-4 lg:px-8 pt-6 max-w-none">

        {/* Profile + Stats */}
        <div className="lg:flex lg:gap-8 mb-6">
          <div className="flex items-center gap-4 mb-5 lg:mb-0 lg:flex-shrink-0">
            <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white"
              style={{ background: "linear-gradient(135deg,#3b82f6,#8b5cf6)" }}>
              {initials}
            </div>
            <div>
              <div className="text-xl font-bold">{user?.name}</div>
              <div className="text-sm" style={{ color: "#64748b" }}>{user?.email}</div>
              <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>Paper Trading Account</div>
            </div>
          </div>

          <div className="flex-1 grid grid-cols-2 lg:grid-cols-3 gap-3">
            {[
              { label: "Paper Balance", val: `$${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}`, color: "#3b82f6" },
              { label: "Total P&L", val: `${totalPnL >= 0 ? "+" : ""}$${totalPnL.toFixed(2)}`, color: totalPnL >= 0 ? "#22c55e" : "#ef4444" },
              { label: "Win Rate", val: `${winRate}%`, color: winRate >= 60 ? "#22c55e" : winRate >= 40 ? "#f59e0b" : "#ef4444" },
              { label: "Open Trades", val: String(openTrades.length), color: "#e2e8f0" },
              { label: "Best Trade", val: `+$${bestTrade.toFixed(2)}`, color: "#22c55e" },
              { label: "Worst Trade", val: `$${worstTrade.toFixed(2)}`, color: "#ef4444" },
            ].map(item => (
              <div key={item.label} className="rounded-2xl p-4" style={{ background: "#1a2332", border: "1px solid #243044" }}>
                <div className="text-xs mb-1" style={{ color: "#64748b" }}>{item.label}</div>
                <div className="text-xl font-black" style={{ color: item.color }}>{item.val}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Open Positions with live P&L */}
        {openTrades.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-sm font-bold">📊 Open Positions</span>
              <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: "#22c55e" }} />
              <span className="text-xs" style={{ color: "#22c55e" }}>Live P&L</span>
            </div>
            <div className="flex flex-col gap-2 lg:hidden">
              {openTrades.map((trade: any) => (
                <div key={trade.id} className="rounded-xl p-3" style={{ background: "#1a2332", border: "1px solid rgba(34,197,94,0.2)" }}>
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold">{trade.ticker}</span>
                        <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>{trade.market}</span>
                        <span className="text-[10px] font-bold" style={{ color: trade.action === "BUY" ? "#22c55e" : "#ef4444" }}>{trade.action}</span>
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                        {parseFloat(trade.units).toFixed(4)} units @ ${parseFloat(trade.entryPrice).toFixed(2)} · inv: ${parseFloat(trade.investedAmount).toFixed(2)}
                      </div>
                    </div>
                    <div className="text-right">
                      <LivePnL trade={trade} livePrices={livePrices} />
                    </div>
                  </div>
                  <button onClick={() => closeMutation.mutate(trade.id)} disabled={closeMutation.isPending}
                    className="w-full text-xs px-3 py-1.5 rounded-lg font-semibold"
                    style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
                    Close Position
                  </button>
                </div>
              ))}
            </div>
            <div className="hidden lg:block rounded-2xl overflow-hidden" style={{ background: "#1a2332", border: "1px solid rgba(34,197,94,0.2)" }}>
              <table className="w-full text-sm">
                <thead>
                  <tr style={{ borderBottom: "1px solid #243044" }}>
                    {["Ticker","Market","Action","Entry","Units","Invested","Live P&L",""].map(h => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#64748b" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {openTrades.map((trade: any, idx: number) => (
                    <tr key={trade.id} style={{ borderBottom: idx < openTrades.length - 1 ? "1px solid #1a2332" : "none" }}>
                      <td className="px-4 py-3 font-bold">{trade.ticker}</td>
                      <td className="px-4 py-3 text-xs capitalize" style={{ color: "#60a5fa" }}>{trade.market}</td>
                      <td className="px-4 py-3 text-xs font-bold" style={{ color: trade.action === "BUY" ? "#22c55e" : "#ef4444" }}>{trade.action}</td>
                      <td className="px-4 py-3 font-mono text-xs">${parseFloat(trade.entryPrice).toFixed(2)}</td>
                      <td className="px-4 py-3 font-mono text-xs">{parseFloat(trade.units).toFixed(4)}</td>
                      <td className="px-4 py-3 font-mono text-xs">${parseFloat(trade.investedAmount).toFixed(2)}</td>
                      <td className="px-4 py-3"><LivePnL trade={trade} livePrices={livePrices} /></td>
                      <td className="px-4 py-3">
                        <button onClick={() => closeMutation.mutate(trade.id)} disabled={closeMutation.isPending}
                          className="text-xs px-3 py-1 rounded-lg font-semibold"
                          style={{ background: "rgba(239,68,68,0.1)", color: "#f87171", border: "1px solid rgba(239,68,68,0.3)" }}>
                          Close
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Closed Trade History */}
        <div className="mb-5">
          <div className="text-sm font-bold mb-3">📋 Trade History</div>
          {isLoading ? (
            <div className="flex flex-col gap-2">{Array(3).fill(0).map((_, i) => <div key={i} className="skeleton rounded-xl" style={{ height: 80 }} />)}</div>
          ) : closedTrades.length === 0 && openTrades.length === 0 ? (
            <div className="rounded-2xl p-6 text-center" style={{ background: "#1a2332", border: "1px solid #243044" }}>
              <div className="text-3xl mb-2">📭</div>
              <div className="text-sm" style={{ color: "#64748b" }}>No trades yet</div>
              <button onClick={() => setLocation("/markets")} className="mt-2 text-xs font-semibold" style={{ color: "#3b82f6" }}>Make your first trade →</button>
            </div>
          ) : closedTrades.length === 0 ? (
            <div className="rounded-2xl p-4 text-center text-sm" style={{ background: "#1a2332", border: "1px solid #243044", color: "#64748b" }}>
              No closed trades yet — close a position to see it here.
            </div>
          ) : (
            <>
              {/* Mobile cards */}
              <div className="flex flex-col gap-2 lg:hidden">
                {closedTrades.map((trade: any) => {
                  const pnl = parseFloat(trade.pnl ?? 0);
                  return (
                    <div key={trade.id} className="rounded-xl p-3" style={{ background: "#1a2332", border: "1px solid #243044" }}>
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-sm">{trade.ticker}</span>
                            <span className="text-[10px] px-1.5 py-0.5 rounded-full capitalize" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>{trade.market}</span>
                          </div>
                          <div className="text-xs mt-0.5" style={{ color: "#64748b" }}>
                            {parseFloat(trade.units).toFixed(4)} units @ ${parseFloat(trade.entryPrice).toFixed(2)}
                          </div>
                          <div className="text-xs" style={{ color: "#64748b" }}>
                            {new Date(trade.entryAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-sm font-bold" style={{ color: pnl >= 0 ? "#22c55e" : "#ef4444" }}>
                            {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                          </div>
                          <div className="text-xs" style={{ color: "#64748b" }}>inv: ${parseFloat(trade.investedAmount).toFixed(2)}</div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop table */}
              <div className="hidden lg:block rounded-2xl overflow-hidden" style={{ background: "#1a2332", border: "1px solid #243044" }}>
                <table className="w-full text-sm">
                  <thead>
                    <tr style={{ borderBottom: "1px solid #243044" }}>
                      {["Ticker","Market","Action","Entry Price","Units","Invested","P&L","Date"].map(h => (
                        <th key={h} className="px-4 py-3 text-left text-xs font-semibold" style={{ color: "#64748b" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {closedTrades.map((trade: any, idx: number) => {
                      const pnl = parseFloat(trade.pnl ?? 0);
                      return (
                        <tr key={trade.id} style={{ borderBottom: idx < closedTrades.length - 1 ? "1px solid #1a2332" : "none", background: idx % 2 === 0 ? "transparent" : "rgba(255,255,255,0.01)" }}>
                          <td className="px-4 py-3 font-bold">{trade.ticker}</td>
                          <td className="px-4 py-3"><span className="text-xs px-2 py-0.5 rounded-full capitalize" style={{ background: "rgba(59,130,246,0.15)", color: "#60a5fa" }}>{trade.market}</span></td>
                          <td className="px-4 py-3 text-xs font-bold" style={{ color: trade.action === "BUY" ? "#22c55e" : "#ef4444" }}>{trade.action}</td>
                          <td className="px-4 py-3 font-mono text-xs">${parseFloat(trade.entryPrice).toFixed(2)}</td>
                          <td className="px-4 py-3 font-mono text-xs">{parseFloat(trade.units).toFixed(4)}</td>
                          <td className="px-4 py-3 font-mono text-xs">${parseFloat(trade.investedAmount).toFixed(2)}</td>
                          <td className="px-4 py-3 font-bold" style={{ color: pnl >= 0 ? "#22c55e" : "#ef4444" }}>
                            {pnl >= 0 ? "+" : ""}${pnl.toFixed(2)}
                          </td>
                          <td className="px-4 py-3 text-xs" style={{ color: "#64748b" }}>
                            {new Date(trade.entryAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col lg:flex-row gap-3 mb-6">
          <button onClick={() => setShowReset(true)}
            className="lg:flex-1 py-3 rounded-2xl font-semibold text-sm"
            style={{ background: "#1a2332", border: "1px solid #ef444444", color: "#f87171" }}>
            🔄 Reset Portfolio
          </button>
          <button onClick={logout}
            className="lg:flex-1 py-3 rounded-2xl font-semibold text-sm"
            style={{ background: "#1a2332", border: "1px solid #243044", color: "#64748b" }}>
            🚪 Sign Out
          </button>
        </div>
      </div>

      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.7)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{ background: "#1a2332", border: "1px solid #243044" }}>
            <div className="text-xl font-bold mb-2">Reset Portfolio?</div>
            <div className="text-sm mb-5" style={{ color: "#94a3b8" }}>This will reset your balance to $10,000 and close all open trades. This cannot be undone.</div>
            <div className="flex gap-3">
              <button onClick={() => setShowReset(false)} className="flex-1 py-3 rounded-xl font-semibold text-sm" style={{ background: "#243044" }}>Cancel</button>
              <button onClick={() => resetMutation.mutate()} disabled={resetMutation.isPending}
                className="flex-1 py-3 rounded-xl font-bold text-white text-sm" style={{ background: "#ef4444" }}>
                {resetMutation.isPending ? "Resetting..." : "Yes, Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
