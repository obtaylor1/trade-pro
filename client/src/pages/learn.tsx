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

function QuizSection({ module, onComplete }: { module: typeof MODULES[0]; onComplete: (score: number) => void }) {
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
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/learn/progress"] }),
  });

  const getModuleProgress = (moduleId: number) => progress.find((p: any) => p.moduleId === moduleId);
  const completedCount = progress.filter((p: any) => p.completed).length;
  const progressPercent = Math.round((completedCount / MODULES.length) * 100);

  // Required list status check
  // Required Modules are: 1, 2, 5. Coming soon requirement: 4th (locked paper trade)
  const isRequiredDone = (id: number) => !!getModuleProgress(id)?.completed;
  const completedRequired = (isRequiredDone(1) ? 1 : 0) + (isRequiredDone(2) ? 1 : 0) + (isRequiredDone(5) ? 1 : 0);

  const handleQuizComplete = (moduleId: number, score: number) => {
    const passed = score >= 2;
    progressMutation.mutate({ moduleId, completed: passed, quizScore: score });
    if (passed) {
      toast({ title: `🎉 Lesson Complete!`, description: `You scored ${score}/3 on Module ${moduleId}.` });
    } else {
      toast({ title: `Not Passed`, description: `Score ${score}/3. Reset and review details before retrying.`, variant: "destructive" });
    }
  };

  const handleStartModule = (modId: number) => {
    setOpenModule(modId);
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
    <div className="select-none text-left pb-16">
      <div className="max-w-none">

        {/* 1. Page Header */}
        <div className="page-header select-none">
          <div>
            <h1 className="page-title">Learning Center</h1>
            <p className="page-subtitle">Learn trading in plain English. No jargon. No pressure.</p>
          </div>
        </div>

        {/* 2. Beginner Trading Path Hero Card */}
        <div className="account-status-card mb-5 select-none text-left">
          {/* Left: Academy Book Icon */}
          <div className="w-[110px] h-[110px] flex items-center justify-center bg-slate-900/50 border border-slate-800/80 rounded-2xl">
            <i className="fas fa-graduation-cap text-[42px] text-blue-400"></i>
          </div>

          {/* Center-Left: Details and progress bar */}
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">ACADEMY PATH</span>
            <h2 className="status-main mt-0.5 leading-tight text-white">Beginner Trading Path</h2>
            <p className="text-[12px] text-slate-400 font-semibold mt-1">
              5 short lessons to help you understand trading before using real or practice money.
            </p>
            
            {/* Progress bar */}
            <div className="flex items-center gap-3 mt-4 w-full max-w-md">
              <div className="flex-1 h-2 rounded-full bg-slate-950 border border-slate-800">
                <div 
                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-300"
                  style={{ width: `${progressPercent}%` }}
                />
              </div>
              <span className="text-xs font-black text-blue-400 w-12 text-right">{progressPercent}%</span>
            </div>
            <span className="text-[10px] font-bold text-slate-500 mt-1.5">
              {completedCount} of 5 lessons complete
            </span>
          </div>

          {/* Center-Right: Timing specs */}
          <div className="flex flex-col justify-center pl-4 select-none">
            <div className="bg-slate-950/40 border border-slate-900 p-3 rounded-xl">
              <span className="block text-[10px] text-slate-500 font-black uppercase tracking-wider">Estimated Time</span>
              <strong className="block text-xl font-black text-white mt-0.5">31 minutes</strong>
              <span className="block text-[9px] text-slate-400 font-bold mt-1">Total academy duration</span>
            </div>
          </div>

          {/* Far Right: Start / Continue Buttons */}
          <div className="flex flex-col justify-center gap-2">
            {completedCount === 0 ? (
              <button 
                onClick={() => handleStartModule(1)}
                className="hero-cta-button w-full cursor-pointer"
              >
                <i className="fas fa-play"></i>
                Start Module 1
              </button>
            ) : (
              <button 
                onClick={() => {
                  const nextUncomp = MODULES.find(m => !getModuleProgress(m.id)?.completed);
                  if (nextUncomp) handleStartModule(nextUncomp.id);
                  else handleStartModule(1);
                }}
                className="hero-cta-button w-full cursor-pointer bg-gradient-to-r from-indigo-500 to-blue-600"
              >
                <i className="fas fa-arrow-right"></i>
                Continue Learning
              </button>
            )}
            <span className="text-[10px] text-slate-500 font-bold text-center">
              Practice trades use virtual money.
            </span>
          </div>
        </div>

        {/* Outer Grids */}
        <div className="flex flex-col gap-6">

          {/* ────────────────── Row 1: Summary Cards ────────────────── */}
          <div className="settings-bottom-grid">
            
            {/* lessons completed */}
            <div className="account-card flex flex-col justify-between min-height-[128px]">
              <div className="flex items-center gap-2.5 mb-2 select-none">
                <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                  <i className="fas fa-check-double text-xs"></i>
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Lessons Completed</span>
              </div>
              <div className="text-left mt-1">
                <strong className="text-3xl font-black text-white">{completedCount} / 5</strong>
                <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                  Finish each lesson to build confidence.
                </p>
              </div>
            </div>

            {/* learning time */}
            <div className="account-card flex flex-col justify-between min-height-[128px]">
              <div className="flex items-center gap-2.5 mb-2 select-none">
                <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                  <i className="fas fa-clock text-xs"></i>
                </div>
                <span className="text-xs font-black text-slate-400 uppercase tracking-wider">Learning Time</span>
              </div>
              <div className="text-left mt-1">
                <strong className="text-3xl font-black text-white">31 min</strong>
                <p className="text-[11px] text-slate-400 font-semibold mt-1.5">
                  Total estimated time.
                </p>
              </div>
            </div>

            {/* current level */}
            <div className="account-card flex flex-col justify-between min-height-[128px]">
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
          <div className="account-card select-none text-left">
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2.5 mb-2">
                  <div className="w-8 h-8 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
                    <i className="fas fa-shield-halved text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black text-white">Before Live Trading</span>
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
                  <strong className="text-sm font-black text-amber-400">{completedRequired} / 4 Done</strong>
                </div>
                <button
                  onClick={handleStartRequired}
                  className="h-10 w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-slate-950 text-xs font-black transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <i className="fas fa-play text-xs"></i>
                  Start Required Lessons
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
              <span className="text-[17px] font-black text-white">Course Academy Modules</span>
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
                    className="account-card flex flex-col justify-between text-left relative"
                    style={{ borderColor: completed ? "rgba(34, 197, 94, 0.45)" : active ? "rgba(59, 130, 246, 0.55)" : "rgba(51, 85, 120, 0.55)" }}
                  >
                    <div>
                      {/* Card Top Pill Details */}
                      <div className="flex items-center justify-between flex-wrap gap-2 mb-3">
                        <span className="text-[10px] font-black text-blue-400 uppercase bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded">
                          Module {mod.moduleNumber}
                        </span>

                        <div className="flex gap-2 items-center">
                          <span className="text-[9px] font-bold text-slate-500">
                            <i className="fas fa-clock mr-1 text-[8px]"></i>
                            {mod.time}
                          </span>
                          <span className="px-1.5 py-0.5 rounded text-[8px] font-black uppercase bg-slate-900 border border-slate-850 text-slate-400">
                            {mod.level}
                          </span>
                          
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
                          Start Lesson
                        </button>
                      ) : (
                        <div className="border-t border-slate-900/80 pt-3 select-none text-left">
                          {!readDone ? (
                            <div>
                              <div className="flex flex-col gap-2 mb-3 max-h-[190px] overflow-y-auto pr-1">
                                {mod.lessons.map((lesson, li) => (
                                  <div key={li} className="rounded-lg p-2.5 text-xs leading-relaxed bg-slate-950/60 border border-slate-900 text-slate-300">
                                    <strong className="text-blue-400">{li + 1}. </strong>
                                    {lesson.split("**").map((p, pi) => pi % 2 === 1 ? <strong key={pi} className="text-white font-bold">{p}</strong> : <span key={pi}>{p}</span>)}
                                  </div>
                                ))}
                              </div>

                              <div className="flex gap-2">
                                <button
                                  onClick={() => setOpenModule(null)}
                                  className="h-10 px-3 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[11px] font-black cursor-pointer shrink-0"
                                >
                                  Collapse
                                </button>
                                <button
                                  onClick={() => setLessonDone(s => { const c = new Set(s); c.add(mod.id); return c; })}
                                  className="flex-1 h-10 rounded-lg bg-green-600 hover:bg-green-700 text-white text-[11px] font-black transition-all flex items-center justify-center cursor-pointer"
                                >
                                  ✅ I've read this — take the quiz
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

                              <QuizSection module={mod} onComplete={score => handleQuizComplete(mod.id, score)} />
                              
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
                        📋 Quick Check: A short quiz will appear after the lesson.
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
                      Module 6
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
                      Module 7
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
                <div key={item.term} className="account-card p-4 rounded-xl text-left flex flex-col justify-between">
                  <div className="text-xs font-black text-blue-400 border-b border-slate-900/60 pb-1.5 mb-2 block">
                    {item.term}
                  </div>
                  <p className="text-xs text-slate-300 font-semibold leading-normal">
                    {item.desc}
                  </p>
                </div>
              ))}
            </div>
          </div>

        </div>

      </div>
    </div>
  );
}
