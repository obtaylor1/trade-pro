import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const [, setLocation] = useLocation();
  const { signup } = useAuth();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password.length < 6) {
      toast({ title: "Password too short", description: "At least 6 characters required", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await signup(name, email, password);
    } catch (err: any) {
      toast({ title: "Signup failed", description: err.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-glow min-h-screen flex flex-col items-center justify-center px-4" style={{ background: "#0d1117" }}>
      <div className="text-center mb-10" style={{ position: "relative", zIndex: 1 }}>
        <div className="text-4xl font-black mb-2 gradient-text">Trade Pro</div>
        <div className="text-base" style={{ color: "var(--color-muted)" }}>Trade any market. Start with $0.25.</div>
      </div>

      <div className="w-full max-w-sm rounded-2xl p-6 glass-panel" style={{ position: "relative", zIndex: 1 }}>
        <h1 className="text-xl font-bold mb-1 text-center">Create Account</h1>
        <p className="text-xs text-center mb-5" style={{ color: "var(--color-muted)" }}>Free forever. No credit card needed.</p>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: "var(--color-text-soft)" }}>Your Name</label>
            <input
              type="text" value={name} onChange={e => setName(e.target.value)}
              required placeholder="Alex Smith"
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
              style={{ background: "#0d1117", borderColor: "#243044", color: "#e2e8f0" }}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: "var(--color-text-soft)" }}>Email</label>
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              required placeholder="you@example.com"
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
              style={{ background: "#0d1117", borderColor: "#243044", color: "#e2e8f0" }}
            />
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block" style={{ color: "var(--color-text-soft)" }}>Password</label>
            <input
              type="password" value={password} onChange={e => setPassword(e.target.value)}
              required placeholder="At least 6 characters"
              className="w-full rounded-xl px-4 py-3 text-sm border outline-none"
              style={{ background: "#0d1117", borderColor: "#243044", color: "#e2e8f0" }}
            />
          </div>
          <button
            type="submit" disabled={loading}
            className="w-full py-3 rounded-xl font-semibold text-white text-sm mt-2 transition-opacity"
            style={{ background: loading ? "#2563eb80" : "#3b82f6" }}
          >
            {loading ? "Creating account..." : "Get Started Free"}
          </button>
        </form>
        <p className="text-center text-sm mt-4" style={{ color: "var(--color-muted)" }}>
          Already have an account?{" "}
          <button onClick={() => setLocation("/login")} className="font-semibold" style={{ color: "var(--color-blue)" }}>
            Sign in
          </button>
        </p>
      </div>

      <div className="mt-6 max-w-xs text-center text-xs" style={{ color: "#334155" }}>
        You'll get $10,000 in paper money to practice trading. No real money ever used.
      </div>
    </div>
  );
}
