import { useLocation } from "wouter";

const NAV = [
  { path: "/",          label: "Home",      icon: "🏠" },
  { path: "/markets",   label: "Markets",   icon: "📊" },
  { path: "/ai-signal", label: "AI Signal", icon: "⚡" },
  { path: "/news",      label: "News",      icon: "📰" },
  { path: "/learn",     label: "Learn",     icon: "🎓" },
  { path: "/account",   label: "Account",   icon: "👤" },
];

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  return (
    <aside
      className="fixed left-0 top-0 h-screen w-[220px] hidden lg:flex flex-col z-40"
      style={{ background: "#0d1117", borderRight: "1px solid #1f2937" }}
    >
      <div className="px-6 pt-7 pb-6">
        <div className="text-2xl font-black" style={{ color: "#3b82f6" }}>Trade Pro</div>
        <div className="text-xs mt-1 leading-snug" style={{ color: "#64748b" }}>
          Trade any market.<br />Start with $0.25.
        </div>
      </div>

      <nav className="flex-1 px-3 flex flex-col gap-1 overflow-y-auto">
        {NAV.map(tab => {
          const active =
            tab.path === "/"
              ? location === "/"
              : location === tab.path || location.startsWith(tab.path + "/");
          return (
            <button
              key={tab.path}
              onClick={() => setLocation(tab.path)}
              className="flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold w-full text-left transition-all"
              style={{
                background: active ? "rgba(59,130,246,0.12)" : "transparent",
                color: active ? "#3b82f6" : "#64748b",
                borderLeft: `3px solid ${active ? "#3b82f6" : "transparent"}`,
              }}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </nav>

      <div className="px-6 pb-6 text-xs" style={{ color: "#374151" }}>
        Paper trading only —<br />no real money at risk
      </div>
    </aside>
  );
}
