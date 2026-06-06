import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

const MARKETS = [
  { id: "stocks",      label: "Stocks",      emoji: "📈", desc: "AAPL, MSFT, NVDA" },
  { id: "crypto",      label: "Crypto",      emoji: "₿",  desc: "BTC, ETH, SOL" },
  { id: "options",     label: "Options",     emoji: "🎯", desc: "Start at $0.25" },
  { id: "forex",       label: "Forex",       emoji: "💱", desc: "EUR/USD, GBP/USD" },
  { id: "commodities", label: "Commodities", emoji: "🪙", desc: "Gold, Oil, Silver" },
];

export default function OnboardingPage() {
  const { user, token, refreshUser } = useAuth();
  const { toast } = useToast();
  const [step, setStep] = useState(1);
  const [interests, setInterests] = useState<string[]>(["stocks"]);
  const [balance, setBalance] = useState(10000);
  const [saving, setSaving] = useState(false);

  const toggleMarket = (id: string) => {
    setInterests(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const finish = async () => {
    if (interests.length === 0) {
      toast({ title: "Pick at least one market", variant: "destructive" }); return;
    }
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ marketInterests: interests, paperBalance: balance }),
      });
      await refreshUser();
    } catch {
      toast({ title: "Something went wrong", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#0d1117" }}>
      <div className="w-full max-w-sm">
        {/* Progress dots */}
        <div className="flex gap-2 justify-center mb-8">
          {[1,2,3].map(s => (
            <div key={s} className="h-2 rounded-full transition-all"
              style={{ width: step === s ? 32 : 8, background: step >= s ? "#3b82f6" : "#243044" }} />
          ))}
        </div>

        {step === 1 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-1">Hi {user?.name?.split(" ")[0]}! 👋</h2>
            <p className="text-sm mb-6" style={{ color: "#64748b" }}>Which markets interest you? (pick all that apply)</p>
            <div className="flex flex-col gap-3 mb-8">
              {MARKETS.map(m => {
                const selected = interests.includes(m.id);
                return (
                  <button key={m.id} onClick={() => toggleMarket(m.id)}
                    className="flex items-center gap-4 p-4 rounded-2xl border-2 text-left transition-all"
                    style={{
                      background: selected ? "rgba(59,130,246,0.1)" : "#1a2332",
                      borderColor: selected ? "#3b82f6" : "#243044",
                    }}>
                    <span className="text-2xl">{m.emoji}</span>
                    <div>
                      <div className="font-semibold text-sm">{m.label}</div>
                      <div className="text-xs" style={{ color: "#64748b" }}>{m.desc}</div>
                    </div>
                    {selected && <span className="ml-auto text-blue-400">✓</span>}
                  </button>
                );
              })}
            </div>
            <button onClick={() => setStep(2)} disabled={interests.length === 0}
              className="w-full py-3 rounded-xl font-semibold text-white"
              style={{ background: interests.length > 0 ? "#3b82f6" : "#243044" }}>
              Continue →
            </button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-fade-in">
            <h2 className="text-2xl font-bold mb-1">Your paper balance</h2>
            <p className="text-sm mb-6" style={{ color: "#64748b" }}>This is fake money for practice. You can always reset it.</p>
            <div className="rounded-2xl p-6 mb-6" style={{ background: "#1a2332", border: "1px solid #243044" }}>
              <div className="text-sm mb-2" style={{ color: "#94a3b8" }}>Starting paper balance</div>
              <div className="text-4xl font-black mb-4" style={{ color: "#22c55e" }}>
                ${balance.toLocaleString()}
              </div>
              <input
                type="range" min={100} max={100000} step={500}
                value={balance} onChange={e => setBalance(Number(e.target.value))}
                className="w-full accent-blue-500"
              />
              <div className="flex justify-between text-xs mt-2" style={{ color: "#64748b" }}>
                <span>$100</span><span>$100,000</span>
              </div>
            </div>
            <div className="flex gap-3 flex-wrap mb-6">
              {[1000,5000,10000,25000].map(v => (
                <button key={v} onClick={() => setBalance(v)}
                  className="flex-1 py-2 rounded-xl text-sm font-medium border transition-all"
                  style={{
                    background: balance === v ? "rgba(59,130,246,0.15)" : "transparent",
                    borderColor: balance === v ? "#3b82f6" : "#243044",
                    color: balance === v ? "#60a5fa" : "#94a3b8",
                    minWidth: 72
                  }}>
                  ${v.toLocaleString()}
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <button onClick={() => setStep(1)} className="flex-1 py-3 rounded-xl font-semibold text-sm" style={{ background: "#243044" }}>Back</button>
              <button onClick={() => setStep(3)} className="flex-1 py-3 rounded-xl font-semibold text-white text-sm" style={{ background: "#3b82f6" }}>Continue →</button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="animate-fade-in text-center">
            <div className="text-6xl mb-4">🚀</div>
            <h2 className="text-2xl font-bold mb-2">You're all set!</h2>
            <p className="text-sm mb-6" style={{ color: "#64748b" }}>
              Your account is ready with <strong style={{ color: "#22c55e" }}>${balance.toLocaleString()}</strong> in paper money.
              The AI will find the best trades for you.
            </p>
            <div className="rounded-2xl p-4 mb-6 text-left" style={{ background: "#1a2332", border: "1px solid #243044" }}>
              {[
                "🤖 AI scans markets 24/7 for you",
                "💵 Trade with as little as $0.25",
                "📊 No real money — zero risk",
                "🎓 Learn while you trade",
              ].map(item => (
                <div key={item} className="flex items-center gap-3 py-2 text-sm" style={{ color: "#94a3b8" }}>
                  <span>{item}</span>
                </div>
              ))}
            </div>
            <button onClick={finish} disabled={saving}
              className="w-full py-3 rounded-xl font-bold text-white text-base"
              style={{ background: saving ? "#2563eb80" : "#3b82f6" }}>
              {saving ? "Setting up..." : "Start Trading →"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
