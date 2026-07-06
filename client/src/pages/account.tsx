import { useState, useEffect } from "react";
import { useLocation, Link } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTradingMode } from "@/contexts/TradingModeContext";
import { useToast } from "@/hooks/use-toast";
import { useLivePrices } from "@/hooks/useLivePrices";
import StatCard from "@/components/shared/StatCard";
import FlagIcon from "@/components/shared/FlagIcon";
import EmptyStateArt from "@/components/shared/EmptyStateArt";
import type { LivePrice } from "@/lib/types";
import type { Trade } from "@shared/schema";

// Flag mapping helper
/** Extracts the leading currency/asset code from a ticker like "EUR-USD" or "GOLD". */
function baseCode(ticker: string): string {
  return ticker.split(/[-\/]/)[0];
}

// Legacy trade logic mapping helper
function calculateLivePnL(trade: Trade, livePrices: Record<string, LivePrice>): number {
  if (trade.status !== "OPEN") return parseFloat(String(trade.pnl ?? 0));
  const market = trade.market;
  const ticker = trade.ticker;
  const commodityMap: Record<string, string> = { GOLD: "GC=F", OIL: "CL=F", SILVER: "SI=F", NATGAS: "NG=F", CORN: "ZC=F", COPPER: "HG=F", WHEAT: "ZW=F" };
  const priceKey = market === "commodities" ? (commodityMap[ticker] ?? ticker) : ticker;
  const livePrice = livePrices[priceKey]?.price;
  if (!livePrice || livePrice <= 0) return 0;
  const units = parseFloat(String(trade.units));
  const entry = parseFloat(String(trade.entryPrice));
  if (trade.action === "SELL") {
    return parseFloat((units * (entry - livePrice)).toFixed(2));
  } else {
    return parseFloat((units * (livePrice - entry)).toFixed(2));
  }
}

export default function AccountPage() {
  const { user, token, logout, updateBalance } = useAuth();
  const { tradingMode, setMode, connectedLiveAccount } = useTradingMode();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [viewType, setViewType] = useState<"beginner" | "advanced">("beginner");
  const [selectedTrade, setSelectedTrade] = useState<Trade | null>(null);
  const [tradeToClose, setTradeToClose] = useState<Trade | null>(null);
  const [closeCheckbox, setCloseCheckbox] = useState(false);
  const [showReset, setShowReset] = useState(false);

  const { prices: livePrices } = useLivePrices();

  // Query trades
  const { data: trades = [], isLoading } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
    queryFn: () => fetch("/api/trades", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
  });

  // Query live orders list to merge if available
  const { data: orders = [] } = useQuery<any[]>({
    queryKey: ["/api/trading/orders"],
    queryFn: async () => {
      if (!token) return [];
      const res = await fetch("/api/trading/orders", {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    },
    enabled: !!token,
  });

  // Close trade mutation
  const closeMutation = useMutation({
    mutationFn: async ({ id, isLive }: { id: string; isLive: boolean }) => {
      const url = isLive 
        ? `/api/trading/orders/${id}/cancel` 
        : `/api/trades/${id}/close`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({}),
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.message); }
      return res.json();
    },
    onSuccess: (data, vars) => {
      if (!vars.isLive) {
        updateBalance(parseFloat(user?.paperBalance ?? "10000") + (data.pnl ?? 0));
      }
      toast({ 
        title: `Position Closed`, 
        description: vars.isLive 
          ? "Live position closed successfully." 
          : `Practice position closed. P&L: ${data.pnl >= 0 ? "+" : ""}$${parseFloat(data.pnl).toFixed(2)}` 
      });
      setTradeToClose(null);
      setCloseCheckbox(false);
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trading/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (e: any) => toast({ title: "Close failed", description: e.message, variant: "destructive" }),
  });

  // Reset mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/portfolio/reset", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    onSuccess: () => {
      updateBalance(10000);
      toast({ title: "✅ Practice portfolio reset to $10,000" });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trading/orders"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/snapshots"] });
      setShowReset(false);
    },
  });

  // Filter trades based on active mode
  const currentMode = tradingMode; // 'paper' or 'live'
  
  // Merge orders & legacy trades for unified display
  type DisplayTrade = Trade & { isLive: boolean };
  const allMergedTrades: DisplayTrade[] = trades.map(t => ({
    ...t,
    isLive: false,
  }));

  // Append live orders if user is in Live Mode
  orders.forEach((o: any) => {
    // Prevent duplicates by checking if symbol matches
    if (!allMergedTrades.some(t => t.id === o.id)) {
      allMergedTrades.push({
        id: o.id,
        userId: o.userId,
        ticker: o.symbol,
        tickerName: o.symbol,
        market: o.assetClass,
        action: o.side.toUpperCase(),
        entryPrice: o.estimatedPrice,
        units: o.quantity,
        investedAmount: o.notionalAmount,
        status: o.status === "filled" ? "OPEN" : "CLOSED",
        entryAt: o.createdAt,
        exitPrice: null,
        exitAt: null,
        potentialGain: null,
        pnl: String(parseFloat(o.estimatedCost) * 0.1), // Mock live history PnL
        isLive: o.mode === "live",
      });
    }
  });

  // Filter based on currently active view mode
  const modeFilteredTrades = allMergedTrades.filter(t => currentMode === "live" ? t.isLive : !t.isLive);

  const openTrades = modeFilteredTrades.filter(t => t.status === "OPEN");
  const closedTrades = modeFilteredTrades.filter(t => t.status === "CLOSED");

  // Calculations for stats
  const paperBalanceVal = parseFloat(user?.paperBalance ?? "10000");
  const liveBalanceVal = connectedLiveAccount?.buyingPower ? parseFloat(connectedLiveAccount.buyingPower) : 25000;
  const balance = currentMode === "live" ? liveBalanceVal : paperBalanceVal;

  const pnlOf = (t: DisplayTrade) => parseFloat(String(t.pnl ?? 0));
  const totalPnL = closedTrades.reduce((s, t) => s + pnlOf(t), 0);
  const winRate = closedTrades.length > 0
    ? Math.round(closedTrades.filter(t => pnlOf(t) > 0).length / closedTrades.length * 100)
    : 0;
  const bestTrade = closedTrades.length > 0 ? Math.max(...closedTrades.map(pnlOf)) : 0;
  const worstTrade = closedTrades.length > 0 ? Math.min(...closedTrades.map(pnlOf)) : 0;

  // Derive "What's Happening Now" metrics
  const winningTradesCount = openTrades.filter(t => calculateLivePnL(t, livePrices) > 0).length;
  const losingTradesCount = openTrades.filter(t => calculateLivePnL(t, livePrices) < 0).length;
  const openPnLSum = openTrades.reduce((s, t) => s + calculateLivePnL(t, livePrices), 0);

  const formatMoney = (val: number) => {
    const sign = val > 0 ? "+" : val < 0 ? "-" : "";
    return `${sign}$${Math.abs(val).toFixed(2)}`;
  };

  const getOpenTimeAgo = (entryAt: string) => {
    const diffMs = new Date().getTime() - new Date(entryAt).getTime();
    const diffMins = Math.max(1, Math.round(diffMs / 60_000));
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHrs = Math.round(diffMins / 60);
    if (diffHrs < 24) return `${diffHrs}h ago`;
    return `${Math.round(diffHrs / 24)}d ago`;
  };

  // Export CSV handler
  const handleExportCSV = () => {
    if (closedTrades.length === 0) {
      toast({
        title: "Export Failed",
        description: "There is no completed trade history to export.",
        variant: "destructive"
      });
      return;
    }
    const headers = ["Symbol", "Market", "Action", "Entry Price", "Quantity", "Invested Amount", "P&L", "Date"];
    const rows = closedTrades.map(t => [
      t.ticker,
      t.market,
      t.action,
      t.entryPrice,
      t.units,
      t.investedAmount,
      t.pnl,
      new Date(t.entryAt).toISOString().split("T")[0]
    ]);
    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(","), ...rows.map(e => e.join(","))].join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `trade_pro_history_${currentMode}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({
      title: "Export Success",
      description: "Trade history successfully downloaded as CSV.",
    });
  };

  return (
    <div className="select-none text-left">
      <div className="max-w-none">
        
        {/* Header Block */}
        <div className="page-header">
          <div>
            <h1 className="page-title">My Trades</h1>
            <p className="page-subtitle">
              Track your practice and live trades in simple language.
            </p>
          </div>
          {/* Segmented Toggle switches Practice / Live */}
          <div className="mode-toggle">
            <button
              onClick={() => setMode("paper")}
              className={currentMode === "paper" ? "active" : "text-slate-400"}
            >
              Practice
            </button>
            <button
              onClick={() => setMode("live")}
              className={currentMode === "live" ? "active" : "text-slate-400"}
            >
              Live
            </button>
          </div>
        </div>

        {/* Practice vs. Live Warning Banner */}
        {currentMode === "paper" ? (
          <div className="mode-banner">
            <i className="fas fa-info-circle text-blue-400 text-lg"></i>
            <div>
              Practice Mode — No real money is being used. You are practicing with virtual money.
            </div>
          </div>
        ) : (
          <div className="mode-banner border-amber-500 bg-amber-500/5 text-amber-500">
            <i className="fas fa-exclamation-triangle text-amber-500 animate-pulse text-lg"></i>
            <div>
              Live Trading Mode — Real money is active. Trades can result in real losses.
            </div>
          </div>
        )}

        {/* Summary Stat Cards Grid */}
        <div className="summary-grid">
          <StatCard
            icon="fas fa-wallet"
            label={currentMode === "live" ? "Live Balance" : "Practice Balance"}
            value={balance.toLocaleString("en-US", { style: "currency", currency: "USD" })}
            valueClass="text-blue-400"
            helper={currentMode === "live" ? "Funds available in live broker." : "Virtual money you can use for practice trades."}
          />
          <StatCard
            icon="fas fa-wave-square"
            label="Today's Profit / Loss"
            value={`${totalPnL >= 0 ? "+" : ""}$${totalPnL.toFixed(2)}`}
            valueClass={totalPnL >= 0 ? "text-green-500" : "text-red-500"}
            helper="Your total result for today."
          />
          <StatCard
            icon="fas fa-chart-pie"
            label="Open Trades"
            value={openTrades.length}
            helper="Trades you currently have open."
          />
          <StatCard
            icon="fas fa-bullseye"
            label="Win Rate"
            value={`${winRate}%`}
            valueClass={winRate >= 60 ? "text-green-500" : winRate >= 45 ? "text-amber-500" : "text-red-500"}
            helper="% of closed trades that were winners."
          />
          <StatCard
            icon="fas fa-trophy"
            label="Best Trade"
            value={`+${formatMoney(bestTrade)}`}
            valueClass="text-green-500"
            helper="Your biggest winner so far."
          />
          <StatCard
            icon="fas fa-arrow-trend-down"
            label="Worst Trade"
            value={formatMoney(worstTrade)}
            valueClass="text-red-500"
            helper="Your biggest loser so far."
          />
        </div>

        {/* What's Happening Now Card */}
        <div className="happening-card">
          <div className="happening-icon">
            <i className="fas fa-comment-alt-dots text-lg"></i>
          </div>
          <div>
            <div className="text-xs text-slate-500 font-black uppercase tracking-wider">What's Happening Now</div>
            <p className="text-[13px] text-slate-300 font-semibold mt-1">
              You have <span className="text-white font-extrabold">{openTrades.length}</span> open {currentMode} trades.{" "}
              <span className="text-green-500 font-extrabold">{winningTradesCount}</span> trades are currently winning and{" "}
              <span className="text-red-500 font-extrabold">{losingTradesCount}</span> trade{losingTradesCount !== 1 && "s"} {losingTradesCount === 1 ? "is" : "are"} slightly losing.{" "}
              Your current total result is{" "}
              <span className={`font-black ${openPnLSum >= 0 ? "text-green-500" : "text-red-500"}`}>
                {openPnLSum >= 0 ? "+" : ""}${openPnLSum.toFixed(2)}
              </span>.
            </p>
          </div>
        </div>

        {/* Open Trades Header with Toggle */}
        <div className="section-header-row mt-8">
          <div>
            <h2 className="section-title">Open Trades</h2>
            <p className="section-subtitle">These are your current open positions.</p>
          </div>
          {/* Beginner / Advanced toggle switch */}
          <div className="view-toggle">
            <button
              onClick={() => setViewType("beginner")}
              className={viewType === "beginner" ? "active" : "text-slate-400"}
            >
              Beginner
            </button>
            <button
              onClick={() => setViewType("advanced")}
              className={viewType === "advanced" ? "active" : "text-slate-400"}
            >
              Advanced
            </button>
          </div>
        </div>

        {/* Open Trades Content */}
        {openTrades.length === 0 ? (
          <div className="rounded-2xl border p-8 text-center text-slate-500 mb-6 bg-[#0b1626] flex flex-col items-center" style={{ borderColor: "var(--color-border-strong)" }}>
            <EmptyStateArt name="open_trades" fallbackIcon="fas fa-chart-line" size={84} className="mb-2.5" />
            <div className="text-xs font-black text-slate-400">No open trades at the moment</div>
            <Link href="/markets" className="text-[10px] font-extrabold text-blue-400 hover:text-blue-300 block mt-2 cursor-pointer">
              Go to Choose a Trade page to find opportunities →
            </Link>
          </div>
        ) : viewType === "beginner" ? (
          /* Beginner Grid Card View */
          <div className="open-trades-grid">
            {openTrades.map((trade: any) => {
              const livePnL = calculateLivePnL(trade, livePrices);
              const isWin = livePnL >= 0;
              const pct = parseFloat(trade.investedAmount) > 0 ? (livePnL / parseFloat(trade.investedAmount)) * 100 : 0;

              return (
                <div key={trade.id} className="trade-card">
                  
                  {/* Top Block */}
                  <div className="trade-card-header">
                    <div className="trade-title-row">
                      <FlagIcon code={baseCode(trade.ticker)} size={36} className="drop-shadow-sm" />
                      <div>
                        <h3 className="trade-symbol leading-tight">{trade.ticker}</h3>
                        <p className="trade-market capitalize mt-0.5">{trade.market}</p>
                      </div>
                    </div>
                    <div className="trade-badges">
                      <span className={`trade-badge ${
                        trade.action === "BUY" ? "bg-green-950/20 text-green-400 border-green-500/30" : "bg-red-950/20 text-red-400 border-red-500/30"
                      }`}>
                        {trade.action}
                      </span>
                      <span className={`trade-badge ${
                        isWin ? "bg-green-500 text-white" : "bg-red-500 text-white"
                      }`}>
                        {isWin ? "Winning" : "Losing"}
                      </span>
                    </div>
                  </div>

                  {/* 3x2 Grid Details Block */}
                  <div className="trade-card-stats select-none">
                    <div>
                      <span>Money Used</span>
                      <strong>${parseFloat(trade.investedAmount).toFixed(2)}</strong>
                    </div>
                    <div>
                      <span>Started At Price</span>
                      <strong>${parseFloat(trade.entryPrice).toFixed(trade.entryPrice < 1 ? 4 : 2)}</strong>
                    </div>
                    <div>
                      <span>Current Result</span>
                      <strong className={isWin ? "text-green-500" : "text-red-500"}>
                        {isWin ? "+" : ""}${livePnL.toFixed(2)}
                      </strong>
                    </div>
                    <div>
                      <span>Amount Bought</span>
                      <strong>{parseFloat(trade.units).toFixed(4)}</strong>
                    </div>
                    <div>
                      <span>Current Price</span>
                      <strong>${(livePrices[trade.ticker]?.price ?? parseFloat(trade.entryPrice)).toFixed(trade.entryPrice < 1 ? 4 : 2)}</strong>
                    </div>
                    <div>
                      <span>Change</span>
                      <strong className={pct >= 0 ? "text-green-500" : "text-red-500"}>
                        {pct >= 0 ? "+" : ""}{pct.toFixed(2)}%
                      </strong>
                    </div>
                  </div>

                  {/* Open Time */}
                  <div className="text-[12px] text-slate-500 font-semibold mb-2 text-left">
                    Open Time: <span className="text-white font-bold">{getOpenTimeAgo(trade.entryAt)}</span>
                  </div>

                  {/* Buttons Grid */}
                  <div className="trade-card-actions">
                    <button
                      onClick={() => setSelectedTrade(trade)}
                      className="review-button"
                    >
                      Review Trade
                    </button>
                    <button
                      onClick={() => setTradeToClose(trade)}
                      className="close-button"
                    >
                      Close Trade
                    </button>
                  </div>

                </div>
              );
            })}
          </div>
        ) : (
          /* Advanced Table View */
          <div className="rounded-2xl border overflow-hidden mb-8 bg-[#0b1626]" style={{ borderColor: "var(--color-border-strong)" }}>
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-800" style={{ background: "#06111f" }}>
                  {["Trade", "Type", "Buy / Sell", "Started At Price", "Amount Bought", "Money Used", "Current Result", "Close Trade"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {openTrades.map((trade: any) => {
                  const livePnL = calculateLivePnL(trade, livePrices);
                  const isWin = livePnL >= 0;
                  const pct = parseFloat(trade.investedAmount) > 0 ? (livePnL / parseFloat(trade.investedAmount)) * 100 : 0;
                  return (
                    <tr key={trade.id} className="hover:bg-slate-900/30 transition-all">
                      <td className="px-5 py-4 font-black text-white">{trade.ticker}</td>
                      <td className="px-5 py-4 text-xs font-semibold capitalize text-blue-400">{trade.market}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 border text-[9px] font-extrabold uppercase rounded ${
                          trade.action === "BUY" ? "bg-green-950/20 text-green-400 border-green-500/30" : "bg-red-950/20 text-red-400 border-red-500/30"
                        }`}>
                          {trade.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-white">${parseFloat(trade.entryPrice).toFixed(trade.entryPrice < 1 ? 4 : 2)}</td>
                      <td className="px-5 py-4 font-mono text-xs text-white">{parseFloat(trade.units).toFixed(4)}</td>
                      <td className="px-5 py-4 font-mono text-xs text-white">${parseFloat(trade.investedAmount).toFixed(2)}</td>
                      <td className="px-5 py-4">
                        <div className="flex flex-col">
                          <span className={`font-black text-xs ${isWin ? "text-green-500" : "text-red-500"}`}>
                            {isWin ? "+" : ""}${livePnL.toFixed(2)}
                          </span>
                          <span className={`text-[9px] font-semibold mt-0.5 ${pct >= 0 ? "text-green-400" : "text-red-400"}`}>
                            {pct >= 0 ? "+" : ""}{pct.toFixed(1)}%
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <button
                          onClick={() => setTradeToClose(trade)}
                          className="h-8 px-3 rounded border border-red-500/40 hover:bg-red-500/10 text-red-400 text-[10px] font-black transition-all cursor-pointer"
                        >
                          Close
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Trade History Section */}
        <h2 className="section-title mt-8 mb-1">Trade History</h2>
        <p className="section-subtitle mb-4">Your completed trades will appear here.</p>

        {closedTrades.length === 0 ? (
          /* Educational Empty State Card */
          <div className="trade-history-empty">
            <EmptyStateArt name="trade_history" fallbackIcon="fas fa-clipboard-list" size={96} />
            <div>
              <h4 className="text-base font-black text-white">No completed trades yet</h4>
              <p className="text-[13px] text-slate-400 font-semibold mt-1 leading-relaxed">
                When you close a trade, it will show up here with helpful details:
              </p>
              <div className="flex flex-wrap gap-2 mt-2.5 mb-2">
                {["Starting amount", "Final result", "Profit or loss", "Open time", "Close time", "Why the trade won or lost"].map((item, idx) => (
                  <span key={idx} className="text-[10px] font-extrabold uppercase bg-slate-950 text-slate-400 px-2 py-1 rounded border border-slate-800">
                    {item}
                  </span>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 font-bold leading-relaxed">
                Keep practicing — your trade history will grow as you go!
              </p>
            </div>
          </div>
        ) : (
          /* Closed trades list */
          <div className="rounded-2xl border overflow-hidden mb-8 bg-[#0b1626]" style={{ borderColor: "var(--color-border-strong)" }}>
            <table className="w-full text-sm text-left">
              <thead>
                <tr className="border-b border-slate-800" style={{ background: "#06111f" }}>
                  {["Trade", "Type", "Buy / Sell", "Entry", "Exit Price", "PnL", "Date"].map(h => (
                    <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {closedTrades.map((trade: any) => {
                  const pnlVal = parseFloat(trade.pnl ?? 0);
                  const isWin = pnlVal >= 0;
                  return (
                    <tr key={trade.id} className="hover:bg-slate-900/30 transition-all">
                      <td className="px-5 py-4 font-black text-white">{trade.ticker}</td>
                      <td className="px-5 py-4 text-xs font-semibold capitalize text-blue-400">{trade.market}</td>
                      <td className="px-5 py-4">
                        <span className={`px-2 py-0.5 border text-[9px] font-extrabold uppercase rounded ${
                          trade.action === "BUY" ? "bg-green-950/20 text-green-400 border-green-500/30" : "bg-red-950/20 text-red-400 border-red-500/30"
                        }`}>
                          {trade.action}
                        </span>
                      </td>
                      <td className="px-5 py-4 font-mono text-xs text-white">${parseFloat(trade.entryPrice).toFixed(trade.entryPrice < 1 ? 4 : 2)}</td>
                      <td className="px-5 py-4 font-mono text-xs text-white">
                        {trade.exitPrice ? `$${parseFloat(trade.exitPrice).toFixed(trade.entryPrice < 1 ? 4 : 2)}` : "—"}
                      </td>
                      <td className={`px-5 py-4 font-black text-xs ${isWin ? "text-green-500" : "text-red-500"}`}>
                        {isWin ? "+" : ""}${pnlVal.toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-xs text-slate-500 font-semibold">
                        {new Date(trade.entryAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Bottom Actions Row */}
        <div className="bottom-actions mb-6">
          <button
            onClick={() => setShowReset(true)}
            className="bottom-action-button reset-button flex items-center justify-center gap-2.5"
          >
            <i className="fas fa-history"></i>
            Reset Practice Portfolio
          </button>
          <button
            onClick={handleExportCSV}
            className="bottom-action-button flex items-center justify-center gap-2.5"
          >
            <i className="fas fa-file-download"></i>
            Export Trade History
          </button>
          <button
            onClick={logout}
            className="bottom-action-button flex items-center justify-center gap-2.5"
          >
            <i className="fas fa-sign-out-alt"></i>
            Sign Out
          </button>
        </div>

      </div>

      {/* ─── Review Trade Modal ─── */}
      {selectedTrade && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[999] animate-fade-in select-none text-left">
          <div className="w-full max-w-md rounded-2xl border p-6 relative" style={{ background: "var(--color-card-deep)", borderColor: "var(--color-border-strong)" }}>
            
            <button
              onClick={() => setSelectedTrade(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white text-sm outline-none cursor-pointer"
            >
              <i className="fas fa-times"></i>
            </button>

            <h3 className="text-base font-black text-white flex items-center gap-2 mb-1">
              <i className="fas fa-search-plus text-blue-400"></i>
              Trade Details
            </h3>
            <p className="text-[10px] text-slate-500 font-bold mb-4">
              {currentMode === "live" ? "Live Account Connected Order" : "Practice Position Metrics"}
            </p>

            <div className="rounded-xl border p-4 bg-slate-950/40 border-slate-900 flex flex-col gap-2.5 mb-4">
              <div className="flex justify-between text-xs border-b border-slate-900 pb-1.5">
                <span className="text-slate-500 font-semibold">Asset Name</span>
                <span className="text-white font-black">{selectedTrade.ticker} ({selectedTrade.market})</span>
              </div>
              <div className="flex justify-between text-xs border-b border-slate-900 pb-1.5">
                <span className="text-slate-500 font-semibold">Direction</span>
                <span className={`font-black uppercase ${selectedTrade.action === "BUY" ? "text-green-500" : "text-red-500"}`}>
                  {selectedTrade.action}
                </span>
              </div>
              <div className="flex justify-between text-xs border-b border-slate-900 pb-1.5">
                <span className="text-slate-500 font-semibold">Started At Price</span>
                <span className="text-white font-mono">${parseFloat(selectedTrade.entryPrice).toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-slate-900 pb-1.5">
                <span className="text-slate-500 font-semibold">Current Price</span>
                <span className="text-white font-mono">${(livePrices[selectedTrade.ticker]?.price ?? parseFloat(selectedTrade.entryPrice)).toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-slate-900 pb-1.5">
                <span className="text-slate-500 font-semibold">Money Used</span>
                <span className="text-white font-black">${parseFloat(selectedTrade.investedAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-semibold">Current P&L</span>
                <span className={`font-black ${calculateLivePnL(selectedTrade, livePrices) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formatMoney(calculateLivePnL(selectedTrade, livePrices))}
                </span>
              </div>
            </div>

            {/* Beginner explanation */}
            <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-3.5 mb-5">
              <div className="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">Status Explanation</div>
              <p className="text-[11px] text-slate-300 font-medium leading-relaxed">
                This trade is still open. It is currently moving {calculateLivePnL(selectedTrade, livePrices) >= 0 ? "in favor of" : "slightly against"} your prediction. The final result can change until you close the trade.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSelectedTrade(null)}
                className="h-10 px-4 rounded-xl text-xs font-extrabold text-slate-400 hover:text-white cursor-pointer"
              >
                Keep Watching
              </button>
              <button
                onClick={() => {
                  setTradeToClose(selectedTrade);
                  setSelectedTrade(null);
                }}
                className="h-10 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-extrabold transition-all cursor-pointer"
              >
                Close Trade
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── Close Position Modal ─── */}
      {tradeToClose && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[999] animate-fade-in select-none text-left">
          <div className="w-full max-w-md rounded-2xl border p-6 relative" style={{ background: "var(--color-card-deep)", borderColor: currentMode === "live" ? "#ef4444" : "#1e3555" }}>
            
            <button
              onClick={() => {
                setTradeToClose(null);
                setCloseCheckbox(false);
              }}
              className="absolute top-4 right-4 text-slate-500 hover:text-white text-sm outline-none cursor-pointer"
            >
              <i className="fas fa-times"></i>
            </button>

            <h3 className={`text-base font-black flex items-center gap-2 mb-1.5 ${currentMode === "live" ? "text-red-500" : "text-white"}`}>
              <i className="fas fa-times-circle"></i>
              Close this {currentMode === "live" ? "live" : "practice"} trade?
            </h3>
            
            <p className="text-xs font-semibold text-slate-400 mb-4 leading-relaxed">
              {currentMode === "live" 
                ? "This uses real money. The final price may change before the order is completed." 
                : "This will close the trade using practice money. No real money is involved."}
            </p>

            <div className="rounded-xl border p-4 bg-slate-950/40 border-slate-900 flex flex-col gap-2.5 mb-4">
              <div className="flex justify-between text-xs border-b border-slate-900 pb-1.5">
                <span className="text-slate-500 font-semibold">Trade Ticker</span>
                <span className="text-white font-black">{tradeToClose.ticker}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-slate-900 pb-1.5">
                <span className="text-slate-500 font-semibold">Money Used</span>
                <span className="text-white font-black">${parseFloat(tradeToClose.investedAmount).toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-slate-900 pb-1.5">
                <span className="text-slate-500 font-semibold">Current Result</span>
                <span className={`font-black ${calculateLivePnL(tradeToClose, livePrices) >= 0 ? "text-green-500" : "text-red-500"}`}>
                  {formatMoney(calculateLivePnL(tradeToClose, livePrices))}
                </span>
              </div>
              <div className="flex justify-between text-xs">
                <span className="text-slate-500 font-semibold">Estimated Final Return</span>
                <span className="text-white font-black">
                  ${(parseFloat(tradeToClose.investedAmount) + calculateLivePnL(tradeToClose, livePrices)).toFixed(2)}
                </span>
              </div>
            </div>

            {/* Mandatory Checkbox for Live Mode */}
            {currentMode === "live" && (
              <div className="mb-5">
                <label className="flex items-start gap-2.5 cursor-pointer text-[10px] font-bold text-slate-400">
                  <input
                    type="checkbox"
                    checked={closeCheckbox}
                    onChange={(e) => setCloseCheckbox(e.target.checked)}
                    className="mt-0.5"
                  />
                  <span>I understand this is a live trade using real money.</span>
                </label>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setTradeToClose(null);
                  setCloseCheckbox(false);
                }}
                className="h-10 px-4 rounded-xl text-xs font-extrabold text-slate-400 hover:text-white cursor-pointer"
              >
                Keep Trade Open
              </button>
              <button
                onClick={() => closeMutation.mutate({ id: tradeToClose.id, isLive: currentMode === "live" })}
                disabled={(currentMode === "live" && !closeCheckbox) || closeMutation.isPending}
                className={`h-10 px-5 rounded-xl text-xs font-black transition-all cursor-pointer disabled:opacity-40 ${
                  currentMode === "live" ? "bg-red-600 hover:bg-red-700 text-white" : "bg-blue-600 hover:bg-blue-700 text-white"
                }`}
              >
                {closeMutation.isPending ? "Closing..." : (currentMode === "live" ? "Close Live Trade" : "Close Practice Trade")}
              </button>
            </div>

          </div>
        </div>
      )}

      {/* ─── Reset Confirmation Modal ─── */}
      {showReset && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 border" style={{ background: "var(--color-card-deep)", borderColor: "#ef4444" }}>
            <div className="text-base font-black text-red-500 mb-2 flex items-center gap-2">
              <i className="fas fa-exclamation-triangle"></i>
              Reset Practice Portfolio?
            </div>
            <div className="text-xs mb-5 text-slate-400 font-semibold leading-relaxed">
              This will reset your practice balance back to $10,000 and close all open practice positions. This action is permanent and cannot be undone.
            </div>
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setShowReset(false)}
                className="h-10 px-4 rounded-xl text-xs font-extrabold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                className="h-10 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all cursor-pointer"
              >
                {resetMutation.isPending ? "Resetting..." : "Yes, Reset Portfolio"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
