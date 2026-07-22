import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiJson } from "@/lib/queryClient";
import type { LearnProgress } from "@shared/schema";
import { useToast } from "@/hooks/use-toast";

const MODULES = [
  {
    id: 1,
    moduleNumber: 1,
    title: "What Is Trading?",
    emoji: "📚",
    icon: "fas fa-book",
    time: "5 min",
    level: "Beginner",
    requiredForLive: true,
    description: "Learn the basics of buying, selling, and practicing trades.",
    whatYouWillLearn: {
      bullets: [
        "What trading actually is using real-world analogies.",
        "How prices fluctuate based on buying vs selling supply.",
        "How paper trading lets you practice completely risk-free."
      ],
      terms: "Paper Trading, Market Price, Bid/Ask Spread",
      whyItMatters: "Gives you a safe sandbox to master the basic mechanics of price swings before using real capital."
    },
    lessons: [
      "Trading is buying an asset at a low price and selling it at a higher price later. Think of it like buying a concert ticket early and selling it for more when the show sells out.",
      "There are different markets: **Stocks** (owning a piece of a company), **Crypto** (digital currencies), **Forex** (currencies like EUR vs USD), and **Commodities** (gold, oil).",
      "A **paper trade** means you practice with fake money. You get all the learning with zero risk — exactly what Trade Pro is for!",
      "The **market price** changes every second based on how many people want to buy vs sell. When more people buy → price goes up. When more people sell → price goes down.",
      "You don't need to be rich to trade. With micro contracts, $0.25 can get you exposure to Apple, Bitcoin, or Gold — that's the entire point of this app!"
    ],
    quiz: [
      { q: "What is paper trading?", options: ["Trading with real money", "Practicing with fake money", "Buying physical paper assets", "A type of forex trade"], answer: 1 },
      { q: "What happens to price when more people buy?", options: ["Price goes down", "Price stays the same", "Price goes up", "Price becomes unpredictable"], answer: 2 },
      { q: "Which of these is NOT a market?", options: ["Stocks", "Crypto", "Spreadsheets", "Commodities"], answer: 2 },
    ]
  },
  {
    id: 2,
    moduleNumber: 2,
    title: "How to Read a Trade Card",
    emoji: "📡",
    icon: "fas fa-chart-simple",
    time: "7 min",
    level: "Beginner",
    requiredForLive: true,
    description: "Understand Buy, Sell, trade score, risk, profit, and loss.",
    whatYouWillLearn: {
      bullets: [
        "How to locate Entry Price, Target Price, and Safety Stop Loss.",
        "How to calculate your gain potential using Risk/Reward ratios.",
        "What the different signal patterns (reversals, breakouts) mean."
      ],
      terms: "Entry Price, Target, Stop Loss, Risk/Reward Ratio",
      whyItMatters: "Saves you from taking trades blindly without knowing exactly how much profit or loss to expect."
    },
    lessons: [
      "A **trade signal** is a recommendation: BUY (go long, hoping price rises) or SELL (go short, hoping price falls). Our AI generates these by analyzing patterns.",
      "**Entry Price** — the price you buy at right now. **Target Price** — where the AI thinks it'll go (your profit). **Stop Loss** — where you'd exit to limit your loss.",
      "**Confidence %** — how certain the AI is based on multiple indicators. Green (75%+) = strong signal. Amber (60-75%) = moderate. Red (below 60%) = weak.",
      "**Risk/Reward Ratio** — if target is $110 and stop is $95 on a $100 entry, that's a 2:1 R/R ratio (gain 2x what you risk). Always want this above 1.5:1.",
      "**Signal Types**: BREAKOUT (price bursting above resistance), REVERSAL (trend changing direction), MOMENTUM (strong trend continuing), MEAN REVERSION (price snapping back to average)."
    ],
    quiz: [
      { q: "What does a 75%+ confidence mean?", options: ["Guaranteed profit", "Strong signal", "Moderate signal", "Weak signal"], answer: 1 },
      { q: "What is a Stop Loss?", options: ["Where you take profit", "Where you limit your loss", "The AI confidence score", "The entry price"], answer: 1 },
      { q: "What Risk/Reward ratio should you prefer?", options: ["0.5:1", "1:1", "Below 1:1", "Above 1.5:1"], answer: 3 },
    ]
  },
  {
    id: 3,
    moduleNumber: 3,
    title: "Why $0.25 Is Enough to Practice",
    emoji: "💵",
    icon: "fas fa-coins",
    time: "5 min",
    level: "Beginner",
    requiredForLive: false,
    description: "See how small practice trades help you learn without pressure.",
    whatYouWillLearn: {
      bullets: [
        "How fractional shares let you buy pieces of large stocks.",
        "How percentages act the same whether you trade $1 or $1,000.",
        "How micro contracts let you capture returns without huge capital."
      ],
      terms: "Fractional Shares, Percentage Return, Micro Options",
      whyItMatters: "Proves that learning the trading process doesn't require risking massive sums of capital."
    },
    lessons: [
      "You don't need to buy a whole share! If Apple is at $213, with $1 you can buy **0.0047 shares** of Apple. That's a real fractional share.",
      "Real math: $1 ÷ $213 = 0.0047 AAPL shares. If Apple goes up 5%, your $1 becomes $1.05. Small? Yes. But with $100 it becomes $105 — same % gain.",
      "For crypto it's even better: $0.25 ÷ Bitcoin's $98,450 = 0.0000025 BTC. Still a real piece of Bitcoin, still goes up and down with the market.",
      "**Micro Options contracts** — instead of buying 100 shares at once ($21,300 for AAPL), you buy 1 share. A $0.56 premium gives you full upside exposure.",
      "The percentage return is identical whether you invest $0.25 or $25,000. The math doesn't care about the size — only the direction matters."
    ],
    quiz: [
      { q: "If AAPL is $213, how many shares does $1 buy?", options: ["1 share", "0.047 shares", "0.0047 shares", "$213 shares"], answer: 2 },
      { q: "If an asset goes up 5%, what happens to your $10 investment?", options: ["Stays at $10", "Goes to $10.50", "Goes to $15", "Doubles to $20"], answer: 1 },
      { q: "Micro options contracts let you buy...", options: ["100 shares at once", "1 share instead of 100", "Free options", "Stocks only"], answer: 1 },
    ]
  },
  {
    id: 4,
    moduleNumber: 4,
    title: "Understanding Trade Score",
    emoji: "🤖",
    icon: "fas fa-robot",
    time: "8 min",
    level: "Beginner",
    requiredForLive: false,
    description: "Learn what a trade score means and why it is not a guarantee.",
    whatYouWillLearn: {
      bullets: [
        "How indicator signals (RSI, MACD) shape the Trade Score.",
        "What overbought and oversold conditions mean in plain English.",
        "Why Trade Scores are guides to probability, not guarantees of success."
      ],
      terms: "RSI, MACD, Bollinger Bands, Volume Confirmation",
      whyItMatters: "Saves you from treating app calculations as guaranteed success metrics."
    },
    lessons: [
      "**RSI (Relative Strength Index)** — a score from 0-100 that measures momentum. Above 70: asset is 'overbought' (might drop soon). Below 30: 'oversold' (might bounce). 40-60: neutral zone.",
      "**MACD (Moving Average Convergence Divergence)** — tracks two trend lines. When the fast line crosses above the slow line → bullish signal (BUY). When it crosses below → bearish (SELL).",
      "**Bollinger Bands** — three lines showing price range. Price touching the top band = possibly overbought. Price touching the bottom band = possibly oversold. Price near the middle = neutral.",
      "**Volume** — how many shares/coins traded. High volume on a breakout confirms it's real. Low volume on a price move = less trustworthy, might reverse.",
      "Our AI combines RSI + MACD + Volume + price patterns to give a confidence score. No single indicator is perfect — it's the combination that matters."
    ],
    quiz: [
      { q: "RSI above 70 means...", options: ["Strong buy signal", "Asset may be overbought", "Perfect entry point", "Strong sell signal only"], answer: 1 },
      { q: "MACD bullish signal happens when...", options: ["Fast line crosses below slow line", "RSI hits 70", "Fast line crosses above slow line", "Price drops 5%"], answer: 2 },
      { q: "High volume on a breakout means...", options: ["The move is less reliable", "The move is more reliable", "Volume doesn't matter", "Price will definitely drop"], answer: 1 },
    ]
  },
  {
    id: 5,
    moduleNumber: 5,
    title: "Risk Management",
    emoji: "🛡️",
    icon: "fas fa-shield-halved",
    time: "6 min",
    level: "Beginner",
    requiredForLive: true,
    description: "Learn how safety stops, limits, and small trade amounts protect you.",
    whatYouWillLearn: {
      bullets: [
        "Why risking only 1-2% of capital per trade keeps you safe.",
        "How setting safety stops locks out massive portfolio damage.",
        "Why avoiding revenge trades keeps emotions from bankrupting you."
      ],
      terms: "Position Sizing, Capital Preservation, Revenge Trading",
      whyItMatters: "Ensures one or two bad trades don't completely wipe out your portfolio value."
    },
    lessons: [
      "**Never risk more than 1-2% of your account on a single trade.** With $10,000 paper money, that means max $100-$200 per trade. This protects you from one bad day wiping you out.",
      "**Always have a Stop Loss.** Before entering any trade, decide: 'If this goes against me by X%, I get out.' The pros who survive long-term all use stop losses.",
      "**Position sizing** — don't go all-in on one idea. Spread across 5-10 different trades/assets. If one fails, others can offset it. Diversification is math.",
      "**Avoid revenge trading.** Lost on a trade? Step away. Don't immediately double down trying to 'get it back.' That's how small losses become big ones.",
      "**Keep a trade journal.** Note why you entered, what happened, what you learned. The traders who improve fastest are the ones who review their mistakes honestly."
    ],
    quiz: [
      { q: "What's the recommended max risk per trade?", options: ["10-20%", "50% of account", "1-2% of account", "All available funds"], answer: 2 },
      { q: "What should you do after a losing trade?", options: ["Double down immediately", "Take a break and review calmly", "Quit trading forever", "Triple your next position"], answer: 1 },
      { q: "Diversification means...", options: ["Only trading stocks", "Spreading across multiple trades", "Concentrating on one winning idea", "Trading only at market open"], answer: 1 },
    ]
  }
];

const GLOSSARY = [
  { term: "Buy", desc: "You think the price may go up." },
  { term: "Sell", desc: "You think the price may go down." },
  { term: "Profit", desc: "Money you make if the trade works." },
  { term: "Loss", desc: "Money you lose if the trade does not work." },
  { term: "Trade Score", desc: "The app’s rating of the setup. It does not guarantee a win." },
  { term: "Safety Stop", desc: "A rule that closes a trade to help limit the loss." }
];

function QuizSection({ module, onComplete, onNext }: { module: typeof MODULES[0]; onComplete: (score: number) => void; onNext: () => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  
  const score = submitted 
    ? module.quiz.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0) 
    : 0;

  const handleSubmit = () => { 
    if (Object.keys(answers).length < module.quiz.length) return; 
    setSubmitted(true); 
    onComplete(score); 
  };

  return (
    <div className="bg-[#050b14]/50 border border-slate-800/80 rounded-xl p-4 mt-3">
      <div className="text-xs font-black text-blue-400 uppercase tracking-wider mb-3">📝 Lesson Quiz</div>
      
      {module.quiz.map((q, qi) => (
        <div key={qi} className="mb-4 text-left">
          <div className="text-xs font-bold text-slate-200 mb-2">{qi + 1}. {q.q}</div>
          <div className="flex flex-col gap-2">
            {q.options.map((opt, oi) => {
              const selected = answers[qi] === oi;
              const correct = submitted && oi === q.answer;
              const wrong = submitted && selected && oi !== q.answer;
              return (
                <button
                  key={oi}
                  disabled={submitted}
                  onClick={() => setAnswers(a => ({ ...a, [qi]: oi }))}
                  className="text-left p-3 rounded-lg text-xs transition-all cursor-pointer"
                  style={{
                    background: correct ? "rgba(34,197,94,0.12)" : wrong ? "rgba(239,68,68,0.12)" : selected ? "rgba(59,130,246,0.12)" : "rgba(11,22,38,0.45)",
                    border: `1px solid ${correct ? "#22c55e" : wrong ? "#ef4444" : selected ? "#3b82f6" : "rgba(51,85,120,0.35)"}`,
                    color: correct ? "#86efac" : wrong ? "#fca5a5" : selected ? "#60a5fa" : "#cbd5e1",
                  }}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      
      {!submitted && (
        <button 
          onClick={handleSubmit} 
          disabled={Object.keys(answers).length < module.quiz.length}
          className="w-full h-10 rounded-lg font-black text-white text-xs cursor-pointer transition-all flex items-center justify-center gap-1.5"
          style={{ background: Object.keys(answers).length === module.quiz.length ? "#2563eb" : "rgba(51,85,120,0.2)" }}
        >
          Submit Quiz Answers
        </button>
      )}

      {submitted && (
        <div className="rounded-lg p-3 text-center mt-2 border" style={{ background: "rgba(34,197,94,0.06)", borderColor: "rgba(34,197,94,0.2)" }}>
          <div className="text-sm font-black" style={{ color: "var(--color-green)" }}>Score: {score}/{module.quiz.length} Correct</div>
          <div className="text-[11px] text-slate-400 font-semibold mt-1">
            {score === module.quiz.length 
              ? "Perfect! Lesson complete! 🎉" 
              : score >= 2 
              ? "Passed! Good job! 📚" 
              : "Try again to pass the lesson."}
          </div>
          {score >= 2 && <button onClick={onNext} className="mt-3 min-h-10 w-full rounded-lg bg-emerald-600 text-[10px] font-black uppercase tracking-wider text-white hover:bg-emerald-500">{module.id < 5 ? <>Continue to Mission {module.id + 1} <i className="fas fa-arrow-right ml-2" /></> : <>Return to Training Path <i className="fas fa-trophy ml-2" /></>}</button>}
        </div>
      )}
    </div>
  );
}

export default function LearnPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [openModule, setOpenModule] = useState<number | null>(null);
  const [expandedLearnMore, setExpandedLearnMore] = useState<Record<number, boolean>>({});
  const [lessonDone, setLessonDone] = useState<Set<number>>(new Set());
  const [missionStep, setMissionStep] = useState<Record<number, number>>({});
  const [coachOpen, setCoachOpen] = useState(false);

  // Database progress queries
  const { data: progress = [] } = useQuery<LearnProgress[]>({
    queryKey: ["/api/learn/progress"],
    queryFn: () => apiJson<LearnProgress[]>("/api/learn/progress"),
    enabled: !!token,
  });

  const progressMutation = useMutation({
    mutationFn: async ({ moduleId, completed, quizScore }: { moduleId: number; completed: boolean; quizScore: number }) => {
      const res = await fetch("/api/learn/progress", { 
        method: "POST", 
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, 
        body: JSON.stringify({ moduleId, completed, quizScore }) 
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.message || "Could not save mission progress");
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/learn/progress"] }),
    onError: (error: Error) => toast({ title: "Progress not saved", description: error.message, variant: "destructive" }),
  });

  const getModuleProgress = (moduleId: number) => progress.find((p: any) => p.moduleId === moduleId);
  const completedCount = progress.filter((p: any) => p.completed).length;
  const progressPercent = Math.round((completedCount / MODULES.length) * 100);

  // Required list status check
  // Required Modules are: 1, 2, 5. Coming soon requirement: 4th (locked paper trade)
  const isRequiredDone = (id: number) => !!getModuleProgress(id)?.completed;
  const completedRequired = (isRequiredDone(1) ? 1 : 0) + (isRequiredDone(2) ? 1 : 0) + (isRequiredDone(5) ? 1 : 0);
  const nextMission = MODULES.find(module => !getModuleProgress(module.id)?.completed) || MODULES[0];

  const handleQuizComplete = (moduleId: number, score: number) => {
    const passed = score >= 2;
    progressMutation.mutate({ moduleId, completed: passed, quizScore: score });
    if (passed) {
      const xp = [100, 125, 75, 100, 150][moduleId - 1];
      toast({ title: `Mission ${moduleId} complete — +${xp} XP`, description: `Quick Check score: ${score}/3. Your progress was saved.` });
    } else {
      toast({ title: `Not Passed`, description: `Score ${score}/3. Reset and review details before retrying.`, variant: "destructive" });
    }
  };

  const handleStartModule = (modId: number) => {
    setOpenModule(modId);
    setMissionStep(steps => ({ ...steps, [modId]: 0 }));
    // Auto-scroll to modules section
    const el = document.getElementById(`module-card-${modId}`);
    if (el) el.scrollIntoView({ behavior: "smooth" });
  };

  const handleStartRequired = () => {
    if (!isRequiredDone(1)) handleStartModule(1);
    else if (!isRequiredDone(2)) handleStartModule(2);
    else if (!isRequiredDone(5)) handleStartModule(5);
    else toast({ title: "Required Complete", description: "You finished all available required lessons!" });
  };

  const toggleLearnMore = (modId: number) => {
    setExpandedLearnMore(prev => ({ ...prev, [modId]: !prev[modId] }));
  };

  const resetLessonQuiz = (modId: number) => {
    setLessonDone(prev => {
      const copy = new Set(prev);
      copy.delete(modId);
      return copy;
    });
  };

  return (
    <div className="min-h-screen select-none bg-[#030914] pb-16 text-left text-slate-100 [background-image:radial-gradient(circle_at_28%_4%,rgba(0,174,255,.09),transparent_26%),linear-gradient(rgba(34,110,180,.035)_1px,transparent_1px),linear-gradient(90deg,rgba(34,110,180,.035)_1px,transparent_1px)] [background-size:auto,32px_32px,32px_32px]">
      <div className="mx-auto max-w-[1540px] px-3 pt-5 sm:px-5 lg:px-7">

        {/* 1. Page Header */}
        <div className="mb-4 select-none">
          <div>
            <div className="flex flex-wrap items-center gap-3"><h1 className="text-2xl font-black tracking-tight text-white">Training Academy</h1><span className="rounded-full border border-emerald-400/45 bg-emerald-400/10 px-3 py-1 text-[9px] font-black uppercase tracking-wider text-emerald-300"><span className="mr-2 inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 motion-safe:animate-pulse" />Beginner Path</span></div>
            <p className="mt-1 text-sm text-slate-400">Learn trading in plain English. Complete missions before unlocking live trading.</p>
          </div>
        </div>

        <section className="command-scan relative mb-5 overflow-hidden rounded-2xl border border-blue-400/35 bg-[#071426]/90 p-4 shadow-[inset_0_1px_0_rgba(255,255,255,.03),0_18px_48px_rgba(0,0,0,.3)] sm:p-5">
          <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300 to-transparent" />
          <div className="grid items-center gap-5 lg:grid-cols-[220px_1fr] 2xl:grid-cols-[240px_1fr_360px]">
            <div className="relative mx-auto h-40 w-56"><div className="absolute inset-x-7 bottom-2 h-8 rounded-[50%] bg-cyan-400/15 blur-xl" /><img src="/trade-icons/ai-autopilot.png" alt="AI training coach" className="relative h-full w-full object-contain drop-shadow-[0_0_22px_rgba(34,211,238,.45)]" /><div className="absolute -right-1 top-5 flex h-12 w-12 items-center justify-center rounded-full border border-blue-300/50 bg-blue-500/20 text-xl text-blue-100 shadow-[0_0_18px_rgba(59,130,246,.45)]"><i className="fas fa-graduation-cap" /></div></div>
            <div><p className="text-[10px] font-black uppercase tracking-[.26em] text-cyan-300">AI Training Path</p><h2 className="mt-1 text-2xl font-black text-emerald-300 sm:text-3xl">Beginner Trading Path</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-slate-300">5 short missions to help you understand trading before using real or practice money.</p><div className="mt-4 flex items-center gap-3"><div className="h-2 flex-1 overflow-hidden rounded-full border border-slate-700 bg-slate-950"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 via-cyan-400 to-emerald-400 transition-all duration-500" style={{ width: `${progressPercent}%` }} /></div><strong className="w-10 text-right text-xs text-blue-300">{progressPercent}%</strong></div><p className="mt-1.5 text-[10px] font-bold text-slate-500">{completedCount} of 5 missions complete · 31 minutes total</p></div>
            <div className="grid grid-cols-2 gap-2 lg:col-span-2 2xl:col-span-1"><AcademyStatus icon="fa-shield-halved" label="Beginner Path" value="Active" tone="emerald" /><AcademyStatus icon="fa-lock" label="Live Trading" value="Locked" tone="rose" /><AcademyStatus icon="fa-book-open" label="Required Lessons" value={`${completedRequired} / 4`} tone="violet" /><AcademyStatus icon="fa-graduation-cap" label="Practice Mode" value="Active" tone="cyan" /><button onClick={() => { const next = MODULES.find(m => !getModuleProgress(m.id)?.completed); handleStartModule(next?.id || 1); }} className="col-span-2 min-h-12 rounded-xl border border-fuchsia-300 bg-fuchsia-600 text-xs font-black uppercase tracking-[.12em] text-white shadow-[0_0_24px_rgba(168,85,247,.35)] hover:bg-fuchsia-500"><i className="fas fa-play mr-2" />{completedCount ? "Continue Training" : "Start Mission 1"}</button><button onClick={() => document.getElementById("live-unlock")?.scrollIntoView({ behavior: "smooth" })} className="col-span-2 min-h-10 rounded-xl border border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-300 hover:border-cyan-400/50">View Required Lessons</button></div>
          </div>
        </section>

        {/* Outer Grids */}
        <div className="flex flex-col gap-6">

          {/* ────────────────── Row 1: Summary Cards ────────────────── */}
          <div className="settings-bottom-grid">
            
            {/* lessons completed */}
            <div className="account-card flex flex-col justify-between min-height-[128px] border-cyan-400/25 hover:border-cyan-300/45 hover:-translate-y-0.5">
              <div className="flex items-center gap-2.5 mb-2 select-none">
                <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                  <i className="fas fa-check-double text-xs"></i>
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Missions Completed</span>
              </div>
              <div className="text-left mt-1">
                <strong className="text-3xl font-black text-white">{completedCount} / 5</strong>
                <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                  Finish each mission to build confidence.
                </p>
              </div>
            </div>

            {/* learning time */}
            <div className="account-card flex flex-col justify-between min-height-[128px] border-blue-400/25 hover:border-blue-300/45 hover:-translate-y-0.5">
              <div className="flex items-center gap-2.5 mb-2 select-none">
                <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                  <i className="fas fa-clock text-xs"></i>
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Training Time</span>
              </div>
              <div className="text-left mt-1">
                <strong className="text-3xl font-black text-white">31 min</strong>
                <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                  Total estimated time.
                </p>
              </div>
            </div>

            {/* current level */}
            <div className="account-card flex flex-col justify-between min-height-[128px] border-violet-400/25 hover:border-violet-300/45 hover:-translate-y-0.5">
              <div className="flex items-center gap-2.5 mb-2 select-none">
                <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                  <i className="fas fa-user-graduate text-xs"></i>
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Current Level</span>
              </div>
              <div className="text-left mt-1">
                <strong className="text-3xl font-black text-green-400">Beginner</strong>
                <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                  Built for new traders.
                </p>
              </div>
            </div>

          </div>

          {/* ────────────────── Before Live Trading Warning ────────────────── */}
          <div id="live-unlock" className="account-card select-none text-left border-amber-400/40 bg-[radial-gradient(circle_at_82%_50%,rgba(245,158,11,.10),transparent_25%)]">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                    <i className="fas fa-shield-halved text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black uppercase tracking-wide text-amber-100">Live Trading Unlock Requirements</span>
                </div>
                <p className="text-xs text-slate-400 font-semibold leading-relaxed">
                  Complete the required lessons before using real money.
                </p>
                
                {/* List requirements */}
                <div className="flex flex-wrap gap-x-6 gap-y-2 mt-4 select-none">
                  {[
                    { id: 1, label: "What Is Trading?" },
                    { id: 2, label: "How to Read a Trade Card" },
                    { id: 5, label: "Risk Management" },
                    { id: 6, label: "Paper vs Live Trading (Coming Soon)" },
                  ].map(req => {
                    const done = req.id === 6 ? false : isRequiredDone(req.id);
                    return (
                      <div key={req.id} className="flex items-center gap-2 text-xs font-bold">
                        {req.id === 6 ? (
                          <i className="fas fa-clock text-slate-500"></i>
                        ) : done ? (
                          <i className="fas fa-circle-check text-green-500"></i>
                        ) : (
                          <i className="fas fa-circle-minus text-amber-500/80"></i>
                        )}
                        <span className={done ? "text-slate-300" : "text-slate-400"}>
                          {req.label} {req.id !== 6 && (done ? "(Done)" : "(Required)")}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Right panel CTA */}
              <div className="flex flex-col gap-2 w-full md:w-[280px] shrink-0 border-l border-slate-800/80 pl-0 md:pl-6 text-left">
                <div className="flex justify-between items-center">
                  <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider">Required Progress</span>
                  <strong className="text-sm font-black text-amber-400">{completedRequired} / 4 Complete</strong>
                </div>
                <button
                  onClick={handleStartRequired}
                  className="h-10 w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <i className="fas fa-play text-xs"></i>
                  Start Required Training
                </button>
                <span className="text-[9px] text-slate-500 font-bold leading-normal block">
                  ⚠️ Live trading uses real money. Learning first helps protect you from mistakes.
                </span>
              </div>
            </div>
          </div>

          {/* ────────────────── Course Modules responsive grid ────────────────── */}
          <div>
            <div className="flex items-center gap-2.5 mb-2 select-none pl-1">
              <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                <i className="fas fa-graduation-cap text-xs"></i>
              </div>
              <div><span className="block text-[17px] font-black text-white">Training Missions</span><span className="text-[10px] font-semibold text-slate-500">Complete these missions to learn trading in simple steps.</span></div>
            </div>

            <div className="grid md:grid-cols-2 gap-4 mt-3">
              {MODULES.map(mod => {
                const mp = getModuleProgress(mod.id);
                const completed = !!mp?.completed;
                const active = openModule === mod.id;
                const readDone = lessonDone.has(mod.id);
                const learnMoreExpanded = !!expandedLearnMore[mod.id];

                return (
                  <div 
                    key={mod.id} 
                    id={`module-card-${mod.id}`}
                    className="account-card group flex flex-col justify-between text-left relative overflow-hidden transition hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(0,0,0,.28)]"
                    style={{ borderColor: completed ? "rgba(34, 197, 94, 0.45)" : active ? "rgba(59, 130, 246, 0.55)" : "rgba(51, 85, 120, 0.55)" }}
                  >
                    <div>
                      {/* Card Top Pill Details */}
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                        <span className="text-[10px] font-black text-blue-400 uppercase bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                          Mission {mod.moduleNumber}
                        </span>

                        <div className="flex gap-2 items-center">
                          <span className="text-[9px] font-bold text-slate-500">
                            <i className="fas fa-clock mr-1 text-[8px]"></i>
                            {mod.time}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-slate-900 border border-slate-850 text-slate-400">
                            {mod.level}
                          </span>
                          
                          {mod.requiredForLive && <span className="rounded border border-emerald-400/30 bg-emerald-400/10 px-1.5 py-0.5 text-[8px] font-black uppercase text-emerald-300">Required for Live</span>}
                          {completed ? (
                            <span className="status-pill green scale-90">
                              <i className="fas fa-check-circle"></i>
                              Completed
                            </span>
                          ) : (
                            <span className="status-pill yellow scale-90">
                              <i className="fas fa-circle-minus"></i>
                              Not Started
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Header Title with Custom Icon */}
                      <div className="flex items-center gap-3 mb-2">
                        <div className="w-8 h-8 rounded-full bg-slate-900/60 border border-slate-850 flex items-center justify-center text-slate-300">
                          <i className={`${mod.icon} text-xs`}></i>
                        </div>
                        <h3 className="text-sm font-black text-white">{mod.title}</h3>
                      </div>

                      <p className="text-xs text-slate-400 font-semibold leading-relaxed mb-4 pl-1">
                        {mod.description}
                      </p>

                      <div className="mb-3 flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/45 px-3 py-2"><div><span className="block text-[10px] font-black text-emerald-300">+{[100,125,75,100,150][mod.id - 1]} XP</span><span className="text-[8px] text-slate-500">Confidence XP</span></div><div className={`flex h-11 w-11 items-center justify-center rounded-full border-4 text-[10px] font-black ${completed ? "border-emerald-400 text-emerald-300" : "border-slate-700 border-t-blue-400 text-slate-400"}`}>{completed ? "100%" : "0%"}</div></div>

                      {/* Expand / Collapse learn details */}
                      <div className="border border-slate-900 bg-slate-950/20 rounded-lg p-2.5 mb-3 select-none text-left">
                        <button
                          onClick={() => toggleLearnMore(mod.id)}
                          className="w-full flex justify-between items-center text-[10px] font-black uppercase tracking-wider text-slate-400 hover:text-white cursor-pointer"
                        >
                          <span>What you'll learn</span>
                          <i className={`fas ${learnMoreExpanded ? "fa-chevron-up" : "fa-chevron-down"} text-[8px]`}></i>
                        </button>

                        {learnMoreExpanded && (
                          <div className="mt-2.5 border-t border-slate-900/60 pt-2.5 flex flex-col gap-2.5 animate-fade-in text-left">
                            <div className="flex flex-col gap-1.5 pl-1.5 text-xs text-slate-300">
                              {mod.whatYouWillLearn.bullets.map((b, bi) => (
                                <div key={bi} className="flex gap-2 items-start">
                                  <span className="text-blue-500 shrink-0 mt-0.5">•</span>
                                  <span className="leading-relaxed">{b}</span>
                                </div>
                              ))}
                            </div>

                            <div className="text-[10px] text-slate-400 border-t border-slate-900/50 pt-2 text-left">
                              <strong className="text-white">Key terms:</strong> {mod.whatYouWillLearn.terms}
                            </div>

                            <div className="text-[10px] text-slate-400 text-left leading-normal">
                              <strong className="text-white font-bold block mb-0.5">Why it matters:</strong>
                              {mod.whatYouWillLearn.whyItMatters}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Start / Expand Lesson Content */}
                    <div className="mt-2">
                      {!active ? (
                        <button
                          onClick={() => setOpenModule(mod.id)}
                          className="w-full h-10 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer shadow-md"
                        >
                          <i className="fas fa-book-open"></i>
                          Start Mission
                        </button>
                      ) : (
                        <div className="border-t border-slate-900/80 pt-3 select-none text-left">
                          {!readDone ? (
                            <div>
                              <div className="mb-3 rounded-xl border border-blue-400/25 bg-slate-950/60 p-4">
                                <div className="mb-4 flex items-center justify-between"><span className="text-[9px] font-black uppercase tracking-[.16em] text-blue-300">Training step {(missionStep[mod.id] || 0) + 1} of {mod.lessons.length}</span><span className="text-[9px] font-bold text-slate-500">{Math.round((((missionStep[mod.id] || 0) + 1) / mod.lessons.length) * 100)}%</span></div>
                                <div className="mb-4 flex gap-1.5" aria-label={`Mission progress: ${(missionStep[mod.id] || 0) + 1} of ${mod.lessons.length} steps`}>{mod.lessons.map((_, stepIndex) => <span key={stepIndex} className={`h-1.5 flex-1 rounded-full ${stepIndex <= (missionStep[mod.id] || 0) ? "bg-gradient-to-r from-blue-500 to-cyan-400 shadow-[0_0_8px_rgba(34,211,238,.3)]" : "bg-slate-800"}`} />)}</div>
                                <div className="min-h-[112px] text-sm leading-7 text-slate-300">
                                  {mod.lessons[missionStep[mod.id] || 0].split("**").map((part, partIndex) => partIndex % 2 === 1 ? <strong key={partIndex} className="font-black text-white">{part}</strong> : <span key={partIndex}>{part}</span>)}
                                </div>
                                <div className="mt-4 rounded-lg border border-emerald-400/15 bg-emerald-400/5 px-3 py-2 text-[10px] text-emerald-200"><i className="fas fa-lightbulb mr-2" />Take your time. There is no real money involved in this mission.</div>
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => {
                                    const current = missionStep[mod.id] || 0;
                                    if (current === 0) setOpenModule(null);
                                    else setMissionStep(steps => ({ ...steps, [mod.id]: current - 1 }));
                                  }}
                                  className="h-10 px-4 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[11px] font-black cursor-pointer shrink-0"
                                >
                                  <i className="fas fa-arrow-left mr-1.5" />{(missionStep[mod.id] || 0) === 0 ? "Exit" : "Back"}
                                </button>
                                <button
                                  onClick={() => {
                                    const current = missionStep[mod.id] || 0;
                                    if (current < mod.lessons.length - 1) setMissionStep(steps => ({ ...steps, [mod.id]: current + 1 }));
                                    else setLessonDone(done => { const copy = new Set(done); copy.add(mod.id); return copy; });
                                  }}
                                  className="flex-1 h-10 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-[11px] font-black transition-all flex items-center justify-center cursor-pointer shadow-[0_0_16px_rgba(37,99,235,.25)]"
                                >
                                  {(missionStep[mod.id] || 0) < mod.lessons.length - 1 ? <>Next Step <i className="fas fa-arrow-right ml-2" /></> : <>Start Quick Check <i className="fas fa-clipboard-check ml-2" /></>}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              <div className="flex justify-between items-center mb-2">
                                <span className="text-[10px] text-slate-500 font-bold">Read complete. Take the quiz below.</span>
                                <button 
                                  onClick={() => resetLessonQuiz(mod.id)}
                                  className="text-[9px] font-black text-amber-500 hover:text-amber-400 cursor-pointer flex items-center gap-1"
                                >
                                  <i className="fas fa-rotate text-[8px]"></i>
                                  Re-read Lesson
                                </button>
                              </div>

                              <QuizSection module={mod} onComplete={score => handleQuizComplete(mod.id, score)} onNext={() => {
                                setOpenModule(null);
                                if (mod.id < 5) handleStartModule(mod.id + 1);
                                else document.querySelector("h1")?.scrollIntoView({ behavior: "smooth" });
                              }} />
                              
                              <div className="flex gap-2 mt-3 select-none">
                                <button
                                  onClick={() => setOpenModule(null)}
                                  className="h-9 w-full rounded-lg border border-slate-800 hover:bg-slate-800/15 text-slate-400 text-[10px] font-bold cursor-pointer"
                                >
                                  Minimize Lesson
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Small Quick Check Info */}
                      <div className="text-[9px] text-slate-500 font-semibold mt-2.5 text-center">
                        📋 Quick Check: A short quiz appears after the mission.
                      </div>
                    </div>
                  </div>
                );
              })}

              {/* Locked Module Placeholder 6 */}
              <div className="account-card flex flex-col justify-between text-left border border-slate-800/60 opacity-60 bg-slate-900/10">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase bg-slate-900/50 border border-slate-800/40 px-2 py-0.5 rounded">
                      Mission 6
                    </span>
                    <span className="px-2 py-0.5 rounded text-[8px] font-black bg-slate-950 text-slate-500 border border-slate-800">
                      Locked
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-slate-950/60 border border-slate-900 flex items-center justify-center text-slate-600">
                      <i className="fas fa-circle-dollar-to-slot text-xs"></i>
                    </div>
                    <h3 className="text-sm font-black text-slate-400">Paper vs Live Trading</h3>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Understand the difference between practice money and real money.
                  </p>
                </div>

                <div className="mt-6">
                  <button disabled className="w-full h-10 rounded-xl bg-slate-800/20 border border-slate-800 text-slate-500 text-xs font-black cursor-not-allowed">
                    Coming Soon
                  </button>
                </div>
              </div>

              {/* Locked Module Placeholder 7 */}
              <div className="account-card flex flex-col justify-between text-left border border-slate-800/60 opacity-60 bg-slate-900/10">
                <div>
                  <div className="flex justify-between items-center mb-3">
                    <span className="text-[10px] font-black text-slate-500 uppercase bg-slate-900/50 border border-slate-800/40 px-2 py-0.5 rounded">
                      Mission 7
                    </span>
                    <span className="px-2 py-0.5 rounded text-[8px] font-black bg-slate-950 text-slate-500 border border-slate-800">
                      Locked
                    </span>
                  </div>

                  <div className="flex items-center gap-3 mb-2">
                    <div className="w-8 h-8 rounded-full bg-slate-950/60 border border-slate-900 flex items-center justify-center text-slate-600">
                      <i className="fas fa-link text-xs"></i>
                    </div>
                    <h3 className="text-sm font-black text-slate-400">Broker Connections</h3>
                  </div>
                  <p className="text-xs text-slate-500 font-semibold leading-relaxed">
                    Learn what a broker is and why live trading requires one.
                  </p>
                </div>

                <div className="mt-6">
                  <button disabled className="w-full h-10 rounded-xl bg-slate-800/20 border border-slate-800 text-slate-500 text-xs font-black cursor-not-allowed">
                    Coming Soon
                  </button>
                </div>
              </div>

            </div>
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.1fr_.9fr]">
            <section className="command-scan relative overflow-hidden rounded-2xl border border-fuchsia-400/40 bg-[#071426]/90 p-5 shadow-[0_0_34px_rgba(168,85,247,.10)]"><p className="text-[9px] font-black uppercase tracking-[.2em] text-fuchsia-300">Recommended Next Mission</p><div className="mt-4 flex items-center gap-4"><div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl border border-blue-400/35 bg-blue-500/10 text-2xl text-blue-200"><i className="fas fa-rocket" /></div><div><h2 className="text-lg font-black text-white">Start Mission {nextMission.id}: {nextMission.title}</h2><p className="mt-1 text-xs leading-5 text-slate-400">{nextMission.description} Practice first before using real money.</p></div></div><div className="mt-5 grid gap-2 sm:grid-cols-2"><button onClick={() => handleStartModule(nextMission.id)} className="min-h-11 rounded-lg bg-fuchsia-600 text-[10px] font-black uppercase tracking-wider text-white shadow-[0_0_20px_rgba(168,85,247,.28)]"><i className="fas fa-play mr-2" />Start Mission {nextMission.id}</button><button onClick={() => { setExpandedLearnMore(value => ({ ...value, [nextMission.id]: true })); handleStartModule(nextMission.id); }} className="min-h-11 rounded-lg border border-slate-700 text-[10px] font-black uppercase tracking-wider text-slate-300"><i className="fas fa-eye mr-2" />Preview Lesson</button></div><p className="mt-3 text-[9px] text-slate-500"><i className="fas fa-clock mr-1" />{nextMission.time} · Beginner · +{[100,125,75,100,150][nextMission.id - 1]} XP</p></section>
            <section className="relative overflow-hidden rounded-2xl border border-violet-400/35 bg-[#071426]/90 p-5"><div className="absolute -bottom-10 -right-8 h-36 w-36 rounded-full border border-cyan-400/20 shadow-[0_0_38px_rgba(34,211,238,.14)]" /><div className="relative"><p className="text-[9px] font-black uppercase tracking-[.2em] text-violet-300">AI Coach Tip</p><div className="mt-4 flex items-start gap-4"><img src="/trade-icons/ai-autopilot.png" alt="AI coach" className="h-24 w-28 object-contain drop-shadow-[0_0_14px_rgba(34,211,238,.35)]" /><p className="text-xs leading-6 text-slate-300">Complete the required training missions before live trading. Practice mode lets you learn without using real money.</p></div><button onClick={() => setCoachOpen(true)} className="mt-4 min-h-10 rounded-lg border border-violet-400/40 bg-violet-500/10 px-5 text-[10px] font-black uppercase tracking-wider text-violet-200 hover:bg-violet-500/20"><i className="fas fa-circle-question mr-2" />Ask AI Coach</button></div></section>
          </div>

          {/* ────────────────── 6. Glossary Section ────────────────── */}
          <div>
            <div className="flex items-center gap-2.5 mb-2 select-none pl-1">
              <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                <i className="fas fa-book-bookmark text-xs"></i>
              </div>
              <span className="text-[17px] font-black text-white">Trading Words Made Simple</span>
            </div>

            <div className="grid md:grid-cols-3 gap-4 mt-3">
              {GLOSSARY.map(item => (
                <div key={item.term} className="account-card p-4 rounded-xl text-left flex flex-col justify-between border-blue-400/20 hover:border-blue-300/40 hover:-translate-y-0.5">
                  <div className="text-xs font-black text-blue-300 border-b border-slate-900/60 pb-1.5 mb-2 flex items-center gap-2"><span className="flex h-7 w-7 items-center justify-center rounded-lg border border-blue-400/25 bg-blue-500/10"><i className={`fas ${item.term === "Buy" ? "fa-arrow-up" : item.term === "Sell" ? "fa-arrow-down" : item.term === "Profit" ? "fa-dollar-sign" : item.term === "Loss" ? "fa-circle-minus" : item.term === "Trade Score" ? "fa-star" : "fa-shield-halved"}`} /></span>{item.term}</div>
                  <p className="text-xs text-slate-300 font-semibold leading-normal">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
      {coachOpen && <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="coach-title"><div className="w-full max-w-md rounded-2xl border border-violet-400/40 bg-[#071426] p-5"><div className="flex items-start justify-between"><div><p className="text-[9px] font-black uppercase tracking-[.2em] text-violet-300">Training support</p><h2 id="coach-title" className="mt-1 text-lg font-black text-white">AI Coach</h2></div><button onClick={() => setCoachOpen(false)} aria-label="Close AI Coach" className="h-9 w-9 rounded-lg border border-slate-700 text-slate-400"><i className="fas fa-xmark" /></button></div><p className="mt-4 text-sm leading-6 text-slate-300">Start with the next required mission. Read each step, take the Quick Check, and use Practice Mode until the safety rules feel familiar.</p><div className="mt-4 rounded-lg border border-amber-400/20 bg-amber-400/5 p-3 text-xs text-amber-200">Training helps you understand risk. It does not guarantee trading results.</div><button onClick={() => { setCoachOpen(false); handleStartRequired(); }} className="mt-5 min-h-11 w-full rounded-lg bg-violet-600 text-xs font-black text-white">Start my next required mission</button></div></div>}
    </div>
  );
}

function AcademyStatus({ icon, label, value, tone }: { icon: string; label: string; value: string; tone: "emerald" | "rose" | "violet" | "cyan" }) {
  const colors = { emerald: "border-emerald-400/30 bg-emerald-400/5 text-emerald-300", rose: "border-rose-400/30 bg-rose-400/5 text-rose-300", violet: "border-violet-400/30 bg-violet-400/5 text-violet-300", cyan: "border-cyan-400/30 bg-cyan-400/5 text-cyan-300" };
  return <div className={`flex min-h-16 items-center gap-3 rounded-xl border px-3 ${colors[tone]}`}><i className={`fas ${icon}`} /><div><p className="text-[8px] font-black uppercase tracking-wider text-slate-500">{label}</p><strong className="text-[10px] uppercase">{value}</strong></div></div>;
}
