import { useLocation } from "wouter";
import { useAuth } from "@/contexts/AuthContext";

const NAV = [
  { path: "/",          label: "Home",      icon: "🏠" },
  { path: "/markets",   label: "Markets",   icon: "📊" },
  { path: "/ai-signal", label: "AI Signal", icon: "⚡" },
  { path: "/news",      label: "News",      icon: "📰" },
  { path: "/learn",     label: "Learn",     icon: "🎓" },
];

export default function Sidebar() {
  const [location, setLocation] = useLocation();
  const { user } = useAuth();

  const allNav = [
    ...NAV,
    ...(user?.isAdmin ? [{ path: "/admin", label: "Admin", icon: "🛡️" }] : []),
    { path: "/account", label: "Account", icon: "👤" },
  ];

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
        {allNav.map(tab => {
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
                background: active ? "rgba(59,130,246,0.15)" : "transparent",
                color: active ? "#3b82f6" : "#64748b",
                fontWeight: active ? 600 : undefined,
                border: active ? "1px solid rgba(59,130,246,0.35)" : "1px solid transparent",
              }}
            >
              <span className="text-base leading-none">{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.path === "/admin" && (
                <span className="ml-auto text-[9px] font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>
                  ADMIN
                </span>
              )}
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
