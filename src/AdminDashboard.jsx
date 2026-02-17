import React, { useEffect, useState } from "react";
import { BarChart3, Users, FileText, Calendar, TrendingUp, X, Percent, UserPlus } from "lucide-react";

export default function AdminDashboard({ onExit }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  const Parse = typeof window !== 'undefined' ? window.Parse : null;

  useEffect(() => {
    if (!Parse) return;
    fetchStats();
  }, [Parse]);

  const fetchStats = async () => {
    setLoading(true);
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // --- Users (new signups only — totalUsers derived from entries/sessions below) ---
      const newSignups7dQuery = new Parse.Query(Parse.User);
      newSignups7dQuery.greaterThan("createdAt", sevenDaysAgo);
      const newSignups7d = await newSignups7dQuery.count();

      const newSignups30dQuery = new Parse.Query(Parse.User);
      newSignups30dQuery.greaterThan("createdAt", thirtyDaysAgo);
      const newSignups30d = await newSignups30dQuery.count();

      // --- Entries ---
      const entryCountQuery = new Parse.Query("Entry");
      const totalEntries = await entryCountQuery.count();

      const entries7Query = new Parse.Query("Entry");
      entries7Query.greaterThan("createdAt", sevenDaysAgo);
      const entriesLast7Days = await entries7Query.count();

      const entries30Query = new Parse.Query("Entry");
      entries30Query.greaterThan("createdAt", thirtyDaysAgo);
      const entriesLast30Days = await entries30Query.count();

      // --- Sessions ---
      const sessionCountQuery = new Parse.Query("SessionSnapshot");
      const totalSessions = await sessionCountQuery.count();

      const sessions7Query = new Parse.Query("SessionSnapshot");
      sessions7Query.greaterThan("createdAt", sevenDaysAgo);
      const sessionsLast7Days = await sessions7Query.count();

      // --- Active users (7d & 30d): users who created an entry OR session ---
      const recentEntries7Query = new Parse.Query("Entry");
      recentEntries7Query.greaterThan("createdAt", sevenDaysAgo);
      recentEntries7Query.limit(2000);
      const recentEntries7 = await recentEntries7Query.find();

      const recentSessions7Query = new Parse.Query("SessionSnapshot");
      recentSessions7Query.greaterThan("createdAt", sevenDaysAgo);
      recentSessions7Query.limit(2000);
      const recentSessions7 = await recentSessions7Query.find();

      const activeIds7d = new Set();
      recentEntries7.forEach(e => { const id = e.get("user")?.id; if (id) activeIds7d.add(id); });
      recentSessions7.forEach(s => { const id = s.get("user")?.id; if (id) activeIds7d.add(id); });
      const activeUsers7d = activeIds7d.size;

      const recentEntries30Query = new Parse.Query("Entry");
      recentEntries30Query.greaterThan("createdAt", thirtyDaysAgo);
      recentEntries30Query.limit(2000);
      const recentEntries30 = await recentEntries30Query.find();

      const recentSessions30Query = new Parse.Query("SessionSnapshot");
      recentSessions30Query.greaterThan("createdAt", thirtyDaysAgo);
      recentSessions30Query.limit(2000);
      const recentSessions30 = await recentSessions30Query.find();

      const activeIds30d = new Set();
      recentEntries30.forEach(e => { const id = e.get("user")?.id; if (id) activeIds30d.add(id); });
      recentSessions30.forEach(s => { const id = s.get("user")?.id; if (id) activeIds30d.add(id); });
      const activeUsers30d = activeIds30d.size;

      // --- Per-user entry counts (engagement rate, mean, median, top users) ---
      const allEntriesQuery = new Parse.Query("Entry");
      allEntriesQuery.include("user");
      allEntriesQuery.limit(2000);
      const allEntries = await allEntriesQuery.find();

      // Derive total users from unique user IDs across entries + sessions
      // (avoids Parse.User CLP restriction which limits count to current user only)
      const allSessionsForUsers = new Parse.Query("SessionSnapshot");
      allSessionsForUsers.include("user");
      allSessionsForUsers.limit(2000);
      const allSessionObjects = await allSessionsForUsers.find();
      const allUserIds = new Set();
      allEntries.forEach(e => { const id = e.get("user")?.id; if (id) allUserIds.add(id); });
      allSessionObjects.forEach(s => { const id = s.get("user")?.id; if (id) allUserIds.add(id); });
      const totalUsers = Math.max(allUserIds.size, 1); // at least 1 (the current admin)

      // Real journalers: exclude users who only have the welcome entry
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
      const avgEntriesPerUser = uniqueJournalers > 0 ? (realEntryTotal / uniqueJournalers).toFixed(1) : 0;

      const countValues = Object.values(userEntryCount).map(d => d.count).sort((a, b) => a - b);
      let medianEntriesPerUser = 0;
      if (countValues.length > 0) {
        const mid = Math.floor(countValues.length / 2);
        medianEntriesPerUser = countValues.length % 2 === 0
          ? ((countValues[mid - 1] + countValues[mid]) / 2).toFixed(1)
          : countValues[mid].toFixed(1);
      }

      const topUsers = Object.entries(userEntryCount)
        .map(([id, data]) => ({ id, email: data.email, count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      // --- Retention: users created 7+ days ago who are still active in 7d ---
      const oldUsersQuery = new Parse.Query(Parse.User);
      oldUsersQuery.lessThan("createdAt", sevenDaysAgo);
      oldUsersQuery.limit(2000);
      const oldUsers = await oldUsersQuery.find();
      const oldUsersStillActive = oldUsers.filter(u => activeIds7d.has(u.id));
      const retentionRate7d = oldUsers.length > 0
        ? Math.round((oldUsersStillActive.length / oldUsers.length) * 100)
        : 0;

      const oldUsers30Query = new Parse.Query(Parse.User);
      oldUsers30Query.lessThan("createdAt", thirtyDaysAgo);
      oldUsers30Query.limit(2000);
      const oldUsers30 = await oldUsers30Query.find();
      const oldUsers30StillActive = oldUsers30.filter(u => activeIds30d.has(u.id));
      const retentionRate30d = oldUsers30.length > 0
        ? Math.round((oldUsers30StillActive.length / oldUsers30.length) * 100)
        : 0;

      setStats({
        totalUsers,
        newSignups7d,
        newSignups30d,
        activeUsers7d,
        activeUsers30d,
        totalEntries,
        entriesLast7Days,
        entriesLast30Days,
        totalSessions,
        sessionsLast7Days,
        engagementRate,
        avgEntriesPerUser,
        medianEntriesPerUser,
        retentionRate7d,
        retentionRate30d,
        topUsers,
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
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
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>
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
        <StatCard icon={Users}    label="Total Users"       value={s.totalUsers}    subtext="Unique users with entries or sessions" highlight />
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
