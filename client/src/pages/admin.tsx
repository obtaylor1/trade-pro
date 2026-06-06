import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

interface AdminStats {
  totalUsers: number;
  totalTrades: number;
  newUsersToday: number;
  avgWinRate: number;
  topAssets: { ticker: string; count: number }[];
}

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

  const headers = { Authorization: `Bearer ${token}` };

  const { data: stats, isLoading: statsLoading } = useQuery<AdminStats>({
    queryKey: ["/api/admin/stats"],
    queryFn: () => fetch("/api/admin/stats", { headers }).then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: users, isLoading: usersLoading } = useQuery<AdminUser[]>({
    queryKey: ["/api/admin/users"],
    queryFn: () => fetch("/api/admin/users", { headers }).then(r => r.json()),
    refetchInterval: 30000,
  });

  const { data: selectedUser, isLoading: detailLoading } = useQuery<UserDetail>({
    queryKey: ["/api/admin/users", selectedUserId],
    queryFn: () => fetch(`/api/admin/users/${selectedUserId}`, { headers }).then(r => r.json()),
    enabled: !!selectedUserId,
  });

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
          <span className="text-xs font-bold px-2 py-0.5 rounded" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>RESTRICTED</span>
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

      {/* Top Assets */}
      {stats?.topAssets && stats.topAssets.length > 1 && (
        <div className="glass-card p-5 mb-8">
          <div className="label-secondary mb-4">Top Assets by Volume</div>
          <div className="flex flex-wrap gap-3">
            {stats.topAssets.map((a, i) => (
              <div key={a.ticker} className="flex items-center gap-2 px-3 py-1.5 rounded-full" style={{ background: "rgba(59,130,246,0.1)", border: "1px solid rgba(59,130,246,0.2)" }}>
                <span className="text-xs font-bold" style={{ color: "#3b82f6" }}>#{i + 1}</span>
                <span className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>{a.ticker}</span>
                <span className="text-xs" style={{ color: "#64748b" }}>{a.count} trades</span>
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
                          <div className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold" style={{ background: "rgba(59,130,246,0.2)", color: "#3b82f6" }}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <div className="text-sm font-semibold" style={{ color: "#e2e8f0" }}>{u.name}</div>
                            {u.isAdmin && <span className="text-[9px] font-bold px-1 rounded" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444" }}>ADMIN</span>}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: "#94a3b8" }}>{u.email}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "#64748b" }}>{formatDate(u.createdAt)}</td>
                      <td className="px-4 py-3 text-sm" style={{ color: "#64748b" }}>{formatDate(u.lastLogin)}</td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: "#e2e8f0" }}>{formatBalance(u.paperBalance)}</td>
                      <td className="px-4 py-3 text-sm font-semibold" style={{ color: pnlColor }}>
                        {u.totalPnl >= 0 ? "+" : ""}${Math.abs(u.totalPnl).toFixed(2)}
                      </td>
                      <td className="px-4 py-3 text-sm" style={{ color: "#94a3b8" }}>{u.tradeCount}</td>
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
                          style={{ background: "rgba(59,130,246,0.15)", color: "#3b82f6", border: "1px solid rgba(59,130,246,0.3)" }}
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
                    <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl font-black" style={{ background: "rgba(59,130,246,0.2)", color: "#3b82f6" }}>
                      {selectedUser.name.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-bold text-lg" style={{ color: "#e2e8f0" }}>{selectedUser.name}</div>
                      <div className="text-sm" style={{ color: "#64748b" }}>{selectedUser.email}</div>
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
                  <div><span className="label-secondary">Joined</span><div className="text-sm mt-0.5" style={{ color: "#94a3b8" }}>{formatDate(selectedUser.createdAt)}</div></div>
                  <div><span className="label-secondary">Last Login</span><div className="text-sm mt-0.5" style={{ color: "#94a3b8" }}>{formatDate(selectedUser.lastLogin)}</div></div>
                  {selectedUser.isAdmin && <div className="flex items-center"><span className="text-xs font-bold px-2 py-1 rounded" style={{ background: "rgba(239,68,68,0.15)", color: "#ef4444", border: "1px solid rgba(239,68,68,0.3)" }}>ADMIN</span></div>}
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
                                <span className="text-xs font-bold px-1.5 py-0.5 rounded" style={{ background: "rgba(34,197,94,0.15)", color: "#22c55e" }}>OPEN</span>
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
