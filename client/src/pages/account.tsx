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
import type { AutoTradePlan } from "@shared/schema";
import { apiJson } from "@/lib/queryClient";

// Extracts the leading currency/asset code from a ticker like "EUR-USD" or "GOLD"
function baseCode(ticker: string): string {
  return ticker.split(/[-\/]/)[0];
}

// Live trade profit/loss calculation helper
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

// ─── Collapsible Auto Trading Plan Card ───
function AutoPlanCard({
  plan,
  token,
  livePrices,
  onStop,
  onReinvest
}: {
  plan: any;
  token: string;
  livePrices: any;
  onStop: (id: string) => void;
  onReinvest: (plan: any) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Lazy query: enabled only when card is expanded
  const { data: details } = useQuery<any>({
    queryKey: ["/api/auto-trades/plans", plan.id],
    queryFn: () => apiJson<any>(`/api/auto-trades/plans/${plan.id}`),
    enabled: isOpen,
    refetchInterval: isOpen ? 5000 : false, // Poll updates every 5 seconds when open
  });

  const currentPrice = livePrices[plan.symbol]?.price ?? parseFloat(plan.initialAmount);
  const activeCycle = details?.cycles?.find((c: any) => c.status === "open");

  let currentPnL = 0;
  let currentPct = 0;
  if (activeCycle) {
    const entry = parseFloat(String(activeCycle.entryPrice || plan.initialAmount));
    const invested = parseFloat(String(activeCycle.startingAmount));
    const directionFactor = plan.direction === "SELL" ? -1 : 1;
    const pct = (currentPrice - entry) / entry;
    currentPnL = directionFactor * pct * invested;
    currentPct = directionFactor * pct * 100;
  }

  const statusColors: Record<string, string> = {
    active: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    stopped: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
    completed: "bg-green-500/10 text-green-400 border border-green-500/20",
    failed: "bg-red-500/10 text-red-400 border border-red-500/20",
  };

  return (
    <div className="rounded-2xl border bg-[#0b1626] border-slate-800 p-5 text-left flex flex-col gap-4 select-none">
      <div className="flex justify-between items-start">
        <div>
          <h3 className="text-sm font-black text-white flex items-center gap-1.5">
            {plan.symbol.replace("-", "/")}
            <span className={`text-[8px] font-extrabold uppercase px-1.5 py-0.5 rounded border ${
              plan.direction === "BUY" ? "bg-green-950/20 text-green-400 border-green-500/30" : "bg-red-950/20 text-red-400 border-red-500/30"
            }`}>
              {plan.direction}
            </span>
          </h3>
          <p className="text-[10px] text-slate-500 font-semibold mt-0.5 capitalize">{plan.market} Auto Plan</p>
        </div>
        <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${statusColors[plan.status] || "bg-slate-500/10 text-slate-400 border border-slate-500/20"}`}>
          {plan.status}
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-slate-950/40 p-3 rounded-xl text-xs">
        <div>
          <span className="text-slate-500 block text-[10px] font-bold uppercase mb-0.5">Initial Amt</span>
          <strong className="text-white">${parseFloat(plan.initialAmount).toFixed(2)}</strong>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] font-bold uppercase mb-0.5">Current Amt</span>
          <strong className="text-white">${parseFloat(plan.currentCycleAmount).toFixed(2)}</strong>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] font-bold uppercase mb-0.5">Cycles Run</span>
          <strong className="text-white">{plan.completedCycles} / {plan.maxCycles}</strong>
        </div>
        <div>
          <span className="text-slate-500 block text-[10px] font-bold uppercase mb-0.5">Compounding</span>
          <strong className="text-blue-400 capitalize">{plan.reinvestMode.replace(/_/g, " ")}</strong>
        </div>
      </div>

      {plan.status === "active" && activeCycle && (
        <div className="bg-[#101d31]/50 border border-slate-850 p-3.5 rounded-xl flex justify-between items-center text-xs border-box">
          <div>
            <div className="text-[9px] text-slate-400 font-bold uppercase">Active Cycle #{activeCycle.cycleNumber} Result</div>
            <div className={`text-base font-black mt-0.5 ${currentPnL >= 0 ? "text-green-500" : "text-red-500"}`}>
              {currentPnL >= 0 ? "+" : ""}${currentPnL.toFixed(2)} ({currentPct >= 0 ? "+" : ""}{currentPct.toFixed(1)}%)
            </div>
          </div>
          <div>
            <button
              onClick={() => onStop(plan.id)}
              className="h-8 px-4 rounded border border-orange-500/40 hover:bg-orange-500/10 text-orange-400 text-[10px] font-black cursor-pointer transition-all"
            >
              Stop Plan
            </button>
          </div>
        </div>
      )}

      <div className="flex gap-2">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex-1 h-9 rounded bg-[#101d31]/75 hover:bg-[#101d31] text-[10px] font-black uppercase text-slate-350 border border-slate-800 cursor-pointer flex items-center justify-center gap-1 transition-all"
        >
          <i className={`fas ${isOpen ? "fa-chevron-up" : "fa-chevron-down"}`}></i>
          {isOpen ? "Hide Cycle History" : "View History & Events"}
        </button>

        <button
          onClick={() => onReinvest(plan)}
          className="h-9 px-3 rounded bg-slate-900 border border-slate-800 text-[10px] font-black uppercase text-blue-400 hover:text-blue-300 cursor-pointer transition-all"
        >
          Configure Reinvest
        </button>
      </div>

      {isOpen && (
        <div className="mt-2 pt-4 border-t border-slate-900 flex flex-col gap-4">
          <div>
            <div className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-2">Cycle Run Logs</div>
            {!details?.cycles || details.cycles.length === 0 ? (
              <p className="text-[10px] text-slate-500 italic">No cycle runs logged yet.</p>
            ) : (
              <div className="flex flex-col gap-2">
                {details.cycles.map((c: any) => {
                  const pnl = parseFloat(c.profitLoss || "0");
                  return (
                    <div key={c.id} className="flex justify-between items-center text-xs p-2 rounded bg-slate-950/20 border border-slate-900">
                      <div>
                        <span className="font-black text-slate-300">Cycle #{c.cycleNumber}</span>
                        <span className="text-[9px] font-semibold text-slate-550 ml-2 capitalize">{c.status}</span>
                      </div>
                      <span className={`font-mono font-bold ${pnl >= 0 ? "text-green-500" : "text-red-500"}`}>
                        {c.status === "open" ? "Active" : `${pnl >= 0 ? "+" : ""}$${pnl.toFixed(2)}`}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          <div>
            <div className="text-[10px] text-slate-500 font-black uppercase tracking-wider mb-2">System Audit Logs</div>
            {!details?.events || details.events.length === 0 ? (
              <p className="text-[10px] text-slate-550 italic">No audit events found.</p>
            ) : (
              <div className="flex flex-col gap-1.5 max-h-40 overflow-y-auto">
                {details.events.map((ev: any) => (
                  <div key={ev.id} className="text-[10px] text-slate-400 font-medium leading-normal bg-slate-950/10 p-2 rounded">
                    <span className="text-slate-550 font-bold mr-1.5">
                      {new Date(ev.createdAt).toLocaleTimeString("en-US", { hour: "numeric", minute: "numeric", second: "numeric" })}
                    </span>
                    {ev.message}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main My Trades Page ───
export default function AccountPage() {
  const { user, token, logout, updateBalance } = useAuth();
  const { tradingMode, setMode, connectedLiveAccount } = useTradingMode();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<"manual" | "auto" | "history">("manual");
  const [viewType, setViewType] = useState<"beginner" | "advanced">("beginner");
  const [selectedTrade, setSelectedTrade] = useState<DisplayTrade | null>(null);
  const [tradeToClose, setTradeToClose] = useState<DisplayTrade | null>(null);
  const [closeCheckbox, setCloseCheckbox] = useState(false);
  const [showReset, setShowReset] = useState(false);

  // Reinvestment Choice Modal states
  const [reinvestModalPlan, setReinvestModalPlan] = useState<any | null>(null);
  const [reinvestModalMode, setReinvestModalMode] = useState<string>("none");

  const { prices: livePrices } = useLivePrices();

  // Query trades
  const { data: trades = [], isLoading } = useQuery<Trade[]>({
    queryKey: ["/api/trades"],
    queryFn: () => apiJson<Trade[]>("/api/trades"),
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

  // Query auto trading plans
  const { data: autoPlans = [] } = useQuery<AutoTradePlan[]>({
    queryKey: ["/api/auto-trades/plans"],
    queryFn: () => apiJson<AutoTradePlan[]>("/api/auto-trades/plans"),
    enabled: !!token,
    refetchInterval: 10000, // Poll every 10s
  });

  const activePlans = autoPlans.filter(p => p.mode === tradingMode);

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
        if (data.newBalance != null) updateBalance(Number(data.newBalance));
      }
      toast({ 
        title: `Position Closed`, 
        description: vars.isLive 
          ? "Sandbox position closed successfully." 
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
      queryClient.invalidateQueries({ queryKey: ["/api/auto-trades/plans"] });
      setShowReset(false);
    },
  });

  // Stop Auto Trading plan mutation
  const stopPlanMutation = useMutation({
    mutationFn: async (planId: string) => {
      const res = await fetch(`/api/auto-trades/plans/${planId}/stop`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to stop auto plan");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Auto Plan Stopped 🤖",
        description: "Your active auto trading cycle has been closed and credited."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auto-trades/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (e: any) => {
      toast({
        title: "Failed to Stop Plan",
        description: e.message,
        variant: "destructive"
      });
    }
  });

  // Configure Reinvestment Mode mutation
  const reinvestMutation = useMutation({
    mutationFn: async ({ planId, reinvestMode }: { planId: string; reinvestMode: string }) => {
      const res = await fetch(`/api/auto-trades/plans/${planId}/reinvest`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ reinvestMode }),
      });
      if (!res.ok) throw new Error("Failed to update reinvest configuration");
      return res.json();
    },
    onSuccess: () => {
      toast({
        title: "Reinvestment Configuration Saved",
        description: "Compounding rules updated successfully."
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auto-trades/plans"] });
      setReinvestModalPlan(null);
    },
    onError: (e: any) => {
      toast({
        title: "Failed to Save Reinvestment",
        description: e.message,
        variant: "destructive"
      });
    }
  });

  const currentMode = tradingMode; 
  
  type DisplayTrade = Trade & { isLive: boolean };
  const allMergedTrades: DisplayTrade[] = trades.map(t => ({
    ...t,
    isLive: false,
  }));

  orders.filter((o: any) => o.mode === "live").forEach((o: any) => {
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
        pnl: String(parseFloat(o.estimatedCost) * 0.1),
        isLive: o.mode === "live",
      });
    }
  });

  const modeFilteredTrades = allMergedTrades.filter(t => currentMode === "live" ? t.isLive : !t.isLive);
  const openTrades = modeFilteredTrades.filter(t => t.status === "OPEN");
  const closedTrades = modeFilteredTrades.filter(t => t.status === "CLOSED");

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

  const handleOpenReinvestModal = (plan: any) => {
    setReinvestModalPlan(plan);
    setReinvestModalMode(plan.reinvestMode);
  };

  return (
    <div className="select-none text-left page-container page-glow min-h-screen lg:pb-8" style={{ background: "var(--color-bg-deep)" }}>
      <div className="px-4 lg:px-8 pt-6 max-w-none">
        
        {/* Header Block */}
        <div className="page-header">
          <div>
            <h1 className="page-title">My Trades</h1>
            <p className="page-subtitle">
              Track your practice and broker-sandbox trades in simple language.
            </p>
          </div>
          {/* Segmented Toggle switches Practice / Broker Sandbox */}
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
              Sandbox
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
              Broker Sandbox — Orders and balances are simulated. No real broker order is sent.
            </div>
          </div>
        )}

        {/* Summary Stat Cards Grid */}
        <div className="summary-grid">
          <StatCard
            icon="fas fa-wallet"
            label={currentMode === "live" ? "Sandbox Balance" : "Practice Balance"}
            value={balance.toLocaleString("en-US", { style: "currency", currency: "USD" })}
            valueClass="text-blue-400"
            helper={currentMode === "live" ? "Simulated buying power in the broker sandbox." : "Virtual money you can use for practice trades."}
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
            value={formatMoney(bestTrade)}
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
        {openTrades.length > 0 && (
          <div className="happening-card select-none">
            <div className="happening-icon">
              <i className="fas fa-comment-alt-dots text-lg"></i>
            </div>
            <div>
              <div className="text-xs text-slate-500 font-black uppercase tracking-wider">What's Happening Now</div>
              <p className="text-[13px] text-slate-350 font-semibold mt-1 leading-normal">
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
        )}

        {/* Navigation Tabs Filter Segmented */}
        <div className="flex border-b border-slate-900 mb-6 mt-8 select-none">
          <button
            type="button"
            onClick={() => setActiveTab("manual")}
            className={`h-11 px-6 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === "manual" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Manual Trades ({openTrades.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("auto")}
            className={`h-11 px-6 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === "auto" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Auto Trades ({activePlans.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("history")}
            className={`h-11 px-6 text-xs font-black uppercase tracking-wider transition-all border-b-2 cursor-pointer ${
              activeTab === "history" ? "border-blue-500 text-blue-400" : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Trade History ({closedTrades.length})
          </button>
        </div>

        {/* ─── TAB 1: MANUAL TRADES ─── */}
        {activeTab === "manual" && (
          <div>
            <div className="section-header-row mb-4">
              <div>
                <h2 className="section-title">Open Manual Positions</h2>
                <p className="section-subtitle">These are your active open positions.</p>
              </div>
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

            {openTrades.length === 0 ? (
              <div className="rounded-2xl border p-8 text-center text-slate-500 mb-6 bg-[#0b1626] flex flex-col items-center select-none" style={{ borderColor: "var(--color-border-strong)" }}>
                <EmptyStateArt name="open_trades" fallbackIcon="fas fa-chart-line" size={140} className="mb-2.5" />
                <div className="text-xs font-black text-slate-400">No open manual trades at the moment</div>
                <Link href="/markets" className="text-[10px] font-extrabold text-blue-400 hover:text-blue-300 block mt-2 cursor-pointer">
                  Go to Choose a Trade page to find opportunities →
                </Link>
              </div>
            ) : viewType === "beginner" ? (
              <div className="open-trades-grid">
                {openTrades.map((trade: any) => {
                  const livePnL = calculateLivePnL(trade, livePrices);
                  const isWin = livePnL >= 0;
                  const pct = parseFloat(trade.investedAmount) > 0 ? (livePnL / parseFloat(trade.investedAmount)) * 100 : 0;

                  return (
                    <div key={trade.id} className="trade-card">
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
                          <span className={`trade-badge ${isWin ? "bg-green-500 text-white" : "bg-red-500 text-white"}`}>
                            {isWin ? "Winning" : "Losing"}
                          </span>
                        </div>
                      </div>

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

                      <div className="text-[12px] text-slate-500 font-semibold mb-2 text-left">
                        Open Time: <span className="text-white font-bold">{getOpenTimeAgo(trade.entryAt)}</span>
                      </div>

                      <div className="trade-card-actions">
                        <button onClick={() => setSelectedTrade(trade)} className="review-button">Review</button>
                        <button onClick={() => setTradeToClose(trade)} className="close-button">Close Position</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="rounded-2xl border overflow-hidden mb-6 bg-[#0b1626]" style={{ borderColor: "var(--color-border-strong)" }}>
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-800" style={{ background: "#06111f" }}>
                      {["Symbol", "Market", "Type", "Entry Price", "Quantity", "Invested", "PnL", "Action"].map(h => (
                        <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 select-none">
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
          </div>
        )}

        {/* ─── TAB 2: AUTO TRADES ─── */}
        {activeTab === "auto" && (
          <div>
            <div className="section-header-row mb-6">
              <div>
                <h2 className="section-title">Active Auto Trading Plans</h2>
                <p className="section-subtitle">Automated setups evaluating rules in the background.</p>
              </div>
            </div>

            {activePlans.length === 0 ? (
              <div className="rounded-2xl border p-12 text-center text-slate-500 mb-6 bg-[#0b1626] flex flex-col items-center select-none" style={{ borderColor: "var(--color-border-strong)" }}>
                <div className="w-16 h-16 rounded-full bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-500 text-2xl mb-4">
                  <i className="fas fa-robot animate-bounce"></i>
                </div>
                <div className="text-xs font-black text-slate-400">No active auto plans at the moment</div>
                <p className="text-[10px] text-slate-500 font-bold mt-1 max-w-xs leading-normal">
                  Toggle Auto Practice on the Choose a Trade page to build automated trading rules and cycles!
                </p>
                <Link href="/markets" className="text-[10px] font-extrabold text-blue-400 hover:text-blue-300 block mt-3.5 cursor-pointer">
                  Setup Auto Practice Plan →
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {activePlans.map((plan) => (
                  <AutoPlanCard
                    key={plan.id}
                    plan={plan}
                    token={token || ""}
                    livePrices={livePrices}
                    onStop={(id) => stopPlanMutation.mutate(id)}
                    onReinvest={handleOpenReinvestModal}
                  />
                ))}
              </div>
            )}
          </div>
        )}

        {/* ─── TAB 3: TRADE HISTORY ─── */}
        {activeTab === "history" && (
          <div>
            <div className="section-header-row mb-4">
              <div>
                <h2 className="section-title">Completed Trade History</h2>
                <p className="section-subtitle font-bold text-slate-500">Your final completed trade metrics.</p>
              </div>
            </div>

            {closedTrades.length === 0 ? (
              <div className="trade-history-empty select-none">
                <EmptyStateArt name="trade_history" fallbackIcon="fas fa-clipboard-list" size={120} />
                <div>
                  <h4 className="text-base font-black text-white">No completed trades yet</h4>
                  <p className="text-[13px] text-slate-400 font-semibold mt-1 leading-relaxed">
                    When you close a trade, it will show up here with helpful details:
                  </p>
                  <div className="flex flex-wrap gap-2 mt-2.5 mb-2">
                    {["Starting amount", "Final result", "Profit or loss", "Open time", "Close time", "Why the trade won or lost"].map((item, idx) => (
                      <span key={idx} className="text-[10px] font-extrabold uppercase bg-slate-950 text-slate-450 px-2 py-1 rounded border border-slate-900">
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
              <div className="rounded-2xl border overflow-hidden mb-8 bg-[#0b1626]" style={{ borderColor: "var(--color-border-strong)" }}>
                <table className="w-full text-sm text-left">
                  <thead>
                    <tr className="border-b border-slate-800" style={{ background: "#06111f" }}>
                      {["Trade", "Type", "Buy / Sell", "Entry", "Exit Price", "PnL", "Date"].map(h => (
                        <th key={h} className="px-5 py-3.5 text-[10px] font-black text-slate-500 uppercase tracking-wider">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 select-none">
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
          </div>
        )}

        {/* Bottom Actions Row */}
        <div className="bottom-actions mb-6 select-none">
          <button
            onClick={() => setShowReset(true)}
            className="bottom-action-button reset-button flex items-center justify-center gap-2.5 transition-all"
          >
            <i className="fas fa-history"></i>
            Reset Practice Portfolio
          </button>
          <button
            onClick={handleExportCSV}
            className="bottom-action-button flex items-center justify-center gap-2.5 transition-all"
          >
            <i className="fas fa-file-download"></i>
            Export Trade History
          </button>
          <button
            onClick={logout}
            className="bottom-action-button flex items-center justify-center gap-2.5 transition-all"
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
              {currentMode === "live" ? "Broker Sandbox Order" : "Practice Position Metrics"}
            </p>

            <div className="rounded-xl border p-4 bg-slate-950/40 border-slate-900 flex flex-col gap-2.5 mb-4">
              <div className="flex justify-between text-xs border-b border-slate-900/60 pb-1.5 border-box">
                <span className="text-slate-500 font-semibold">Asset Name</span>
                <span className="text-white font-black">{selectedTrade.ticker} ({selectedTrade.market})</span>
              </div>
              <div className="flex justify-between text-xs border-b border-slate-900/60 pb-1.5 border-box">
                <span className="text-slate-500 font-semibold">Direction</span>
                <span className={`font-black uppercase ${selectedTrade.action === "BUY" ? "text-green-500" : "text-red-500"}`}>
                  {selectedTrade.action}
                </span>
              </div>
              <div className="flex justify-between text-xs border-b border-slate-900/60 pb-1.5 border-box">
                <span className="text-slate-500 font-semibold">Started At Price</span>
                <span className="text-white font-mono">${parseFloat(selectedTrade.entryPrice).toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-slate-900/60 pb-1.5 border-box">
                <span className="text-slate-500 font-semibold">Current Price</span>
                <span className="text-white font-mono">${(livePrices[selectedTrade.ticker]?.price ?? parseFloat(selectedTrade.entryPrice)).toFixed(4)}</span>
              </div>
              <div className="flex justify-between text-xs border-b border-slate-900/60 pb-1.5 border-box">
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

            <div className="rounded-xl bg-blue-500/5 border border-blue-500/10 p-3.5 mb-5 select-none">
              <div className="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-1">Status Explanation</div>
              <p className="text-[11px] text-slate-350 font-medium leading-relaxed">
                This trade is still open. It is currently moving {calculateLivePnL(selectedTrade, livePrices) >= 0 ? "in favor of" : "slightly against"} your prediction. The final result can change until you close the trade.
              </p>
            </div>

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => setSelectedTrade(null)}
                className="h-10 px-4 rounded-xl text-xs font-extrabold text-slate-400 hover:text-white cursor-pointer"
              >
                Close Window
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Close Position Modal Confirmation ─── */}
      {tradeToClose && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[999] animate-fade-in select-none text-left">
          <div className="w-full max-w-md rounded-2xl border p-6 relative bg-[#0b1624] border-red-500/30">
            <button
              onClick={() => { setTradeToClose(null); setCloseCheckbox(false); }}
              className="absolute top-4 right-4 text-slate-500 hover:text-white text-sm outline-none cursor-pointer"
            >
              <i className="fas fa-times"></i>
            </button>

            <h3 className="text-base font-black text-white flex items-center gap-2 mb-1">
              <i className="fas fa-times-circle text-red-500 animate-pulse"></i>
              Close Position Confirmation
            </h3>
            <p className="text-[10px] text-slate-500 font-bold mb-4 uppercase">
              {currentMode === "live" ? "Sandbox position close" : "Virtual position termination"}
            </p>

            <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-lg text-[10px] text-red-400 font-bold leading-normal mb-4">
              ⚠️ Closing this position immediately locks in your current result of <span className="text-white font-black">${calculateLivePnL(tradeToClose, livePrices).toFixed(2)}</span>.
            </div>

            <div className="flex flex-col gap-4 text-xs font-bold text-slate-350">
              <label className="flex gap-2.5 items-start cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={closeCheckbox}
                  onChange={(e) => setCloseCheckbox(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500 mt-0.5"
                />
                <span className="leading-relaxed">
                  I understand this action will exit the trade at the current market price.
                </span>
              </label>
            </div>

            <div className="flex gap-3 justify-end mt-6">
              <button
                onClick={() => { setTradeToClose(null); setCloseCheckbox(false); }}
                className="h-10 px-4 rounded-xl text-xs font-extrabold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={!closeCheckbox || closeMutation.isPending}
                onClick={() => closeMutation.mutate({ id: tradeToClose.id, isLive: tradeToClose.isLive })}
                className="h-10 px-6 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Close Trade Now
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reset Practice Portfolio Modal ─── */}
      {showReset && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[999] animate-fade-in select-none text-left">
          <div className="w-full max-w-md rounded-2xl border p-6 relative bg-[#0b1624] border-red-500/30">
            <button onClick={() => setShowReset(false)} className="absolute top-4 right-4 text-slate-500 hover:text-white text-sm cursor-pointer">
              <i className="fas fa-times"></i>
            </button>
            <h3 className="text-base font-black text-white flex items-center gap-2 mb-1">
              <i className="fas fa-history text-red-500 animate-pulse"></i>
              Reset Practice Portfolio
            </h3>
            <p className="text-xs text-slate-450 font-semibold my-4 leading-normal">
              This will wipe out all practice history and reset your virtual balance to <strong className="text-white">$10,000.00</strong>. This cannot be undone.
            </p>
            <div className="flex gap-3 justify-end select-none">
              <button onClick={() => setShowReset(false)} className="h-10 px-4 rounded-xl text-xs font-extrabold text-slate-450 hover:text-white cursor-pointer">Cancel</button>
              <button
                disabled={resetMutation.isPending}
                onClick={() => resetMutation.mutate()}
                className="h-10 px-6 rounded-xl bg-red-650 hover:bg-red-700 text-white text-xs font-black cursor-pointer transition-all disabled:opacity-40"
              >
                Reset Portfolio
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reinvest Choice / Compounding Settings Modal ─── */}
      {reinvestModalPlan && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[999] animate-fade-in select-none text-left">
          <div className="w-full max-w-md rounded-2xl border p-6 relative bg-[#0b1624] border-blue-500/35">
            <button onClick={() => setReinvestModalPlan(null)} className="absolute top-4 right-4 text-slate-550 hover:text-white text-sm cursor-pointer">
              <i className="fas fa-times"></i>
            </button>
            <h3 className="text-base font-black text-white flex items-center gap-2 mb-1">
              <i className="fas fa-robot text-blue-400"></i>
              Compounding & Reinvest Setup
            </h3>
            <p className="text-[10px] text-slate-550 font-bold mb-4 uppercase">
              Configure profit reinvestment rules for this plan
            </p>

            <div className="flex flex-col gap-3 my-4 text-xs font-bold text-slate-350">
              <label className="flex gap-2.5 items-center p-3 rounded-lg border border-slate-900 bg-slate-950/20 cursor-pointer select-none">
                <input
                  type="radio"
                  name="reinvest"
                  value="none"
                  checked={reinvestModalMode === "none"}
                  onChange={() => setReinvestModalMode("none")}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="block text-white">Keep Profit</span>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Your profit stays in your balance.</span>
                </div>
              </label>

              <label className="flex gap-2.5 items-center p-3 rounded-lg border border-slate-900 bg-slate-950/20 cursor-pointer select-none">
                <input
                  type="radio"
                  name="reinvest"
                  value="profit_only"
                  checked={reinvestModalMode === "profit_only"}
                  onChange={() => setReinvestModalMode("profit_only")}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="block text-white">Reinvest Profit Only</span>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Only the money you made goes into the next trade cycle.</span>
                </div>
              </label>

              <label className="flex gap-2.5 items-center p-3 rounded-lg border border-slate-900 bg-slate-950/20 cursor-pointer select-none">
                <input
                  type="radio"
                  name="reinvest"
                  value="profit_plus_principal"
                  checked={reinvestModalMode === "profit_plus_principal"}
                  onChange={() => setReinvestModalMode("profit_plus_principal")}
                  className="w-4 h-4 text-blue-600 focus:ring-blue-500"
                />
                <div>
                  <span className="block text-white">Reinvest Profit + Original Amount</span>
                  <span className="text-[10px] text-slate-500 font-semibold block mt-0.5">Your original trade amount and profit go into the next trade.</span>
                </div>
              </label>
            </div>

            <div className="bg-slate-950/40 p-3 rounded-lg text-[10px] text-slate-450 leading-relaxed font-bold mb-4">
              ⚠️ <strong className="text-white">Note:</strong> Reinvesting can grow your balance faster, but it can also lose your profits faster.
            </div>

            <div className="flex gap-3 justify-end select-none">
              <button onClick={() => setReinvestModalPlan(null)} className="h-10 px-4 rounded-xl text-xs font-extrabold text-slate-450 hover:text-white cursor-pointer">Cancel</button>
              <button
                disabled={reinvestMutation.isPending}
                onClick={() => reinvestMutation.mutate({ planId: reinvestModalPlan.id, reinvestMode: reinvestModalMode })}
                className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black cursor-pointer transition-all disabled:opacity-40"
              >
                Save Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
