import { useState } from "react";
import { Link, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { useTradingMode } from "@/contexts/TradingModeContext";
import { useToast } from "@/hooks/use-toast";

export default function AccountCenterPage() {
  const { user, token, logout, updateBalance } = useAuth();
  const { tradingMode, setMode, connectedLiveAccount } = useTradingMode();
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const queryClient = useQueryClient();

  // Dialog / Modal states
  const [showReset, setShowReset] = useState(false);
  const [showAddFunds, setShowAddFunds] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmationText, setDeleteConfirmationText] = useState("");

  // Safety settings states
  const [maxTradeAmount, setMaxTradeAmount] = useState(25);
  const [dailyLimit, setDailyLimit] = useState(100);
  const [requireConfirmation, setRequireConfirmation] = useState(true);
  const [allowAdvanced, setAllowAdvanced] = useState(false);

  // Notification channels/states
  const [notifStates, setNotifStates] = useState({
    tradeOpened: { email: true, push: true, sms: false },
    tradeClosed: { email: true, push: true, sms: false },
    tradeWon: { email: false, push: true, sms: false },
    tradeLost: { email: true, push: true, sms: false },
    liveOrder: { email: true, push: true, sms: true },
    brokerDisconnect: { email: true, push: true, sms: true },
    dailySummary: { email: true, push: false, sms: false },
  });

  // Query trades list to summarize practice metrics
  const { data: trades = [] } = useQuery<any[]>({
    queryKey: ["/api/trades"],
    queryFn: () => fetch("/api/trades", { headers: { Authorization: `Bearer ${token}` } }).then(r => r.json()),
    enabled: !!token,
  });

  // Practice balance computations
  const balance = parseFloat(user?.paperBalance ?? "998.50");
  const startingBalance = 1000;
  const practicePnL = balance - startingBalance;
  const openPracticeTrades = trades.filter((t: any) => t.status === "OPEN").length;
  const completedPracticeTrades = trades.filter((t: any) => t.status === "CLOSED").length;

  // Add Practice Funds mutation
  const addFundsMutation = useMutation({
    mutationFn: async (amount: number) => {
      const res = await fetch("/api/portfolio/topup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ amount }),
      });
      if (!res.ok) throw new Error("Failed to add virtual funds.");
      return res.json();
    },
    onSuccess: (data) => {
      updateBalance(parseFloat(data.paperBalance));
      toast({ title: `+$${data.amount.toLocaleString()} Added`, description: "Virtual practice funds have been topped up." });
      setShowAddFunds(false);
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/snapshots"] });
    },
    onError: (e: any) => toast({ title: "Failed", description: e.message, variant: "destructive" }),
  });

  // Reset practice portfolio mutation
  const resetMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch("/api/portfolio/reset", { method: "POST", headers: { Authorization: `Bearer ${token}` } });
      return res.json();
    },
    onSuccess: () => {
      updateBalance(1000);
      toast({ title: "✅ Practice portfolio reset to $1,000.00" });
      queryClient.invalidateQueries({ queryKey: ["/api/trades"] });
      queryClient.invalidateQueries({ queryKey: ["/api/portfolio/snapshots"] });
      setShowReset(false);
    },
  });

  // Disconnect broker mutation
  const disconnectMutation = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/trading/accounts/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) throw new Error("Failed to disconnect broker");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/trading/accounts"] });
      toast({
        title: "Broker Disconnected",
        description: "Your broker connection has been removed successfully.",
      });
    },
    onError: (err: any) => {
      toast({
        variant: "destructive",
        title: "Disconnection Failed",
        description: err.message
      });
    }
  });

  // Toggle notification helper
  const handleToggleNotif = (key: keyof typeof notifStates, channel: "email" | "push" | "sms") => {
    setNotifStates(prev => ({
      ...prev,
      [key]: {
        ...prev[key],
        [channel]: !prev[key][channel],
      }
    }));
  };

  // Delete account handler
  const handleDeleteAccount = () => {
    if (deleteConfirmationText.toLowerCase() !== "delete my account") {
      toast({
        title: "Error",
        description: "Please type 'delete my account' to confirm deletion.",
        variant: "destructive"
      });
      return;
    }
    toast({
      title: "Account Deleted",
      description: "Your Account has been successfully deleted.",
      variant: "destructive"
    });
    logout();
  };

  return (
    <div className="select-none text-left pb-12">
      <div className="max-w-none">

        {/* 1. Page Header */}
        <div className="page-header select-none">
          <div>
            <h1 className="page-title">Account Center</h1>
            <p className="page-subtitle">
              Manage your profile, practice account, broker connections, and trading safety settings.
            </p>
          </div>
        </div>

        {/* 2. Account Status Hero Card */}
        <div className="account-status-card mb-5 select-none text-left">
          {/* Left: Shield Icon */}
          <div className="w-[110px] h-[110px] flex items-center justify-center">
            <img src="/status_shield.jpg" alt="Safety Shield" className="status-shield" />
          </div>

          {/* Center-Left: Status text and pills */}
          <div className="flex flex-col justify-center">
            <span className="text-[10px] font-black tracking-wider text-slate-500 uppercase">ACCOUNT STATUS</span>
            <h2 className="status-main mt-0.5 leading-tight">Practice Mode Active</h2>
            <p className="text-[12px] text-slate-400 font-semibold mt-1">
              No real money is being used. Live trading is locked until a broker is connected.
            </p>
            <div className="flex items-center gap-3 mt-3">
              <span className="status-pill green">
                <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
                Practice Active
              </span>
              <span className="status-pill yellow">
                <span className="w-2 h-2 rounded-full bg-yellow-400"></span>
                Live Locked
              </span>
              <span className="status-pill red">
                <span className="w-2 h-2 rounded-full bg-red-500"></span>
                No Broker Connected
              </span>
            </div>
          </div>

          {/* Center-Right: Glowing chart graphic */}
          <div className="w-[340px] h-[120px] flex items-center justify-center">
            <img src="/status_chart.jpg" alt="Performance chart" className="status-chart" />
          </div>

          {/* Far Right: Blue CTA button */}
          <div className="flex flex-col justify-center">
            <Link href="/connect-broker" className="hero-cta-button w-full cursor-pointer">
              <i className="fas fa-link"></i>
              Connect Broker to Unlock Live Trading
            </Link>
            <span className="text-[11px] text-slate-500 font-bold text-center mt-2.5">
              You can keep practicing without connecting a broker.
            </span>
          </div>
        </div>

        {/* Outer Rows Cards Layout Grid */}
        <div className="flex flex-col gap-6">          {/* ────────────────── ROW 1 ────────────────── */}
          <div className="top-card-grid">

            {/* Profile Card */}
            <div className="account-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4 select-none">
                  <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                    <i className="fas fa-user text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black text-white">Profile</span>
                </div>

                <div className="flex items-center gap-5 mt-4 mb-3 select-none">
                  <div className="profile-avatar border border-blue-500/30 shadow-[0_0_12px_rgba(59,130,246,0.3)]">
                    {(user?.name ?? "TP").split(" ").map(part => part[0]).slice(0, 2).join("").toUpperCase()}
                  </div>
                  <div className="text-left">
                    <h3 className="text-xl font-black text-white leading-tight">{user?.name ?? "Trader"}</h3>
                    <p className="text-xs text-slate-400 font-semibold mt-1">{user?.email ?? ""}</p>
                    
                    <div className="flex items-center gap-2 mt-3">
                      <span className="px-2.5 py-0.5 rounded text-[9px] font-black uppercase bg-[#2563eb]/10 text-[#bfdbfe] border border-[#2563eb]/40">
                        Practice + Live Ready
                      </span>
                      <span className="px-2.5 py-0.5 rounded text-[9px] font-black uppercase bg-amber-500/10 text-amber-400 border border-amber-500/25 flex items-center gap-1">
                        <span className="w-3.5 h-3.5 rounded-full bg-amber-500 text-slate-950 flex items-center justify-center text-[9px] font-extrabold select-none">!</span>
                        Verification Needed
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="profile-actions select-none">
                <button
                  onClick={() => toast({ title: "Feature coming soon", description: "Edit profile forms are currently in development." })}
                  className="rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[11px] font-black transition-all cursor-pointer flex items-center justify-center"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-slate-400 mr-2 text-[9px]"><i className="fas fa-user-pen"></i></span>
                  Edit Profile
                </button>
                <button
                  onClick={() => toast({ title: "Verify Account", description: "Identity check portal is currently offline." })}
                  className="rounded-lg border border-amber-500/30 hover:bg-amber-500/5 text-amber-400 text-[11px] font-black transition-all cursor-pointer flex items-center justify-center"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-amber-500/20 text-amber-500 mr-2 text-[9px]"><i className="fas fa-shield-halved"></i></span>
                  Verify Account
                </button>
                <button
                  onClick={() => toast({ title: "Feature coming soon", description: "Password change is currently disabled for practice demo." })}
                  className="rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[11px] font-black transition-all cursor-pointer flex items-center justify-center"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-slate-400 mr-2 text-[9px]"><i className="fas fa-lock"></i></span>
                  Change Password
                </button>
              </div>
            </div>

            {/* Trading Mode Status */}
            <div className="account-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4 select-none">
                  <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                    <i className="fas fa-chart-bar text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black text-white">Trading Mode</span>
                </div>

                <div className="flex flex-col gap-1 mt-3 select-none text-left">
                  <h3 className="text-base font-black text-green-500 uppercase tracking-wide">Practice Mode Active</h3>
                  <p className="text-[11px] text-slate-400 font-semibold leading-relaxed">
                    Practice with virtual money in a risk-free environment.
                  </p>
                </div>

                <div className="mode-status-table select-none">
                  <div className="mode-status-row text-slate-300">
                    <span className="text-slate-500">Practice:</span>
                    <strong className="text-green-500 flex items-center gap-1.5">
                      Active
                      <i className="fas fa-check-circle text-xs"></i>
                    </strong>
                  </div>
                  <div className="mode-status-row text-slate-300 border-t border-slate-900/60">
                    <span className="text-slate-500">Live:</span>
                    <strong className="text-amber-500 flex items-center gap-1.5">
                      Locked
                      <i className="fas fa-lock text-[10px]"></i>
                    </strong>
                  </div>
                  <div className="mode-status-row text-slate-300 border-t border-slate-900/60">
                    <span className="text-slate-500">Broker:</span>
                    <strong className="text-red-500 flex items-center gap-1.5">
                      Not Connected
                      <i className="fas fa-times-circle text-xs"></i>
                    </strong>
                  </div>
                </div>
              </div>

              <div className="flex flex-col gap-2 mt-4 select-none">
                <Link href="/connect-broker" className="full-blue-button text-xs font-black w-full flex items-center justify-center gap-2 cursor-pointer">
                  <i className="fas fa-link"></i>
                  Connect Broker
                </Link>
                <button
                  onClick={() => toast({ title: "Practice vs Live", description: "Practice Mode runs safely without a broker. Live mode requires an Alpaca or other broker connection." })}
                  className="h-9 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[11px] font-black transition-all cursor-pointer flex items-center justify-center gap-1.5"
                >
                  <i className="fas fa-book-open text-xs opacity-75"></i>
                  Learn about Practice vs Live
                </button>
              </div>
            </div>

            {/* Practice Account Card */}
            <div className="account-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4 select-none">
                  <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                    <i className="fas fa-wallet text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black text-white">Practice Account</span>
                </div>

                <div className="grid grid-cols-12 gap-3 mt-3 items-center select-none">
                  {/* Left Column: Big Balance */}
                  <div className="col-span-6 text-left">
                    <strong className="practice-balance font-mono tracking-tight block">
                      ${balance.toLocaleString("en-US", { minimumFractionDigits: 2 })}
                    </strong>
                    <span className="text-[10px] text-slate-500 font-bold uppercase mt-0.5 block">Virtual balance</span>
                  </div>

                  {/* Right Column: Statistics */}
                  <div className="col-span-6 flex flex-col gap-1.5 bg-slate-950/40 border border-slate-900 p-2.5 rounded-lg text-[10px] font-bold text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Starting Balance:</span>
                      <span className="text-white font-mono">${startingBalance.toLocaleString("en-US", { minimumFractionDigits: 2 })}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-900/60 pt-1 mt-0.5">
                      <span className="text-slate-500">Total Practice Profit/Loss:</span>
                      <strong className="font-mono text-red-500">
                        -${Math.abs(practicePnL).toFixed(2)}
                      </strong>
                    </div>
                    <div className="flex justify-between border-t border-slate-900/60 pt-1 mt-0.5">
                      <span className="text-slate-500">Open Practice Trades:</span>
                      <span className="text-white">{openPracticeTrades}</span>
                    </div>
                    <div className="flex justify-between border-t border-slate-900/60 pt-1 mt-0.5">
                      <span className="text-slate-500">Completed Trades:</span>
                      <span className="text-white">{completedPracticeTrades}</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="practice-actions select-none">
                <button
                  onClick={() => setShowAddFunds(true)}
                  className="h-10 rounded-lg bg-[#3b82f6] hover:bg-blue-600 text-white text-[11px] font-black transition-all cursor-pointer flex items-center justify-center"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-white/20 text-white mr-2 text-[9px]"><i className="fas fa-plus"></i></span>
                  Add Practice Funds
                </button>
                <Link href="/my-trades" className="h-10 rounded-lg border border-slate-700 hover:bg-slate-700/10 text-white text-[11px] font-black transition-all flex items-center justify-center cursor-pointer">
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-slate-800 text-slate-400 mr-2 text-[9px]"><i className="fas fa-clock"></i></span>
                  View Practice History
                </Link>
                <button
                  onClick={() => setShowReset(true)}
                  className="reset-practice-button flex items-center justify-center"
                >
                  <span className="inline-flex items-center justify-center w-5 h-5 rounded-full bg-red-500/20 text-red-400 mr-2 text-[9px]"><i className="fas fa-rotate"></i></span>
                  Reset Practice Portfolio
                </button>
              </div>
            </div>

          </div>

          {/* ────────────────── ROW 2 ────────────────── */}
          <div className="middle-card-grid">

            {/* Broker Connections Card */}
            <div className="account-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4 select-none">
                  <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                    <i className="fas fa-link text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black text-white">Broker Connections</span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-1 select-none text-left">
                  A broker is required only for live trading. You can keep practicing without one.
                </p>

                {/* Info alert banner */}
                <div className="mt-3 bg-blue-500/5 border border-blue-500/20 p-2.5 rounded-lg flex items-center gap-2.5 text-blue-400 select-none text-left">
                  <i className="fas fa-info-circle text-xs shrink-0"></i>
                  <span className="text-[10px] font-bold">No live broker connected. Connect a broker to place real trades.</span>
                </div>

                {/* Grid 2x2 of broker option items */}
                <div className="broker-grid select-none">
                  {[
                    { key: "alpaca", name: "Alpaca", desc: "Stocks, ETFs, Crypto", badge: "Recommended for Beginners", logo: "/alpaca_logo.jpg" },
                    { key: "tradier", name: "Tradier", desc: "Options Trading", badge: "Options", logo: "/tradier_logo.jpg" },
                    { key: "oanda", name: "OANDA", desc: "Forex Specialist", badge: "Forex", logo: "/oanda_logo.jpg" },
                    { key: "ib", name: "Interactive Brokers", desc: "Advanced Multi-Market", badge: "Advanced", logo: "/ib_logo.jpg" },
                  ].map(b => (
                    <div key={b.key} className="broker-card relative">
                      <img src={b.logo} alt={b.name} className="broker-icon" />
                      <div className="text-left overflow-hidden">
                        <strong className="block text-white text-[11px] font-black">{b.name}</strong>
                        <span className="block text-[9px] text-slate-500 font-bold mt-0.5 leading-tight truncate">{b.desc}</span>
                        <span className="inline-block mt-1 px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-wider bg-blue-500/10 text-blue-400 border border-blue-500/20 truncate max-w-full">
                          {b.badge}
                        </span>
                      </div>
                      <Link href="/connect-broker" className="text-[10px] text-blue-400 hover:text-blue-300 font-black cursor-pointer self-center">
                        Connect →
                      </Link>
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 mt-5 select-none">
                <Link href="/connect-broker" className="flex-1 h-11 rounded-xl bg-[#2563eb] hover:bg-blue-700 text-white text-xs font-black transition-all flex items-center justify-center cursor-pointer gap-2">
                  <i className="fas fa-link"></i>
                  Connect Broker
                </Link>
                <button
                  onClick={() => toast({ title: "Compare Brokers", description: "Detailed broker matrix is currently being updated." })}
                  className="flex-1 h-11 rounded-xl border border-slate-700 hover:bg-slate-700/10 text-white text-xs font-black transition-all cursor-pointer flex items-center justify-center gap-2"
                >
                  <i className="fas fa-balance-scale"></i>
                  Compare Brokers
                </button>
              </div>
            </div>

            {/* Beginner Protection Settings Card */}
            <div className="account-card flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4 select-none">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-green-400">
                      <i className="fas fa-shield-halved text-xs"></i>
                    </div>
                    <span className="text-[15px] font-black text-white">Beginner Protection Settings</span>
                  </div>
                  <span className="px-2.5 py-0.5 rounded text-[9px] font-black uppercase bg-green-500/10 text-green-400 border border-green-500/25">
                    Protection Active
                  </span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-1 select-none text-left">
                  Beginner protection is on. Riskier trade types are currently disabled.
                </p>

                <div className="flex flex-col gap-1 mt-4 select-none">

                  {/* Max single limit */}
                  <div className="protection-row">
                    <span className="text-slate-400">Maximum Live Trade Amount:</span>
                    <strong className="text-white flex items-center gap-1 cursor-pointer hover:text-slate-200">
                      ${maxTradeAmount} per order
                      <i className="fas fa-chevron-right text-[10px] text-slate-500 ml-1"></i>
                    </strong>
                  </div>

                  {/* Daily limit */}
                  <div className="protection-row">
                    <span className="text-slate-400">Daily Live Trading Limit:</span>
                    <strong className="text-white flex items-center gap-1 cursor-pointer hover:text-slate-200">
                      ${dailyLimit} per day
                      <i className="fas fa-chevron-right text-[10px] text-slate-500 ml-1"></i>
                    </strong>
                  </div>

                  {/* Confirm Toggle */}
                  <div className="protection-row">
                    <span className="text-slate-400">Require Confirmation:</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase ${requireConfirmation ? "text-green-400" : "text-slate-500"}`}>
                        {requireConfirmation ? "On" : "Off"}
                      </span>
                      <button
                        onClick={() => setRequireConfirmation(!requireConfirmation)}
                        className={`toggle-switch ${requireConfirmation ? "on" : ""}`}
                      />
                    </div>
                  </div>

                  {/* Advanced features toggle */}
                  <div className="protection-row">
                    <span className="text-slate-400">Advanced Trading Features:</span>
                    <div className="flex items-center gap-2">
                      <span className={`text-[10px] font-black uppercase ${allowAdvanced ? "text-amber-500 animate-pulse" : "text-slate-500"}`}>
                        {allowAdvanced ? "On" : "Off"}
                      </span>
                      <button
                        onClick={() => setAllowAdvanced(!allowAdvanced)}
                        className={`toggle-switch ${allowAdvanced ? "on" : ""}`}
                      />
                    </div>
                  </div>

                </div>
              </div>

              {/* Disabled feature pills row */}
              <div className="mt-4 select-none">
                <div className="disabled-feature-grid">
                  {["Margin", "Options", "Short Selling", "Leverage", "Futures"].map(feat => (
                    <div key={feat} className="disabled-feature-pill">
                      <strong>{feat}</strong>
                      <span>Disabled</span>
                    </div>
                  ))}
                </div>
                <div className="text-[10px] text-slate-500 font-bold mt-4 text-left select-none">
                  ℹ️ These limits help prevent large accidental losses when Live Mode is active.
                </div>
              </div>
            </div>

          </div>

          {/* ────────────────── ROW 3 ────────────────── */}
          <div className="bottom-card-grid">

            {/* Security Card */}
            <div className="account-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4 select-none">
                  <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                    <i className="fas fa-lock text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black text-white">Security</span>
                </div>

                <div className="flex flex-col gap-1 mt-4 select-none">
                  
                  {/* Password row */}
                  <div className="security-row">
                    <div>
                      <span className="block text-xs font-black text-white text-left">Password</span>
                      <span className="block text-[9px] text-slate-500 font-bold mt-0.5 text-left">Last changed 3 days ago</span>
                    </div>
                    <button
                      onClick={() => toast({ title: "Form loading", description: "Disabled for secure credentials protection." })}
                      className="security-button"
                    >
                      Change Password
                    </button>
                  </div>

                  {/* 2FA row */}
                  <div className="security-row">
                    <div>
                      <span className="block text-xs font-black text-white text-left">Two-Factor Authentication</span>
                      <span className="block text-[9px] text-slate-500 font-bold mt-0.5 text-left">Recommended</span>
                    </div>
                    <button
                      onClick={() => toast({ title: "2FA Setup", description: "Code has been dispatched to your verified email." })}
                      className="security-button"
                      style={{ borderColor: "rgba(59, 130, 246, 0.55)", color: "#bfdbfe" }}
                    >
                      Enable 2FA
                    </button>
                  </div>

                  {/* Sessions row */}
                  <div className="security-row">
                    <div>
                      <span className="block text-xs font-black text-white text-left">Connected Sessions</span>
                      <span className="block text-[9px] text-slate-500 font-bold mt-0.5 text-left">1 active session</span>
                    </div>
                    <button
                      onClick={() => toast({ title: "Session Manager", description: "Authorized slots are safe." })}
                      className="security-button"
                    >
                      Manage Sessions
                    </button>
                  </div>

                  {/* Broker keys row */}
                  <div className="security-row">
                    <div>
                      <span className="block text-xs font-black text-white text-left">Broker/API Security</span>
                      <span className="block text-[9px] text-slate-500 font-bold mt-0.5 text-left">Broker keys are encrypted and never shown in full.</span>
                    </div>
                    <button
                      onClick={() => toast({ title: "Sign Out Broadcasted", description: "Credentials closed." })}
                      className="security-button"
                      style={{ borderColor: "rgba(239, 68, 68, 0.4)", color: "#fca5a5" }}
                    >
                      Sign Out Everywhere
                    </button>
                  </div>

                </div>
              </div>
            </div>

            {/* Notifications Card */}
            <div className="account-card flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2.5 mb-4 select-none">
                  <div className="w-8 h-8 rounded-full bg-[#101d31]/80 border border-slate-800 flex items-center justify-center text-slate-400">
                    <i className="fas fa-bell text-xs"></i>
                  </div>
                  <span className="text-[15px] font-black text-white">Notifications</span>
                </div>
                <p className="text-[11px] text-slate-500 font-semibold leading-relaxed mt-1 select-none text-left">
                  Choose how you want to be alerted when trades open, close, win, or lose.
                </p>

                {/* Notification Panels grid */}
                <div className="notification-panels select-none">
                  
                  {/* Panel 1: Trade Alerts */}
                  <div className="notification-panel flex flex-col gap-2.5 text-left">
                    <span className="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-0.5">Trade Alerts</span>
                    {[
                      { key: "tradeOpened", label: "Trade opened" },
                      { key: "tradeClosed", label: "Trade closed" },
                      { key: "tradeWon", label: "Trade won" },
                      { key: "tradeLost", label: "Trade lost" },
                    ].map(item => {
                      const rowStates = notifStates[item.key as keyof typeof notifStates];
                      return (
                        <div key={item.key} className="flex flex-col gap-2 py-2 border-b border-slate-900/60 last:border-0">
                          <span className="text-[10px] font-black text-white">{item.label}</span>
                          <div className="flex gap-4">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifStates, "email")} className={`toggle-switch scale-75 shrink-0 ${rowStates.email ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">Email</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifStates, "push")} className={`toggle-switch scale-75 shrink-0 ${rowStates.push ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">Push</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifStates, "sms")} className={`toggle-switch scale-75 shrink-0 ${rowStates.sms ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">SMS</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Panel 2: Live Trading Alerts */}
                  <div className="notification-panel flex flex-col gap-2.5 text-left">
                    <span className="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-0.5">Live Trading Alerts</span>
                    {[
                      { key: "liveOrder", label: "Live order placed" },
                      { key: "brokerDisconnect", label: "Broker disconnected" },
                    ].map(item => {
                      const rowStates = notifStates[item.key as keyof typeof notifStates];
                      return (
                        <div key={item.key} className="flex flex-col gap-2 py-2 border-b border-slate-900/60 last:border-0">
                          <span className="text-[10px] font-black text-white">{item.label}</span>
                          <div className="flex gap-4">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifStates, "email")} className={`toggle-switch scale-75 shrink-0 ${rowStates.email ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">Email</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifStates, "push")} className={`toggle-switch scale-75 shrink-0 ${rowStates.push ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">Push</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifStates, "sms")} className={`toggle-switch scale-75 shrink-0 ${rowStates.sms ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">SMS</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Panel 3: Account Updates */}
                  <div className="notification-panel flex flex-col gap-2.5 text-left">
                    <span className="text-[10px] text-blue-400 font-black uppercase tracking-wider mb-0.5">Account Updates</span>
                    {[
                      { key: "dailySummary", label: "Daily summary" },
                    ].map(item => {
                      const rowStates = notifStates[item.key as keyof typeof notifStates];
                      return (
                        <div key={item.key} className="flex flex-col gap-2 py-2 border-b border-slate-900/60 last:border-0">
                          <span className="text-[10px] font-black text-white">{item.label}</span>
                          <div className="flex gap-4">
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifStates, "email")} className={`toggle-switch scale-75 shrink-0 ${rowStates.email ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">Email</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifStates, "push")} className={`toggle-switch scale-75 shrink-0 ${rowStates.push ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">Push</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <button onClick={() => handleToggleNotif(item.key as keyof typeof notifStates, "sms")} className={`toggle-switch scale-75 shrink-0 ${rowStates.sms ? "on" : ""}`} />
                              <span className="text-[9px] font-bold text-slate-400">SMS</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                </div>
              </div>
            </div>

          </div>

          {/* ────────────────── BOTTOM ACTIONS ────────────────── */}
          <div className="account-bottom-actions select-none">
            <button
              onClick={logout}
              className="account-bottom-button cursor-pointer"
            >
              <i className="fas fa-sign-out-alt"></i>
              Sign Out
            </button>
            <button
              onClick={() => toast({ title: "Account Export Triggered", description: "A zip file of your settings, metrics, and trades will download shortly." })}
              className="account-bottom-button cursor-pointer"
            >
              <i className="fas fa-file-download"></i>
              Export Account Data
            </button>
            <button
              onClick={() => {
                setDeleteConfirmationText("");
                setShowDeleteConfirm(true);
              }}
              className="account-bottom-button delete-account-button cursor-pointer"
            >
              <i className="fas fa-trash-alt"></i>
              Delete Account
            </button>
          </div>

        </div>

      </div>

      {/* ─── Practice Add Funds Modal ─── */}
      {showAddFunds && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-[999] animate-fade-in text-left">
          <div className="w-full max-w-sm rounded-2xl border p-6 relative bg-[#0b1624] border-[#1e3555]">
            <button
              onClick={() => setShowAddFunds(false)}
              className="absolute top-4 right-4 text-slate-500 hover:text-white text-sm outline-none cursor-pointer"
            >
              <i className="fas fa-times"></i>
            </button>

            <h3 className="text-base font-black text-white flex items-center gap-2 mb-2">
              <i className="fas fa-coins text-blue-400"></i>
              Add Practice Funds
            </h3>
            <p className="text-xs text-slate-400 font-semibold mb-5 leading-relaxed">
              Top up your virtual portfolio balance. No real banking links or transactions are triggered.
            </p>

            <div className="grid grid-cols-3 gap-2.5 mb-6 select-none">
              {[1000, 5000, 10000].map(amt => (
                <button
                  key={amt}
                  onClick={() => addFundsMutation.mutate(amt)}
                  disabled={addFundsMutation.isPending}
                  className="h-12 rounded-xl border border-blue-600/30 bg-slate-950 text-white font-bold hover:bg-blue-600/10 text-xs transition-all cursor-pointer"
                >
                  +${amt.toLocaleString()}
                </button>
              ))}
            </div>

            <div className="flex justify-end select-none">
              <button
                onClick={() => setShowAddFunds(false)}
                className="h-10 px-4 rounded-xl text-xs font-extrabold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Reset Confirmation Modal ─── */}
      {showReset && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="w-full max-w-sm rounded-2xl p-6 border bg-[#0b1624] border-[#ef4444] text-left">
            <div className="text-base font-black text-red-500 mb-2 flex items-center gap-2">
              <i className="fas fa-exclamation-triangle"></i>
              Reset Practice Portfolio?
            </div>
            <div className="text-xs mb-5 text-slate-400 font-semibold leading-relaxed">
              This will reset your practice balance back to $1,000.00 and close all open practice positions. This action is permanent and cannot be undone.
            </div>
            <div className="flex gap-3 justify-end select-none">
              <button
                onClick={() => setShowReset(false)}
                className="h-10 px-4 rounded-xl text-xs font-extrabold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={() => resetMutation.mutate()}
                disabled={resetMutation.isPending}
                className="h-10 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all cursor-pointer"
              >
                {resetMutation.isPending ? "Resetting..." : "Yes, Reset Portfolio"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Account Confirmation Modal ─── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center px-4" style={{ background: "rgba(0,0,0,0.8)" }}>
          <div className="w-full max-w-md rounded-2xl p-6 border bg-[#0b1624] border-[#ef4444] text-left">
            <div className="text-base font-black text-red-500 mb-2 flex items-center gap-2">
              <i className="fas fa-trash-alt"></i>
              Danger: Delete Account?
            </div>
            <p className="text-xs mb-4 text-slate-400 font-semibold leading-relaxed">
              This will permanently delete your Trade Pro account, credentials, broker keys, and practice trade history. This cannot be undone.
            </p>

            <div className="mb-5 text-left">
              <label className="block text-[10px] text-slate-500 font-black uppercase tracking-wider mb-2">
                Type "delete my account" below to confirm:
              </label>
              <input
                type="text"
                value={deleteConfirmationText}
                onChange={(e) => setDeleteConfirmationText(e.target.value)}
                placeholder="delete my account"
                className="w-full h-11 px-3 border rounded-lg text-sm bg-slate-950 font-bold text-white border-slate-800"
              />
            </div>

            <div className="flex gap-3 justify-end select-none">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="h-10 px-4 rounded-xl text-xs font-extrabold text-slate-400 hover:text-white cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                className="h-10 px-5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-black transition-all cursor-pointer"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
