import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { TradingOpportunity } from "@shared/schema";

type Market = "stocks" | "crypto" | "options" | "forex" | "commodities";
const TABS = [
  { id: "stocks" as Market,      label: "Stocks",      emoji: "📈", min: 1.00 },
  { id: "crypto" as Market,      label: "Crypto",      emoji: "₿",  min: 0.01 },
  { id: "options" as Market,     label: "Options",     emoji: "🎯", min: 0.25 },
  { id: "forex" as Market,       label: "Forex",       emoji: "💱", min: 0.10 },
  { id: "commodities" as Market, label: "Commodities", emoji: "🪙", min: 0.50 },
];
const MCOLORS: Record<Market,string> = {
  stocks:"#3b82f6",crypto:"#f59e0b",options:"#8b5cf6",forex:"#22c55e",commodities:"#ef4444"
};

function ConfBar({ val }: { val: number }) {
  const c = val>=75?"#22c55e":val>=60?"#f59e0b":"#ef4444";
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-1.5 rounded-full" style={{background:"#243044"}}>
        <div className="h-1.5 rounded-full" style={{width:`${val}%`,background:c}}/>
      </div>
      <span className="text-xs font-semibold" style={{color:c}}>{val}%</span>
    </div>
  );
}
function SBadge({type}:{type:string}) {
  const cls:Record<string,string>={BREAKOUT:"badge-breakout",REVERSAL:"badge-reversal",MOMENTUM:"badge-momentum",MEAN_REVERSION:"badge-mean"};
  const lbl:Record<string,string>={MEAN_REVERSION:"MEAN REV"};
  return <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${cls[type]??"badge-breakout"}`}>{lbl[type]??type}</span>;
}
function ABadge({action}:{action:string}) {
  const c=action==="BUY"?"#22c55e":action==="SELL"?"#ef4444":"#64748b";
  return <span className="text-[10px] font-bold px-2 py-0.5 rounded-full" style={{background:`${c}22`,color:c,border:`1px solid ${c}55`}}>{action}</span>;
}

function TradeCard({opp,budget,onTrade,onWatchlist,trading}:{opp:TradingOpportunity;budget:number;onTrade:(o:TradingOpportunity,a:number)=>void;onWatchlist:(o:TradingOpportunity)=>void;trading:boolean}) {
  const [expanded,setExpanded]=useState(false);
  const units=budget/opp.entryPrice;
  const potGain=opp.market==="options"?opp.entryPrice*6*units:(opp.targetPrice-opp.entryPrice)*units;
  const maxRisk=opp.market==="options"?budget:(opp.entryPrice-opp.stopLoss)*units;
  const netProfit=potGain-Math.abs(maxRisk);
  const pdisp=opp.market==="forex"?opp.entryPrice.toFixed(4):opp.entryPrice<10?opp.entryPrice.toFixed(4):opp.entryPrice.toLocaleString("en-US",{minimumFractionDigits:2});
  const udisp=units<0.001?units.toFixed(6):units<1?units.toFixed(4):units.toFixed(2);
  return (
    <div className="rounded-2xl p-4 trade-card" style={{background:"#1a2332",border:"1px solid #243044"}}>
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span className="text-lg font-black">{opp.ticker}</span>
            <ABadge action={opp.action}/>
            <SBadge type={opp.signalType}/>
          </div>
          <div className="text-xs" style={{color:"#64748b"}}>{opp.name}</div>
          {opp.optionType&&<div className="text-xs mt-0.5 font-medium" style={{color:"#8b5cf6"}}>{opp.optionType} · Strike ${opp.strikePrice} · Exp {opp.expiry}</div>}
        </div>
        <button onClick={()=>onWatchlist(opp)} className="text-xl">⭐</button>
      </div>
      <div className="grid grid-cols-2 gap-2 mb-3">
        {[
          {label:"Entry Price",val:`$${pdisp}`},
          {label:"Your Investment",val:`$${budget.toFixed(2)}`},
          {label:"Units You Get",val:udisp},
          {label:"Confidence",custom:<ConfBar val={opp.confidence}/>},
        ].map((item,i)=>(
          <div key={i} className="rounded-xl p-2.5" style={{background:"#0d1117"}}>
            <div className="text-xs mb-0.5" style={{color:"#64748b"}}>{item.label}</div>
            {item.custom??<div className="text-sm font-bold">{item.val}</div>}
          </div>
        ))}
        <div className="rounded-xl p-2.5" style={{background:"rgba(34,197,94,0.08)",border:"1px solid rgba(34,197,94,0.2)"}}>
          <div className="text-xs mb-0.5" style={{color:"#64748b"}}>Potential Gain</div>
          <div className="text-sm font-bold" style={{color:"#22c55e"}}>+${potGain.toFixed(2)}</div>
        </div>
        <div className="rounded-xl p-2.5" style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.2)"}}>
          <div className="text-xs mb-0.5" style={{color:"#64748b"}}>Max Risk</div>
          <div className="text-sm font-bold" style={{color:"#ef4444"}}>-${Math.abs(maxRisk).toFixed(2)}</div>
        </div>
      </div>
      <div className="rounded-xl p-2.5 mb-3" style={{background:netProfit>=0?"rgba(34,197,94,0.1)":"rgba(239,68,68,0.1)",border:`1px solid ${netProfit>=0?"rgba(34,197,94,0.25)":"rgba(239,68,68,0.25)"}`}}>
        <div className="flex justify-between items-center">
          <span className="text-xs font-semibold" style={{color:"#94a3b8"}}>Net Profit</span>
          <span className="text-sm font-black" style={{color:netProfit>=0?"#22c55e":"#ef4444"}}>{netProfit>=0?"+":""}{netProfit.toFixed(2)}</span>
        </div>
      </div>
      {(opp.rsi||opp.macd)&&(
        <div className="flex gap-2 mb-3 flex-wrap">
          {opp.rsi&&<span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{background:"#243044",color:opp.rsi>70?"#ef4444":opp.rsi<30?"#22c55e":"#94a3b8"}}>RSI {opp.rsi}</span>}
          {opp.macd&&<span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{background:"#243044",color:"#94a3b8"}}>MACD: {opp.macd}</span>}
          {opp.volume&&<span className="text-[10px] px-2 py-0.5 rounded-full font-semibold" style={{background:"#243044",color:"#94a3b8"}}>Vol: {opp.volume}</span>}
        </div>
      )}
      <button onClick={()=>setExpanded(!expanded)} className="w-full text-left mb-2 flex items-center justify-between text-xs font-semibold py-1" style={{color:"#f59e0b"}}>
        <span>💡 Why Trade Now</span><span>{expanded?"▲":"▼"}</span>
      </button>
      {expanded&&<div className="rounded-xl p-3 mb-3 text-xs leading-relaxed animate-fade-in" style={{background:"#0d1117",color:"#94a3b8"}}>{opp.rationale}</div>}
      <button onClick={()=>onTrade(opp,budget)} disabled={trading} className="w-full py-3 rounded-xl font-bold text-white text-sm" style={{background:trading?"#2563eb80":"#3b82f6"}}>
        {trading?"Executing...":"⚡ Execute Paper Trade ($"+budget.toFixed(2)+")"}
      </button>
    </div>
  );
}

export default function MarketsPage() {
  const {token,updateBalance}=useAuth();
  const {toast}=useToast();
  const [activeMarket,setActiveMarket]=useState<Market>("stocks");
  const [budget,setBudget]=useState(1.00);
  const [budgetInput,setBudgetInput]=useState("1.00");
  const currentTab=TABS.find(t=>t.id===activeMarket)!;

  const {data:opps,isLoading}=useQuery<TradingOpportunity[]>({
    queryKey:["/api/opportunities",activeMarket],
    queryFn:()=>fetch(`/api/opportunities/${activeMarket}`).then(r=>r.json()),
    refetchInterval:60000,staleTime:30000,
  });

  const tradeMutation=useMutation({
    mutationFn:async({opp,amount}:{opp:TradingOpportunity;amount:number})=>{
      const units=parseFloat((amount/opp.entryPrice).toFixed(6));
      const potGain=opp.market==="options"?opp.entryPrice*6*units:(opp.targetPrice-opp.entryPrice)*units;
      const res=await fetch("/api/trades/execute",{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({market:opp.market,ticker:opp.ticker,tickerName:opp.name,action:opp.action,entryPrice:opp.entryPrice,units,investedAmount:amount,potentialGain:potGain})});
      if(!res.ok){const d=await res.json();throw new Error(d.message);}
      return res.json();
    },
    onSuccess:(data)=>{updateBalance(data.newBalance);toast({title:"✅ Paper trade opened!",description:`Balance: $${parseFloat(data.newBalance).toFixed(2)}`});queryClient.invalidateQueries({queryKey:["/api/trades"]});queryClient.invalidateQueries({queryKey:["/api/portfolio/snapshots"]});},
    onError:(e:any)=>toast({title:"Trade failed",description:e.message,variant:"destructive"}),
  });

  const watchMutation=useMutation({
    mutationFn:async(opp:TradingOpportunity)=>{const res=await fetch(`/api/watchlist/${opp.ticker}`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({market:opp.market})});return res.json();},
    onSuccess:(_,opp)=>{toast({title:`⭐ ${opp.ticker} added to watchlist`});queryClient.invalidateQueries({queryKey:["/api/watchlist"]});},
  });

  useEffect(()=>{const m=Math.max(currentTab.min,budget);setBudget(m);setBudgetInput(String(m));},[activeMarket]);

  return (
    <div className="page-container min-h-screen" style={{background:"#0d1117"}}>
      <div className="max-w-md mx-auto px-4 pt-6">
        <h1 className="text-xl font-black mb-4">Markets</h1>
        <div className="flex gap-2 overflow-x-auto pb-2 mb-4 -mx-4 px-4" style={{scrollbarWidth:"none"}}>
          {TABS.map(tab=>{const active=tab.id===activeMarket;const c=MCOLORS[tab.id];return(
            <button key={tab.id} onClick={()=>setActiveMarket(tab.id)} className="flex-shrink-0 flex items-center gap-1.5 px-3 py-2 rounded-2xl text-sm font-semibold transition-all"
              style={{background:active?`${c}22`:"#1a2332",color:active?c:"#64748b",border:`2px solid ${active?c:"#243044"}`}}>
              <span>{tab.emoji}</span><span>{tab.label}</span>
            </button>
          );})}
        </div>
        <div className="sticky top-0 z-10 py-3 mb-4" style={{background:"#0d1117"}}>
          <div className="rounded-2xl p-4" style={{background:"#1a2332",border:"1px solid #243044"}}>
            <div className="text-xs font-semibold mb-2" style={{color:"#64748b"}}>HOW MUCH DO YOU WANT TO INVEST?</div>
            <div className="flex items-center gap-3 mb-2">
              <div className="flex items-center gap-2 flex-1 rounded-xl px-4 py-2.5" style={{background:"#0d1117",border:"1px solid #243044"}}>
                <span className="font-bold" style={{color:"#22c55e"}}>$</span>
                <input type="number" min={currentTab.min} step={0.01} value={budgetInput}
                  onChange={e=>{setBudgetInput(e.target.value);const n=parseFloat(e.target.value);if(!isNaN(n)&&n>=0.01)setBudget(n);}}
                  className="flex-1 bg-transparent outline-none text-base font-bold" style={{color:"#e2e8f0"}}/>
              </div>
              <div className="text-xs whitespace-nowrap" style={{color:"#64748b"}}>Min: ${currentTab.min.toFixed(2)}</div>
            </div>
            <div className="flex gap-2">
              {[0.25,1,5,10,25].filter(v=>v>=currentTab.min).slice(0,5).map(v=>(
                <button key={v} onClick={()=>{setBudget(v);setBudgetInput(String(v));}} className="flex-1 py-1 rounded-lg text-xs font-semibold border transition-all"
                  style={{background:budget===v?"rgba(59,130,246,0.15)":"transparent",borderColor:budget===v?"#3b82f6":"#243044",color:budget===v?"#60a5fa":"#64748b"}}>
                  ${v}
                </button>
              ))}
            </div>
          </div>
        </div>
        {isLoading?(
          <div className="flex flex-col gap-4">{Array(4).fill(0).map((_,i)=><div key={i} className="skeleton rounded-2xl" style={{height:280}}/>)}</div>
        ):(
          <div className="flex flex-col gap-4">
            {(opps??[]).map(opp=>(
              <TradeCard key={opp.id} opp={opp} budget={budget} trading={tradeMutation.isPending}
                onTrade={(o,a)=>tradeMutation.mutate({opp:o,amount:a})} onWatchlist={o=>watchMutation.mutate(o)}/>
            ))}
            {opps?.length===0&&<div className="text-center py-12"><div className="text-4xl mb-3">📭</div><div className="font-semibold">No signals right now</div></div>}
          </div>
        )}
      </div>
    </div>
  );
}
