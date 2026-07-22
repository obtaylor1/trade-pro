import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Bot, BrainCircuit, CalendarClock, Check, ChevronRight, CirclePause, LockKeyhole, Play, ShieldCheck, Sparkles } from "lucide-react";
import { apiJson } from "@/lib/queryClient";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

type Allocation = { symbol: string; name: string; market: string; weight: number; reason: string };
type Profile = { id: string; goal: string; horizon: string; riskComfort: string; experience: string; riskLevel: string; allowedMarkets: string[]; authorityLevel: string; maxOrderAmount: string; maxDailyAmount: string; maxPositionPercent: number; maxLossAmount: string; approvalMode: string; mandateExpiresAt: string | null; emergencyPaused: boolean };
type Plan = { id: string; name: string; status: string; recurringAmount: string; frequency: string; allocations: Allocation[]; rationale: string; nextRunAt: string | null; lastRunAt: string | null };
type Activity = { id: string; type: string; title: string; explanation: string; createdAt: string };
type ManagedState = { profile: Profile | null; plan: Plan | null; activities: Activity[] };

const choiceClass = (active: boolean) => `rounded-2xl border px-4 py-3 text-left transition-all ${active ? "border-violet-400 bg-violet-500/15 text-white shadow-[0_0_0_1px_rgba(167,139,250,.15)]" : "border-slate-800 bg-slate-950/45 text-slate-300 hover:border-slate-600"}`;
const formatLabel = (value: string) => value.replaceAll("_", " ").replace(/\b\w/g, c => c.toUpperCase());

export default function AIManagedPage() {
  const { updateBalance } = useAuth();
  const { toast } = useToast();
  const client = useQueryClient();
  const [goal, setGoal] = useState("grow_wealth");
  const [horizon, setHorizon] = useState("over_7");
  const [riskComfort, setRiskComfort] = useState("medium");
  const [experience, setExperience] = useState("new");
  const [includeCrypto, setIncludeCrypto] = useState(false);
  const [recurringAmount, setRecurringAmount] = useState(50);
  const [frequency, setFrequency] = useState("weekly");
  const [maxOrderAmount, setMaxOrderAmount] = useState(100);
  const [maxDailyAmount, setMaxDailyAmount] = useState(250);
  const [maxLossAmount, setMaxLossAmount] = useState(100);
  const [approvalMode, setApprovalMode] = useState("manage_within_limits");

  const { data, isLoading } = useQuery<ManagedState>({ queryKey: ["/api/managed"], queryFn: () => apiJson("/api/managed") });
  const refresh = () => client.invalidateQueries({ queryKey: ["/api/managed"] });
  const setup = useMutation({
    mutationFn: async () => {
      await apiJson("/api/managed/profile", { method: "POST", body: JSON.stringify({ goal, horizon, riskComfort, experience, allowedMarkets: includeCrypto ? ["stocks", "crypto"] : ["stocks"], maxOrderAmount, maxDailyAmount, maxLossAmount, maxPositionPercent: 20, approvalMode }) });
      return apiJson<Plan>("/api/managed/proposal", { method: "POST", body: JSON.stringify({ recurringAmount, frequency }) });
    },
    onSuccess: () => { refresh(); toast({ title: "Your AI plan is ready", description: "Review the strategy and permissions before activating it." }); },
    onError: (error: Error) => toast({ title: "Plan could not be created", description: error.message, variant: "destructive" }),
  });
  const planAction = useMutation({
    mutationFn: ({ id, action }: { id: string; action: string }) => apiJson(`/api/managed/plans/${id}/${action}`, { method: "POST" }),
    onSuccess: (_, variables) => { refresh(); toast({ title: variables.action === "pause" ? "AI investing paused" : variables.action === "activate" ? "AI plan activated" : "AI investing resumed" }); },
  });
  const runNow = useMutation({
    mutationFn: (id: string) => apiJson<{ newBalance: number }>(`/api/managed/plans/${id}/run-now`, { method: "POST" }),
    onSuccess: result => { updateBalance(result.newBalance); refresh(); client.invalidateQueries({ queryKey: ["/api/trades"] }); client.invalidateQueries({ queryKey: ["/api/portfolio/snapshots"] }); toast({ title: "Practice investment complete", description: "The decision and its reason are now in your activity feed." }); },
    onError: (error: Error) => toast({ title: "Investment was not placed", description: error.message, variant: "destructive" }),
  });

  if (isLoading) return <div className="min-h-[70vh] grid place-items-center text-slate-400">Preparing your AI investing space…</div>;
  const plan = data?.plan;

  return (
    <div className="managed-page min-h-screen pb-24 text-slate-100">
      <header className="managed-hero px-5 py-8 md:px-10 md:py-10">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row md:items-end md:justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex items-center gap-2 text-violet-300 text-xs font-black uppercase tracking-[.2em] mb-3"><Sparkles size={15} /> AI-managed practice investing</div>
            <h1 className="text-3xl md:text-5xl font-black tracking-tight text-white leading-[1.05]">Set the destination.<br/><span className="text-violet-300">Trade Pro handles the routine.</span></h1>
            <p className="mt-4 text-sm md:text-base text-slate-300 max-w-2xl leading-relaxed">Build a goal-based portfolio, invest on a schedule, and see every decision in plain English. You stay in control.</p>
          </div>
          <div className="shrink-0 rounded-2xl border border-amber-400/30 bg-amber-400/10 px-4 py-3 flex gap-3 items-center max-w-sm">
            <ShieldCheck className="text-amber-300" size={22}/><div><div className="text-xs font-black text-amber-200">Practice simulation</div><div className="text-[11px] text-amber-100/70">No real money or live broker orders.</div></div>
          </div>
        </div>
      </header>

      {!plan ? (
        <main className="max-w-6xl mx-auto px-5 md:px-10 py-8 grid lg:grid-cols-[1fr_320px] gap-7">
          <section className="rounded-[28px] border border-slate-800 bg-[#111827]/90 p-5 md:p-8 shadow-2xl">
            <div className="flex items-center gap-3 mb-7"><div className="w-11 h-11 rounded-2xl bg-violet-500/15 grid place-items-center text-violet-300"><BrainCircuit/></div><div><h2 className="text-xl font-black">Tell the AI what matters</h2><p className="text-xs text-slate-400 mt-1">About 2 minutes. You can change these choices later.</p></div></div>
            <Field title="1. What are you investing for?">
              <div className="grid sm:grid-cols-2 gap-2">{[["grow_wealth","Build long-term wealth"],["home","Save for a home"],["retirement","Prepare for retirement"],["safety_net","Grow a safety net"]].map(([v,l]) => <button key={v} onClick={() => setGoal(v)} className={choiceClass(goal === v)}><span className="text-sm font-bold">{l}</span></button>)}</div>
            </Field>
            <Field title="2. When will you need this money?">
              <div className="grid sm:grid-cols-3 gap-2">{[["under_3","Under 3 years"],["3_to_7","3–7 years"],["over_7","More than 7 years"]].map(([v,l]) => <button key={v} onClick={() => setHorizon(v)} className={choiceClass(horizon === v)}><span className="text-sm font-bold">{l}</span></button>)}</div>
            </Field>
            <Field title="3. How do market drops feel?">
              <div className="grid sm:grid-cols-3 gap-2">{[["low","Protect me from swings"],["medium","I can handle some"],["high","I accept bigger swings"]].map(([v,l]) => <button key={v} onClick={() => setRiskComfort(v)} className={choiceClass(riskComfort === v)}><span className="text-sm font-bold">{l}</span></button>)}</div>
            </Field>
            <Field title="4. Your practice mandate">
              <div className="grid sm:grid-cols-2 gap-4">
                <MoneyInput label="Invest this amount" value={recurringAmount} onChange={setRecurringAmount}/>
                <label className="text-xs font-bold text-slate-300">Schedule<select value={frequency} onChange={e => setFrequency(e.target.value)} className="mt-2 w-full h-12 rounded-xl bg-slate-950 border border-slate-700 px-3 text-white"><option value="weekly">Every week</option><option value="biweekly">Every 2 weeks</option><option value="monthly">Every month</option></select></label>
                <MoneyInput label="Maximum per AI order" value={maxOrderAmount} onChange={setMaxOrderAmount}/>
                <MoneyInput label="Maximum AI amount each day" value={maxDailyAmount} onChange={setMaxDailyAmount}/>
                <MoneyInput label="Pause after this much loss" value={maxLossAmount} onChange={setMaxLossAmount}/>
                <label className="rounded-xl border border-slate-800 bg-slate-950/45 p-3 flex items-center gap-3 cursor-pointer"><input type="checkbox" checked={includeCrypto} onChange={e => setIncludeCrypto(e.target.checked)} className="accent-violet-500 w-4 h-4"/><div><div className="text-xs font-bold">Allow a small crypto allocation</div><div className="text-[10px] text-slate-500 mt-1">Higher volatility; always capped by the plan.</div></div></label>
              </div>
              <div className="mt-4"><div className="text-xs font-bold text-slate-300 mb-2">What may the AI do?</div><div className="grid sm:grid-cols-3 gap-2">{[["explain_only","Explain only","AI gives simple ideas. You place every trade."],["confirm_each","Ask me first","AI builds the trade. You approve it."],["manage_within_limits","Trade within my limits","AI may place practice trades inside your rules."]].map(([value,label,help])=><button type="button" key={value} onClick={()=>setApprovalMode(value)} className={choiceClass(approvalMode===value)}><span className="text-xs font-black block">{label}</span><span className="text-[10px] text-slate-500 mt-1 block">{help}</span></button>)}</div></div>
              <label className="block mt-4 text-xs text-slate-500">Experience<select value={experience} onChange={e => setExperience(e.target.value)} className="ml-2 rounded-lg bg-slate-950 border border-slate-700 px-2 py-1.5 text-slate-200"><option value="new">I’m new</option><option value="some">Some experience</option><option value="experienced">Experienced</option></select></label>
            </Field>
            <button data-testid="create-managed-plan" disabled={setup.isPending} onClick={() => setup.mutate()} className="w-full h-14 rounded-2xl bg-violet-500 hover:bg-violet-400 disabled:opacity-50 text-white font-black flex items-center justify-center gap-2 shadow-[0_12px_35px_rgba(139,92,246,.25)]">{setup.isPending ? "Building your plan…" : "Build my AI plan"}<ChevronRight size={18}/></button>
          </section>
          <MandateRail profile={null}/>
        </main>
      ) : (
        <ControlCenter state={data!} action={planAction} runNow={runNow}/>
      )}
    </div>
  );
}

function Field({ title, children }: { title: string; children: React.ReactNode }) { return <div className="mb-7"><h3 className="text-sm font-black text-white mb-3">{title}</h3>{children}</div>; }
function MoneyInput({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) { return <label className="text-xs font-bold text-slate-300">{label}<div className="relative mt-2"><span className="absolute left-3 top-3 text-slate-500">$</span><input type="number" min="10" value={value} onChange={e => onChange(Number(e.target.value))} className="w-full h-12 rounded-xl bg-slate-950 border border-slate-700 pl-7 pr-3 text-white"/></div></label>; }

function MandateRail({ profile }: { profile: Profile | null }) {
  return <aside className="rounded-[28px] border border-violet-400/20 bg-gradient-to-b from-violet-500/10 to-slate-950/30 p-6 h-fit lg:sticky lg:top-6"><div className="w-12 h-12 rounded-2xl bg-violet-500 text-white grid place-items-center mb-5 shadow-[0_0_30px_rgba(139,92,246,.35)]"><Bot/></div><h2 className="text-lg font-black">Your AI permission</h2><p className="text-xs text-slate-400 mt-2 leading-relaxed">Rules the AI must follow every time.</p><div className="mt-6 space-y-5 border-l border-violet-400/30 pl-5">{["Uses practice money only","Buys only approved markets",profile ? `Never more than $${Number(profile.maxOrderAmount).toFixed(0)} per trade` : "Never exceeds your order limit",profile ? `Never more than $${Number(profile.maxDailyAmount).toFixed(0)} each day` : "Follows your daily limit","Stops immediately when paused"].map(text => <div key={text} className="relative text-xs font-bold text-slate-200"><span className="absolute -left-[26px] top-0.5 w-2.5 h-2.5 rounded-full bg-violet-400 ring-4 ring-violet-400/10"/>{text}</div>)}</div>{profile && <div className="mt-6 rounded-xl bg-slate-950/50 p-3 text-[11px] text-slate-400 space-y-1"><div>AI mode: <strong className="text-white">{formatLabel(profile.approvalMode)}</strong></div><div>Risk path: <strong className="text-white">{formatLabel(profile.riskLevel)}</strong></div></div>}</aside>;
}

function ControlCenter({ state, action, runNow }: { state: ManagedState; action: any; runNow: any }) {
  const { plan, profile, activities } = state;
  if (!plan || !profile) return null;
  const active = plan.status === "active";
  const paused = plan.status === "paused";
  return <main className="max-w-6xl mx-auto px-5 md:px-10 py-8">
    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6"><div><div className="flex items-center gap-2"><span data-testid="managed-status" className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-wider font-black ${active ? "bg-green-400/15 text-green-300" : paused ? "bg-amber-400/15 text-amber-300" : "bg-violet-400/15 text-violet-300"}`}>{plan.status}</span><span className="text-xs text-slate-500">Practice mandate</span></div><h2 className="text-2xl md:text-3xl font-black mt-2">{plan.name}</h2><p className="text-sm text-slate-400 mt-1">{plan.rationale}</p></div><div className="flex gap-2">{plan.status === "proposed" && <button data-testid="activate-managed-plan" onClick={() => action.mutate({ id: plan.id, action: "activate" })} className="h-11 px-5 rounded-xl bg-violet-500 hover:bg-violet-400 font-black text-sm flex items-center gap-2"><Play size={16}/>Activate plan</button>}{active && <button data-testid="pause-managed-plan" onClick={() => action.mutate({ id: plan.id, action: "pause" })} className="h-11 px-5 rounded-xl border border-amber-400/35 bg-amber-400/10 text-amber-200 font-black text-sm flex items-center gap-2"><CirclePause size={16}/>Pause AI</button>}{paused && <button data-testid="resume-managed-plan" onClick={() => action.mutate({ id: plan.id, action: "resume" })} className="h-11 px-5 rounded-xl bg-violet-500 font-black text-sm flex items-center gap-2"><Play size={16}/>Resume AI</button>}</div></div>
    <div className="grid lg:grid-cols-[1fr_340px] gap-6">
      <div className="space-y-6">
        <section className="rounded-[28px] border border-slate-800 bg-[#111827]/90 p-5 md:p-7"><div className="flex items-center justify-between mb-6"><div><div className="text-[10px] uppercase tracking-[.18em] font-black text-slate-500">Target portfolio</div><h3 className="text-lg font-black mt-1">Where the AI will invest</h3></div><div className="text-right"><div className="text-xl font-black text-violet-300">${Number(plan.recurringAmount).toFixed(0)}</div><div className="text-[10px] text-slate-500">{formatLabel(plan.frequency)}</div></div></div><div className="h-3 flex rounded-full overflow-hidden mb-6">{plan.allocations.map((a,i) => <div key={a.symbol} style={{ width: `${a.weight}%`, background: ["#8b5cf6","#3b82f6","#14b8a6","#f59e0b"][i] }} />)}</div><div className="grid sm:grid-cols-2 gap-3">{plan.allocations.map((a,i) => <div key={a.symbol} className="rounded-2xl border border-slate-800 bg-slate-950/45 p-4"><div className="flex justify-between"><div className="flex items-center gap-2"><span className="w-2.5 h-2.5 rounded-full" style={{ background: ["#8b5cf6","#3b82f6","#14b8a6","#f59e0b"][i] }}/><strong>{a.symbol}</strong><span className="text-[10px] text-slate-500">{a.name}</span></div><strong className="text-violet-300">{a.weight}%</strong></div><p className="mt-2 text-[11px] text-slate-400 leading-relaxed">{a.reason}</p></div>)}</div></section>
        <section className="rounded-[28px] border border-slate-800 bg-[#111827]/90 p-5 md:p-7"><div className="flex items-center justify-between gap-4"><div><div className="flex items-center gap-2 text-sm font-black"><CalendarClock size={17} className="text-violet-300"/>Next managed investment</div><p className="text-xs text-slate-400 mt-2">{active && plan.nextRunAt ? new Date(plan.nextRunAt).toLocaleDateString(undefined,{weekday:"long",month:"long",day:"numeric"}) : paused ? "Paused — nothing will be invested." : "Activate your plan to begin."}</p></div><button data-testid="run-managed-plan" disabled={!active || runNow.isPending} onClick={() => runNow.mutate(plan.id)} className="h-10 px-4 rounded-xl bg-slate-100 text-slate-950 disabled:opacity-30 font-black text-xs">{runNow.isPending ? "Investing…" : "Run next investment now"}</button></div></section>
      </div>
      <div className="space-y-6"><MandateRail profile={profile}/><section className="rounded-[28px] border border-slate-800 bg-[#111827]/90 p-5"><div className="flex items-center gap-2"><Sparkles size={16} className="text-violet-300"/><h3 className="text-sm font-black">AI activity</h3></div><div data-testid="managed-activity" className="mt-5 space-y-5 border-l border-slate-700 pl-5">{activities.map(item => <article key={item.id} className="relative"><span className="absolute -left-[25px] top-1 w-2 h-2 rounded-full bg-violet-400 ring-4 ring-violet-500/10"/><h4 className="text-xs font-black text-white">{item.title}</h4><p className="text-[11px] text-slate-400 mt-1 leading-relaxed">{item.explanation}</p><time className="text-[9px] text-slate-600 mt-2 block">{new Date(item.createdAt).toLocaleString()}</time></article>)}</div></section></div>
    </div>
  </main>;
}
