import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

const MODULES = [
  {
    id: 1, title: "What is Trading?", emoji: "📚", time: "5 min",
    description: "Learn the basics of buying and selling assets using real-world analogies.",
    lessons: [
      "Trading is buying something at a low price and selling it at a higher price later. Think of it like buying a concert ticket early and selling it for more when the show sells out.",
      "There are different markets: **Stocks** (owning a piece of a company), **Crypto** (digital currencies), **Forex** (currencies like EUR vs USD), and **Commodities** (gold, oil).",
      "A **paper trade** means you practice with fake money. You get all the learning with zero risk — exactly what Trade Pro is for!",
      "The **market price** changes every second based on how many people want to buy vs sell. When more people buy → price goes up. When more people sell → price goes down.",
      "You don't need to be rich to trade. With micro contracts, $0.25 can get you exposure to Apple, Bitcoin, or Gold — that's the entire point of this app!",
    ],
    quiz: [
      { q: "What is paper trading?", options: ["Trading with real money", "Practicing with fake money", "Buying physical paper assets", "A type of forex trade"], answer: 1 },
      { q: "What happens to price when more people buy?", options: ["Price goes down", "Price stays the same", "Price goes up", "Price becomes unpredictable"], answer: 2 },
      { q: "Which of these is NOT a market?", options: ["Stocks", "Crypto", "Spreadsheets", "Commodities"], answer: 2 },
    ],
  },
  {
    id: 2, title: "Reading a Trade Signal", emoji: "📡", time: "7 min",
    description: "Understand what BUY/SELL signals mean and how to read the AI cards.",
    lessons: [
      "A **trade signal** is a recommendation: BUY (go long, hoping price rises) or SELL (go short, hoping price falls). Our AI generates these by analyzing patterns.",
      "**Entry Price** — the price you buy at right now. **Target Price** — where the AI thinks it'll go (your profit). **Stop Loss** — where you'd exit to limit your loss.",
      "**Confidence %** — how certain the AI is based on multiple indicators. Green (75%+) = strong signal. Amber (60-75%) = moderate. Red (below 60%) = weak.",
      "**Risk/Reward Ratio** — if target is $110 and stop is $95 on a $100 entry, that's a 2:1 R/R ratio (gain 2x what you risk). Always want this above 1.5:1.",
      "**Signal Types**: BREAKOUT (price bursting above resistance), REVERSAL (trend changing direction), MOMENTUM (strong trend continuing), MEAN REVERSION (price snapping back to average).",
    ],
    quiz: [
      { q: "What does a 75%+ confidence mean?", options: ["Guaranteed profit", "Strong signal", "Moderate signal", "Weak signal"], answer: 1 },
      { q: "What is a Stop Loss?", options: ["Where you take profit", "Where you limit your loss", "The AI confidence score", "The entry price"], answer: 1 },
      { q: "What R/R ratio should you prefer?", options: ["0.5:1", "1:1", "Below 1:1", "Above 1.5:1"], answer: 3 },
    ],
  },
  {
    id: 3, title: "Why $0.25 is Enough", emoji: "💵", time: "5 min",
    description: "Real math showing how fractional trading works — $1 buys real shares.",
    lessons: [
      "You don't need to buy a whole share! If Apple is at $213, with $1 you can buy **0.0047 shares** of Apple. That's a real fractional share.",
      "Real math: $1 ÷ $213 = 0.0047 AAPL shares. If Apple goes up 5%, your $1 becomes $1.05. Small? Yes. But with $100 it becomes $105 — same % gain.",
      "For crypto it's even better: $0.25 ÷ Bitcoin's $98,450 = 0.0000025 BTC. Still a real piece of Bitcoin, still goes up and down with the market.",
      "**Micro Options contracts** — instead of buying 100 shares at once ($21,300 for AAPL), you buy 1 share. A $0.56 premium gives you full upside exposure.",
      "The percentage return is identical whether you invest $0.25 or $25,000. The math doesn't care about the size — only the direction matters. That's why small amounts teach you just as much.",
    ],
    quiz: [
      { q: "If AAPL is $213, how many shares does $1 buy?", options: ["1 share", "0.047 shares", "0.0047 shares", "$213 shares"], answer: 2 },
      { q: "If an asset goes up 5%, what happens to your $10 investment?", options: ["Stays at $10", "Goes to $10.50", "Goes to $15", "Doubles to $20"], answer: 1 },
      { q: "Micro options contracts let you buy...", options: ["100 shares at once", "1 share instead of 100", "Free options", "Stocks only"], answer: 1 },
    ],
  },
  {
    id: 4, title: "Understanding AI Confidence", emoji: "🤖", time: "8 min",
    description: "What RSI, MACD, and Bollinger Bands mean in plain English.",
    lessons: [
      "**RSI (Relative Strength Index)** — a score from 0-100 that measures momentum. Above 70: asset is 'overbought' (might drop soon). Below 30: 'oversold' (might bounce). 40-60: neutral zone.",
      "**MACD (Moving Average Convergence Divergence)** — tracks two trend lines. When the fast line crosses above the slow line → bullish signal (BUY). When it crosses below → bearish (SELL).",
      "**Bollinger Bands** — three lines showing price range. Price touching the top band = possibly overbought. Price touching the bottom band = possibly oversold. Price near the middle = neutral.",
      "**Volume** — how many shares/coins traded. High volume on a breakout confirms it's real. Low volume on a price move = less trustworthy, might reverse.",
      "Our AI combines RSI + MACD + Volume + price patterns to give a confidence score. No single indicator is perfect — it's the combination that matters. 75%+ confidence uses all signals agreeing.",
    ],
    quiz: [
      { q: "RSI above 70 means...", options: ["Strong buy signal", "Asset may be overbought", "Perfect entry point", "Strong sell signal only"], answer: 1 },
      { q: "MACD bullish signal happens when...", options: ["Fast line crosses below slow line", "RSI hits 70", "Fast line crosses above slow line", "Price drops 5%"], answer: 2 },
      { q: "High volume on a breakout means...", options: ["The move is less reliable", "The move is more reliable", "Volume doesn't matter", "Price will definitely drop"], answer: 1 },
    ],
  },
  {
    id: 5, title: "Risk Management", emoji: "🛡️", time: "6 min",
    description: "How to protect your capital and survive long enough to learn.",
    lessons: [
      "**Never risk more than 1-2% of your account on a single trade.** With $10,000 paper money, that means max $100-$200 per trade. This protects you from one bad day wiping you out.",
      "**Always have a Stop Loss.** Before entering any trade, decide: 'If this goes against me by X%, I get out.' The pros who survive long-term all use stop losses religiously.",
      "**Position sizing** — don't go all-in on one idea. Spread across 5-10 different trades/assets. If one fails, others can offset it. Diversification is not just advice, it's math.",
      "**Avoid revenge trading.** Lost on a trade? Step away. Don't immediately double down trying to 'get it back.' That's how small losses become big ones. The market will be there tomorrow.",
      "**Keep a trade journal.** Note why you entered, what happened, what you learned. The traders who improve fastest are the ones who review their mistakes honestly. Even paper trades deserve journaling.",
    ],
    quiz: [
      { q: "What's the recommended max risk per trade?", options: ["10-20%", "50% of account", "1-2% of account", "All available funds"], answer: 2 },
      { q: "What should you do after a losing trade?", options: ["Double down immediately", "Take a break and review calmly", "Quit trading forever", "Triple your next position"], answer: 1 },
      { q: "Diversification means...", options: ["Only trading stocks", "Spreading across multiple trades", "Concentrating on one winning idea", "Trading only at market open"], answer: 1 },
    ],
  },
];

function QuizSection({ module, progress, onComplete }: { module: typeof MODULES[0]; progress: any; onComplete: (score: number) => void }) {
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [submitted, setSubmitted] = useState(false);
  const score = submitted ? module.quiz.reduce((s, q, i) => s + (answers[i] === q.answer ? 1 : 0), 0) : 0;
  const handleSubmit = () => { if (Object.keys(answers).length < module.quiz.length) return; setSubmitted(true); onComplete(score); };
  return (
    <div>
      {module.quiz.map((q, qi) => (
        <div key={qi} className="mb-4">
          <div className="text-sm font-semibold mb-2">{qi + 1}. {q.q}</div>
          <div className="flex flex-col gap-2">
            {q.options.map((opt, oi) => {
              const selected = answers[qi] === oi;
              const correct = submitted && oi === q.answer;
              const wrong = submitted && selected && oi !== q.answer;
              return (
                <button key={oi} onClick={() => !submitted && setAnswers(a => ({ ...a, [qi]: oi }))}
                  className="text-left p-3 rounded-xl text-sm transition-all"
                  style={{
                    background: correct ? "rgba(34,197,94,0.15)" : wrong ? "rgba(239,68,68,0.15)" : selected ? "rgba(59,130,246,0.15)" : "#0d1117",
                    border: `1px solid ${correct ? "#22c55e" : wrong ? "#ef4444" : selected ? "#3b82f6" : "#243044"}`,
                    color: correct ? "#4ade80" : wrong ? "#f87171" : selected ? "#60a5fa" : "#94a3b8",
                  }}>
                  {opt}
                </button>
              );
            })}
          </div>
        </div>
      ))}
      {!submitted && (
        <button onClick={handleSubmit} disabled={Object.keys(answers).length < module.quiz.length}
          className="w-full py-3 rounded-xl font-bold text-white text-sm"
          style={{ background: Object.keys(answers).length === module.quiz.length ? "#3b82f6" : "#243044" }}>
          Submit Answers
        </button>
      )}
      {submitted && (
        <div className="rounded-xl p-4 text-center" style={{ background: "rgba(34,197,94,0.1)", border: "1px solid rgba(34,197,94,0.3)" }}>
          <div className="text-2xl font-black mb-1" style={{ color: "#22c55e" }}>{score}/{module.quiz.length} correct</div>
          <div className="text-sm" style={{ color: "#94a3b8" }}>{score === module.quiz.length ? "Perfect! Module complete! 🎉" : score >= 2 ? "Good job! Keep learning!" : "Review the lesson and try again."}</div>
        </div>
      )}
    </div>
  );
}

export default function LearnPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const [openModule, setOpenModule] = useState<number | null>(null);
  const [lessonDone, setLessonDone] = useState<Set<number>>(new Set());

  const { data: progress } = useQuery({
    queryKey: ["/api/learn/progress"],
    queryFn: () => fetch("/api/learn/progress", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
  });

  const progressMutation = useMutation({
    mutationFn: async ({ moduleId, completed, quizScore }: { moduleId: number; completed: boolean; quizScore: number }) => {
      const res = await fetch("/api/learn/progress", { method: "POST", headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }, body: JSON.stringify({ moduleId, completed, quizScore }) });
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/learn/progress"] }),
  });

  const getModuleProgress = (moduleId: number) => (progress ?? []).find((p: any) => p.moduleId === moduleId);
  const completedCount = (progress ?? []).filter((p: any) => p.completed).length;

  const handleQuizComplete = (moduleId: number, score: number) => {
    const passed = score >= 2;
    progressMutation.mutate({ moduleId, completed: passed, quizScore: score });
    if (passed) toast({ title: `🎉 Module complete! Score: ${score}/3` });
  };

  return (
    <div className="page-container lg:pb-8 min-h-screen" style={{ background: "#0d1117" }}>
      <div className="px-4 lg:px-8 pt-6 max-w-none">
        <h1 className="text-xl font-black mb-1">🎓 Trading Academy</h1>
        <p className="text-sm mb-4" style={{ color: "#64748b" }}>Learn to trade in plain English. No jargon.</p>

        {/* Progress bar */}
        <div className="rounded-2xl p-4 mb-5" style={{ background: "#1a2332", border: "1px solid #243044" }}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-semibold">{completedCount} of {MODULES.length} modules complete</span>
            <span className="text-sm font-bold" style={{ color: "#3b82f6" }}>{Math.round(completedCount / MODULES.length * 100)}%</span>
          </div>
          <div className="h-2 rounded-full" style={{ background: "#243044" }}>
            <div className="h-2 rounded-full transition-all" style={{ width: `${(completedCount / MODULES.length) * 100}%`, background: "#3b82f6" }} />
          </div>
        </div>

        {/* Module cards — 2 cols on desktop */}
        <div className="grid md:grid-cols-2 gap-4 items-start">
          {MODULES.map(mod => {
            const mp = getModuleProgress(mod.id);
            const done = mp?.completed;
            const open = openModule === mod.id;
            const lessonRead = lessonDone.has(mod.id);
            return (
              <div key={mod.id} className="rounded-2xl overflow-hidden" style={{ background: "#1a2332", border: `1px solid ${done ? "#22c55e44" : "#243044"}` }}>
                <button className="w-full p-4 text-left flex items-start gap-3" onClick={() => setOpenModule(open ? null : mod.id)}>
                  <div className="text-2xl">{mod.emoji}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5 flex-wrap">
                      <span className="font-bold text-sm">Module {mod.id}: {mod.title}</span>
                      {done && <span className="text-xs px-2 py-0.5 rounded-full font-bold" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>✓ Done</span>}
                    </div>
                    <div className="text-xs" style={{ color: "#64748b" }}>{mod.time} · {mod.description}</div>
                  </div>
                  <span style={{ color: "#64748b" }}>{open ? "▲" : "▼"}</span>
                </button>
                {open && (
                  <div className="px-4 pb-4 animate-fade-in">
                    {!lessonRead ? (
                      <div>
                        <div className="flex flex-col gap-3 mb-4">
                          {mod.lessons.map((lesson, i) => (
                            <div key={i} className="rounded-xl p-3 text-sm leading-relaxed" style={{ background: "#0d1117", color: "#94a3b8" }}>
                              <span className="font-bold" style={{ color: "#60a5fa" }}>{i + 1}. </span>
                              {lesson.split("**").map((part, pi) => pi % 2 === 1 ? <strong key={pi} style={{ color: "#e2e8f0" }}>{part}</strong> : <span key={pi}>{part}</span>)}
                            </div>
                          ))}
                        </div>
                        <button onClick={() => setLessonDone(s => { const n = new Set(s); n.add(mod.id); return n; })}
                          className="w-full py-3 rounded-xl font-bold text-white text-sm" style={{ background: "#3b82f6" }}>
                          ✅ I've read this — take the quiz
                        </button>
                      </div>
                    ) : (
                      <div>
                        <div className="text-sm font-bold mb-3">📝 Quick Quiz</div>
                        <QuizSection module={mod} progress={mp} onComplete={score => handleQuizComplete(mod.id, score)} />
                        {done && <div className="mt-3 text-center text-xs" style={{ color: "#64748b" }}>Try it in Paper Trading →</div>}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {completedCount === MODULES.length && (
          <div className="mt-6 rounded-2xl p-5 text-center" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.3)" }}>
            <div className="text-4xl mb-2">🏆</div>
            <div className="font-black text-lg mb-1">Academy Complete!</div>
            <div className="text-sm" style={{ color: "#94a3b8" }}>You're ready to trade like a pro. Head to Markets to put your skills to work!</div>
          </div>
        )}
      </div>
    </div>
  );
}
