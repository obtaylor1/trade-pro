import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const { login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await login(email, password);
      setLocation("/");
    } catch (err: any) {
      toast({ title: "Login failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-glow min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#0d1117" }}>
      {/* Logo */}
      <div className="text-center mb-10" style={{ position: "relative", zIndex: 1 }}>
        <div className="text-4xl font-black mb-2 gradient-text">Trade Pro</div>
        <div className="text-base" style={{ color: "#64748b" }}>Trade any market. Start with $0.25.</div>
      </div>

      <div className="w-full max-w-sm rounded-2xl p-6 glass-panel" style={{ position: "relative", zIndex: 1 }}>
        <h1 className="text-xl font-bold mb-6 text-center">Sign In</h1>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: "#94a3b8" }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="you@example.com"
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
              style={{ background: "#0d1117", borderColor: "#243044", color: "#e2e8f0" }}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: "#94a3b8" }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="••••••••"
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
              style={{ background: "#0d1117", borderColor: "#243044", color: "#e2e8f0" }}
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm mt-2 transition-opacity"
            style={{ background: loading ? "#2563eb80" : "#3b82f6" }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
        <p className="text-center text-sm mt-4" style={{ color: "#64748b" }}>
          No account?{" "}
          <button onClick={() => setLocation("/signup")} className="font-semibold" style={{ color: "#3b82f6" }}>
            Create one free
          </button>
        </p>
      </div>

      <div className="mt-8 text-center text-xs" style={{ color: "#334155" }}>
        Paper trading only — no real money at risk
      </div>
    </div>
  );
}
