import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link, useLocation } from "wouter";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import { apiJson } from "@/lib/queryClient";

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
  const [, setLocation] = useLocation();

  const [selectedBroker, setSelectedBroker] = useState<any | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [showSignupHelper, setShowSignupHelper] = useState<string | null>(null);

  // Form fields
  const [accountLabel, setAccountLabel] = useState("");
  const [mode, setMode] = useState("paper");
  const [brokerAccountId, setBrokerAccountId] = useState("");

  // Query connected accounts
  const { data: accounts = [] } = useQuery<TradingAccount[]>({
    queryKey: ["/api/trading/accounts"],
    queryFn: async () => {
      return apiJson<TradingAccount[]>("/api/trading/accounts");
    }
  });

  // Connect mutation
  const connectMutation = useMutation({
    mutationFn: async (data: any) => {
      return apiJson<TradingAccount>("/api/trading/accounts/connect", {
        method: "POST",
        body: JSON.stringify(data)
      });
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
      return apiJson<{ success: boolean }>(`/api/trading/accounts/${id}`, { method: "DELETE" });
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
    toast({
      title: "Opening Signup Page",
      description: `Redirecting you to create an account with ${broker.name}.`
    });
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountLabel) {
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
      brokerAccountId: brokerAccountId || undefined,
    });
  };

  return (
    <div className="select-none text-left pb-16">
      <div className="max-w-none">
        
        {/* Back Link */}
        <Link href="/markets" className="text-xs font-bold text-blue-400 hover:text-blue-300 flex items-center gap-1.5 mb-5 w-fit transition-all cursor-pointer select-none">
          <i className="fas fa-arrow-left"></i> Back to Choose a Trade
        </Link>

        {/* Page Title */}
        <div className="page-header select-none">
          <div>
            <h1 className="page-title text-[32px] font-black text-white leading-tight">Connect a Trading Account</h1>
            <p className="page-subtitle text-xs font-semibold mt-1 text-slate-500">
              Choose a broker based on what you want to trade. You can practice without connecting a broker.
            </p>
          </div>
        </div>

        {/* Header Notice Alerts Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-8 select-none">
          <div className="rounded-xl p-4 border border-blue-500/20 bg-blue-500/5 flex items-start gap-3">
            <i className="fas fa-info-circle text-blue-400 text-sm mt-0.5"></i>
            <div>
              <div className="text-xs font-black text-white">Not sure? Start in Practice Mode</div>
              <div className="text-[11px] text-slate-400 font-semibold mt-1">No broker profile is required for practice. The broker sandbox is optional.</div>
            </div>
          </div>
          <div className="rounded-xl p-4 border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
            <i className="fas fa-exclamation-triangle text-amber-500 text-sm mt-0.5"></i>
            <div>
              <div className="text-xs font-black text-white">Sandbox Notice</div>
              <div className="text-[11px] text-slate-400 font-semibold mt-1">Current broker connections are simulated. No broker credentials are requested or stored, and no real orders are submitted.</div>
            </div>
          </div>
        </div>

        {/* Connected Accounts Section */}
        {accounts.length > 0 && (
          <div className="mb-8 select-none">
            <h2 className="text-xs font-black uppercase tracking-wider text-slate-400 mb-4 pl-1">Connected Accounts</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {accounts.map((acc) => (
                <div key={acc.id} className="rounded-2xl p-5 border flex items-center justify-between bg-[#07101d] border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                      <i className="fas fa-link text-xs"></i>
                    </div>
                    <div>
                      <div className="text-xs font-black text-white">{acc.accountLabel}</div>
                      <div className="text-[11px] text-slate-550 font-bold mt-0.5">{acc.brokerName} • Key: {acc.maskedKey}</div>
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

        {/* ────────── Sections Wrapper ────────── */}
        <div className="flex flex-col gap-6">

          {/* 1. RECOMMENDED FOR BEGINNERS */}
          <div>
            <div className="flex items-center gap-2 mb-3 pl-1 select-none">
              <span className="text-[14px] font-black text-white uppercase tracking-wider">Recommended for Beginners</span>
              <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-[#22c55e]/15 text-[#4ade80] border border-[#22c55e]/30">
                Best for getting started
              </span>
            </div>

            <div className="broker-three-grid">
              {/* Alpaca */}
              <div className="account-card broker-sandbox-card flex flex-col justify-between min-h-[300px] text-left">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1e40af] flex items-center justify-center text-white shrink-0 shadow-md">
                        <i className="fas fa-paw text-[18px]"></i>
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white">Alpaca</h3>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5 leading-normal">
                          Stocks, ETFs, Crypto, Paper Trading
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                      Best First Broker
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {["Stocks", "ETFs", "Crypto", "Paper"].map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-slate-900 border border-slate-850 text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <ul className="flex flex-col gap-1.5 text-[10px] font-bold text-slate-300 pl-1.5">
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Beginner friendly API</li>
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Paper trading supported</li>
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Low minimums</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-6">
                  <button
                    onClick={() => handleSignUpClick({ name: "Alpaca", signupUrl: "https://alpaca.markets/" })}
                    className="h-9 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[11px] font-black cursor-pointer transition-all"
                  >
                    Learn More
                  </button>
                  <button
                    onClick={() => handleOpenConnect({ name: "Alpaca", category: "Recommended for Beginners" })}
                    className="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black cursor-pointer transition-all"
                  >
                    Connect
                  </button>
                </div>
              </div>

              {/* Public */}
              <div className="account-card broker-sandbox-card flex flex-col justify-between min-h-[300px] text-left">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#10b981] flex items-center justify-center text-white shrink-0 shadow-md font-black text-lg font-mono">
                        P
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white">Public</h3>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5 leading-normal">
                          Stocks, ETFs, Options, Bonds, Crypto, Fractional Shares
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-green-500/10 text-green-400 border border-green-500/20">
                      Beginner Friendly
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {["Stocks", "ETFs", "Options", "Crypto"].map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-slate-900 border border-slate-850 text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <ul className="flex flex-col gap-1.5 text-[10px] font-bold text-slate-300 pl-1.5">
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Easy account setup</li>
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Fractional shares</li>
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Great for new investors</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-6">
                  <button
                    onClick={() => handleSignUpClick({ name: "Public", signupUrl: "https://public.com/" })}
                    className="h-9 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[11px] font-black cursor-pointer transition-all"
                  >
                    Learn More
                  </button>
                  <button
                    onClick={() => handleOpenConnect({ name: "Public", category: "Recommended for Beginners" })}
                    className="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black cursor-pointer transition-all"
                  >
                    Connect
                  </button>
                </div>
              </div>

              {/* Charles Schwab */}
              <div className="account-card broker-sandbox-card flex flex-col justify-between min-h-[300px] text-left">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#0284c7] flex items-center justify-center text-white shrink-0 shadow-md">
                        <i className="fas fa-snowflake text-[18px]"></i>
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white">Charles Schwab</h3>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5 leading-normal">
                          Stocks, ETFs, Options
                        </span>
                      </div>
                    </div>
                    <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-purple-500/10 text-purple-400 border border-purple-500/20">
                      Already Have an Account?
                    </span>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {["Stocks", "ETFs", "Options"].map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-slate-900 border border-slate-850 text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <ul className="flex flex-col gap-1.5 text-[10px] font-bold text-slate-300 pl-1.5">
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Trusted & established</li>
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Great for long-term investors</li>
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Use your existing Schwab login</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-6">
                  <button
                    onClick={() => handleSignUpClick({ name: "Charles Schwab", signupUrl: "https://developer.schwab.com/" })}
                    className="h-9 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[11px] font-black cursor-pointer transition-all"
                  >
                    Learn More
                  </button>
                  <button
                    onClick={() => handleOpenConnect({ name: "Charles Schwab", category: "Recommended for Beginners" })}
                    className="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black cursor-pointer transition-all"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 2. OPTIONS TRADING */}
          <div>
            <div className="flex items-center gap-2 mb-3 pl-1 select-none">
              <span className="text-[14px] font-black text-white uppercase tracking-wider">Options Trading</span>
              <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-purple-500/15 text-purple-400 border border-purple-500/30">
                Advanced
              </span>
            </div>

            <div className="broker-three-grid">
              {/* Tradier */}
              <div className="account-card broker-sandbox-card flex flex-col justify-between min-h-[300px] text-left">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#eab308] flex items-center justify-center text-white shrink-0 shadow-md">
                        <i className="fas fa-crosshairs text-[18px]"></i>
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white">Tradier</h3>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5 leading-normal">
                          Stocks, ETFs, Options
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {["Stocks", "ETFs", "Options"].map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-slate-900 border border-slate-850 text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <ul className="flex flex-col gap-1.5 text-[10px] font-bold text-slate-300 pl-1.5">
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Options trading API</li>
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Real-time market data</li>
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Advanced order types</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-6">
                  <button
                    onClick={() => handleSignUpClick({ name: "Tradier", signupUrl: "https://tradier.com/" })}
                    className="h-9 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[11px] font-black cursor-pointer transition-all"
                  >
                    Learn More
                  </button>
                  <button
                    onClick={() => handleOpenConnect({ name: "Tradier", category: "Options Trading" })}
                    className="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black cursor-pointer transition-all"
                  >
                    Connect
                  </button>
                </div>
              </div>

              {/* tastytrade */}
              <div className="account-card broker-sandbox-card flex flex-col justify-between min-h-[300px] text-left">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shrink-0 shadow-md text-[18px]">
                        🍒
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white">tastytrade</h3>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5 leading-normal">
                          Options, Stocks, Futures, Crypto
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {["Options", "Stocks", "Futures", "Crypto"].map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-slate-900 border border-slate-850 text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <ul className="flex flex-col gap-1.5 text-[10px] font-bold text-slate-300 pl-1.5">
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Options focused platform</li>
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Powerful trading tools</li>
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Active trader community</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-6">
                  <button
                    onClick={() => handleSignUpClick({ name: "tastytrade", signupUrl: "https://tastytrade.com/" })}
                    className="h-9 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[11px] font-black cursor-pointer transition-all"
                  >
                    Learn More
                  </button>
                  <button
                    onClick={() => handleOpenConnect({ name: "tastytrade", category: "Options Trading" })}
                    className="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black cursor-pointer transition-all"
                  >
                    Connect
                  </button>
                </div>
              </div>

              {/* TradeStation */}
              <div className="account-card broker-sandbox-card flex flex-col justify-between min-h-[300px] text-left">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#06b6d4] flex items-center justify-center text-white shrink-0 shadow-md font-bold text-lg font-mono">
                        T
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white">TradeStation</h3>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5 leading-normal">
                          Stocks, Options, Futures
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {["Stocks", "Options", "Futures"].map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-slate-900 border border-slate-850 text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <ul className="flex flex-col gap-1.5 text-[10px] font-bold text-slate-300 pl-1.5">
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Multi-asset support</li>
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Advanced charting</li>
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Strategy automation</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-6">
                  <button
                    onClick={() => handleSignUpClick({ name: "TradeStation", signupUrl: "https://api.tradestation.com/" })}
                    className="h-9 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[11px] font-black cursor-pointer transition-all"
                  >
                    Learn More
                  </button>
                  <button
                    onClick={() => handleOpenConnect({ name: "TradeStation", category: "Options Trading" })}
                    className="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black cursor-pointer transition-all"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* 3. ROW 3: FOREX / FUTURES / CRYPTO Grid */}
          <div className="broker-three-grid select-none">
            
            {/* Column 1: FOREX */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 pl-1 select-none">
                <span className="text-[12px] font-black text-slate-400 uppercase tracking-wider">Forex</span>
                <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Forex Specialists
                </span>
              </div>

              {/* OANDA */}
              <div className="account-card broker-sandbox-card flex flex-col justify-between min-h-[220px] text-left">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-[#16a34a] flex items-center justify-center text-white shrink-0 shadow-md">
                      <i className="fas fa-globe text-[16px]"></i>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">OANDA</h4>
                      <p className="text-[10px] text-slate-500 font-bold">Currency pairs, Forex trading</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {["Forex", "CFD", "Commodities"].map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase bg-slate-900 border border-slate-850 text-slate-450">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={() => handleSignUpClick({ name: "OANDA", signupUrl: "https://www.oanda.com/" })}
                    className="h-8 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[10px] font-black cursor-pointer transition-all"
                  >
                    Learn More
                  </button>
                  <button
                    onClick={() => handleOpenConnect({ name: "OANDA", category: "Forex" })}
                    className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black cursor-pointer transition-all"
                  >
                    Connect
                  </button>
                </div>
              </div>

              {/* Interactive Brokers */}
              <div className="account-card broker-sandbox-card flex flex-col justify-between min-h-[220px] text-left">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-[#111827] border border-slate-800 flex items-center justify-center text-red-500 shrink-0 shadow-md font-black text-base font-mono">
                      IB
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Interactive Brokers</h4>
                      <p className="text-[10px] text-slate-500 font-bold">Currencies, Global markets, Stocks, Options, Futures</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {["Forex", "Global", "Multi-Asset"].map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase bg-slate-900 border border-slate-850 text-slate-455">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={() => handleSignUpClick({ name: "Interactive Brokers", signupUrl: "https://www.interactivebrokers.com/" })}
                    className="h-8 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[10px] font-black cursor-pointer transition-all"
                  >
                    Learn More
                  </button>
                  <button
                    onClick={() => handleOpenConnect({ name: "Interactive Brokers", category: "Forex" })}
                    className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black cursor-pointer transition-all"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>

            {/* Column 2: FUTURES & COMMODITIES */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 pl-1 select-none">
                <span className="text-[12px] font-black text-slate-400 uppercase tracking-wider">Futures & Commodities</span>
                <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase bg-amber-500/15 text-amber-400 border border-amber-500/30">
                  Advanced
                </span>
              </div>

              {/* Tradovate */}
              <div className="account-card broker-sandbox-card flex flex-col justify-between min-h-[220px] text-left">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-[#1d4ed8] flex items-center justify-center text-white shrink-0 shadow-md">
                      <i className="fas fa-cube text-[16px]"></i>
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">Tradovate</h4>
                      <p className="text-[10px] text-slate-500 font-bold">Futures trading platform</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {["Futures", "Commodities", "Options"].map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase bg-slate-900 border border-slate-850 text-slate-455">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={() => handleSignUpClick({ name: "Tradovate", signupUrl: "https://api.tradovate.com/" })}
                    className="h-8 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[10px] font-black cursor-pointer transition-all"
                  >
                    Learn More
                  </button>
                  <button
                    onClick={() => handleOpenConnect({ name: "Tradovate", category: "Futures & Commodities" })}
                    className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black cursor-pointer transition-all"
                  >
                    Connect
                  </button>
                </div>
              </div>

              {/* TradeStation */}
              <div className="account-card broker-sandbox-card flex flex-col justify-between min-h-[220px] text-left">
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-[#06b6d4] flex items-center justify-center text-white shrink-0 shadow-md font-bold text-base font-mono">
                      T
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-white">TradeStation</h4>
                      <p className="text-[10px] text-slate-500 font-bold">Futures, Options, Equities</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-2">
                    {["Futures", "Options", "Stocks"].map(tag => (
                      <span key={tag} className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase bg-slate-900 border border-slate-850 text-slate-455">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={() => handleSignUpClick({ name: "TradeStation", signupUrl: "https://api.tradestation.com/" })}
                    className="h-8 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[10px] font-black cursor-pointer transition-all"
                  >
                    Learn More
                  </button>
                  <button
                    onClick={() => handleOpenConnect({ name: "TradeStation", category: "Futures & Commodities" })}
                    className="h-8 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-black cursor-pointer transition-all"
                  >
                    Connect
                  </button>
                </div>
              </div>
            </div>

            {/* Column 3: CRYPTO */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center gap-2 pl-1 select-none">
                <span className="text-[12px] font-black text-slate-400 uppercase tracking-wider">Crypto</span>
                <span className="px-1.5 py-0.5 rounded text-[7px] font-black uppercase bg-blue-500/10 text-blue-400 border border-blue-500/20">
                  Crypto Trading
                </span>
              </div>

              {/* Stacked list panel */}
              <div className="account-card broker-sandbox-card p-4 rounded-2xl flex flex-col gap-3.5 select-none justify-between h-[456px] text-left">
                <div className="flex flex-col gap-3">
                  
                  {/* Alpaca stack */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-900/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#1e40af] flex items-center justify-center text-white shrink-0 shadow-sm text-xs">
                        <i className="fas fa-paw"></i>
                      </div>
                      <div>
                        <strong className="block text-xs text-white">Alpaca</strong>
                        <span className="block text-[9px] text-slate-500 font-bold mt-0.5">Crypto with stocks & ETFs</span>
                        <div className="flex gap-1 mt-1">
                          {["Crypto", "Stocks", "ETFs"].map(tg => (
                            <span key={tg} className="text-[7px] font-black uppercase text-slate-400 bg-slate-900 border border-slate-850 px-1 py-0.2 rounded">{tg}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0 select-none">
                      <button onClick={() => handleSignUpClick({ name: "Alpaca", signupUrl: "https://alpaca.markets/" })} className="px-2 py-1 rounded border border-slate-700 hover:bg-slate-700/10 text-[9px] font-black text-white cursor-pointer transition-all">Learn</button>
                      <button onClick={() => handleOpenConnect({ name: "Alpaca", category: "Crypto" })} className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-[9px] font-black text-white cursor-pointer transition-all">Connect</button>
                    </div>
                  </div>

                  {/* Coinbase stack */}
                  <div className="flex items-center justify-between pb-3 border-b border-slate-900/60">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#2563eb] flex items-center justify-center text-white shrink-0 shadow-sm font-black text-xs font-mono">
                        C
                      </div>
                      <div>
                        <strong className="block text-xs text-white">Coinbase</strong>
                        <span className="block text-[9px] text-slate-500 font-bold mt-0.5">Crypto exchange account</span>
                        <div className="flex gap-1 mt-1">
                          {["Crypto", "Spot"].map(tg => (
                            <span key={tg} className="text-[7px] font-black uppercase text-slate-400 bg-slate-900 border border-slate-850 px-1 py-0.2 rounded">{tg}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0 select-none">
                      <button onClick={() => handleSignUpClick({ name: "Coinbase", signupUrl: "https://coinbase.com/" })} className="px-2 py-1 rounded border border-slate-700 hover:bg-slate-700/10 text-[9px] font-black text-white cursor-pointer transition-all">Learn</button>
                      <button onClick={() => handleOpenConnect({ name: "Coinbase", category: "Crypto" })} className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-[9px] font-black text-white cursor-pointer transition-all">Connect</button>
                    </div>
                  </div>

                  {/* Kraken stack */}
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-[#7c3aed] flex items-center justify-center text-white shrink-0 shadow-sm text-xs">
                        <i className="fas fa-spider"></i>
                      </div>
                      <div>
                        <strong className="block text-xs text-white">Kraken</strong>
                        <span className="block text-[9px] text-slate-500 font-bold mt-0.5">Spot & derivatives crypto trading</span>
                        <div className="flex gap-1 mt-1">
                          {["Crypto", "Futures", "Margin"].map(tg => (
                            <span key={tg} className="text-[7px] font-black uppercase text-slate-400 bg-slate-900 border border-slate-850 px-1 py-0.2 rounded">{tg}</span>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="flex gap-1.5 shrink-0 select-none">
                      <button onClick={() => handleSignUpClick({ name: "Kraken", signupUrl: "https://kraken.com/" })} className="px-2 py-1 rounded border border-slate-700 hover:bg-slate-700/10 text-[9px] font-black text-white cursor-pointer transition-all">Learn</button>
                      <button onClick={() => handleOpenConnect({ name: "Kraken", category: "Crypto" })} className="px-2.5 py-1 rounded bg-blue-600 hover:bg-blue-700 text-[9px] font-black text-white cursor-pointer transition-all">Connect</button>
                    </div>
                  </div>

                </div>

                {/* Safety comes first widget */}
                <div className="rounded-xl border border-[#3b82f6]/20 bg-blue-500/5 p-3.5 mt-4 text-[10px] text-slate-350 leading-relaxed font-bold flex gap-2.5">
                  <div className="w-7 h-7 rounded-full bg-blue-500/10 flex items-center justify-center text-blue-400 shrink-0">
                    <i className="fas fa-shield text-[10px]"></i>
                  </div>
                  <div>
                    <strong className="text-white block mb-0.5 text-[11px]">Your Safety Comes First</strong>
                    <ul className="flex flex-col gap-0.5 list-disc pl-3 text-[9px] text-slate-400 font-bold">
                      <li>We use secure API connections</li>
                      <li>Your login stays between you and the broker</li>
                      <li>We never see your password</li>
                      <li>You control your account</li>
                    </ul>
                  </div>
                </div>

              </div>
            </div>

          </div>

          {/* 4. PLATFORM SOLUTIONS */}
          <div>
            <div className="flex items-center gap-2 mb-3 pl-1 select-none">
              <span className="text-[14px] font-black text-white uppercase tracking-wider">Platform Solutions</span>
              <span className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-[#10b981]/15 text-[#4ade80] border border-[#10b981]/30">
                For advanced users & platforms
              </span>
            </div>

            <div className="broker-three-grid">
              {/* SnapTrade */}
              <div className="account-card broker-sandbox-card flex flex-col justify-between min-h-[280px] text-left">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#1e3a8a] flex items-center justify-center text-white shrink-0 shadow-md font-bold text-lg font-mono">
                        S
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white">SnapTrade</h3>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5 leading-normal">
                          Connect multiple brokerage accounts with one API
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {["Aggregation", "Account Linking"].map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-slate-900 border border-slate-850 text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <ul className="flex flex-col gap-1.5 text-[10px] font-bold text-slate-300 pl-1.5">
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Connect many brokers</li>
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Normalized account data</li>
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Place trades across accounts</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-6">
                  <button
                    onClick={() => handleSignUpClick({ name: "SnapTrade", signupUrl: "https://snaptrade.com/" })}
                    className="h-9 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[11px] font-black cursor-pointer transition-all"
                  >
                    Learn More
                  </button>
                  <button
                    onClick={() => handleOpenConnect({ name: "SnapTrade", category: "Platform Solutions" })}
                    className="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black cursor-pointer transition-all"
                  >
                    Connect
                  </button>
                </div>
              </div>

              {/* DriveWealth */}
              <div className="account-card broker-sandbox-card flex flex-col justify-between min-h-[280px] text-left">
                <div>
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-[#374151] flex items-center justify-center text-yellow-500 shrink-0 shadow-md font-bold text-lg font-mono">
                        W
                      </div>
                      <div>
                        <h3 className="text-base font-black text-white">DriveWealth</h3>
                        <span className="text-[10px] text-slate-400 font-bold block mt-0.5 leading-normal">
                          Embedded investing & brokerage infrastructure
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-1.5 mb-4">
                    {["Embedded", "Brokerage", "Infrastructure"].map(tag => (
                      <span key={tag} className="px-2 py-0.5 rounded text-[8px] font-black uppercase bg-slate-900 border border-slate-850 text-slate-400">
                        {tag}
                      </span>
                    ))}
                  </div>

                  <ul className="flex flex-col gap-1.5 text-[10px] font-bold text-slate-300 pl-1.5">
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Full trading infrastructure</li>
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Account opening & funding</li>
                    <li className="flex gap-2 items-center"><i className="fas fa-check text-green-500 text-[8px]"></i> Compliance & clearing</li>
                  </ul>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-6">
                  <button
                    onClick={() => handleSignUpClick({ name: "DriveWealth", signupUrl: "https://www.drivewealth.com/" })}
                    className="h-9 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[11px] font-black cursor-pointer transition-all"
                  >
                    Learn More
                  </button>
                  <button
                    onClick={() => handleOpenConnect({ name: "DriveWealth", category: "Platform Solutions" })}
                    className="h-9 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-[11px] font-black cursor-pointer transition-all"
                  >
                    Connect
                  </button>
                </div>
              </div>

              {/* Safety comes first card column (Row 4 Column 3) */}
              <div className="account-card bg-[#0b1626] border border-slate-800 rounded-2xl p-6 text-left flex flex-col justify-center">
                <span className="text-[10px] text-slate-500 font-black uppercase tracking-wider block mb-1">Beginner Protection Rules</span>
                <strong className="text-base font-black text-white block mb-2 leading-tight">Your Safety Comes First</strong>
                <p className="text-xs text-slate-400 leading-relaxed mb-4 font-semibold">
                  Some brokers support advanced trading features, but Trade Pro keeps those modes locked until you understand the risks. Live mode only allows:
                </p>
                <div className="flex flex-col gap-1.5 text-[10px] font-bold text-slate-350 bg-slate-950/40 p-3 rounded-lg border border-slate-900 select-none text-left">
                  <div className="flex gap-2 items-center"><i className="fas fa-circle-check text-green-500 text-[9px]"></i> Cash Trades only (no margin)</div>
                  <div className="flex gap-2 items-center"><i className="fas fa-circle-check text-green-500 text-[9px]"></i> No Options or Futures (unless unlocked)</div>
                  <div className="flex gap-2 items-center"><i className="fas fa-circle-check text-green-500 text-[9px]"></i> No Short Selling / Leverage overrides</div>
                </div>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* Bottom Sticky-style Actions Bar */}
      <div className="fixed bottom-0 left-[260px] right-0 bg-[#06111f] border-t border-slate-800/80 px-6 py-4 flex justify-between items-center z-[90] select-none">
        
        {/* Left info */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold text-left">
          <i className="fas fa-lock text-blue-500"></i>
          <span>Secure connections • Your data is encrypted. You stay in control of your account.</span>
        </div>

        {/* Center help */}
        <div className="flex items-center gap-2 text-[10px] text-slate-400 font-semibold">
          <i className="fas fa-circle-question text-slate-500"></i>
          <span>Need help choosing? Visit our <Link href="/learn" className="text-blue-400 hover:text-blue-300 font-black underline">Learning Center</Link> to compare brokers.</span>
        </div>

        {/* Right CTA */}
        <button
          onClick={() => setLocation("/")}
          className="h-11 px-6 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs transition-all flex flex-col justify-center items-center cursor-pointer shadow-md select-none leading-tight"
        >
          <span>Continue in Practice Mode</span>
          <span className="text-[9px] text-blue-200 font-bold mt-0.5">No broker needed</span>
        </button>
      </div>

      {/* ─── Connection Modal ─── */}
      {modalOpen && selectedBroker && (
        <div className="fixed inset-0 bg-black/85 flex items-center justify-center p-4 z-[999] animate-fade-in select-none">
          <div role="dialog" aria-modal="true" aria-labelledby="broker-dialog-title" className="w-full max-w-md rounded-2xl border p-6 text-left relative bg-[#0b1624] border-slate-800/80">
            
            <button
              onClick={() => { setModalOpen(false); resetForm(); }}
              aria-label="Close broker connection dialog"
              className="absolute top-4 right-4 text-slate-500 hover:text-white text-sm outline-none cursor-pointer"
            >
              <i className="fas fa-times"></i>
            </button>

            <h3 id="broker-dialog-title" className="text-base font-black text-white flex items-center gap-2">
              <i className="fas fa-shield-alt text-blue-400"></i>
              Connect Your Trading Account
            </h3>
            <p className="text-[11px] text-slate-500 font-bold mt-1">
              Broker: {selectedBroker.name} ({selectedBroker.category})
            </p>

            <form onSubmit={handleSave} className="mt-5 flex flex-col gap-4">
              
              {/* Account Label */}
              <div>
                <label htmlFor="broker-account-label" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Account Nickname *
                </label>
                <input
                  id="broker-account-label"
                  type="text"
                  required
                  value={accountLabel}
                  onChange={(e) => setAccountLabel(e.target.value)}
                  className="w-full h-10 rounded-lg px-3 bg-slate-900 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Mode Select */}
              <div>
                <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
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
                    Broker Sandbox
                  </button>
                </div>
              </div>

              {/* Account ID */}
              <div>
                <label htmlFor="broker-account-id" className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  Account ID (Optional)
                </label>
                <input
                  id="broker-account-id"
                  type="text"
                  placeholder="Optional broker account identifier"
                  value={brokerAccountId}
                  onChange={(e) => setBrokerAccountId(e.target.value)}
                  className="w-full h-10 rounded-lg px-3 bg-slate-900 border border-slate-800 text-white text-xs font-bold focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Sandbox Notice */}
              <div className="rounded-lg p-3 bg-blue-500/5 border border-blue-500/10 text-[10px] text-blue-400 font-bold flex gap-2">
                <i className="fas fa-flask text-xs mt-0.5" aria-hidden="true"></i>
                <span>No API keys are requested or stored. This creates a local sandbox profile for simulated orders only.</span>
              </div>

              {/* Actions */}
              <div className="flex gap-3 justify-end mt-2 select-none">
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
                  {connectMutation.isPending ? "Creating..." : "Create Sandbox Profile"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}
    </div>
  );
}
