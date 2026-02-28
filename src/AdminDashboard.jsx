import React, { useEffect, useState } from "react";
import { BarChart3, Users, FileText, Calendar, TrendingUp, X, Percent, UserPlus, ChevronDown } from "lucide-react";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function AdminDashboard({ onExit }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // User drill-down
  const [selectedUserId, setSelectedUserId] = useState('');
  const [userDetail, setUserDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState(null);

  const Parse = typeof window !== 'undefined' ? window.Parse : null;

  useEffect(() => {
    if (!Parse) return;
    fetchStats();
  }, [Parse]);

  const fetchStats = async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await Parse.Cloud.run("getAdminStats");
      setStats(result);
    } catch (err) {
      console.error("Failed to fetch stats:", err);
      setError(err.message || "Failed to load analytics. Make sure the getAdminStats cloud function is deployed.");
    } finally {
      setLoading(false);
    }
  };

  const fetchUserDetail = async (userId) => {
    if (!userId) { setUserDetail(null); return; }
    setDetailLoading(true);
    setDetailError(null);
    setUserDetail(null);
    try {
      const result = await Parse.Cloud.run("getUserDetail", { userId });
      setUserDetail(result);
    } catch (err) {
      setDetailError(err.message || "Failed to load user detail.");
    } finally {
      setDetailLoading(false);
    }
  };

  const handleUserSelect = (userId) => {
    setSelectedUserId(userId);
    fetchUserDetail(userId);
  };

  const fmtTime = (iso) => {
    if (!iso) return '—';
    return new Date(iso).toLocaleString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric',
      hour: 'numeric', minute: '2-digit', hour12: true
    });
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div style={{ width: '48px', height: '48px', border: '4px solid #e9d5ff', borderTopColor: '#9333ea', borderRadius: '50%', margin: '0 auto', animation: 'spin 1s linear infinite' }}></div>
        <p style={{ marginTop: '16px', color: '#7c3aed' }}>Loading analytics...</p>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding: '32px' }}>
        <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: '16px', padding: '24px', marginBottom: '16px' }}>
          <p style={{ color: '#dc2626', fontWeight: '500', marginBottom: '8px' }}>Analytics Error</p>
          <p style={{ color: '#7f1d1d', fontSize: '14px', margin: 0 }}>{error}</p>
        </div>
        <details style={{ background: '#f5f3ff', border: '1px solid #e9d5ff', borderRadius: '12px', padding: '16px' }}>
          <summary style={{ cursor: 'pointer', fontWeight: '500', color: '#7c3aed', fontSize: '14px' }}>Cloud Function setup instructions</summary>
          <pre style={{ marginTop: '12px', fontSize: '12px', color: '#374151', whiteSpace: 'pre-wrap', lineHeight: '1.6' }}>{CLOUD_FUNCTION_CODE}</pre>
        </details>
        <button onClick={fetchStats} style={{ marginTop: '16px', padding: '10px 20px', borderRadius: '12px', border: 'none', background: '#9333ea', color: 'white', fontWeight: '500', cursor: 'pointer' }}>
          Retry
        </button>
        <button onClick={onExit} style={{ marginTop: '16px', marginLeft: '12px', padding: '10px 20px', borderRadius: '12px', border: '1px solid #e9d5ff', background: 'white', color: '#7c3aed', fontWeight: '500', cursor: 'pointer' }}>
          Exit
        </button>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, subtext, highlight }) => (
    <div style={{
      background: highlight ? 'linear-gradient(135deg, #f5f3ff, #ede9fe)' : 'rgba(255,255,255,0.9)',
      border: `1px solid ${highlight ? '#c4b5fd' : '#e9d5ff'}`,
      borderRadius: '16px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '10px' }}>
        <Icon size={20} style={{ color: '#9333ea' }} />
        <h3 style={{ fontSize: '13px', fontWeight: '500', color: '#6b7280', margin: 0 }}>{label}</h3>
      </div>
      <p style={{ fontSize: '32px', fontWeight: '600', color: '#581c87', margin: '0 0 4px 0' }}>{value}</p>
      {subtext && <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{subtext}</p>}
    </div>
  );

  const s = stats;
  const allUsers = s.allUsersList || [];

  return (
    <div style={{ maxWidth: '1000px', margin: '0 auto', padding: '32px' }}>
      <div style={{ marginBottom: '32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h1 style={{ fontSize: '32px', fontWeight: '300', color: '#581c87', marginBottom: '8px' }}>Between Analytics</h1>
          <p style={{ color: '#7c3aed', fontSize: '16px' }}>Key metrics and user engagement</p>
        </div>
        <button
          onClick={onExit}
          style={{ padding: '8px 16px', borderRadius: '12px', border: '1px solid #e9d5ff', background: 'white', color: '#7c3aed', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}
        >
          <X size={20} />Exit Analytics
        </button>
      </div>

      {/* All stat cards — 3-column grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '32px' }}>

        {/* Growth */}
        <div style={{ gridColumn: '1 / -1', fontSize: '14px', fontWeight: '600', color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase', paddingBottom: '4px', borderBottom: '1px solid #e9d5ff' }}>Growth</div>
        <StatCard icon={Users}    label="Total Users"        value={s.totalUsers}     subtext="All registered accounts" highlight />
        <StatCard icon={UserPlus} label="New Signups (7d)"   value={s.newSignups7d}   subtext={`${s.newSignups30d} in last 30 days`} />
        <StatCard icon={Users}    label="Active Users (7d)"  value={s.activeUsers7d}  subtext={`${s.totalUsers > 0 ? Math.round((s.activeUsers7d / s.totalUsers) * 100) : 0}% of total`} />
        <StatCard icon={Users}    label="Active Users (30d)" value={s.activeUsers30d} subtext={`${s.totalUsers > 0 ? Math.round((s.activeUsers30d / s.totalUsers) * 100) : 0}% of total`} />

        {/* Engagement */}
        <div style={{ gridColumn: '1 / -1', fontSize: '14px', fontWeight: '600', color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase', paddingBottom: '4px', borderBottom: '1px solid #e9d5ff', marginTop: '8px' }}>Engagement</div>
        <StatCard icon={Percent}    label="Engagement Rate"      value={`${s.engagementRate}%`}   subtext="Users who have journaled" highlight />
        <StatCard icon={Percent}    label="Retention (7d)"       value={`${s.retentionRate7d}%`}  subtext="Week-old users still active" />
        <StatCard icon={Percent}    label="Retention (30d)"      value={`${s.retentionRate30d}%`} subtext="Month-old users still active" />
        <StatCard icon={TrendingUp} label="Avg Entries / User"   value={s.avgEntriesPerUser}      subtext="Among journaling users (excl. welcome)" />
        <StatCard icon={TrendingUp} label="Median Entries / User" value={s.medianEntriesPerUser}  subtext="50th percentile" />

        {/* Content */}
        <div style={{ gridColumn: '1 / -1', fontSize: '14px', fontWeight: '600', color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase', paddingBottom: '4px', borderBottom: '1px solid #e9d5ff', marginTop: '8px' }}>Content</div>
        <StatCard icon={FileText} label="Total Entries"  value={s.totalEntries}  subtext={`${s.entriesLast7Days} last 7d · ${s.entriesLast30Days} last 30d`} />
        <StatCard icon={Calendar} label="Total Sessions" value={s.totalSessions} subtext={`${s.sessionsLast7Days} in last 7 days`} />
      </div>

      {/* Line chart */}
      {s.dailyData?.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #e9d5ff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
          <h3 style={{ fontSize: '16px', fontWeight: '500', color: '#581c87', marginBottom: '20px' }}>Activity Over Time (Last 30 Days)</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={s.dailyData} margin={{ top: 4, right: 16, left: 0, bottom: 4 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f3e8ff" />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: '#9ca3af' }} tickFormatter={d => d.slice(5)} />
              <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#9ca3af' }} />
              <Tooltip
                contentStyle={{ borderRadius: '12px', border: '1px solid #e9d5ff', fontSize: '13px' }}
                labelFormatter={d => `Date: ${d}`}
              />
              <Legend wrapperStyle={{ fontSize: '13px', paddingTop: '12px' }} />
              <Line type="monotone" dataKey="newUsers"  name="New Users"  stroke="#9333ea" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="entries"   name="Entries"    stroke="#7c3aed" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
              <Line type="monotone" dataKey="sessions"  name="Sessions"   stroke="#c084fc" strokeWidth={2} dot={false} activeDot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* New Users (7d) */}
      <div style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #e9d5ff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '500', color: '#581c87', marginBottom: '16px' }}>New Users (Last 7 Days)</h3>
        {s.newUsers7dList?.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>No new signups in the last 7 days.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e9d5ff' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Email</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Signed Up</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Entries</th>
                  <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Sessions</th>
                </tr>
              </thead>
              <tbody>
                {s.newUsers7dList.map((user) => (
                  <tr
                    key={user.id}
                    onClick={() => handleUserSelect(user.id)}
                    style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: selectedUserId === user.id ? '#faf5ff' : 'transparent' }}
                  >
                    <td style={{ padding: '10px 12px', color: '#581c87', fontSize: '14px' }}>{user.email || 'Unknown'}</td>
                    <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: '13px' }}>
                      {new Date(user.signedUpAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: user.entries > 0 ? '#9333ea' : '#9ca3af', fontSize: '14px' }}>{user.entries}</td>
                    <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: user.sessions > 0 ? '#9333ea' : '#9ca3af', fontSize: '14px' }}>{user.sessions ?? 0}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Top Users */}
      <div style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #e9d5ff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '500', color: '#581c87', marginBottom: '16px' }}>Top Users by Entries</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e9d5ff' }}>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Rank</th>
                <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Email</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Entries</th>
                <th style={{ textAlign: 'right', padding: '10px 12px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Sessions</th>
              </tr>
            </thead>
            <tbody>
              {s.topUsers.map((user, index) => (
                <tr
                  key={user.id}
                  onClick={() => handleUserSelect(user.id)}
                  style={{ borderBottom: '1px solid #f3f4f6', cursor: 'pointer', background: selectedUserId === user.id ? '#faf5ff' : 'transparent' }}
                >
                  <td style={{ padding: '10px 12px', color: '#581c87', fontSize: '14px' }}>{index + 1}</td>
                  <td style={{ padding: '10px 12px', color: '#581c87', fontSize: '14px' }}>{user.email || 'Unknown'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: '#9333ea', fontSize: '14px' }}>{user.count}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: '#9333ea', fontSize: '14px' }}>{user.sessions ?? 0}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Activity Leaderboard */}
      <div style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #e9d5ff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '500', color: '#581c87', marginBottom: '16px' }}>Recent Activity</h3>
        {!s.recentActivity || s.recentActivity.length === 0 ? (
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>No recent activity.</p>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid #e9d5ff' }}>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>#</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>User</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Action</th>
                  <th style={{ textAlign: 'left', padding: '10px 12px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>When</th>
                </tr>
              </thead>
              <tbody>
                {s.recentActivity.map((item, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                    <td style={{ padding: '10px 12px', color: '#9ca3af', fontSize: '13px' }}>{i + 1}</td>
                    <td style={{ padding: '10px 12px', color: '#581c87', fontSize: '14px' }}>{item.email}</td>
                    <td style={{ padding: '10px 12px', fontSize: '13px' }}>
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '3px 10px', borderRadius: '20px', background: item.type === 'entry' ? '#f3e8ff' : '#ede9fe', color: item.type === 'entry' ? '#7c3aed' : '#6d28d9', fontWeight: '500' }}>
                        {item.type === 'entry' ? '📝 Journal entry' : '🗓️ Session logged'}
                      </span>
                    </td>
                    <td style={{ padding: '10px 12px', color: '#6b7280', fontSize: '13px' }}>
                      {new Date(item.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── USER DETAIL ── */}
      <div style={{ background: 'rgba(255,255,255,0.9)', border: '1px solid #e9d5ff', borderRadius: '16px', padding: '24px', boxShadow: '0 2px 8px rgba(0,0,0,0.05)', marginBottom: '24px' }}>
        <h3 style={{ fontSize: '16px', fontWeight: '500', color: '#581c87', marginBottom: '16px' }}>User Detail</h3>

        {/* User selector */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: '240px' }}>
            <select
              value={selectedUserId}
              onChange={e => handleUserSelect(e.target.value)}
              style={{ width: '100%', padding: '10px 36px 10px 14px', borderRadius: '12px', border: '2px solid #e9d5ff', background: 'white', color: selectedUserId ? '#581c87' : '#9ca3af', fontSize: '14px', cursor: 'pointer', appearance: 'none', outline: 'none' }}
            >
              <option value="">— Select a user —</option>
              {allUsers.map(u => (
                <option key={u.id} value={u.id}>{u.email} ({u.entries} entries, {u.sessions} sessions)</option>
              ))}
            </select>
            <ChevronDown size={16} style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af', pointerEvents: 'none' }} />
          </div>
          {selectedUserId && (
            <button onClick={() => { setSelectedUserId(''); setUserDetail(null); }} style={{ padding: '8px 14px', borderRadius: '10px', border: '1px solid #e9d5ff', background: 'white', color: '#7c3aed', fontSize: '13px', cursor: 'pointer' }}>
              Clear
            </button>
          )}
        </div>

        {detailLoading && (
          <div style={{ textAlign: 'center', padding: '24px', color: '#a78bfa', fontSize: '14px' }}>Loading user data…</div>
        )}
        {detailError && (
          <div style={{ color: '#dc2626', fontSize: '13px', padding: '12px', background: '#fef2f2', borderRadius: '10px' }}>{detailError}</div>
        )}
        {!selectedUserId && !detailLoading && (
          <p style={{ color: '#9ca3af', fontSize: '14px', margin: 0 }}>Select a user above, or click any row in the tables above to view their detail. You can also select from the dropdown.</p>
        )}

        {userDetail && !detailLoading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ flex: 1, minWidth: '200px', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '1px solid #c4b5fd', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Journal Entries</div>
                <div style={{ fontSize: '36px', fontWeight: '600', color: '#581c87' }}>{userDetail.entries.length}</div>
              </div>
              <div style={{ flex: 1, minWidth: '200px', background: 'linear-gradient(135deg, #f5f3ff, #ede9fe)', border: '1px solid #c4b5fd', borderRadius: '12px', padding: '16px' }}>
                <div style={{ fontSize: '12px', color: '#7c3aed', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '6px' }}>Session Snapshots</div>
                <div style={{ fontSize: '36px', fontWeight: '600', color: '#581c87' }}>{userDetail.sessions.length}</div>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              {/* Entries list */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#581c87', marginBottom: '10px' }}>
                  Entry timestamps ({userDetail.entries.length})
                </div>
                {userDetail.entries.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: '13px' }}>No entries.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '320px', overflowY: 'auto' }}>
                    {userDetail.entries.map((e, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', borderRadius: '8px', background: i % 2 === 0 ? '#faf5ff' : 'white', fontSize: '13px' }}>
                        <span style={{ color: '#9ca3af', fontSize: '11px', minWidth: '20px' }}>{i + 1}</span>
                        <span style={{ color: '#581c87' }}>{fmtTime(e.timestamp || e.createdAt)}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Sessions list */}
              <div>
                <div style={{ fontSize: '13px', fontWeight: '600', color: '#581c87', marginBottom: '10px' }}>
                  Session timestamps ({userDetail.sessions.length})
                </div>
                {userDetail.sessions.length === 0 ? (
                  <p style={{ color: '#9ca3af', fontSize: '13px' }}>No sessions logged.</p>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '4px', maxHeight: '320px', overflowY: 'auto' }}>
                    {userDetail.sessions.map((s, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '7px 10px', borderRadius: '8px', background: i % 2 === 0 ? '#faf5ff' : 'white', fontSize: '13px' }}>
                        <span style={{ color: '#9ca3af', fontSize: '11px', minWidth: '20px' }}>{i + 1}</span>
                        <div>
                          <div style={{ color: '#581c87' }}>{fmtTime(s.createdAt)}</div>
                          {s.sessionDate && <div style={{ color: '#a78bfa', fontSize: '11px' }}>Session date: {s.sessionDate}</div>}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      <button
        onClick={fetchStats}
        style={{ padding: '12px 24px', borderRadius: '12px', border: 'none', background: '#9333ea', color: 'white', fontWeight: '500', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px' }}
      >
        <BarChart3 size={20} />
        Refresh Stats
      </button>
    </div>
  );
}

const CLOUD_FUNCTION_CODE = `// ── getAdminStats ────────────────────────────────────────────────────────────
Parse.Cloud.define("getAdminStats", async (request) => {
  const user = request.user;
  if (!user || user.get('username') !== 'lee.alisonnicole@gmail.com') {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Admin only');
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  const allUsersQuery = new Parse.Query(Parse.User);
  allUsersQuery.limit(5000);
  const allUsers = await allUsersQuery.find({ useMasterKey: true });
  const totalUsers = allUsers.length;
  const newSignups7d = allUsers.filter(u => u.createdAt > sevenDaysAgo).length;
  const newSignups30d = allUsers.filter(u => u.createdAt > thirtyDaysAgo).length;

  const allEntriesQuery = new Parse.Query("Entry");
  allEntriesQuery.include("user");
  allEntriesQuery.limit(5000);
  const allEntries = await allEntriesQuery.find({ useMasterKey: true });

  const allSessionsQuery = new Parse.Query("SessionSnapshot");
  allSessionsQuery.include("user");
  allSessionsQuery.limit(5000);
  const allSessions = await allSessionsQuery.find({ useMasterKey: true });

  const totalEntries = allEntries.length;
  const totalSessions = allSessions.length;
  const entriesLast7Days = allEntries.filter(e => e.createdAt > sevenDaysAgo).length;
  const entriesLast30Days = allEntries.filter(e => e.createdAt > thirtyDaysAgo).length;
  const sessionsLast7Days = allSessions.filter(s => s.createdAt > sevenDaysAgo).length;

  const activeIds7d = new Set();
  allEntries.filter(e => e.createdAt > sevenDaysAgo).forEach(e => { const id = e.get("user")?.id; if (id) activeIds7d.add(id); });
  allSessions.filter(s => s.createdAt > sevenDaysAgo).forEach(s => { const id = s.get("user")?.id; if (id) activeIds7d.add(id); });

  const activeIds30d = new Set();
  allEntries.filter(e => e.createdAt > thirtyDaysAgo).forEach(e => { const id = e.get("user")?.id; if (id) activeIds30d.add(id); });
  allSessions.filter(s => s.createdAt > thirtyDaysAgo).forEach(s => { const id = s.get("user")?.id; if (id) activeIds30d.add(id); });

  const userEntryCount = {};
  const userHasRealEntry = {};
  allEntries.forEach(entry => {
    const userId = entry.get("user")?.id;
    const userEmail = entry.get("user")?.get("username");
    const isWelcome = entry.get("isWelcomeEntry") === true;
    if (userId) {
      if (!userEntryCount[userId]) userEntryCount[userId] = { email: userEmail, count: 0 };
      if (!isWelcome) {
        userEntryCount[userId].count++;
        userHasRealEntry[userId] = true;
      }
    }
  });

  const userSessionCount = {};
  allSessions.forEach(s => {
    const userId = s.get("user")?.id;
    const userEmail = s.get("user")?.get("username");
    if (userId) {
      if (!userSessionCount[userId]) userSessionCount[userId] = { email: userEmail, count: 0 };
      userSessionCount[userId].count++;
    }
  });

  const uniqueJournalers = Object.keys(userHasRealEntry).length;
  const engagementRate = totalUsers > 0 ? Math.round((uniqueJournalers / totalUsers) * 100) : 0;
  const realEntryTotal = Object.values(userEntryCount).reduce((sum, d) => sum + d.count, 0);
  const avgEntriesPerUser = uniqueJournalers > 0 ? parseFloat((realEntryTotal / uniqueJournalers).toFixed(1)) : 0;

  const countValues = Object.values(userEntryCount).filter(d => d.count > 0).map(d => d.count).sort((a, b) => a - b);
  let medianEntriesPerUser = 0;
  if (countValues.length > 0) {
    const mid = Math.floor(countValues.length / 2);
    medianEntriesPerUser = countValues.length % 2 === 0
      ? parseFloat(((countValues[mid - 1] + countValues[mid]) / 2).toFixed(1))
      : parseFloat(countValues[mid].toFixed(1));
  }

  const topUsers = Object.entries(userEntryCount)
    .map(([id, data]) => ({ id, email: data.email, count: data.count, sessions: userSessionCount[id]?.count ?? 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  const oldUserIds = allUsers.filter(u => u.createdAt < sevenDaysAgo).map(u => u.id);
  const retentionRate7d = oldUserIds.length > 0
    ? Math.round((oldUserIds.filter(id => activeIds7d.has(id)).length / oldUserIds.length) * 100) : 0;

  const oldUser30Ids = allUsers.filter(u => u.createdAt < thirtyDaysAgo).map(u => u.id);
  const retentionRate30d = oldUser30Ids.length > 0
    ? Math.round((oldUser30Ids.filter(id => activeIds30d.has(id)).length / oldUser30Ids.length) * 100) : 0;

  const newUsers7dList = allUsers
    .filter(u => u.createdAt > sevenDaysAgo)
    .map(u => ({
      id: u.id,
      email: u.get('username'),
      signedUpAt: u.createdAt.toISOString(),
      entries: userEntryCount[u.id]?.count ?? 0,
      sessions: userSessionCount[u.id]?.count ?? 0,
    }))
    .sort((a, b) => new Date(b.signedUpAt) - new Date(a.signedUpAt));

  // All users list for the user-detail dropdown
  const allUsersList = allUsers
    .map(u => ({
      id: u.id,
      email: u.get('username') || 'Unknown',
      entries: userEntryCount[u.id]?.count ?? 0,
      sessions: userSessionCount[u.id]?.count ?? 0,
    }))
    .sort((a, b) => b.entries - a.entries);

  const dailyData = [];
  for (let i = 29; i >= 0; i--) {
    const dayStart = new Date(now);
    dayStart.setDate(dayStart.getDate() - i);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(dayStart);
    dayEnd.setDate(dayEnd.getDate() + 1);
    const label = dayStart.toISOString().split('T')[0];
    dailyData.push({
      date: label,
      newUsers: allUsers.filter(u => u.createdAt >= dayStart && u.createdAt < dayEnd).length,
      entries:  allEntries.filter(e => e.createdAt >= dayStart && e.createdAt < dayEnd).length,
      sessions: allSessions.filter(s => s.createdAt >= dayStart && s.createdAt < dayEnd).length,
    });
  }

  const recentActivity = [
    ...allEntries
      .filter(e => !e.get("isWelcomeEntry"))
      .map(e => ({ type: 'entry', email: e.get("user")?.get("username") || 'Unknown', createdAt: e.createdAt.toISOString() })),
    ...allSessions
      .filter(s => !s.get("isExampleSnapshot"))
      .map(s => ({ type: 'session', email: s.get("user")?.get("username") || 'Unknown', createdAt: s.createdAt.toISOString() })),
  ].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 10);

  return {
    totalUsers, newSignups7d, newSignups30d,
    activeUsers7d: activeIds7d.size, activeUsers30d: activeIds30d.size,
    totalEntries, entriesLast7Days, entriesLast30Days,
    totalSessions, sessionsLast7Days,
    engagementRate, avgEntriesPerUser, medianEntriesPerUser,
    retentionRate7d, retentionRate30d,
    topUsers, newUsers7dList, allUsersList, dailyData, recentActivity,
  };
});

// ── getUserDetail ─────────────────────────────────────────────────────────────
Parse.Cloud.define("getUserDetail", async (request) => {
  const user = request.user;
  if (!user || user.get('username') !== 'lee.alisonnicole@gmail.com') {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Admin only');
  }
  const { userId } = request.params;

  const targetUser = await new Parse.Query(Parse.User).get(userId, { useMasterKey: true });

  const entriesQuery = new Parse.Query("Entry");
  entriesQuery.equalTo("user", targetUser);
  entriesQuery.ascending("timestamp");
  entriesQuery.limit(1000);
  const entries = await entriesQuery.find({ useMasterKey: true });

  const sessionsQuery = new Parse.Query("SessionSnapshot");
  sessionsQuery.equalTo("user", targetUser);
  sessionsQuery.ascending("createdAt");
  sessionsQuery.limit(1000);
  const sessions = await sessionsQuery.find({ useMasterKey: true });

  return {
    email: targetUser.get('username'),
    entries: entries
      .filter(e => !e.get('isWelcomeEntry'))
      .map(e => ({
        timestamp: e.get('timestamp') || e.createdAt.toISOString(),
        createdAt: e.createdAt.toISOString(),
        date: e.get('date') || '',
      })),
    sessions: sessions
      .filter(s => !s.get('isExampleSnapshot'))
      .map(s => ({
        sessionDate: s.get('sessionDate') || '',
        createdAt: s.createdAt.toISOString(),
      })),
  };
});`;
