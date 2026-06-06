import { useState } from "react";
import { useLocation } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

export default function AccountPage() {
  const {user,token,logout,updateBalance}=useAuth();
  const {toast}=useToast();
  const [,setLocation]=useLocation();
  const [showReset,setShowReset]=useState(false);

  const {data:trades,isLoading}=useQuery<any[]>({
    queryKey:["/api/trades"],
    queryFn:()=>fetch("/api/trades",{headers:{Authorization:`Bearer ${token}`}}).then(r=>r.json()),
    enabled:!!token,
  });

  const closeMutation=useMutation({
    mutationFn:async(tradeId:string)=>{
      const res=await fetch(`/api/trades/${tradeId}/close`,{method:"POST",headers:{"Content-Type":"application/json",Authorization:`Bearer ${token}`},body:JSON.stringify({})});
      if(!res.ok){const d=await res.json();throw new Error(d.message);}
      return res.json();
    },
    onSuccess:(data)=>{
      updateBalance(parseFloat(user?.paperBalance??"10000")+data.pnl);
      toast({title:`Trade closed`,description:`P&L: ${data.pnl>=0?"+":""}$${parseFloat(data.pnl).toFixed(2)}`});
      queryClient.invalidateQueries({queryKey:["/api/trades"]});
      queryClient.invalidateQueries({queryKey:["/api/portfolio/snapshots"]});
    },
    onError:(e:any)=>toast({title:"Close failed",description:e.message,variant:"destructive"}),
  });

  const resetMutation=useMutation({
    mutationFn:async()=>{
      const res=await fetch("/api/portfolio/reset",{method:"POST",headers:{Authorization:`Bearer ${token}`}});
      return res.json();
    },
    onSuccess:()=>{
      updateBalance(10000);
      toast({title:"✅ Portfolio reset to $10,000"});
      queryClient.invalidateQueries({queryKey:["/api/trades"]});
      queryClient.invalidateQueries({queryKey:["/api/portfolio/snapshots"]});
      setShowReset(false);
    },
  });

  const balance=parseFloat(String(user?.paperBalance??10000));
  const allTrades=trades??[];
  const closedTrades=allTrades.filter(t=>t.status==="CLOSED");
  const openTrades=allTrades.filter(t=>t.status==="OPEN");
  const totalPnL=closedTrades.reduce((s,t)=>s+parseFloat(t.pnl??0),0);
  const winRate=closedTrades.length>0?Math.round(closedTrades.filter(t=>parseFloat(t.pnl??0)>0).length/closedTrades.length*100):0;
  const bestTrade=closedTrades.length>0?Math.max(...closedTrades.map(t=>parseFloat(t.pnl??0))):0;
  const worstTrade=closedTrades.length>0?Math.min(...closedTrades.map(t=>parseFloat(t.pnl??0))):0;

  const initials=(user?.name??"U").split(" ").map((n:string)=>n[0]).join("").toUpperCase().slice(0,2);

  return(
    <div className="page-container min-h-screen" style={{background:"#0d1117"}}>
      <div className="max-w-md mx-auto px-4 pt-6">
        {/* Profile */}
        <div className="flex items-center gap-4 mb-5">
          <div className="w-16 h-16 rounded-full flex items-center justify-center text-xl font-black text-white" style={{background:"linear-gradient(135deg,#3b82f6,#8b5cf6)"}}>
            {initials}
          </div>
          <div>
            <div className="text-xl font-bold">{user?.name}</div>
            <div className="text-sm" style={{color:"#64748b"}}>{user?.email}</div>
            <div className="text-xs mt-0.5" style={{color:"#64748b"}}>Paper Trading Account</div>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {[
            {label:"Paper Balance",val:`$${balance.toLocaleString("en-US",{minimumFractionDigits:2})}`,color:"#3b82f6"},
            {label:"Total P&L",val:`${totalPnL>=0?"+":""}$${totalPnL.toFixed(2)}`,color:totalPnL>=0?"#22c55e":"#ef4444"},
            {label:"Win Rate",val:`${winRate}%`,color:winRate>=60?"#22c55e":winRate>=40?"#f59e0b":"#ef4444"},
            {label:"Total Trades",val:String(allTrades.length),color:"#e2e8f0"},
            {label:"Best Trade",val:`+$${bestTrade.toFixed(2)}`,color:"#22c55e"},
            {label:"Worst Trade",val:`$${worstTrade.toFixed(2)}`,color:"#ef4444"},
          ].map(item=>(
            <div key={item.label} className="rounded-2xl p-4" style={{background:"#1a2332",border:"1px solid #243044"}}>
              <div className="text-xs mb-1" style={{color:"#64748b"}}>{item.label}</div>
              <div className="text-xl font-black" style={{color:item.color}}>{item.val}</div>
            </div>
          ))}
        </div>

        {/* Trade History */}
        <div className="mb-5">
          <div className="text-sm font-bold mb-3">📋 Trade History</div>
          {isLoading?(
            <div className="flex flex-col gap-2">{Array(3).fill(0).map((_,i)=><div key={i} className="skeleton rounded-xl" style={{height:80}}/>)}</div>
          ):allTrades.length===0?(
            <div className="rounded-2xl p-6 text-center" style={{background:"#1a2332",border:"1px solid #243044"}}>
              <div className="text-3xl mb-2">📭</div>
              <div className="text-sm" style={{color:"#64748b"}}>No trades yet</div>
              <button onClick={()=>setLocation("/markets")} className="mt-2 text-xs font-semibold" style={{color:"#3b82f6"}}>Make your first trade →</button>
            </div>
          ):(
            <div className="flex flex-col gap-2">
              {allTrades.map((trade:any)=>{
                const pnl=parseFloat(trade.pnl??0);
                const invested=parseFloat(trade.investedAmount);
                const isOpen=trade.status==="OPEN";
                const currentVal=isOpen?invested*(1+(Math.random()-0.45)*0.03):invested+pnl;
                return(
                  <div key={trade.id} className="rounded-xl p-3" style={{background:"#1a2332",border:"1px solid #243044"}}>
                    <div className="flex items-start justify-between mb-1">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-sm">{trade.ticker}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold capitalize" style={{background:"rgba(59,130,246,0.15)",color:"#60a5fa"}}>{trade.market}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded-full font-bold" style={{background:isOpen?"rgba(34,197,94,0.15)":"rgba(100,116,139,0.15)",color:isOpen?"#22c55e":"#94a3b8"}}>{trade.status}</span>
                        </div>
                        <div className="text-xs mt-0.5" style={{color:"#64748b"}}>{new Date(trade.entryAt).toLocaleDateString("en-US",{month:"short",day:"numeric",hour:"2-digit",minute:"2-digit"})}</div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold" style={{color:isOpen?"#94a3b8":pnl>=0?"#22c55e":"#ef4444"}}>
                          {isOpen?`$${currentVal.toFixed(2)}`:`${pnl>=0?"+":""}$${pnl.toFixed(2)}`}
                        </div>
                        <div className="text-xs" style={{color:"#64748b"}}>inv: ${invested.toFixed(2)}</div>
                      </div>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="text-xs" style={{color:"#64748b"}}>
                        {parseFloat(trade.units).toFixed(4)} units @ ${parseFloat(trade.entryPrice).toFixed(2)}
                      </div>
                      {isOpen&&(
                        <button onClick={()=>closeMutation.mutate(trade.id)} disabled={closeMutation.isPending}
                          className="text-xs px-3 py-1 rounded-lg font-semibold" style={{background:"rgba(239,68,68,0.15)",color:"#f87171",border:"1px solid rgba(239,68,68,0.3)"}}>
                          Close Trade
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3 mb-6">
          <button onClick={()=>setShowReset(true)}
            className="w-full py-3 rounded-2xl font-semibold text-sm"
            style={{background:"#1a2332",border:"1px solid #ef444444",color:"#f87171"}}>
            🔄 Reset Portfolio
          </button>
          <button onClick={logout}
            className="w-full py-3 rounded-2xl font-semibold text-sm"
            style={{background:"#1a2332",border:"1px solid #243044",color:"#64748b"}}>
            🚪 Sign Out
          </button>
        </div>
      </div>

      {/* Reset confirm modal */}
      {showReset&&(
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{background:"rgba(0,0,0,0.7)"}}>
          <div className="w-full max-w-sm rounded-2xl p-6" style={{background:"#1a2332",border:"1px solid #243044"}}>
            <div className="text-xl font-bold mb-2">Reset Portfolio?</div>
            <div className="text-sm mb-5" style={{color:"#94a3b8"}}>
              This will reset your balance to $10,000 and close all open trades. This cannot be undone.
            </div>
            <div className="flex gap-3">
              <button onClick={()=>setShowReset(false)} className="flex-1 py-3 rounded-xl font-semibold text-sm" style={{background:"#243044"}}>Cancel</button>
              <button onClick={()=>resetMutation.mutate()} disabled={resetMutation.isPending}
                className="flex-1 py-3 rounded-xl font-bold text-white text-sm" style={{background:"#ef4444"}}>
                {resetMutation.isPending?"Resetting...":"Yes, Reset"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
