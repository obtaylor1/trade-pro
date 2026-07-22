import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { apiJson } from "@/lib/queryClient";

interface AdminStats {
  totalUsers: number;
  totalTrades: number;
  newUsersToday: number;
  avgWinRate: number;
  topAssets: { ticker: string; count: number }[];
  onboardingComplete: number;
  aiPlansActive: number;
  aiPlansTotal: number;
  brokerConnections: number;
  liveBrokerConnections: number;
  rejectedOrders: number;
}

interface MfaStatus { enabled: boolean; confirmedAt: string | null; recoveryCodesRemaining: number }
interface MfaSetup { qrDataUrl: string; manualKey: string; recoveryCodes: string[] }
interface AuditLog { id: string; action: string; summary: string; ipAddress: string | null; createdAt: string }
interface Controls { globalTradingPaused: boolean; paperBetaInviteOnly: boolean; liveTradingEnabled: boolean; liveTradingReason: string }
interface SafetyEvent { id: string; rule: string; message: string; severity: string; createdAt: string }
interface BetaFeedback { id: string; category: string; message: string; page: string | null; status: string; createdAt: string }

interface AdminUser {
  id: string;
  name: string;
  email: string;
  createdAt: string;
  lastLogin: string | null;
  paperBalance: string;
  totalPnl: number;
  tradeCount: number;
  winRate: number;
  isAdmin: boolean;
}

interface UserDetail extends AdminUser {
  trades: any[];
}

type SortKey = keyof Pick<AdminUser, "name" | "email" | "createdAt" | "lastLogin" | "paperBalance" | "totalPnl" | "tradeCount" | "winRate">;

function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
  return (
    <div className="glass-card p-5 flex flex-col gap-1">
      <div className="label-secondary">{label}</div>
      <div className="text-2xl font-black mt-1" style={{ color: color || "#e2e8f0" }}>{value}</div>
      {sub && <div className="text-xs" style={{ color: "#475569" }}>{sub}</div>}
    </div>
  );
}

function formatDate(d: string | null | undefined) {
  if (!d) return "—";
  const date = new Date(d);
  return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function formatBalance(b: string | number) {
  return "$" + parseFloat(String(b)).toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function AdminPage() {
  const { token } = useAuth();
  const [sortKey, setSortKey] = useState<SortKey>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [mfaSetup, setMfaSetup] = useState<MfaSetup | null>(null);
  const [mfaCode, setMfaCode] = useState("");
  const [newInvite, setNewInvite] = useState<string | null>(null);

  const headers = { Authorization: `Bearer ${token}` };

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: () => apiJson<AdminStats>("/api/admin/stats"),
    refetchInterval: 30000,
  });

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => apiJson<AdminUser[]>("/api/admin/users"),
    refetchInterval: 30000,
  });

  const { data: selectedUser, isLoading: detailLoading } = useQuery<UserDetail>({
    queryKey: ["/api/admin/users", selectedUserId],
    queryFn: () => apiJson<UserDetail>(`/api/admin/users/${selectedUserId}`),
    enabled: !!selectedUserId,
  });

  const { data: mfa, refetch: refetchMfa } = useQuery<MfaStatus>({ queryKey: ["/api/auth/admin-mfa/status"], queryFn: () => apiJson("/api/auth/admin-mfa/status") });
  const { data: auditLogs = [] } = useQuery<AuditLog[]>({ queryKey: ["/api/admin/audit-logs"], queryFn: () => apiJson("/api/admin/audit-logs") });
  const { data: controls, refetch: refetchControls } = useQuery<Controls>({ queryKey: ["/api/operations/controls"], queryFn: () => apiJson("/api/operations/controls") });
  const { data: safetyEvents = [] } = useQuery<SafetyEvent[]>({ queryKey: ["/api/operations/safety-events"], queryFn: () => apiJson("/api/operations/safety-events") });
  const { data: betaFeedback = [] } = useQuery<BetaFeedback[]>({ queryKey: ["/api/operations/beta-feedback"], queryFn: () => apiJson("/api/operations/beta-feedback") });

  const startMfa = async () => setMfaSetup(await apiJson<MfaSetup>("/api/auth/admin-mfa/setup", { method: "POST" }));
  const confirmMfa = async () => {
    await apiJson("/api/auth/admin-mfa/confirm", { method: "POST", body: JSON.stringify({ code: mfaCode }) });
    setMfaSetup(null); setMfaCode(""); await refetchMfa();
  };
  const updateControls = async (changes: Partial<Controls>) => { await apiJson("/api/operations/controls", { method: "PATCH", body: JSON.stringify(changes) }); await refetchControls(); };
  const createInvite = async () => { const result = await apiJson<{ code: string }>("/api/operations/beta-invites", { method: "POST", body: JSON.stringify({ label: "Paper beta", maxUses: 1, expiresInDays: 30 }) }); setNewInvite(result.code); };
  const reconcile = async () => { const result = await apiJson<{ checked: number; exceptions: number }>("/api/operations/reconcile", { method: "POST" }); alert(`Checked ${result.checked} broker orders. ${result.exceptions} need attention.`); };

  const handleSort = (key: SortKey) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("desc"); }
  };

  const filteredUsers = (users ?? [])
    .filter(u =>
      search === "" ||
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = String(av).localeCompare(String(bv), undefined, { numeric: true });
      return sortDir === "asc" ? cmp : -cmp;
    });

  const SortHeader = ({ label, k }: { label: string; k: SortKey }) => (
    <th
      className="px-4 py-3 text-left cursor-pointer select-none hover:text-white transition-colors"
      style={{ color: sortKey === k ? "#3b82f6" : "#64748b", fontSize: 11, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase" }}
      onClick={() => handleSort(k)}
    >
      {label} {sortKey === k ? (sortDir === "asc" ? "↑" : "↓") : ""}
    </th>
  );

  const topAsset = stats?.topAssets?.[0]?.ticker ?? "—";

  return (
    <div className="p-4 lg:p-8 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-1">
          <span className="text-2xl">🛡️</span>
          <h1 className="text-2xl font-black" style={{ color: "#e2e8f0" }}>Admin Panel</h1>
          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.15)", color: "var(--color-red)", border: "1px solid rgba(239,68,68,0.3)" }}>RESTRICTED</span>
        </div>
        <p className="label-secondary">Platform analytics and user management</p>
      </div>

      {/* Stats Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        {statsLoading ? (
          Array(4).fill(0).map((_, i) => (
            <div key={i} className="glass-card p-5 animate-pulse h-24" />
          ))
        ) : (
          <>
            <StatCard label="Total Users" value={stats?.totalUsers ?? 0} sub={`${stats?.newUsersToday ?? 0} joined today`} color="#3b82f6" />
            <StatCard label="Total Trades" value={stats?.totalTrades ?? 0} sub="all time" color="#a78bfa" />
            <StatCard label="Avg Win Rate" value={`${stats?.avgWinRate ?? 0}%`} sub="closed trades" color={((stats?.avgWinRate ?? 0) >= 50) ? "#22c55e" : "#ef4444"} />
            <StatCard label="Most Traded" value={topAsset} sub={`${stats?.topAssets?.[0]?.count ?? 0} trades`} color="#f59e0b" />
          </>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mb-8">
        <div className="glass-card p-5"><div className="label-secondary">Onboarding</div><div className="text-2xl font-black text-blue-400 mt-2">{stats?.onboardingComplete ?? 0} / {stats?.totalUsers ?? 0}</div><div className="text-xs text-slate-500 mt-1">users finished setup</div></div>
        <div className="glass-card p-5"><div className="label-secondary">AI Managed</div><div className="text-2xl font-black text-violet-400 mt-2">{stats?.aiPlansActive ?? 0} active</div><div className="text-xs text-slate-500 mt-1">{stats?.aiPlansTotal ?? 0} plans created</div></div>
        <div className="glass-card p-5"><div className="label-secondary">Broker Readiness</div><div className="text-2xl font-black text-amber-400 mt-2">{stats?.brokerConnections ?? 0} sandbox</div><div className="text-xs text-slate-500 mt-1">{stats?.liveBrokerConnections ?? 0} marked live · {stats?.rejectedOrders ?? 0} order exceptions</div></div>
      </div>

      <div className="glass-card p-5 mb-8 border border-amber-400/20">
        <div className="flex items-center justify-between gap-4 flex-wrap"><div><div className="font-bold text-white">Operations control room</div><div className="text-xs text-slate-500 mt-1">Stop trading, manage beta access, and check broker records.</div></div><span className="text-[10px] font-black px-3 py-1 rounded-full bg-red-500/10 text-red-300">LIVE TRADING LOCKED</span></div>
        <div className="grid md:grid-cols-3 gap-3 mt-5">
          <button onClick={()=>updateControls({ globalTradingPaused: !controls?.globalTradingPaused })} className={`rounded-xl border p-4 text-left ${controls?.globalTradingPaused ? "border-red-400 bg-red-500/15" : "border-slate-700 bg-slate-950/40"}`}><div className="text-xs font-black">{controls?.globalTradingPaused ? "Resume all trading" : "Emergency stop"}</div><div className="text-[10px] text-slate-500 mt-1">{controls?.globalTradingPaused ? "All new orders are blocked." : "Immediately block every new order."}</div></button>
          <button onClick={()=>updateControls({ paperBetaInviteOnly: !controls?.paperBetaInviteOnly })} className={`rounded-xl border p-4 text-left ${controls?.paperBetaInviteOnly ? "border-violet-400 bg-violet-500/15" : "border-slate-700 bg-slate-950/40"}`}><div className="text-xs font-black">Paper beta: {controls?.paperBetaInviteOnly ? "Invite only" : "Open"}</div><div className="text-[10px] text-slate-500 mt-1">Control who can create a new account.</div></button>
          <button onClick={reconcile} className="rounded-xl border border-slate-700 bg-slate-950/40 p-4 text-left"><div className="text-xs font-black">Check broker records</div><div className="text-[10px] text-slate-500 mt-1">Compare local and sandbox broker orders.</div></button>
        </div>
        <div className="mt-4 flex items-center gap-3 flex-wrap"><button onClick={createInvite} className="px-4 py-2 rounded-lg bg-blue-600 text-xs font-black">Create one beta invite</button>{newInvite && <div className="rounded-lg bg-slate-950 border border-blue-400/20 px-4 py-2 font-mono text-sm text-blue-300">{newInvite} <span className="font-sans text-[10px] text-slate-500 ml-2">copy now—it is shown once</span></div>}</div>
        <div className="mt-4 rounded-xl bg-slate-950/50 p-3 text-[11px] text-slate-400"><strong className="text-amber-300">Live gate:</strong> {controls?.liveTradingReason ?? "Broker approval and compliance review required"}</div>
      </div>

      {safetyEvents.length > 0 && <div className="glass-card p-5 mb-8"><div className="font-bold text-sm text-white">Recent safety stops</div><div className="mt-3 space-y-2">{safetyEvents.slice(0,8).map(event => <div key={event.id} className="rounded-lg bg-red-500/5 border border-red-500/10 p-3"><div className="text-xs font-bold text-red-300">{event.message}</div><div className="text-[10px] text-slate-600 mt-1">{event.rule} · {new Date(event.createdAt).toLocaleString()}</div></div>)}</div></div>}
      {betaFeedback.length > 0 && <div className="glass-card p-5 mb-8"><div className="font-bold text-sm text-white">Paper beta feedback</div><div className="mt-3 grid md:grid-cols-2 gap-3">{betaFeedback.slice(0,8).map(item=><div key={item.id} className="rounded-xl bg-slate-950/50 border border-slate-800 p-4"><div className="text-[10px] uppercase tracking-wider font-black text-violet-300">{item.category}</div><p className="text-xs text-slate-300 mt-2">{item.message}</p><div className="text-[9px] text-slate-600 mt-2">{item.page ?? "Unknown page"} · {new Date(item.createdAt).toLocaleString()}</div></div>)}</div></div>}

      <div className="glass-card p-5 mb-8 border border-violet-400/20">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4"><div><div className="font-bold text-white">Owner account security</div><div className="text-xs text-slate-500 mt-1">Authenticator two-factor is {mfa?.enabled ? "on" : "not set up"}.</div></div>{!mfa?.enabled && !mfaSetup && <button onClick={startMfa} className="px-4 py-2 rounded-lg bg-violet-500 text-white text-xs font-black">Set up two-factor</button>}{mfa?.enabled && <span className="text-xs font-black text-green-400">✓ Protected · {mfa.recoveryCodesRemaining} recovery codes</span>}</div>
        {mfaSetup && <div className="mt-5 grid md:grid-cols-[240px_1fr] gap-6 border-t border-slate-800 pt-5"><img src={mfaSetup.qrDataUrl} alt="Authenticator QR code" className="rounded-xl w-60 h-60"/><div><h3 className="font-bold">Scan this in your authenticator app</h3><p className="text-xs text-slate-400 mt-2">Then enter the current six-digit code. Save the recovery codes somewhere private before confirming.</p><div className="mt-3 rounded-xl bg-slate-950 p-3 font-mono text-xs break-all text-slate-300">Manual key: {mfaSetup.manualKey}</div><div className="grid grid-cols-2 gap-2 mt-3">{mfaSetup.recoveryCodes.map(code => <code key={code} className="rounded bg-slate-950 p-2 text-xs text-amber-300">{code}</code>)}</div><div className="flex gap-2 mt-4"><input aria-label="Authenticator code" value={mfaCode} onChange={e=>setMfaCode(e.target.value.replace(/\D/g,"").slice(0,6))} placeholder="6-digit code" className="h-10 rounded-lg bg-slate-950 border border-slate-700 px-3 text-white"/><button onClick={confirmMfa} disabled={mfaCode.length!==6} className="px-4 rounded-lg bg-violet-500 disabled:opacity-40 text-xs font-black">Turn on two-factor</button></div></div></div>}
      </div>

      <div className="glass-card p-5 mb-8"><div className="font-bold text-sm text-white">Recent owner activity</div><div className="mt-4 space-y-3">{auditLogs.slice(0,8).map(log => <div key={log.id} className="flex items-start justify-between gap-4 border-t border-slate-800 pt-3"><div><div className="text-xs font-bold text-slate-200">{log.summary}</div><div className="text-[10px] text-slate-600 mt-1">{log.action} · {log.ipAddress ?? "unknown IP"}</div></div><time className="text-[10px] text-slate-500 shrink-0">{new Date(log.createdAt).toLocaleString()}</time></div>)}</div></div>

      {/* Top Assets */}
      {stats?.topAssets && stats.topAssets.length > 1 && (
        <div className="glass-card p-5 mb-8">
          <div className="label-secondary mb-4">Top Assets by Volume</div>
          <div className="flex flex-wrap gap-3">
            {stats.topAssets.map((a, i) => (
              <div key={a.ticker} className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
                <span className="text-xs font-bold" style={{ color: "var(--color-blue)" }}>#{i + 1}</span>
                <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>{a.ticker}</span>
                <span className="text-xs" style={{ color: "var(--color-muted)" }}>{a.count} trades</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Users Table */}
      <div className="glass-card overflow-hidden mb-8">
        <div className="px-6 py-4 flex items-center justify-between" style={{ borderBottom: "1px solid rgba(59,130,246,0.1)" }}>
          <div>
            <div className="font-bold text-sm" style={{ color: "#e2e8f0" }}>All Users</div>
            <div className="label-secondary mt-0.5">{filteredUsers.length} of {users?.length ?? 0} shown</div>
          </div>
          <input
            type="text"
            placeholder="Search name or email…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm border outline-none w-56"
            style={{ background: "#0d1117", borderColor: "#243044", color: "#e2e8f0" }}
          />
        </div>

        {usersLoading ? (
          <div className="p-8 text-center" style={{ color: "#475569" }}>Loading users…</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead style={{ background: "rgba(0,0,0,0.2)" }}>
                <tr>
                  <SortHeader label="Name" k="name" />
                  <SortHeader label="Email" k="email" />
                  <SortHeader label="Joined" k="createdAt" />
                  <SortHeader label="Last Login" k="lastLogin" />
                  <SortHeader label="Balance" k="paperBalance" />
                  <SortHeader label="P&L" k="totalPnl" />
                  <SortHeader label="Trades" k="tradeCount" />
                  <SortHeader label="Win %" k="winRate" />
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {filteredUsers.map((u, i) => {
                  const pnlColor = u.totalPnl > 0 ? "#22c55e" : u.totalPnl < 0 ? "#ef4444" : "#64748b";
                  return (
                    <tr
                      key={u.id}
                      style={{ borderTop: i > 0 ? "1px solid rgba(59,130,246,0.07)" : undefined }}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(59,130,246,0.2)", color: "var(--color-blue)" }}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>{u.name}</div>
                            {u.isAdmin && <span className="text-[9px] font-bold px-1 rounded" style={{ background: "rgba(239,68,68,0.15)", color: "var(--color-red)" }}>ADMIN</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-soft)" }}>{u.email}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--color-muted)" }}>{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--color-muted)" }}>{formatDate(u.lastLogin)}</td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: "#e2e8f0" }}>{formatBalance(u.paperBalance)}</td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: pnlColor }}>
                        {u.totalPnl >= 0 ? "+" : ""}${Math.abs(u.totalPnl).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: "var(--color-text-soft)" }}>{u.tradeCount}</td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-16 rounded-full overflow-hidden" style={{ background: "rgba(40,56,81,1)" }}>
                            <div className="h-full rounded-full conf-bar-fill" style={{ width: `${u.winRate}%` }} />
                          </div>
                          <span className="text-xs font-semibold" style={{ color: u.winRate >= 50 ? "#22c55e" : "#ef4444" }}>{u.winRate}%</span>
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <button
                          onClick={() => setSelectedUserId(u.id)}
                          className="text-xs font-semibold px-3 py-1.5 rounded-lg transition-all"
                          style={{ background: "rgba(59,130,246,0.15)", color: "var(--color-blue)", border: "1px solid rgba(59,130,246,0.3)" }}
                        >
                          View
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredUsers.length === 0 && (
                  <tr>
                    <td colSpan={9} className="px-4 py-8 text-center text-sm" style={{ color: "#475569" }}>
                      No users found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Detail Modal */}
      {selectedUserId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: "rgba(0,0,0,0.7)" }}
          onClick={e => { if (e.target === e.currentTarget) setSelectedUserId(null); }}
        >
          <div
            className="w-full max-w-3xl max-h-[85vh] overflow-y-auto rounded-2xl"
            style={{ background: "#1a2332", border: "1px solid rgba(59,130,246,0.25)", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}
          >
            {detailLoading || !selectedUser ? (
              <div className="p-8 text-center" style={{ color: "#475569" }}>Loading…</div>
            ) : (
              <>
                {/* Modal Header */}
                <div className="px-6 py-5 flex items-start justify-between" style={{ borderBottom: "1px solid rgba(59,130,246,0.1)" }}>
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black" style={{ background: "rgba(59,130,246,0.2)", color: "var(--color-blue)" }}>
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-lg" style={{ color: "#e2e8f0" }}>{selectedUser.name}</div>
                      <div className="text-sm" style={{ color: "var(--color-muted)" }}>{selectedUser.email}</div>
                    </div>
                  </div>
                  <button onClick={() => setSelectedUserId(null)} className="text-2xl leading-none" style={{ color: "#475569" }}>×</button>
                </div>

                {/* Stats Row */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 p-6 pb-0">
                  <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <div className="label-secondary">Balance</div>
                    <div className="text-lg font-black mt-1" style={{ color: "#e2e8f0" }}>{formatBalance(selectedUser.paperBalance)}</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <div className="label-secondary">Total P&L</div>
                    <div className="text-lg font-black mt-1" style={{ color: selectedUser.totalPnl >= 0 ? "#22c55e" : "#ef4444" }}>
                      {selectedUser.totalPnl >= 0 ? "+" : ""}${Math.abs(selectedUser.totalPnl).toFixed(2)}
                    </div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <div className="label-secondary">Trades</div>
                    <div className="text-lg font-black mt-1" style={{ color: "#a78bfa" }}>{selectedUser.tradeCount}</div>
                  </div>
                  <div className="rounded-xl p-3" style={{ background: "rgba(0,0,0,0.3)" }}>
                    <div className="label-secondary">Win Rate</div>
                    <div className="text-lg font-black mt-1" style={{ color: selectedUser.winRate >= 50 ? "#22c55e" : "#ef4444" }}>{selectedUser.winRate}%</div>
                  </div>
                </div>

                {/* Meta */}
                <div className="px-6 py-4 flex gap-6 flex-wrap">
                  <div><span className="label-secondary">Joined</span><div className="text-sm mt-0.5" style={{ color: "var(--color-text-soft)" }}>{formatDate(selectedUser.createdAt)}</div></div>
                  <div><span className="label-secondary">Last Login</span><div className="text-sm mt-0.5" style={{ color: "var(--color-text-soft)" }}>{formatDate(selectedUser.lastLogin)}</div></div>
                  {selectedUser.isAdmin && <div className="flex items-center"><span className="text-xs font-bold px-2 py-1 rounded" style={{ background: "rgba(239,68,68,0.15)", color: "var(--color-red)", border: "1px solid rgba(239,68,68,0.3)" }}>ADMIN</span></div>}
                </div>

                {/* Trade History */}
                <div className="px-6 pb-6">
                  <div className="label-secondary mb-3">Trade History ({selectedUser.trades.length})</div>
                  {selectedUser.trades.length === 0 ? (
                    <div className="text-sm text-center py-6" style={{ color: "#475569" }}>No trades yet</div>
                  ) : (
                    <div className="flex flex-col gap-2">
                      {selectedUser.trades.map((t: any) => {
                        const pnl = parseFloat(String(t.pnl ?? 0));
                        const pnlColor = pnl > 0 ? "#22c55e" : pnl < 0 ? "#ef4444" : "#64748b";
                        return (
                          <div
                            key={t.id}
                            className="flex items-center justify-between p-3 rounded-xl"
                            style={{ background: "rgba(0,0,0,0.3)", border: "1px solid rgba(59,130,246,0.08)" }}
                          >
                            <div className="flex items-center gap-3">
                              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${t.action === "BUY" ? "badge-buy" : "badge-sell"}`}>
                                {t.action}
                              </span>
                              <div>
                                <div className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>{t.ticker}</div>
                                <div className="label-secondary">{t.market} · {formatDate(t.entryAt)}</div>
                              </div>
                            </div>
                            <div className="text-right">
                              <div className="text-sm font-bold" style={{ color: "#e2e8f0" }}>${parseFloat(String(t.investedAmount)).toFixed(2)}</div>
                              {t.status === "CLOSED" ? (
                                <div className="text-xs font-semibold" style={{ color: pnlColor }}>
                                  {pnl >= 0 ? "+" : ""}${Math.abs(pnl).toFixed(2)} P&L
                                </div>
                              ) : (
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.15)", color: "var(--color-green)" }}>OPEN</span>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
