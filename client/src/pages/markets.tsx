import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiJson } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TradingOpportunity, LearnProgress, TradingAccount } from "@shared/schema";
import { useTradingMode } from "@/contexts/TradingModeContext";
import LiveOrderPreviewModal from "@/components/trade/LiveOrderPreviewModal";
import ModeSwitch from "@/components/trade/ModeSwitch";
import { useLocation } from "wouter";

import MarketSelector from "@/components/trade/MarketSelector";
import DurationSelector from "@/components/trade/DurationSelector";
import AmountSelector from "@/components/trade/AmountSelector";
import ProtectionNotice from "@/components/trade/ProtectionNotice";
import BestMatchTradeCard from "@/components/trade/BestMatchTradeCard";
import SmallTradeCard from "@/components/trade/SmallTradeCard";
import PracticeFooter from "@/components/trade/PracticeFooter";
import { useLivePrices } from "@/hooks/useLivePrices";
import PageHeader from "@/components/shared/PageHeader";
import { DEFAULT_IDEAS } from "@/lib/defaultIdeas";
import type { TradeIdea, LiveOrderPreview } from "@/lib/types";
import { readSavedTradeDefaults } from "@/lib/preferences";

interface AutoPlanDraft {
  mode: "paper" | "live"; market: string; symbol: string; direction: string;
  initialAmount: number; reinvestMode: string; maxCycles: number;
  maxDailyTrades: number; stopAfterLoss: boolean; maxDailyLoss: string;
  profitGoalAmount: string; closeAfterMinutes: number;
  profitTargetAmount: number; stopLossAmount: number;
}

// ─── Markets Page ─────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const { token, updateBalance } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tradingMode } = useTradingMode();
  const [, setLocation] = useLocation();

  // State Management
  const [tradeDefaults] = useState(readSavedTradeDefaults);
  const [selectedMarket, setSelectedMarket] = useState<string>(tradeDefaults.market);
  const [selectedDuration, setSelectedDuration] = useState<string>(tradeDefaults.duration);
  const [selectedAmount, setSelectedAmount] = useState<number>(tradeDefaults.amount);
  const [customActive, setCustomActive] = useState<boolean>(false);
  const [activeLivePreview, setActiveLivePreview] = useState<LiveOrderPreview | null>(null);
  const [showAutomation, setShowAutomation] = useState(false);

  // Auto Practice Setup States
  const [autoCloseEnabled, setAutoCloseEnabled] = useState<boolean>(true);
  const [closeInMinutes, setCloseInMinutes] = useState<number>(240); // default 4 hours
  const [profitTarget, setProfitTarget] = useState<string>("");
  const [safetyStop, setSafetyStop] = useState<string>("");
  const [reinvestMode, setReinvestMode] = useState<string>("none");
  const [stopAfterLoss, setStopAfterLoss] = useState<boolean>(true);
  const [maxCycles, setMaxCycles] = useState<number>(5);
  const [maxDailyTrades, setMaxDailyTrades] = useState<number>(3);

  // Live Auto Confirmation States
  const [liveConfirmOpen, setLiveConfirmOpen] = useState<boolean>(false);
  const [liveCheckboxChecked, setLiveCheckboxChecked] = useState<boolean>(false);
  const [liveTextOverride, setLiveTextOverride] = useState<string>("");

  const { prices: livePrices, marketOpen } = useLivePrices();

  // Map user duration to backend API Style Parameter
  const styleMap: Record<string, string> = {
    quick: "SCALP",
    shortTerm: "SWING",
    longTerm: "POSITION",
  };
  const activeStyle = styleMap[selectedDuration] || "SCALP";

  // Query Backend opportunities
  const { data: opps, isLoading } = useQuery<TradingOpportunity[]>({
    queryKey: ["/api/opportunities", selectedMarket, activeStyle],
    queryFn: () => {
      const url = selectedMarket === "forex"
        ? `/api/opportunities/forex?style=${activeStyle}`
        : `/api/opportunities/${selectedMarket}`;
      return apiJson<TradingOpportunity[]>(url);
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  // Query learning progress & broker status for live mode restrictions
  const { data: learnProgress = [] } = useQuery<LearnProgress[]>({
    queryKey: ["/api/learn/progress"],
    queryFn: () => apiJson<LearnProgress[]>("/api/learn/progress"),
    enabled: !!token,
  });

  const { data: brokerAccounts = [] } = useQuery<Array<Omit<TradingAccount, "apiKeyEncrypted" | "apiSecretEncrypted" | "accessTokenEncrypted" | "refreshTokenEncrypted">>>({
    queryKey: ["/api/trading/accounts"],
    queryFn: () => apiJson<Array<Omit<TradingAccount, "apiKeyEncrypted" | "apiSecretEncrypted" | "accessTokenEncrypted" | "refreshTokenEncrypted">>>("/api/trading/accounts"),
    enabled: !!token,
  });

  const completedLessonIds = learnProgress.filter(p => p.completed).map(p => p.moduleId);
  const allRequiredDone = [1, 2, 5].every(id => completedLessonIds.includes(id));
  const hasBrokerConnected = brokerAccounts.length > 0;

  // ─── Order Preview Mutation ───
  const previewMutation = useMutation({
    mutationFn: async ({ opp, amount, liveP }: { opp: TradeIdea; amount: number; liveP: number }) => {
      const ticker = opp.pair.replace("/", "-");
      const side = opp.direction.toLowerCase() === "sell" ? "sell" : "buy";
      const quantity = amount / liveP;

      const res = await fetch("/api/trading/orders/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          symbol: ticker,
          assetClass: opp.market || "forex",
          side,
          orderType: "market",
          quantity,
          notionalAmount: amount,
          estimatedPrice: liveP,
          tradeScore: opp.score || 85,
          riskLevel: opp.riskLevel || "Low",
          reason: opp.whyThisTrade || "Signal convergence match.",
        })
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to preview order");
      }
      return res.json();
    },
    onSuccess: (data, vars) => {
      if (tradingMode === "paper") {
        placePaperMutation.mutate({ previewId: data.previewId, liveP: vars.liveP });
      } else {
        setActiveLivePreview({
          previewId: data.previewId,
          symbol: vars.opp.pair,
          assetClass: vars.opp.market || "forex",
          side: vars.opp.direction.toLowerCase() === "sell" ? "sell" : "buy",
          orderType: "market",
          quantity: data.quantity,
          notionalAmount: vars.amount,
          estimatedPrice: data.estimatedPrice,
          estimatedCost: data.estimatedCost,
          estimatedFees: data.estimatedFees,
          estimatedTotal: data.estimatedTotal,
          tradeScore: vars.opp.score || 85,
          riskLevel: vars.opp.riskLevel || "Low",
          reason: vars.opp.whyThisTrade || "Signal convergence match.",
        });
      }
    },
    onError: (e: any) => {
      toast({
        title: "Trade Denied",
        description: e.message,
        variant: "destructive",
      });
    }
  });

  // ─── Place Paper Order Mutation ───
  const placePaperMutation = useMutation({
    mutationFn: async ({ previewId }: { previewId: string; liveP: number }) => {
      const res = await fetch("/api/trading/orders/place", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ previewId }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.message || "Failed to execute paper trade");
      }
      return res.json();
    },
    onSuccess: (data, vars) => {
      if (data.newBalance != null) updateBalance(Number(data.newBalance));
      toast({
        title: `✅ Practice trade executed at $${vars.liveP.toFixed(vars.liveP < 1 ? 4 : 2)}`,
        description: "Your practice balance has been updated.",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/snapshots"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    },
    onError: (e: any) => {
      toast({
        title: "Trade Failed",
        description: e.message,
        variant: "destructive",
      });
    }
  });

  // ─── Start Auto Trading Plan Mutation ───
  const startAutoPlanMutation = useMutation({
    mutationFn: async (planData: AutoPlanDraft) => {
      return apiJson<{ success: boolean; plan: { symbol: string } }>("/api/auto-trades/plans", {
        method: "POST",
        body: JSON.stringify(planData),
      });
    },
    onSuccess: (data) => {
      toast({
        title: "Auto Plan Started! 🤖",
        description: `Plan on ${data.plan.symbol} is active. Redirecting to My Trades...`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auto-trades/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setLocation("/my-trades");
    },
    onError: (e: any) => {
      toast({
        title: "Failed to Start Auto Plan",
        description: e.message,
        variant: "destructive",
      });
    }
  });

  const handleSelectAmount = (val: number, isCustom: boolean) => {
    setSelectedAmount(val);
    setCustomActive(isCustom);
  };

  // Harmonize backend live signals with UI components and default simulated dataset
  const getMappedIdeas = (): TradeIdea[] => {
    const list: TradeIdea[] = [];

    // 1. Process actual live opportunities from backend
    if (opps && opps.length > 0) {
      opps.forEach((opp, index) => {
        const tickerKey = opp.ticker;
        const livePriceObj = livePrices[tickerKey] || livePrices[tickerKey.replace("-", "/")];
        const liveP = livePriceObj?.price ?? parseFloat(String(opp.entryPrice));

        list.push({
          id: `backend-${opp.id}-${index}`,
          pair: opp.ticker.replace("-", "/"),
          direction: opp.action,
          score: opp.confidence,
          whyThisTrade: opp.rationale,
          description: opp.name,
          status: "Open",
          openTime: "Right Now",
          closeTime: "Simulated Duration",
          tradeLength: "Variable",
          bestTime: opp.bestTime || "NY Session",
          sessionName: "Active Markets",
          profitRate: 1.25,
          lossRate: 0.75,
          market: opp.market,
          entryPrice: liveP,
          duration: selectedDuration,
          profitGoal: `+$${(liveP * 0.05).toFixed(2)}`,
          safetyStop: `-$${(liveP * 0.02).toFixed(2)}`,
          tradeSize: "0.01 Lots",
          timeframe: "M5",
          signalType: opp.signalType || "Momentum Breakout",
          riskLevel: opp.confidence > 80 ? "Low" : opp.confidence > 60 ? "Medium" : "High",
        });
      });
    }

    // 2. Load Fallback ideas if backend is loading or empty
    const fallbacks = DEFAULT_IDEAS[selectedMarket] || [];
    fallbacks.forEach((idea) => {
      if (!list.some(item => item.pair === idea.pair)) {
        list.push(idea);
      }
    });

    // 3. Filter list
    const filtered = list.filter(item => {
      if (selectedMarket === "forex") return item.market === "forex";
      if (selectedMarket === "stocks") return item.market === "stocks";
      if (selectedMarket === "crypto") return item.market === "crypto";
      if (selectedMarket === "options") return item.market === "options";
      return item.market === "commodities";
    });

    const sorted = filtered.sort((a, b) => (b.score || 0) - (a.score || 0));

    return sorted.map((item, idx) => ({
      ...item,
      rank: idx + 1,
    }));
  };

  const tradeIdeasList = getMappedIdeas();
  const bestMatch = tradeIdeasList[0] || null;
  const otherTradeIdeas = tradeIdeasList.slice(1);

  // Time Formatter
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    timeZoneName: "short",
  });

  const handleTriggerAutoPlan = () => {
    if (!bestMatch) {
      toast({ title: "No Trade Idea", description: "No trade idea available to automate.", variant: "destructive" });
      return;
    }

    if (tradingMode === "live") {
      if (!hasBrokerConnected) {
        toast({
          variant: "destructive",
          title: "Sandbox Automation Locked",
          description: "Connect a broker sandbox profile before using sandbox automation."
        });
        return;
      }
      if (!allRequiredDone) {
        toast({
          variant: "destructive",
          title: "Sandbox Automation Locked",
          description: "Complete all required academy lessons (Modules 1, 2, and 5) first."
        });
        return;
      }
      setLiveConfirmOpen(true);
    } else {
      executeAutoPlan();
    }
  };

  const executeAutoPlan = () => {
    if (!bestMatch) return;
    const finalProfit = parseFloat(profitTarget) || parseFloat((selectedAmount * 0.28).toFixed(2));
    const finalStop = parseFloat(safetyStop) || parseFloat((selectedAmount * 0.23).toFixed(2));

    startAutoPlanMutation.mutate({
      mode: tradingMode,
      market: bestMatch.market || selectedMarket,
      symbol: bestMatch.pair.replace("/", "-"),
      direction: bestMatch.direction,
      initialAmount: selectedAmount,
      reinvestMode,
      maxCycles: Number(maxCycles),
      maxDailyTrades,
      stopAfterLoss,
      maxDailyLoss: (selectedAmount * 0.5).toFixed(2),
      profitGoalAmount: (selectedAmount * 0.8).toFixed(2),
      closeAfterMinutes: closeInMinutes,
      profitTargetAmount: finalProfit,
      stopLossAmount: finalStop
    });
  };

  return (
    <div className="page-container page-glow lg:pb-8 min-h-screen" style={{ background: "var(--color-bg-deep)" }}>
      <div className="px-4 lg:px-8 pt-6 max-w-none">
        
        {/* Broker Sandbox Active notice */}
        {tradingMode === "live" && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-6 flex items-start gap-3 select-none">
            <i className="fas fa-exclamation-triangle text-amber-500 text-sm mt-0.5 animate-pulse"></i>
            <div>
              <div className="text-xs font-black text-white">BROKER SANDBOX ACTIVE</div>
              <div className="text-[10px] text-slate-400 font-semibold mt-1">
                Orders are simulated locally for testing. Trade Pro does not send orders to a real broker.
              </div>
            </div>
          </div>
        )}

        {/* Header Block */}
        <PageHeader
          title="Choose a Trade"
          subtitle="We find the best trade ideas based on your amount and preferences."
          action={
            <>
              <div className={`flex items-center gap-1.5 text-xs font-extrabold ${marketOpen ? "text-green-500" : "text-slate-400"}`}>
                <span className={`w-2.5 h-2.5 rounded-full ${marketOpen ? "bg-green-500 animate-pulse" : "bg-slate-500"}`} />
                <span>{marketOpen ? "US Markets Open" : "US Markets Closed"}</span>
                <span className="text-slate-500 font-bold ml-1.5">{formattedTime}</span>
              </div>
              <ModeSwitch />
            </>
          }
        />

        {/* Three-Step Horizontal Selector Card */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-5 mb-5 select-none">
          {/* Left Area (Steps 1 & 2 + Alert) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              {/* Step 1 Box */}
              <div className="flex-[1.3] rounded-2xl p-5 border" style={{ background: "var(--color-panel)", borderColor: "var(--color-border-strong)" }}>
                <MarketSelector selected={selectedMarket} onChange={setSelectedMarket} />
              </div>
              {/* Step 2 Box */}
              <div className="flex-1 rounded-2xl p-5 border" style={{ background: "var(--color-panel)", borderColor: "var(--color-border-strong)" }}>
                <DurationSelector selected={selectedDuration} onChange={setSelectedDuration} />
              </div>
            </div>
            {/* Notice Alert Notice */}
            <ProtectionNotice />
          </div>

          {/* Right Area (Step 3 Box) */}
          <div className="lg:col-span-3 rounded-2xl p-5 border flex flex-col justify-between" style={{ background: "var(--color-panel)", borderColor: "var(--color-border-strong)" }}>
            <AmountSelector amount={selectedAmount} customActive={customActive} onSelectAmount={handleSelectAmount} />
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col gap-6">
          
          {/* Featured Best Match Card */}
          {bestMatch ? (
            <div className="flex flex-col gap-5">
              <BestMatchTradeCard
                trade={bestMatch}
                amount={selectedAmount}
                onTrade={(opp, amt, lp) => previewMutation.mutate({ opp, amount: amt, liveP: lp })}
                trading={previewMutation.isPending || placePaperMutation.isPending}
              />

              <button
                type="button"
                onClick={() => setShowAutomation(value => !value)}
                aria-expanded={showAutomation}
                aria-controls="auto-practice-options"
                className="min-h-11 rounded-xl border border-blue-500/25 bg-blue-500/5 px-4 text-sm font-bold text-blue-300 hover:bg-blue-500/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-400 flex items-center justify-between"
              >
                <span><i className="fas fa-robot mr-2" aria-hidden="true" />Automate this {tradingMode === "live" ? "sandbox" : "practice"} trade</span>
                <i className={`fas fa-chevron-${showAutomation ? "up" : "down"}`} aria-hidden="true" />
              </button>

              {/* Advanced automation stays collapsed during the beginner flow. */}
              {showAutomation && (
              <div className="account-card p-6 border rounded-2xl bg-[#0b1626] border-slate-800 text-left select-none">
                <div id="auto-practice-options">
                <div className="flex justify-between items-center mb-4">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-blue-400">
                      <i className="fas fa-robot text-xs animate-pulse"></i>
                    </div>
                    <span className="text-[15px] font-black text-white">Auto Practice Options</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[8px] font-black uppercase ${
                    tradingMode === "live" ? "bg-amber-500/10 text-amber-400 border border-amber-500/20" : "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                  }`}>
                    {tradingMode === "live" ? "Sandbox" : "Practice Mode"}
                  </span>
                </div>

                <p className="text-xs text-slate-400 font-semibold mb-4 leading-normal">
                  {tradingMode === "live" 
                    ? "Sandbox automation simulates opening and closing broker orders using your strategy and safety settings." 
                    : "Auto Practice lets the app open and close practice trades automatically using virtual money based on your settings."
                  }
                </p>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 select-none">
                  {/* Toggle Active */}
                  <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1.5">Auto-Close Mode</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setAutoCloseEnabled(true)}
                        className={`h-9 flex-1 rounded-lg text-[10px] font-black tracking-wider uppercase border transition-all cursor-pointer ${
                          autoCloseEnabled ? "bg-blue-600/10 border-blue-500 text-blue-400" : "bg-slate-950 border-slate-900 text-slate-400"
                        }`}
                      >
                        Enabled
                      </button>
                      <button
                        type="button"
                        onClick={() => setAutoCloseEnabled(false)}
                        className={`h-9 flex-1 rounded-lg text-[10px] font-black tracking-wider uppercase border transition-all cursor-pointer ${
                          !autoCloseEnabled ? "bg-slate-950/40 border-slate-900 text-slate-400" : "bg-slate-950 border-slate-900 text-slate-400"
                        }`}
                      >
                        Off
                      </button>
                    </div>
                  </div>

                  {/* Close In Dropdown */}
                  <div>
                    <label htmlFor="auto-close-duration" className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Close Duration</label>
                    <select
                      id="auto-close-duration"
                      disabled={!autoCloseEnabled}
                      value={closeInMinutes}
                      onChange={(e) => setCloseInMinutes(Number(e.target.value))}
                      className="w-full h-9 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-bold px-2.5 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    >
                      <option value={30}>30 min</option>
                      <option value={60}>1 hour</option>
                      <option value={240}>4 hours (Default)</option>
                      <option value={480}>8 hours</option>
                      <option value={1440}>End of Day</option>
                    </select>
                  </div>

                  {/* Profit Target */}
                  <div>
                    <label htmlFor="auto-profit-target" className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Profit Target ($)</label>
                    <input
                      id="auto-profit-target"
                      type="number"
                      step="0.01"
                      disabled={!autoCloseEnabled}
                      placeholder={`Recommended: +$${(selectedAmount * 0.28).toFixed(2)}`}
                      value={profitTarget}
                      onChange={(e) => setProfitTarget(e.target.value)}
                      className="w-full h-9 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-bold px-3 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>

                  {/* Safety Stop */}
                  <div>
                    <label htmlFor="auto-safety-stop" className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Safety Stop ($)</label>
                    <input
                      id="auto-safety-stop"
                      type="number"
                      step="0.01"
                      disabled={!autoCloseEnabled}
                      placeholder={`Recommended: -$${(selectedAmount * 0.23).toFixed(2)}`}
                      value={safetyStop}
                      onChange={(e) => setSafetyStop(e.target.value)}
                      className="w-full h-9 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-bold px-3 focus:outline-none focus:border-blue-500 disabled:opacity-50"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4 border-t border-slate-900/60 pt-4 select-none">
                  {/* Reinvest Mode */}
                  <div>
                    <label htmlFor="auto-reinvest-mode" className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Reinvest Your Profit</label>
                    <select
                      id="auto-reinvest-mode"
                      value={reinvestMode}
                      onChange={(e) => setReinvestMode(e.target.value)}
                      className="w-full h-9 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-bold px-2.5 focus:outline-none focus:border-blue-500"
                    >
                      <option value="none">Keep Profit (Off)</option>
                      <option value="profit_only">Reinvest Profit Only</option>
                      <option value="profit_plus_principal">Reinvest Profit + Original</option>
                    </select>
                  </div>

                  {/* Stop After One Loss */}
                  <div>
                    <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1.5">Stop After Loss</label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => setStopAfterLoss(true)}
                        className={`h-9 flex-1 rounded-lg text-[10px] font-black tracking-wider uppercase border transition-all cursor-pointer ${
                          stopAfterLoss ? "bg-blue-600/10 border-blue-500 text-blue-400" : "bg-slate-950 border-slate-900 text-slate-400"
                        }`}
                      >
                        On
                      </button>
                      <button
                        type="button"
                        onClick={() => setStopAfterLoss(false)}
                        className={`h-9 flex-1 rounded-lg text-[10px] font-black tracking-wider uppercase border transition-all cursor-pointer ${
                          !stopAfterLoss ? "bg-slate-950/40 border-slate-900 text-slate-400" : "bg-slate-950 border-slate-900 text-slate-400"
                        }`}
                      >
                        Off
                      </button>
                    </div>
                  </div>

                  {/* Max Cycles */}
                  <div>
                    <label htmlFor="auto-max-cycles" className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Max Cycle Iterations</label>
                    <input
                      id="auto-max-cycles"
                      min={1}
                      max={20}
                      type="number"
                      value={maxCycles}
                      onChange={(e) => setMaxCycles(Number(e.target.value))}
                      className="w-full h-9 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-bold px-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>

                  {/* Max Daily Auto Trades */}
                  <div>
                    <label htmlFor="auto-max-daily" className="text-[11px] text-slate-400 font-bold uppercase tracking-wider block mb-1.5">Max Daily Auto Trades</label>
                    <input
                      id="auto-max-daily"
                      min={1}
                      max={20}
                      type="number"
                      value={maxDailyTrades}
                      onChange={(e) => setMaxDailyTrades(Number(e.target.value))}
                      className="w-full h-9 rounded-lg bg-slate-900 border border-slate-800 text-white text-xs font-bold px-3 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                {/* Warning message reinvesting */}
                <div className="bg-slate-950/40 border border-slate-900/80 p-3 rounded-lg text-[10px] text-slate-400 leading-relaxed font-bold mb-4">
                  ⚠️ <strong className="text-white">Reinvestment Notice:</strong> Reinvesting can grow your balance faster, but it can also lose your profits faster.
                  {tradingMode === "live" ? " Broker Sandbox uses simulated fills and balances. No real order is sent." : " Auto Practice uses virtual money. No real money is being used."}
                </div>

                {/* Plan Summary Preview */}
                <div className="bg-slate-950/70 border border-slate-900 p-3.5 rounded-xl text-xs text-slate-300 font-semibold leading-relaxed mb-4 text-left border-box">
                  🤖 <strong className="text-white">Plan Summary:</strong> You are starting an auto {tradingMode === "live" ? "sandbox" : "practice"} plan on <strong className="text-white">{bestMatch.pair}</strong> with <strong className="text-white">${selectedAmount}</strong>. 
                  The app will close this trade after {closeInMinutes === 1440 ? "End of Day" : `${closeInMinutes} minutes`}, or earlier if it reaches +${profitTarget || (selectedAmount * 0.28).toFixed(2)} profit or -${safetyStop || (selectedAmount * 0.23).toFixed(2)} safety stop.
                  If the trade wins, your profit will stay in your balance unless you choose reinvest (reinvest choice: <strong className="text-blue-400 capitalize">{reinvestMode.replace(/_/g, " ")}</strong>).
                </div>

                {/* Trigger Buttons */}
                <button
                  type="button"
                  onClick={handleTriggerAutoPlan}
                  disabled={startAutoPlanMutation.isPending}
                  className="w-full h-11 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-sm font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                >
                  <i className="fas fa-play text-xs"></i>
                  {tradingMode === "live" ? "Start Sandbox Simulation" : "Start Auto Practice Trade"}
                </button>
                </div>
              </div>
              )}
            </div>
          ) : (
            <div className="rounded-2xl border p-10 text-center text-slate-500" style={{ background: "var(--color-card-deep)", borderColor: "var(--color-border-strong)" }}>
              <i className="fas fa-search text-3xl mb-3 text-slate-600"></i>
              <div className="text-sm font-bold">No perfect match found for current choices</div>
              <p className="text-xs text-slate-600 mt-1">Try switching to Forex or modifying the Duration setup</p>
            </div>
          )}

          {/* Secondary Trade ideas list */}
          {otherTradeIdeas.length > 0 && (
            <div className="flex flex-col gap-4 mt-2">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-black text-white">Other Trade Ideas for You</h2>
                <span className="text-[10px] font-bold text-slate-500">Sorted by best match</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {otherTradeIdeas.map((trade) => (
                  <SmallTradeCard
                    key={trade.id}
                    trade={trade}
                    rank={trade.rank ?? 0}
                    amount={selectedAmount}
                    onTrade={(opp, amt, lp) => previewMutation.mutate({ opp, amount: amt, liveP: lp })}
                    trading={previewMutation.isPending || placePaperMutation.isPending}
                  />
                ))}
              </div>
            </div>
          )}

          {/* Practice First Footer */}
          <PracticeFooter />
        </div>

      </div>

      {/* Live Order Preview Modal */}
      {activeLivePreview && (
        <LiveOrderPreviewModal
          previewId={activeLivePreview.previewId}
          orderData={activeLivePreview}
          onClose={() => setActiveLivePreview(null)}
          onSuccess={() => {
            setActiveLivePreview(null);
            queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
            queryClient.invalidateQueries({ queryKey: ["/api/portfolio/snapshots"] });
            queryClient.invalidateQueries({ queryKey: ["/api/trading/accounts"] });
          }}
        />
      )}

      {/* Live Auto Trading Risk Confirmation Modal */}
      {liveConfirmOpen && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[999] animate-fade-in select-none">
          <div className="w-full max-w-md rounded-2xl border p-6 text-left relative bg-[#0b1624] border-amber-500/40">
            <button
              onClick={() => { setLiveConfirmOpen(false); setLiveCheckboxChecked(false); setLiveTextOverride(""); }}
              className="absolute top-4 right-4 text-slate-550 hover:text-white text-sm outline-none cursor-pointer"
            >
              <i className="fas fa-times"></i>
            </button>

            <h3 className="text-base font-black text-white flex items-center gap-2">
              <i className="fas fa-triangle-exclamation text-amber-500 animate-pulse"></i>
              Live Auto Trading Confirmation
            </h3>
            
            <div className="bg-red-500/5 border border-red-500/20 p-3 rounded-lg text-[10px] text-red-400 font-bold leading-normal my-4">
              Sandbox automation is simulated. Results do not represent real execution, liquidity, slippage, or fees.
            </div>

            <div className="flex flex-col gap-4 text-xs font-bold text-slate-350">
              <label className="flex gap-2.5 items-start cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={liveCheckboxChecked}
                  onChange={(e) => setLiveCheckboxChecked(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-800 bg-slate-900 text-blue-600 focus:ring-blue-500 mt-0.5 animate-none"
                />
                <span className="leading-relaxed">
                  I understand this plan simulates orders and does not send them to a real broker.
                </span>
              </label>

              {/* Typing override for amount >= 50 */}
              {selectedAmount >= 50 && (
                <div className="border-t border-slate-900/60 pt-3 mt-1">
                  <label className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1.5">
                    Type "AUTO LIVE" to confirm:
                  </label>
                  <input
                    type="text"
                    placeholder="AUTO LIVE"
                    value={liveTextOverride}
                    onChange={(e) => setLiveTextOverride(e.target.value)}
                    className="w-full h-10 rounded-lg px-3 bg-slate-900 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-blue-500 animate-none"
                  />
                </div>
              )}
            </div>

            <div className="flex gap-3 justify-end mt-6 select-none">
              <button
                onClick={() => { setLiveConfirmOpen(false); setLiveCheckboxChecked(false); setLiveTextOverride(""); }}
                className="h-10 px-4 rounded-xl text-xs font-extrabold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                disabled={
                  !liveCheckboxChecked || 
                  (selectedAmount >= 50 && liveTextOverride !== "AUTO LIVE") || 
                  startAutoPlanMutation.isPending
                }
                onClick={() => {
                  setLiveConfirmOpen(false);
                  executeAutoPlan();
                }}
                className="h-10 px-6 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Start Live Auto Trade
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
