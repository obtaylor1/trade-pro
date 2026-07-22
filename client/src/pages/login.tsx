import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login, loginDemo } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [demoLoading, setDemoLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password, rememberMe);
      setLocation("/");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleDemo = async () => {
    setDemoLoading(true);
    try {
      await loginDemo();
      setLocation("/");
    } catch (err: any) {
      toast({ title: "Demo failed", description: err.message, variant: "destructive" });
    } finally {
      setDemoLoading(false);
    }
  };

  return (
    <div className="page-glow min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#0d1117" }}>
      <div className="text-center mb-8" style={{ position: "relative", zIndex: 1 }}>
        <div className="text-4xl font-black mb-2 gradient-text">Trade Pro</div>
        <div className="text-base" style={{ color: "var(--color-muted)" }}>Trade any market. Start with $0.25.</div>
      </div>

      {/* Demo CTA */}
      <div className="w-full max-w-sm mb-4" style={{ position: "relative", zIndex: 1 }}>
        <button
          onClick={handleDemo}
          disabled={demoLoading}
          className="w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all flex items-center justify-center gap-2"
          style={{
            background: "linear-gradient(135deg, #16a34a, #22c55e)",
            boxShadow: "0 4px 16px rgba(34,197,94,0.35)",
            opacity: demoLoading ? 0.7 : 1,
          }}
        >
          {demoLoading ? "Loading demo..." : <><span>⚡</span><span>Try Live Demo — No Sign Up</span></>}
        </button>
        <p className="text-center text-xs mt-2" style={{ color: "#475569" }}>
          Instant access · $10,000 paper balance · all markets
        </p>
      </div>

      <div className="w-full max-w-sm flex items-center gap-3 mb-4" style={{ position: "relative", zIndex: 1 }}>
        <div className="flex-1 h-px" style={{ background: "#1e2d42" }} />
        <span className="text-xs" style={{ color: "#475569" }}>or sign in</span>
        <div className="flex-1 h-px" style={{ background: "#1e2d42" }} />
      </div>

      <div className="w-full max-w-sm rounded-2xl p-6 glass-panel" style={{ position: "relative", zIndex: 1 }}>
        <h1 className="text-xl font-bold mb-6 text-center">Sign In</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label htmlFor="login-email" className="text-sm font-medium mb-1 block" style={{ color: "var(--color-text-soft)" }}>Email</label>
            <input
              id="login-email"
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="you@example.com"
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
              style={{ background: "#0d1117", borderColor: "#243044", color: "#e2e8f0" }}
            />
          </div>
          <div>
            <label htmlFor="login-password" className="text-sm font-medium mb-1 block" style={{ color: "var(--color-text-soft)" }}>Password</label>
            <input
              id="login-password"
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="••••••••"
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
              style={{ background: "#0d1117", borderColor: "#243044", color: "#e2e8f0" }}
            />
          </div>

          {/* Remember Me */}
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={e => setRememberMe(e.target.checked)}
              className="h-5 w-5 rounded border-slate-600 accent-blue-500"
            />
            <span className="text-sm" style={{ color: "var(--color-text-soft)" }}>
              Remember me{" "}
              <span className="text-xs" style={{ color: "#475569" }}>(stay signed in for 90 days)</span>
            </span>
          </label>

          <button
            type="submit" disabled={loading}
            className="btn-execute w-full py-3 text-white text-sm font-semibold mt-2"
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="text-center text-sm mt-4" style={{ color: "var(--color-muted)" }}>
          No account?{" "}
          <button onClick={() => setLocation("/signup")} className="font-semibold" style={{ color: "var(--color-blue)" }}>
            Create one free
          </button>
        </p>
      </div>

      <div className="mt-8 text-center text-xs" style={{ color: "#334155" }}>
        Paper trading only — no real money at risk
      </div>
      <button onClick={() => setLocation("/admin-login")} className="mt-3 text-[11px] text-slate-600 hover:text-violet-300 transition-colors">
        Owner sign in
      </button>
    </div>
  );
}
