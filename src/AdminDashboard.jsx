import React, { useEffect, useState } from "react";
import { BarChart3, Users, FileText, Calendar, TrendingUp, X, Percent, UserPlus } from "lucide-react";

export default function AdminDashboard({ onExit }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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

      {/* Growth */}
      <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>Growth</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <StatCard icon={Users}    label="Total Users"       value={s.totalUsers}    subtext="All registered accounts" highlight />
        <StatCard icon={UserPlus} label="New Signups (7d)"  value={s.newSignups7d}  subtext={`${s.newSignups30d} in last 30 days`} />
        <StatCard icon={Users}    label="Active Users (7d)" value={s.activeUsers7d} subtext={`${s.totalUsers > 0 ? Math.round((s.activeUsers7d / s.totalUsers) * 100) : 0}% of total`} />
        <StatCard icon={Users}    label="Active Users (30d)" value={s.activeUsers30d} subtext={`${s.totalUsers > 0 ? Math.round((s.activeUsers30d / s.totalUsers) * 100) : 0}% of total`} />
      </div>

      {/* Engagement */}
      <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>Engagement</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <StatCard icon={Percent}   label="Engagement Rate"     value={`${s.engagementRate}%`}     subtext="Users who have journaled" highlight />
        <StatCard icon={Percent}   label="Retention (7d)"      value={`${s.retentionRate7d}%`}    subtext="Week-old users still active" />
        <StatCard icon={Percent}   label="Retention (30d)"     value={`${s.retentionRate30d}%`}   subtext="Month-old users still active" />
        <StatCard icon={TrendingUp} label="Avg Entries / User"    value={s.avgEntriesPerUser}       subtext="Among journaling users (excl. welcome)" />
        <StatCard icon={TrendingUp} label="Median Entries / User" value={s.medianEntriesPerUser}    subtext="50th percentile" />
      </div>

      {/* Content */}
      <h2 style={{ fontSize: '14px', fontWeight: '600', color: '#9ca3af', letterSpacing: '0.05em', textTransform: 'uppercase', marginBottom: '12px' }}>Content</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <StatCard icon={FileText} label="Total Entries"    value={s.totalEntries}      subtext={`${s.entriesLast7Days} last 7d · ${s.entriesLast30Days} last 30d`} />
        <StatCard icon={Calendar} label="Total Sessions"   value={s.totalSessions}     subtext={`${s.sessionsLast7Days} in last 7 days`} />
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
              </tr>
            </thead>
            <tbody>
              {s.topUsers.map((user, index) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '10px 12px', color: '#581c87', fontSize: '14px' }}>{index + 1}</td>
                  <td style={{ padding: '10px 12px', color: '#581c87', fontSize: '14px' }}>{user.email || 'Unknown'}</td>
                  <td style={{ padding: '10px 12px', textAlign: 'right', fontWeight: '600', color: '#9333ea', fontSize: '14px' }}>{user.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
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

const CLOUD_FUNCTION_CODE = `// Paste this into your Back4App Cloud Code (main.js)

Parse.Cloud.define("getAdminStats", async (request) => {
  const user = request.user;
  if (!user || user.get('username') !== 'lee.alisonnicole@gmail.com') {
    throw new Parse.Error(Parse.Error.OPERATION_FORBIDDEN, 'Admin only');
  }

  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  // All users (master key bypasses CLP)
  const allUsersQuery = new Parse.Query(Parse.User);
  allUsersQuery.limit(5000);
  const allUsers = await allUsersQuery.find({ useMasterKey: true });
  const totalUsers = allUsers.length;
  const newSignups7d = allUsers.filter(u => u.createdAt > sevenDaysAgo).length;
  const newSignups30d = allUsers.filter(u => u.createdAt > thirtyDaysAgo).length;

  // All entries (master key bypasses ACL)
  const allEntriesQuery = new Parse.Query("Entry");
  allEntriesQuery.include("user");
  allEntriesQuery.limit(5000);
  const allEntries = await allEntriesQuery.find({ useMasterKey: true });

  // All sessions
  const allSessionsQuery = new Parse.Query("SessionSnapshot");
  allSessionsQuery.include("user");
  allSessionsQuery.limit(5000);
  const allSessions = await allSessionsQuery.find({ useMasterKey: true });

  const totalEntries = allEntries.length;
  const totalSessions = allSessions.length;
  const entriesLast7Days = allEntries.filter(e => e.createdAt > sevenDaysAgo).length;
  const entriesLast30Days = allEntries.filter(e => e.createdAt > thirtyDaysAgo).length;
  const sessionsLast7Days = allSessions.filter(s => s.createdAt > sevenDaysAgo).length;

  // Active user sets
  const activeIds7d = new Set();
  allEntries.filter(e => e.createdAt > sevenDaysAgo).forEach(e => { const id = e.get("user")?.id; if (id) activeIds7d.add(id); });
  allSessions.filter(s => s.createdAt > sevenDaysAgo).forEach(s => { const id = s.get("user")?.id; if (id) activeIds7d.add(id); });

  const activeIds30d = new Set();
  allEntries.filter(e => e.createdAt > thirtyDaysAgo).forEach(e => { const id = e.get("user")?.id; if (id) activeIds30d.add(id); });
  allSessions.filter(s => s.createdAt > thirtyDaysAgo).forEach(s => { const id = s.get("user")?.id; if (id) activeIds30d.add(id); });

  // Per-user entry counts (exclude welcome entries)
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
    .map(([id, data]) => ({ id, email: data.email, count: data.count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Retention
  const oldUserIds = allUsers.filter(u => u.createdAt < sevenDaysAgo).map(u => u.id);
  const retentionRate7d = oldUserIds.length > 0
    ? Math.round((oldUserIds.filter(id => activeIds7d.has(id)).length / oldUserIds.length) * 100) : 0;

  const oldUser30Ids = allUsers.filter(u => u.createdAt < thirtyDaysAgo).map(u => u.id);
  const retentionRate30d = oldUser30Ids.length > 0
    ? Math.round((oldUser30Ids.filter(id => activeIds30d.has(id)).length / oldUser30Ids.length) * 100) : 0;

  return {
    totalUsers, newSignups7d, newSignups30d,
    activeUsers7d: activeIds7d.size, activeUsers30d: activeIds30d.size,
    totalEntries, entriesLast7Days, entriesLast30Days,
    totalSessions, sessionsLast7Days,
    engagementRate, avgEntriesPerUser, medianEntriesPerUser,
    retentionRate7d, retentionRate30d, topUsers,
  };
});`;
