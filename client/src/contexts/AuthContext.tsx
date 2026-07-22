import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { queryClient } from "@/lib/queryClient";

interface AuthUser {
  id: string;
  name: string;
  email: string;
  paperBalance: string;
  onboardingComplete: boolean;
  marketInterests: string[];
  isAdmin: boolean;
}

interface AuthContextType {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  login: (email: string, password: string, rememberMe?: boolean) => Promise<void>;
  adminLogin: (email: string, password: string) => Promise<{ requiresMfa: boolean; challengeToken?: string }>;
  verifyAdminMfa: (challengeToken: string, code: string) => Promise<void>;
  loginDemo: () => Promise<void>;
  signup: (name: string, email: string, password: string, inviteCode?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  updateBalance: (newBalance: number) => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

function decodeExp(token: string): number | null {
  try {
    const payload = JSON.parse(atob(token.split(".")[1]));
    return payload.exp ?? null;
  } catch {
    return null;
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem("tp_token"));
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!token) { setIsLoading(false); return; }

    // Auto-refresh if less than 7 days remain
    const exp = decodeExp(token);
    const sevenDays = 7 * 24 * 3600;
    const shouldRefresh = exp !== null && (exp - Date.now() / 1000) < sevenDays;

    const fetchMe = (t: string) =>
      fetch("/api/auth/me", { headers: { Authorization: `Bearer ${t}` } })
        .then(r => r.ok ? r.json() : null);

    const init = async () => {
      try {
        let activeToken = token;
        if (shouldRefresh) {
          try {
            const rr = await fetch("/api/auth/refresh", {
              method: "POST",
              headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
            });
            if (rr.ok) {
              const { token: newToken } = await rr.json();
              localStorage.setItem("tp_token", newToken);
              setToken(newToken);
              activeToken = newToken;
            }
          } catch { /* keep old token */ }
        }
        const data = await fetchMe(activeToken);
        if (data) setUser(data);
        else { setToken(null); localStorage.removeItem("tp_token"); }
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const login = async (email: string, password: string, rememberMe = false) => {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, rememberMe }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Login failed");
    localStorage.setItem("tp_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const loginDemo = async () => {
    const res = await fetch("/api/auth/demo", { method: "POST" });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Demo login failed");
    localStorage.setItem("tp_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const adminLogin = async (email: string, password: string) => {
    const res = await fetch("/api/auth/admin-login", {
      method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Owner sign-in failed");
    if (data.requiresMfa) return { requiresMfa: true, challengeToken: data.challengeToken };
    localStorage.setItem("tp_token", data.token);
    setToken(data.token);
    setUser(data.user);
    return { requiresMfa: false };
  };

  const verifyAdminMfa = async (challengeToken: string, code: string) => {
    const res = await fetch("/api/auth/admin-login/mfa", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ challengeToken, code }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Two-factor verification failed");
    localStorage.setItem("tp_token", data.token); setToken(data.token); setUser(data.user);
  };

  const signup = async (name: string, email: string, password: string, inviteCode?: string) => {
    const res = await fetch("/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, inviteCode }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Signup failed");
    localStorage.setItem("tp_token", data.token);
    setToken(data.token);
    setUser(data.user);
  };

  const logout = () => {
    localStorage.removeItem("tp_token");
    setToken(null);
    setUser(null);
    queryClient.clear();
  };

  const refreshUser = async () => {
    if (!token) return;
    const res = await fetch("/api/auth/me", { headers: { Authorization: `Bearer ${token}` } });
    if (res.ok) setUser(await res.json());
  };

  const updateBalance = (newBalance: number) => {
    setUser(u => u ? { ...u, paperBalance: String(newBalance) } : null);
  };

  return (
    <AuthContext.Provider value={{ user, token, isLoading, login, adminLogin, verifyAdminMfa, loginDemo, signup, logout, refreshUser, updateBalance }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
