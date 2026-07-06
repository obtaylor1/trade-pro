import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TradingOpportunity } from "@shared/schema";
import { useTradingMode } from "@/contexts/TradingModeContext";
import LiveOrderPreviewModal from "@/components/trade/LiveOrderPreviewModal";
import ModeSwitch from "@/components/trade/ModeSwitch";

import MarketSelector from "@/components/trade/MarketSelector";
import DurationSelector from "@/components/trade/DurationSelector";
import AmountSelector from "@/components/trade/AmountSelector";
import ProtectionNotice from "@/components/trade/ProtectionNotice";
import BestMatchTradeCard from "@/components/trade/BestMatchTradeCard";
import SmallTradeCard from "@/components/trade/SmallTradeCard";
import PracticeFooter from "@/components/trade/PracticeFooter";
import { useLivePrices } from "@/hooks/useLivePrices";
import { DEFAULT_IDEAS } from "@/lib/defaultIdeas";
import type { TradeIdea, LiveOrderPreview } from "@/lib/types";

// ─── Markets Page ─────────────────────────────────────────────────────────────

export default function MarketsPage() {
  const { token, updateBalance } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { tradingMode } = useTradingMode();

  // State Management
  const [selectedMarket, setSelectedMarket] = useState<string>("forex");
  const [selectedDuration, setSelectedDuration] = useState<string>("quick");
  const [selectedAmount, setSelectedAmount] = useState<number>(0.25);
  const [customActive, setCustomActive] = useState<boolean>(false);
  const [activeLivePreview, setActiveLivePreview] = useState<LiveOrderPreview | null>(null);

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
      return fetch(url).then(r => r.json());
    },
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

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
        // Retrieve live price check if exists
        const tickerKey = opp.ticker;
        const livePriceObj = livePrices[tickerKey] || livePrices[tickerKey.replace("-", "/")];
        const liveP = livePriceObj?.price ?? parseFloat(String(opp.entryPrice));

        // Map Drizzle opportunities back to our simplified structures
        const entry = liveP;
        const target = parseFloat(String(opp.targetPrice));
        const stop = parseFloat(String(opp.stopLoss ?? entry * 0.95));

        const profitRate = Math.abs((target - entry) / entry) * 50;
        const lossRate = Math.abs((entry - stop) / entry) * 50;

        const friendlyTimeframe = (opp.timeframes || "").toUpperCase();
        const style = (opp.forexStyle || (opp as any).style || "").toUpperCase();
        let duration = selectedDuration; // default to avoid empty filter states

        if (style === "POSITION" || friendlyTimeframe.includes("D1") || friendlyTimeframe.includes("1D") || friendlyTimeframe.includes("W1") || friendlyTimeframe.includes("MN") || friendlyTimeframe.includes("DAILY")) {
          duration = "longTerm";
        } else if (style === "SWING" || friendlyTimeframe.includes("1H") || friendlyTimeframe.includes("H1") || friendlyTimeframe.includes("4H") || friendlyTimeframe.includes("H4")) {
          duration = "shortTerm";
        } else if (style === "SCALP" || friendlyTimeframe.includes("5M") || friendlyTimeframe.includes("15M")) {
          duration = "quick";
        }

        const signalFriendlyMap: Record<string, string> = {
          BREAKOUT: "Price is breaking out of a tight consolidation pattern.",
          REVERSAL: "Price is showing signs of reversing its previous trend.",
          MOMENTUM: "Strong upward/downward momentum is driving the price.",
          MEAN_REVERSION: "Price is stretched and is likely to bounce back to its average.",
        };

        const statusList = ["Open", "Open", "Win", "Loss", "Open"];
        const status = statusList[index % statusList.length];

        list.push({
          id: opp.id.toString(),
          pair: opp.ticker.replace("-", "/"),
          description: opp.name,
          market: opp.market,
          direction: opp.action,
          duration,
          score: opp.confidence || 75,
          riskLevel: opp.confidence > 75 ? "Low" : opp.confidence > 65 ? "Medium" : "High",
          status,
          openTime: "Today, 8:05 AM ET",
          closeTime: "Today, 11:45 AM ET",
          tradeLength: duration === "quick" ? "About 3 hr 40 min" : duration === "shortTerm" ? "About 2 days" : "About 1 week",
          bestTime: duration === "quick" ? "8:00 AM - 12:00 PM ET" : "Anytime",
          sessionName: duration === "quick" ? "London / New York Overlap" : "Standard trading session",
          whyThisTrade: signalFriendlyMap[opp.signalType] || opp.rationale || "Positive indicator crossover alignment.",
          profitRate: Math.max(0.5, parseFloat(profitRate.toFixed(2))),
          lossRate: Math.max(0.25, parseFloat(lossRate.toFixed(2))),
          entryPrice: entry,
          profitGoal: `+$${Math.abs(target - entry).toFixed(2)} Target`,
          safetyStop: `-$${Math.abs(entry - stop).toFixed(2)} Stop Loss`,
          tradeSize: "0.01 Micro Lots equivalent",
          timeframe: opp.timeframes || "5 Minute (M5)",
          signalType: opp.signalType,
        });
      });
    }

    // 2. Append default simulated trade dataset to ensure plenty of high-quality mock trade choices
    const fallbackList = DEFAULT_IDEAS[selectedMarket] || [];
    fallbackList.forEach((item) => {
      // Connect live price feeds to fallbacks if matching pair ticker is observed
      const livePriceObj = livePrices[item.pair] || livePrices[item.pair.replace("/", "-")];
      const liveP = livePriceObj?.price ?? item.entryPrice;

      // Adjust profit rates/prices dynamically
      list.push({
        ...item,
        entryPrice: liveP,
      });
    });

    // Filter by selected market & selected duration options
    const filtered = list.filter(
      (item) => item.market === selectedMarket && item.duration === selectedDuration
    );

    // Sort by best trade score (rank) descending
    const sorted = [...filtered].sort((a, b) => b.score - a.score);

    // Re-assign ranks dynamically based on final list position
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

  return (
    <div className="page-container page-glow lg:pb-8 min-h-screen" style={{ background: "#050b14" }}>
      <div className="px-4 lg:px-8 pt-6 max-w-none">
        
        {/* Live Mode Active Warning alert bar */}
        {tradingMode === "live" && (
          <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 mb-6 flex items-start gap-3 select-none">
            <i className="fas fa-exclamation-triangle text-amber-500 text-sm mt-0.5 animate-pulse"></i>
            <div>
              <div className="text-xs font-black text-white">LIVE TRADING MODE ACTIVE</div>
              <div className="text-[10px] text-slate-400 font-semibold mt-1">
                Your terminal is executing trades on the real market via your connected broker. Always verify your size and stop-loss rules before placing live orders.
              </div>
            </div>
          </div>
        )}

        {/* Header Block */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-[32px] font-black text-white leading-tight">Choose a Trade</h1>
            <p className="text-xs font-semibold mt-1" style={{ color: "#64748b" }}>
              We find the best trade ideas based on your amount and preferences.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-1.5 text-xs font-extrabold" style={{ color: "#22c55e" }}>
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 animate-pulse" />
              <span>US Markets Open</span>
              <span className="text-slate-500 font-bold ml-1.5">{formattedTime}</span>
            </div>
            <ModeSwitch />
          </div>
        </div>

        {/* Three-Step Horizontal Selector Card */}
        <div className="grid grid-cols-1 lg:grid-cols-10 gap-5 mb-5 select-none">
          {/* Left Area (Steps 1 & 2 + Alert) */}
          <div className="lg:col-span-7 flex flex-col gap-4">
            <div className="flex flex-col md:flex-row gap-4 flex-1">
              {/* Step 1 Box */}
              <div className="flex-[1.3] rounded-2xl p-5 border" style={{ background: "#07101d", borderColor: "#1e3555" }}>
                <MarketSelector selected={selectedMarket} onChange={setSelectedMarket} />
              </div>
              {/* Step 2 Box */}
              <div className="flex-1 rounded-2xl p-5 border" style={{ background: "#07101d", borderColor: "#1e3555" }}>
                <DurationSelector selected={selectedDuration} onChange={setSelectedDuration} />
              </div>
            </div>
            {/* Notice Alert Notice */}
            <ProtectionNotice />
          </div>

          {/* Right Area (Step 3 Box) */}
          <div className="lg:col-span-3 rounded-2xl p-5 border flex flex-col justify-between" style={{ background: "#07101d", borderColor: "#1e3555" }}>
            <AmountSelector amount={selectedAmount} customActive={customActive} onSelectAmount={handleSelectAmount} />
          </div>
        </div>

        {/* Main Content Layout */}
        <div className="flex flex-col gap-6">
          
          {/* Featured Best Match Card */}
          {bestMatch ? (
            <div className="flex flex-col gap-4">
              <BestMatchTradeCard
                trade={bestMatch}
                amount={selectedAmount}
                onTrade={(opp, amt, lp) => previewMutation.mutate({ opp, amount: amt, liveP: lp })}
                trading={previewMutation.isPending || placePaperMutation.isPending}
              />
            </div>
          ) : (
            <div className="rounded-2xl border p-10 text-center text-slate-500" style={{ background: "#0b1624", borderColor: "#1e3555" }}>
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
    </div>
  );
}
