import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

export const brokerConfigs = {
  alpaca: {
    id: "alpaca",
    name: "Alpaca",
    category: "Stocks & Crypto",
    signupUrl: "https://alpaca.markets/",
    description: "Beginner-friendly API for stocks, ETFs, crypto, and paper trading.",
    supportedMarkets: ["Stocks", "ETFs", "Crypto", "Paper trading"],
    safetyNote: null,
  },
  tradier: {
    id: "tradier",
    name: "Tradier",
    category: "Options",
    signupUrl: "https://tradier.com/",
    description: "Good for stocks, ETFs, and options trading with sandbox support.",
    supportedMarkets: ["Stocks", "ETFs", "Options", "Sandbox testing"],
    safetyNote: "Options are advanced and should be locked behind Advanced Mode for beginner users.",
  },
  oanda: {
    id: "oanda",
    name: "OANDA",
    category: "Forex",
    signupUrl: "https://www.oanda.com/",
    description: "Built for forex trading with demo and live API access.",
    supportedMarkets: ["Currency pairs", "Forex demo trading", "Forex live trading"],
    safetyNote: "Forex can involve leverage. Disable leverage for beginners unless the user unlocks Advanced Mode and confirms the risks.",
  },
  interactiveBrokers: {
    id: "interactiveBrokers",
    name: "Interactive Brokers",
    category: "Advanced Multi-Market",
    signupUrl: "https://www.interactivebrokers.com/",
    description: "Powerful platform for advanced traders who want access to stocks, options, futures, currencies, and global markets.",
    supportedMarkets: ["Advanced traders", "Stocks", "Options", "Futures", "Currencies", "Global markets"],
    safetyNote: "This option is best for experienced users.",
  },
};

interface TradingAccount {
  id: string;
  brokerName: string;
  mode: string;
  status: string;
  accountLabel: string;
  maskedKey: string;
  buyingPower: string;
}

export default function ConnectBrokerPage() {
  const { token } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [selectedBroker, setSelectedBroker] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showSignupHelper, setShowSignupHelper] = useState<string | null>(null);

  // Form fields
  const [accountLabel, setAccountLabel] = useState("");
  const [mode, setMode] = useState("paper");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [brokerAccountId, setBrokerAccountId] = useState("");

  // Query connected accounts
  const { data: accounts = [], isLoading } = useQuery<TradingAccount[]>({
    queryKey: ["/api/trading/accounts"],
    queryFn: async () => {
      const res = await fetch("/api/trading/accounts", {
        headers: { Authorization: `Bearer ${token}` }
      });
      return res.json();
    }
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async (data: any) => {
      const res = await fetch("/api/trading/accounts/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify(data)
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.message || "Failed to save connection");
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading/accounts"] });
      toast({
        title: "Connection Saved",
        description: "Your trading account has been securely connected.",
      });
      setModalOpen(false);
      resetForm();
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Connection Failed",
        description: err.message,
      });
    }
  });

  // Disconnect mutation
  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/trading/accounts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to delete account");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading/accounts"] });
      toast({
        title: "Account Disconnected",
        description: "The broker connection was successfully removed.",
      });
    }
  });

  const resetForm = () => {
    setAccountLabel("");
    setMode("paper");
    setApiKey("");
    setApiSecret("");
    setBrokerAccountId("");
  };

  const handleOpenConnect = (broker: any) => {
    setSelectedBroker(broker);
    setAccountLabel(`My ${broker.name} Account`);
    setModalOpen(true);
  };

  const handleSignUpClick = (broker: any) => {
    window.open(broker.signupUrl, "_blank");
    setShowSignupHelper(broker.name);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountLabel || !apiKey || !apiSecret) {
      toast({
        variant: "destructive",
        title: "Missing Fields",
        description: "Please fill in all required fields.",
      });
      return;
    }

    connectMutation.mutate({
      brokerName: selectedBroker.name,
      mode,
      accountLabel,
      apiKey,
      apiSecret,
      brokerAccountId: brokerAccountId || undefined,
    });
  };

  return (
    <div className="page-container page-glow min-h-screen pb-12 select-none" style={{ background: "var(--color-bg-deep)" }}>
      <div className="px-4 lg:px-8 pt-6 max-w-6xl mx-auto text-left">
        
        {/* Back Link */}
        <Link href="/markets" className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 mb-6 w-fit transition-all cursor-pointer">
          <i className="fas fa-arrow-left"></i> Back to Choose a Trade
        </Link>

        {/* Page Title */}
        <h1 className="text-[32px] font-black text-white leading-tight">Connect a Trading Account</h1>
        <p className="text-xs font-semibold mt-1 text-slate-500">
          Choose a broker based on what you want to trade. You can practice without connecting a broker.
        </p>

        {/* Notices */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 mb-8">
          <div className="rounded-xl p-4 border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
            <i className="fas fa-info-circle text-blue-400 text-sm mt-0.5"></i>
            <div>
              <div className="text-xs font-black text-white">Not sure? Start in Practice Mode</div>
              <div className="text-[11px] text-slate-400 font-semibold mt-1">No broker connection required. You can connect a live broker later when you are ready.</div>
            </div>
          </div>
          <div className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
            <i className="fas fa-exclamation-triangle text-amber-500 text-sm mt-0.5"></i>
            <div>
              <div className="text-xs font-black text-white">Live Trading Warning</div>
              <div className="text-[11px] text-slate-400 font-semibold mt-1">Live trading uses real money and can result in financial losses. Never risk more than you can afford.</div>
            </div>
          </div>
        </div>

        {/* Currently Connected Accounts Section */}
        {accounts.length > 0 && (
          <div className="mb-8">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4">Connected Accounts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((acc) => (
                <div key={acc.id} className="rounded-2xl p-5 border flex items-center justify-between bg-[#07101d]" style={{ borderColor: "var(--color-border-strong)" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <i className="fas fa-link text-xs"></i>
                    </div>
                    <div>
                      <div className="text-xs font-black text-white">{acc.accountLabel}</div>
                      <div className="text-[11px] text-slate-500 font-bold mt-0.5">{acc.brokerName} • Key: {acc.maskedKey}</div>
                      <div className="flex gap-2 mt-2">
                        <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border bg-green-500/10 text-green-400 border-green-500/20">
                          {acc.status}
                        </span>
                        <span className="px-2 py-0.5 rounded text-[9px] font-extrabold uppercase border bg-blue-500/10 text-blue-400 border-blue-500/20">
                          {acc.mode}
                        </span>
                      </div>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      if (confirm("Are you sure you want to disconnect this account?")) {
                        disconnectMutation.mutate(acc.id);
                      }
                    }}
                    className="px-3 py-1.5 rounded-lg border border-red-500/30 text-red-400 text-[10px] font-black hover:bg-red-500/10 transition-all cursor-pointer"
                  >
                    Disconnect
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Broker Choices Section */}
        <h2 className="text-sm font-black uppercase tracking-wider text-slate-400 mb-4">Recommended Brokers by Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {Object.values(brokerConfigs).map((broker) => (
            <div
              key={broker.id}
              className="rounded-2xl p-6 border flex flex-col justify-between min-h-[280px]"
              style={{ background: "var(--color-panel)", borderColor: "var(--color-border-strong)" }}
            >
              <div>
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-blue-400 bg-blue-900/10 border border-blue-500/10 px-2.5 py-1 rounded">
                  {broker.category}
                </span>
                <h3 className="text-lg font-black text-white mt-4">{broker.name}</h3>
                <p className="text-xs text-slate-400 font-semibold mt-2 leading-relaxed">
                  {broker.description}
                </p>

                <div className="mt-4">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-1.5">Best For:</div>
                  <ul className="flex flex-wrap gap-1.5">
                    {broker.supportedMarkets.map((m, idx) => (
                      <li key={idx} className="text-[10px] bg-slate-900 text-slate-300 px-2 py-0.5 rounded font-extrabold border border-slate-800">
                        {m}
                      </li>
                    ))}
                  </ul>
                </div>

                {broker.safetyNote && (
                  <div className="mt-4 rounded-lg bg-amber-500/5 border border-amber-500/10 p-3 text-[10px] text-amber-500 font-bold flex gap-2">
                    <i className="fas fa-exclamation-circle text-xs mt-0.5"></i>
                    <span>{broker.safetyNote}</span>
                  </div>
                )}
              </div>

              {/* Card Actions */}
              <div className="mt-6 flex flex-col gap-2.5">
                {showSignupHelper === broker.name && (
                  <div className="rounded-lg p-2.5 bg-blue-500/10 border border-blue-500/20 text-[10px] text-blue-400 font-extrabold text-center animate-fade-in">
                    After creating your broker account, click "I already have account" below to connect it.
                  </div>
                )}
                <div className="grid grid-cols-2 gap-3">
                  <button
                    onClick={() => handleSignUpClick(broker)}
                    className="w-full h-10 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-black border border-slate-700 transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    Sign Up with {broker.name}
                    <i className="fas fa-external-link-alt text-[9px]"></i>
                  </button>
                  <button
                    onClick={() => handleOpenConnect(broker)}
                    className="w-full h-10 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-black transition-all flex items-center justify-center cursor-pointer"
                  >
                    I already have {broker.name === "Interactive Brokers" ? "IBKR" : broker.name}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

      </div>

      {/* ─── Connection Modal ─── */}
      {modalOpen && selectedBroker && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center p-4 z-50 animate-fade-in select-none">
          <div className="w-full max-w-md rounded-2xl border p-6 text-left relative" style={{ background: "var(--color-card-deep)", borderColor: "var(--color-border-strong)" }}>
            
            <button
              onClick={() => { setModalOpen(false); resetForm(); }}
              className="absolute top-4 right-4 text-slate-500 hover:text-white text-sm outline-none cursor-pointer"
            >
              <i className="fas fa-times"></i>
            </button>

            <h3 className="text-base font-black text-white flex items-center gap-2">
              <i className="fas fa-shield-alt text-blue-400"></i>
              Connect Your Trading Account
            </h3>
            <p className="text-[11px] text-slate-500 font-bold mt-1">
              Broker: {selectedBroker.name} ({selectedBroker.category})
            </p>

            <form onSubmit={handleSave} className="mt-5 flex flex-col gap-4">
              
              {/* Account Label */}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Account Nickname *
                </label>
                <input
                  type="text"
                  required
                  value={accountLabel}
                  onChange={(e) => setAccountLabel(e.target.value)}
                  className="w-full h-10 rounded-lg px-3 bg-slate-900 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Mode Select */}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Account Type *
                </label>
                <div className="grid grid-cols-2 gap-3 mt-1">
                  <button
                    type="button"
                    onClick={() => setMode("paper")}
                    className={`h-9 rounded-lg text-[10px] font-black tracking-wider uppercase border transition-all cursor-pointer ${
                      mode === "paper"
                        ? "bg-blue-600/10 border-blue-500 text-blue-400"
                        : "bg-slate-950 border-slate-900 text-slate-400"
                    }`}
                  >
                    Sandbox / Paper
                  </button>
                  <button
                    type="button"
                    onClick={() => setMode("live")}
                    className={`h-9 rounded-lg text-[10px] font-black tracking-wider uppercase border transition-all cursor-pointer ${
                      mode === "live"
                        ? "bg-amber-600/10 border-amber-500 text-amber-400"
                        : "bg-slate-950 border-slate-900 text-slate-400"
                    }`}
                  >
                    Live Money
                  </button>
                </div>
              </div>

              {/* API Key */}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  API Key *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PKXXXXXX"
                  value={apiKey}
                  onChange={(e) => setApiKey(e.target.value)}
                  className="w-full h-10 rounded-lg px-3 bg-slate-900 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* API Secret */}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  API Secret *
                </label>
                <input
                  type="password"
                  required
                  placeholder="e.g. secret_xxxxxx"
                  value={apiSecret}
                  onChange={(e) => setApiSecret(e.target.value)}
                  className="w-full h-10 rounded-lg px-3 bg-slate-900 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Account ID */}
              <div>
                <label className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400 block mb-1">
                  Account ID (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Optional broker account identifier"
                  value={brokerAccountId}
                  onChange={(e) => setBrokerAccountId(e.target.value)}
                  className="w-full h-10 rounded-lg px-3 bg-slate-900 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Security Warning */}
              <div className="rounded-lg p-3 bg-blue-500/5 border border-blue-500/10 text-[10px] text-blue-400 font-bold flex gap-2">
                <i className="fas fa-lock text-xs mt-0.5"></i>
                <span>Your credentials are encrypted before storage and sent over a secure connection. Trade Pro masks full keys and secrets.</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end mt-2">
                <button
                  type="button"
                  onClick={() => { setModalOpen(false); resetForm(); }}
                  className="h-10 px-4 rounded-xl text-xs font-extrabold text-slate-400 hover:text-white cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={connectMutation.isPending}
                  className="h-10 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-extrabold transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                >
                  {connectMutation.isPending ? "Connecting..." : "Save Connection"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
