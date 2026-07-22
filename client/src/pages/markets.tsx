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
import PageHeader from "@/components/shared/PageHeader";

import { useLivePrices } from "@/hooks/useLivePrices";
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
  const [confirmAutoOpen, setConfirmAutoOpen] = useState(false);
  const [autoActive, setAutoActive] = useState(false);
  const [queue, setQueue] = useState<string[]>([]);
  const [reinvestInfoOpen, setReinvestInfoOpen] = useState(false);

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
        description: `Plan on ${data.plan.symbol} is active. You can follow it in My Trades.`,
      });
      queryClient.invalidateQueries({ queryKey: ["/api/auto-trades/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
      setAutoActive(true);
      setConfirmAutoOpen(false);
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
      setConfirmAutoOpen(true);
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

  const profitAmount = parseFloat(profitTarget) || Number((selectedAmount * 0.28).toFixed(2));
  const lossAmount = parseFloat(safetyStop) || Number((selectedAmount * 0.23).toFixed(2));
  const marketChoices = [
    { id: "forex", icon: "/trade-icons/forex.png", label: "Forex", help: "World money" },
    { id: "stocks", icon: "/trade-icons/stocks.png", label: "Stocks", help: "Companies" },
    { id: "crypto", icon: "/trade-icons/crypto.png", label: "Crypto", help: "Digital coins" },
    { id: "commodities", icon: "/trade-icons/goods.png", label: "Goods", help: "Gold & oil" },
    { id: "options", icon: "/trade-icons/options.png", label: "Options", help: "Advanced" },
  ];
  const speedChoices = [
    { id: "quick", icon: "/trade-icons/quick.png", label: "Quick", help: "Minutes" },
    { id: "shortTerm", icon: "/trade-icons/short.png", label: "Short", help: "Hours" },
    { id: "longTerm", icon: "/trade-icons/long-term.png", label: "Long-Term", help: "Weeks" },
  ];

  const panel = "rounded-2xl border border-cyan-400/20 bg-[#071426]/90 shadow-[inset_0_1px_0_rgba(255,255,255,.03),0_16px_40px_rgba(0,0,0,.24)]";
  const selected = "border-blue-400 bg-blue-500/15 text-white shadow-[0_0_0_1px_rgba(59,130,246,.35),0_0_22px_rgba(37,99,235,.28)]";

  return (
    <div className="min-h-screen bg-[#030914] pb-10 text-slate-100 [background-image:radial-gradient(circle_at_28%_8%,rgba(0,180,255,.10),transparent_28%),linear-gradient(rgba(30,110,180,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(30,110,180,.035)_1px,transparent_1px)] [background-size:auto,32px_32px,32px_32px]">
      <div className="mx-auto max-w-[1500px] px-3 pb-8 pt-5 sm:px-5 lg:px-7">
        <header className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="mb-1 text-[10px] font-black uppercase tracking-[.28em] text-cyan-400">Mission control</p>
            <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Choose a Trade</h1>
            <p className="mt-1 text-sm text-slate-400">Pick three simple choices. Trade Pro finds the best practice trade for you.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className={`flex items-center gap-2 text-xs font-bold ${marketOpen ? "text-emerald-400" : "text-slate-400"}`}>
              <span className={`h-2 w-2 rounded-full ${marketOpen ? "bg-emerald-400 shadow-[0_0_12px_#34d399]" : "bg-slate-500"}`} />
              {marketOpen ? "US markets open" : "US markets closed"}
              <span className="text-slate-500">{formattedTime}</span>
            </div>
            <ModeSwitch />
          </div>
        </header>

        {tradingMode === "live" && (
          <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-400/25 bg-amber-400/5 px-4 py-3 text-xs text-amber-200">
            <i className="fas fa-flask" aria-hidden="true" />
            <span><strong>Broker sandbox:</strong> orders are still simulations. No real money is sent.</span>
          </div>
        )}

        <section className={`${panel} relative mb-4 overflow-hidden p-4 sm:p-5`}>
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
          <div className="grid items-center gap-5 lg:grid-cols-[190px_1fr_auto]">
            <div className="relative mx-auto h-36 w-52" aria-hidden="true">
              <div className="absolute inset-x-6 bottom-1 h-5 rounded-[50%] bg-cyan-400/15 blur-lg" />
              <img src="/trade-icons/ai-autopilot.png" alt="" className="h-full w-full object-contain drop-shadow-[0_0_18px_rgba(34,211,238,.42)] motion-safe:animate-[pulse_4s_ease-in-out_infinite]" />
              <div className="absolute bottom-0 left-1/2 h-px w-40 -translate-x-1/2 bg-cyan-300 shadow-[0_0_14px_#22d3ee]" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-3">
                <h2 className="text-xl font-black uppercase tracking-[.12em] text-white sm:text-2xl">AI Auto Pilot</h2>
                <span className="rounded-full border border-emerald-400/30 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-emerald-300">Practice active</span>
              </div>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-300">Trade Pro can choose, open, and close practice trades using your safety rules. You stay in control.</p>
              <div className="mt-4 grid gap-2 sm:grid-cols-3">
                <StatusChip icon="fa-shield" label="Practice money" value="Active" tone="emerald" />
                <StatusChip icon="fa-clock" label="Auto-close" value={autoCloseEnabled ? "On" : "Off"} tone="cyan" />
                <StatusChip icon="fa-lock" label="Real money" value="Locked" tone="rose" />
              </div>
            </div>
            <div className="grid min-w-[240px] gap-2">
              <button type="button" onClick={handleTriggerAutoPlan} disabled={!bestMatch || startAutoPlanMutation.isPending} className="min-h-12 rounded-xl border border-blue-300 bg-blue-600 px-5 text-xs font-black uppercase tracking-[.12em] text-white shadow-[0_0_24px_rgba(37,99,235,.45)] transition hover:bg-blue-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 disabled:opacity-50">
                <i className="fas fa-play mr-2" />{autoActive ? "Start another mission" : "Start auto practice"}
              </button>
              <button type="button" onClick={() => setShowAutomation(v => !v)} className="min-h-11 rounded-xl border border-slate-600 bg-slate-950/60 px-5 text-xs font-black uppercase tracking-[.1em] text-slate-200 hover:border-cyan-400/50">
                <i className="fas fa-gear mr-2" />Customize auto rules
              </button>
            </div>
          </div>
        </section>

        <section className={`${panel} mb-4 p-3 sm:p-4`}>
          <div className="mb-3 flex items-center gap-3"><span className="h-px flex-1 bg-cyan-400/20" /><h2 className="text-[11px] font-black uppercase tracking-[.24em] text-cyan-200">Mission setup · 3 choices</h2><span className="h-px flex-1 bg-cyan-400/20" /></div>
          <div className="grid gap-3 xl:grid-cols-[1.35fr_.85fr_1fr]">
            <ChoiceGroup title="1 · Pick a market">
              <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
                {marketChoices.map(item => <ChoiceButton key={item.id} {...item} active={selectedMarket === item.id} onClick={() => setSelectedMarket(item.id)} activeClass={selected} />)}
              </div>
            </ChoiceGroup>
            <ChoiceGroup title="2 · Pick a speed">
              <div className="grid grid-cols-3 gap-2">
                {speedChoices.map(item => <ChoiceButton key={item.id} {...item} active={selectedDuration === item.id} onClick={() => setSelectedDuration(item.id)} activeClass={selected} />)}
              </div>
            </ChoiceGroup>
            <ChoiceGroup title="3 · Pick practice money">
              <div className="grid grid-cols-5 gap-2">
                {[0.25, 1, 5, 10, 25].map(amount => <button key={amount} type="button" aria-pressed={selectedAmount === amount && !customActive} onClick={() => handleSelectAmount(amount, false)} className={`min-h-11 rounded-lg border text-xs font-black ${selectedAmount === amount && !customActive ? selected : "border-slate-700 bg-slate-950/60 text-slate-300 hover:border-blue-400/50"}`}>${amount}</button>)}
              </div>
              <label className="mt-2 flex h-10 items-center rounded-lg border border-slate-700 bg-slate-950/60 px-3 text-slate-500 focus-within:border-cyan-400"><span>$</span><input aria-label="Custom practice amount" type="number" min="0.25" max="100" step="0.25" value={customActive ? selectedAmount : ""} onFocus={() => setCustomActive(true)} onChange={e => handleSelectAmount(Math.max(.25, Number(e.target.value)), true)} placeholder="Custom amount" className="h-full w-full bg-transparent px-2 text-xs font-bold text-white outline-none" /></label>
            </ChoiceGroup>
          </div>
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-emerald-400/20 bg-emerald-400/5 px-3 py-2 text-[11px] font-semibold text-emerald-300"><i className="fas fa-shield-halved" />AI only picks trades that fit this amount. Your practice money is virtual.</div>
        </section>

        {bestMatch ? (
          <div className="mb-4 grid gap-4 xl:grid-cols-[1fr_290px]">
            <section className={`${panel} overflow-hidden border-fuchsia-400/30`}>
              <div className="flex items-center justify-between border-b border-fuchsia-400/15 bg-fuchsia-500/5 px-4 py-3"><h2 className="text-sm font-black uppercase tracking-[.16em] text-fuchsia-200"><i className="fas fa-wand-magic-sparkles mr-2" />AI best match</h2><span className="text-[10px] font-bold text-slate-500">Updated from live signals</span></div>
              <div className="grid gap-5 p-4 lg:grid-cols-[1.1fr_.85fr_1fr]">
                <div>
                  <div className="mb-3 inline-flex rounded-md bg-fuchsia-600 px-2 py-1 text-[9px] font-black uppercase tracking-wider">#1 recommended</div>
                  <div className="flex items-center gap-3"><div className="flex -space-x-2 text-2xl"><span>🇪🇺</span><span>🇺🇸</span></div><div><h3 className="text-3xl font-black tracking-tight text-white">{bestMatch.pair}</h3><span className={`mt-1 inline-flex rounded-md px-2 py-1 text-[10px] font-black ${bestMatch.direction === "SELL" ? "bg-rose-500/15 text-rose-300" : "bg-emerald-500/15 text-emerald-300"}`}>{bestMatch.direction === "SELL" ? "SELL ↓" : "BUY ↑"}</span></div></div>
                  <p className="mt-4 text-sm leading-6 text-slate-300">{bestMatch.whyThisTrade || bestMatch.description}</p>
                  <p className="mt-3 text-[11px] font-bold text-cyan-300"><i className="fas fa-star mr-2" />Strong setup for your choices</p>
                </div>
                <div className="grid content-start gap-3">
                  <div className="grid grid-cols-3 gap-2 text-center"><Metric label="Can win" value={`+$${profitAmount.toFixed(2)}`} tone="text-emerald-300" /><Metric label="Can lose" value={`-$${lossAmount.toFixed(2)}`} tone="text-rose-300" /><Metric label="Time" value={closeInMinutes >= 60 ? `${closeInMinutes / 60} hr` : `${closeInMinutes} min`} tone="text-white" /></div>
                  <div className="mx-auto flex h-28 w-28 flex-col items-center justify-center rounded-full border-[9px] border-emerald-400/25 border-t-emerald-400 bg-slate-950/70 shadow-[0_0_28px_rgba(52,211,153,.12)]"><strong className="text-3xl text-white">{bestMatch.score}</strong><span className="text-[9px] uppercase text-slate-500">trade score</span></div>
                  <div className="rounded-xl border border-slate-700 bg-slate-950/45 p-3 text-xs leading-5 text-slate-300"><p><i className="fas fa-sun mr-2 text-amber-300" /><strong className="text-white">Best time:</strong> {bestMatch.bestTime || "Right now"}</p><p className="mt-2"><i className="fas fa-circle-info mr-2 text-cyan-300" /><strong className="text-white">Why:</strong> Clear market movement and a strong signal.</p></div>
                </div>
                <div className="rounded-xl border border-blue-400/20 bg-[#061124] p-3">
                  <h4 className="mb-3 text-[10px] font-black uppercase tracking-[.16em] text-blue-300">Auto trade preview</h4>
                  <PreviewRow label="Practice amount" value={`$${selectedAmount.toFixed(2)}`} />
                  <PreviewRow label="Possible profit" value={`+$${profitAmount.toFixed(2)}`} tone="text-emerald-300" />
                  <PreviewRow label="Possible loss" value={`-$${lossAmount.toFixed(2)}`} tone="text-rose-300" />
                  <PreviewRow label="Auto closes" value={`${closeInMinutes >= 60 ? closeInMinutes / 60 + " hours" : closeInMinutes + " min"} or at limit`} />
                  <PreviewRow label="Reinvest profit" value={reinvestMode === "none" ? "Off" : reinvestMode === "profit_only" ? "Profit only" : "Profit + amount"} />
                  <button type="button" onClick={handleTriggerAutoPlan} disabled={startAutoPlanMutation.isPending} className="mt-3 min-h-11 w-full rounded-lg border border-fuchsia-300 bg-fuchsia-600 text-xs font-black uppercase tracking-wider text-white shadow-[0_0_18px_rgba(192,38,211,.32)] hover:bg-fuchsia-500"><i className="fas fa-play mr-2" />Start auto practice trade</button>
                  <button type="button" onClick={() => previewMutation.mutate({ opp: bestMatch, amount: selectedAmount, liveP: Number(bestMatch.entryPrice) || 1 })} className="mt-2 min-h-10 w-full rounded-lg border border-slate-700 text-xs font-bold text-slate-300 hover:border-cyan-400">Practice This Trade</button>
                </div>
              </div>
            </section>

            <aside className={`${panel} h-fit border-emerald-400/25 p-3`}>
              <h2 className="mb-3 flex items-center gap-2 text-xs font-black uppercase tracking-[.14em] text-slate-200"><span className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_10px_#34d399]" />Auto trade console</h2>
              <ConsoleRow label="Auto Pilot" value={autoActive ? "Running" : "Ready"} />
              <ConsoleRow label="Mode" value="Practice only" />
              <ConsoleRow label="Max trades today" value={String(maxDailyTrades)} />
              <ConsoleRow label="Stop after loss" value={stopAfterLoss ? "On" : "Off"} />
              <ConsoleRow label="Reinvest profit" value={reinvestMode === "none" ? "Off" : "On"} />
              <ConsoleRow label="Daily loss limit" value={`$${(selectedAmount * .5).toFixed(2)}`} />
              <ConsoleRow label="Real money" value="Locked 🔒" danger />
              <button type="button" onClick={() => setShowAutomation(true)} className="mt-3 min-h-10 w-full rounded-lg border border-fuchsia-400/40 text-[10px] font-black uppercase tracking-wider text-fuchsia-200 hover:bg-fuchsia-500/10"><i className="fas fa-shield mr-2" />Edit safety settings</button>
            </aside>
          </div>
        ) : <div className={`${panel} mb-4 p-10 text-center text-sm text-slate-400`}>No match yet. Try another market.</div>}

        {showAutomation && (
          <section className={`${panel} mb-4 p-4`} id="auto-practice-options">
            <div className="mb-4 flex items-center justify-between"><div><h2 className="text-sm font-black uppercase tracking-[.16em] text-white">Auto trade rules</h2><p className="mt-1 text-xs text-slate-400">Simple limits that tell Auto Pilot when to stop.</p></div><button type="button" onClick={() => setShowAutomation(false)} aria-label="Close auto rules" className="h-9 w-9 rounded-lg border border-slate-700 text-slate-400 hover:text-white"><i className="fas fa-xmark" /></button></div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <RuleCard label="Auto-close"><Toggle value={autoCloseEnabled} setValue={setAutoCloseEnabled} /></RuleCard>
              <RuleCard label="Close time"><select aria-label="Close time" value={closeInMinutes} onChange={e => setCloseInMinutes(Number(e.target.value))} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs font-bold text-white outline-none focus:border-cyan-400"><option value="30">30 minutes</option><option value="60">1 hour</option><option value="240">4 hours</option><option value="480">8 hours</option><option value="1440">End of day</option></select></RuleCard>
              <RuleCard label="Profit target"><input aria-label="Profit target" className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-white outline-none focus:border-cyan-400" type="number" step=".01" value={profitTarget} onChange={e => setProfitTarget(e.target.value)} placeholder={`$${profitAmount}`} /></RuleCard>
              <RuleCard label="Safety stop"><input aria-label="Safety stop" className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-3 text-xs font-bold text-white outline-none focus:border-cyan-400" type="number" step=".01" value={safetyStop} onChange={e => setSafetyStop(e.target.value)} placeholder={`$${lossAmount}`} /></RuleCard>
              <RuleCard label="Reinvest profit"><select aria-label="Reinvest profit" value={reinvestMode} onChange={e => { setReinvestMode(e.target.value); if (e.target.value !== "none") setReinvestInfoOpen(true); }} className="h-10 w-full rounded-lg border border-slate-700 bg-slate-900 px-2 text-xs font-bold text-white outline-none focus:border-cyan-400"><option value="none">Off</option><option value="profit_only">Profit only</option><option value="profit_plus_principal">Profit + amount</option></select></RuleCard>
            </div>
          </section>
        )}

        <section className={`${panel} mb-4 p-4`}>
          <div className="mb-3 flex items-center justify-between"><div><h2 className="text-sm font-black uppercase tracking-[.16em] text-white"><i className="fas fa-paper-plane mr-2 text-cyan-300" />AI picks queue</h2><p className="mt-1 text-xs text-slate-500">Other practice ideas ranked for you.</p></div><span className="text-[10px] font-bold text-slate-500">{queue.length} saved</span></div>
          <div className="flex snap-x gap-3 overflow-x-auto pb-2">
            {otherTradeIdeas.slice(0, 6).map((trade, index) => {
              const queued = queue.includes(trade.id);
              return <article key={trade.id} className="min-w-[250px] snap-start rounded-xl border border-slate-700 bg-slate-950/50 p-3">
                <div className="flex items-start justify-between"><div><span className="text-[9px] font-black uppercase tracking-wider text-cyan-300">#{index + 2} · {index % 2 ? "Fast close" : "Lower risk"}</span><h3 className="mt-2 text-lg font-black text-white">{trade.pair}</h3></div><div className="flex h-11 w-11 items-center justify-center rounded-full border-4 border-cyan-400/20 border-t-cyan-300 text-sm font-black">{trade.score}</div></div>
                <div className="mt-3 grid grid-cols-3 gap-2 text-center"><Metric label="Close" value={`${Math.max(2, Math.round(closeInMinutes / 60))} hr`} tone="text-white" /><Metric label="Profit" value={`+$${(selectedAmount * .22).toFixed(2)}`} tone="text-emerald-300" /><Metric label="Loss" value={`-$${(selectedAmount * .14).toFixed(2)}`} tone="text-rose-300" /></div>
                <button type="button" onClick={() => setQueue(q => queued ? q.filter(id => id !== trade.id) : [...q, trade.id])} className={`mt-3 min-h-10 w-full rounded-lg border text-[10px] font-black uppercase tracking-wider ${queued ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-blue-400/50 bg-blue-600/20 text-blue-200 hover:bg-blue-600/35"}`}>{queued ? "✓ In auto queue" : "+ Add to auto queue"}</button>
              </article>;
            })}
          </div>
        </section>

        <footer className="flex flex-col gap-3 rounded-xl border border-emerald-400/20 bg-emerald-400/5 px-4 py-3 text-xs sm:flex-row sm:items-center sm:justify-between"><span className="font-bold text-emerald-300"><i className="fas fa-shield-halved mr-2" />Practice mode active <span className="ml-2 font-medium text-slate-400">No real money is at risk.</span></span><button type="button" onClick={() => setLocation("/learn")} className="font-bold text-blue-300 hover:text-blue-200">How it works <i className="fas fa-arrow-right ml-1" /></button></footer>
      </div>

      {confirmAutoOpen && bestMatch && <ConfirmMission trade={bestMatch} amount={selectedAmount} profit={profitAmount} loss={lossAmount} minutes={closeInMinutes} reinvestMode={reinvestMode} pending={startAutoPlanMutation.isPending} onCancel={() => setConfirmAutoOpen(false)} onConfirm={executeAutoPlan} />}
      {reinvestInfoOpen && <ReinvestModal mode={reinvestMode} onClose={() => setReinvestInfoOpen(false)} />}
      {false && (<>
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
      </>)}

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

function StatusChip({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: "emerald" | "cyan" | "rose" }) {
  const colors = { emerald: "border-emerald-400/25 bg-emerald-400/5 text-emerald-300", cyan: "border-cyan-400/25 bg-cyan-400/5 text-cyan-300", rose: "border-rose-400/25 bg-rose-400/5 text-rose-300" };
  return <div className={`flex items-center gap-2 rounded-lg border px-3 py-2 ${colors[tone]}`}><i className={`fas ${icon}`} /><div><p className="text-[8px] font-black uppercase tracking-wider text-slate-500">{label}</p><p className="text-[10px] font-black uppercase">{value}</p></div></div>;
}

function ChoiceGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return <fieldset className="rounded-xl border border-slate-700/80 bg-slate-950/35 p-3"><legend className="px-1 text-[10px] font-black uppercase tracking-[.14em] text-slate-400">{title}</legend>{children}</fieldset>;
}

function ChoiceButton({ icon, label, help, active, onClick, activeClass }: { icon: string; label: string; help: string; active: boolean; onClick: () => void; activeClass: string }) {
  return <button type="button" onClick={onClick} aria-pressed={active} aria-label={`${label} ${help}`} className={`group min-h-[94px] rounded-xl border px-2 py-1.5 text-center transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-300 ${active ? activeClass : "border-slate-700 bg-slate-950/55 text-slate-300 hover:-translate-y-0.5 hover:border-cyan-400/45"}`}><img src={icon} alt="" aria-hidden="true" className={`mx-auto mb-0.5 h-12 w-12 object-contain transition duration-200 group-hover:scale-110 ${active ? "scale-110 drop-shadow-[0_0_10px_rgba(34,211,238,.65)]" : "opacity-80 saturate-75 group-hover:opacity-100 group-hover:saturate-100"}`} /><span className="block text-[10px] font-black uppercase tracking-wide">{label}</span><span className="mt-0.5 block text-[8px] text-slate-500">{help}</span></button>;
}

function Metric({ label, value, tone }: { label: string; value: string; tone: string }) {
  return <div className="rounded-lg border border-slate-800 bg-slate-950/55 px-2 py-2"><p className="text-[8px] font-black uppercase tracking-wider text-slate-500">{label}</p><p className={`mt-1 text-xs font-black ${tone}`}>{value}</p></div>;
}

function PreviewRow({ label, value, tone = "text-slate-200" }: { label: string; value: string; tone?: string }) {
  return <div className="flex items-center justify-between border-b border-slate-800/80 py-2 text-[10px]"><span className="text-slate-500">{label}</span><strong className={tone}>{value}</strong></div>;
}

function ConsoleRow({ label, value, danger = false }: { label: string; value: string; danger?: boolean }) {
  return <div className="mb-1.5 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/55 px-3 py-2.5 text-[10px]"><span className="font-semibold text-slate-400">{label}</span><strong className={danger ? "text-rose-300" : "text-cyan-200"}>{value}</strong></div>;
}

function RuleCard({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="rounded-xl border border-slate-700 bg-slate-950/45 p-3"><span className="mb-2 block text-[9px] font-black uppercase tracking-wider text-slate-500">{label}</span>{children}</label>;
}

function Toggle({ value, setValue }: { value: boolean; setValue: (value: boolean) => void }) {
  return <button type="button" role="switch" aria-checked={value} onClick={() => setValue(!value)} className={`flex h-10 w-full items-center justify-between rounded-lg border px-3 text-[10px] font-black uppercase ${value ? "border-emerald-400/40 bg-emerald-400/10 text-emerald-300" : "border-slate-700 bg-slate-900 text-slate-400"}`}><span>{value ? "On" : "Off"}</span><span className={`h-5 w-9 rounded-full p-0.5 ${value ? "bg-emerald-400" : "bg-slate-700"}`}><span className={`block h-4 w-4 rounded-full bg-white transition ${value ? "translate-x-4" : ""}`} /></span></button>;
}

function ConfirmMission({ trade, amount, profit, loss, minutes, reinvestMode, pending, onCancel, onConfirm }: { trade: TradeIdea; amount: number; profit: number; loss: number; minutes: number; reinvestMode: string; pending: boolean; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-[#01040b]/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="mission-title"><div className="w-full max-w-lg rounded-2xl border border-fuchsia-400/35 bg-[#071426] p-5 shadow-[0_0_60px_rgba(147,51,234,.22)]"><div className="mb-4 flex items-start justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-fuchsia-300">Ready check</p><h2 id="mission-title" className="mt-1 text-xl font-black text-white">Start this practice mission?</h2></div><button type="button" onClick={onCancel} aria-label="Close" className="h-9 w-9 rounded-lg border border-slate-700 text-slate-400"><i className="fas fa-xmark" /></button></div><div className="grid grid-cols-2 gap-2 rounded-xl border border-slate-700 bg-slate-950/55 p-3 text-xs"><PreviewRow label="Trade" value={`${trade.pair} ${trade.direction}`} /><PreviewRow label="Practice money" value={`$${amount.toFixed(2)}`} /><PreviewRow label="Can win" value={`+$${profit.toFixed(2)}`} tone="text-emerald-300" /><PreviewRow label="Can lose" value={`-$${loss.toFixed(2)}`} tone="text-rose-300" /><PreviewRow label="Auto-close" value={minutes >= 60 ? `${minutes / 60} hours` : `${minutes} minutes`} /><PreviewRow label="Reinvest" value={reinvestMode === "none" ? "Off" : "On"} /></div><p className="mt-4 rounded-lg border border-emerald-400/20 bg-emerald-400/5 p-3 text-xs leading-5 text-emerald-200"><i className="fas fa-shield-halved mr-2" />This uses practice money only. You can stop the plan from My Trades.</p><div className="mt-5 grid grid-cols-2 gap-3"><button type="button" onClick={onCancel} className="min-h-11 rounded-xl border border-slate-700 text-xs font-black text-slate-300">Go back</button><button type="button" onClick={onConfirm} disabled={pending} className="min-h-11 rounded-xl border border-fuchsia-300 bg-fuchsia-600 text-xs font-black uppercase tracking-wider text-white disabled:opacity-50">{pending ? "Starting…" : "Confirm & start"}</button></div></div></div>;
}

function ReinvestModal({ mode, onClose }: { mode: string; onClose: () => void }) {
  const plusOriginal = mode === "profit_plus_principal";
  return <div className="fixed inset-0 z-[1001] flex items-center justify-center bg-[#01040b]/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true"><div className="w-full max-w-md rounded-2xl border border-cyan-400/30 bg-[#071426] p-5"><h2 className="text-lg font-black text-white">Use winnings again?</h2><p className="mt-2 text-sm leading-6 text-slate-300">{plusOriginal ? "After a win, Auto Pilot can use your profit and original practice amount in the next mission." : "After a win, Auto Pilot can use only the profit in the next mission."}</p><div className="my-4 flex items-center justify-center gap-3 rounded-xl border border-slate-700 bg-slate-950/50 p-4 text-center"><span className="rounded-lg bg-blue-500/15 px-3 py-2 text-xs font-black text-blue-200">Trade wins</span><i className="fas fa-arrow-right text-cyan-300" /><span className="rounded-lg bg-emerald-500/15 px-3 py-2 text-xs font-black text-emerald-200">Next mission grows</span></div><p className="text-xs leading-5 text-amber-200">This can grow practice money faster, but the next loss can also be bigger.</p><button type="button" onClick={onClose} className="mt-5 min-h-11 w-full rounded-xl bg-blue-600 text-xs font-black text-white">Got it</button></div></div>;
}
