import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";
import { useTradingMode } from "@/contexts/TradingModeContext";

const NAV = [
  { path: "/",          label: "Home",            icon: "fas fa-house" },
  { path: "/markets",   label: "Choose a Trade",  icon: "fas fa-chart-line" },
  { path: "/connect-broker", label: "Connect Broker", icon: "fas fa-link" },
  { path: "/my-trades", label: "My Trades",       icon: "fas fa-briefcase" },
  { path: "/learn",     label: "Learning Center", icon: "fas fa-graduation-cap" },
  { path: "/news",      label: "News",            icon: "fas fa-newspaper" },
  { path: "/account",   label: "Account",         icon: "fas fa-user" },
  { path: "/settings",  label: "Settings",        icon: "fas fa-gear" },
];

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();
  const { tradingMode, connectedLiveAccount } = useTradingMode();

  const formattedBalance = user?.paperBalance
    ? parseFloat(user.paperBalance).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })
    : "$0.00";

  const formattedLiveBalance = connectedLiveAccount?.buyingPower
    ? parseFloat(connectedLiveAccount.buyingPower).toLocaleString("en-US", {
        style: "currency",
        currency: "USD",
      })
    : "$25,000.00";

  return (
    <aside className="sidebar hidden lg:flex select-none pb-4">
      {/* Brand Header */}
      <div className="px-6 pt-7 pb-6">
        <div className="flex items-center gap-2">
          <img
            src="/trade_pro_logo.png"
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/trade_pro_logo.jpg"; }}
            alt="Trade Pro Logo"
            className="w-6 h-6 rounded-lg object-cover border border-blue-500/30 shadow-[0_0_8px_rgba(59,130,246,0.3)]"
          />
          <span className="sidebar-logo-title text-white">Trade Pro</span>
        </div>
        <div className="sidebar-logo-subtitle mt-1.5 font-medium leading-relaxed">
          Smart trades.<br />Better decisions.
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto custom-scrollbar">
        {NAV.map(tab => {
          const active =
            tab.label === "Choose a Trade"
              ? location === "/markets"
              : tab.label === "Connect Broker"
              ? location === "/connect-broker"
              : tab.label === "Home"
              ? location === "/"
              : tab.label === "My Trades"
              ? location === "/my-trades"
              : tab.label === "Account"
              ? location === "/account"
              : tab.label === "Settings"
              ? location === "/settings"
              : location === tab.path;

          return (
            <button
              key={tab.label}
              onClick={() => setLocation(tab.path)}
              aria-current={active ? "page" : undefined}
              className={`sidebar-item w-full text-left transition-all ${
                active ? "active" : "text-slate-400 hover:text-slate-200"
              }`}
            >
              <span className="text-sm opacity-80 flex items-center justify-center w-5 h-5"><i className={tab.icon} aria-hidden="true"></i></span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Bottom Widgets */}
      <div className="px-4 flex flex-col gap-3">
        {/* Account Balance Display */}
        {tradingMode === "live" && connectedLiveAccount ? (
          <div className="rounded-xl p-3" style={{ background: "var(--color-card-deep)", border: "1px solid #d97706" }}>
            <div className="text-[10px] uppercase tracking-wider font-bold text-amber-500">
              Live Buying Power
            </div>
            <div className="text-lg font-black mt-1 text-white">
              {formattedLiveBalance}
            </div>
            <div className="text-[9px] mt-1 text-slate-500 font-bold">
              Broker: {connectedLiveAccount.brokerName} Live
            </div>
          </div>
        ) : (
          <div className="rounded-xl p-3" style={{ background: "var(--color-card-deep)", border: "1px solid var(--color-border-strong)" }}>
            <div className="text-[10px] uppercase tracking-wider font-extrabold" style={{ color: "var(--color-muted)" }}>
              PRACTICE BALANCE
            </div>
            <div className="text-lg font-black mt-1" style={{ color: "var(--color-green)" }}>
              {formattedBalance}
            </div>
            <div className="text-[9px] mt-1" style={{ color: "var(--color-muted)" }}>
              This is practice money
            </div>
          </div>
        )}

        {/* Need Help Box */}
        <div className="rounded-xl p-3 flex items-center gap-3" style={{ background: "var(--color-card-deep)", border: "1px solid var(--color-border-strong)" }}>
          <div className="w-8 h-8 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
            <i className="fas fa-headset text-xs"></i>
          </div>
          <div>
            <div className="text-xs font-bold text-white">Need Help?</div>
            <div className="text-[10px]" style={{ color: "var(--color-muted)" }}>We're here for you</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
