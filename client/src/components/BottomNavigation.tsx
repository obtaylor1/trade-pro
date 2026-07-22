import { useLocation } from "wouter";

const TABS = [
  { path: "/",          label: "Home",      icon: "🏠" },
  { path: "/markets",   label: "Trade",     icon: "📊" },
  { path: "/ai-managed", label: "AI Plan", icon: "✦" },
  { path: "/my-trades", label: "Positions", icon: "💼" },
  { path: "/account",   label: "Account",   icon: "👤" },
];

export default function BottomNavigation() {
  const [location, setLocation] = useLocation();
  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-around lg:hidden"
      style={{
        background: "#111827",
        borderTop: "1px solid #1f2937",
        paddingBottom: "env(safe-area-inset-bottom, 0px)",
        height: 64,
      }}
    >
      {TABS.map(tab => {
        const active = tab.path === "/" ? location === "/" : location === tab.path || location.startsWith(tab.path + "/");
        return (
          <button
            key={tab.path}
            onClick={() => setLocation(tab.path)}
            aria-label={tab.label}
            aria-current={active ? "page" : undefined}
            className="flex flex-col items-center justify-center gap-0.5 flex-1 h-full transition-all"
            style={{ color: active ? "#3b82f6" : "#4b5563" }}
          >
            <span className="text-xl leading-none" aria-hidden="true">{tab.icon}</span>
            <span className="text-[10px] font-semibold">{tab.label}</span>
            {active && <div className="w-1 h-1 rounded-full" style={{ background: "#3b82f6" }} />}
          </button>
        );
      })}
    </nav>
  );
}
