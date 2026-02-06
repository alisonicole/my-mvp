import React, { useEffect, useState } from "react";
import { BarChart3, Users, FileText, Calendar, TrendingUp } from "lucide-react";

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalEntries: 0,
    totalSessions: 0,
    avgEntriesPerUser: 0,
    activeUsersLast7Days: 0,
    activeUsersLast30Days: 0,
    entriesLast7Days: 0,
    entriesLast30Days: 0,
    topUsers: [],
    loading: true
  });

  const Parse = typeof window !== 'undefined' ? window.Parse : null;

  useEffect(() => {
    if (!Parse) return;
    fetchStats();
  }, [Parse]);

  const fetchStats = async () => {
    try {
      const now = new Date();
      const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

      // Total users
      const userQuery = new Parse.Query(Parse.User);
      const totalUsers = await userQuery.count();

      // Total entries
      const entryQuery = new Parse.Query("Entry");
      const totalEntries = await entryQuery.count();

      // Total sessions
      const sessionQuery = new Parse.Query("Session");
      const totalSessions = await sessionQuery.count();

      // Active users last 7 days
      const activeUsers7Query = new Parse.Query(Parse.User);
      activeUsers7Query.greaterThan("updatedAt", sevenDaysAgo);
      const activeUsersLast7Days = await activeUsers7Query.count();

      // Active users last 30 days
      const activeUsers30Query = new Parse.Query(Parse.User);
      activeUsers30Query.greaterThan("updatedAt", thirtyDaysAgo);
      const activeUsersLast30Days = await activeUsers30Query.count();

      // Entries last 7 days
      const entries7Query = new Parse.Query("Entry");
      entries7Query.greaterThan("createdAt", sevenDaysAgo);
      const entriesLast7Days = await entries7Query.count();

      // Entries last 30 days
      const entries30Query = new Parse.Query("Entry");
      entries30Query.greaterThan("createdAt", thirtyDaysAgo);
      const entriesLast30Days = await entries30Query.count();

      // Average entries per user
      const avgEntriesPerUser = totalUsers > 0 ? (totalEntries / totalUsers).toFixed(1) : 0;

      // Top users by entry count (requires aggregation pipeline)
      const topUsersQuery = new Parse.Query("Entry");
      topUsersQuery.include("user");
      topUsersQuery.limit(1000); // Get recent entries
      const allEntries = await topUsersQuery.find();
      
      // Count entries per user
      const userEntryCount = {};
      allEntries.forEach(entry => {
        const userId = entry.get("user")?.id;
        const userEmail = entry.get("user")?.get("username");
        if (userId) {
          if (!userEntryCount[userId]) {
            userEntryCount[userId] = { email: userEmail, count: 0 };
          }
          userEntryCount[userId].count++;
        }
      });

      // Sort and get top 10
      const topUsers = Object.entries(userEntryCount)
        .map(([id, data]) => ({ id, email: data.email, count: data.count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10);

      setStats({
        totalUsers,
        totalEntries,
        totalSessions,
        avgEntriesPerUser,
        activeUsersLast7Days,
        activeUsersLast30Days,
        entriesLast7Days,
        entriesLast30Days,
        topUsers,
        loading: false
      });
    } catch (error) {
      console.error("Failed to fetch stats:", error);
      setStats(prev => ({ ...prev, loading: false }));
    }
  };

  if (stats.loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>
        <div className="animate-spin" style={{ width: '48px', height: '48px', border: '4px solid #e9d5ff', borderTopColor: '#9333ea', borderRadius: '50%', margin: '0 auto' }}></div>
        <p style={{ marginTop: '16px', color: '#7c3aed' }}>Loading analytics...</p>
      </div>
    );
  }

  const StatCard = ({ icon: Icon, label, value, subtext }) => (
    <div style={{ 
      background: 'rgba(255,255,255,0.9)', 
      border: '1px solid #e9d5ff', 
      borderRadius: '16px', 
      padding: '24px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '12px' }}>
        <Icon size={24} style={{ color: '#9333ea' }} />
        <h3 style={{ fontSize: '14px', fontWeight: '500', color: '#6b7280', margin: 0 }}>{label}</h3>
      </div>
      <p style={{ fontSize: '36px', fontWeight: '600', color: '#581c87', margin: '0 0 4px 0' }}>{value}</p>
      {subtext && <p style={{ fontSize: '12px', color: '#9ca3af', margin: 0 }}>{subtext}</p>}
    </div>
  );

  return (
    <div style={{ maxWidth: '1400px', margin: '0 auto', padding: '32px' }}>
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ fontSize: '32px', fontWeight: '300', color: '#581c87', marginBottom: '8px' }}>Between Analytics</h1>
        <p style={{ color: '#7c3aed', fontSize: '16px' }}>Track your app's key metrics and user engagement</p>
      </div>

      {/* Overview Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <StatCard 
          icon={Users} 
          label="Total Users" 
          value={stats.totalUsers}
          subtext={`${stats.activeUsersLast7Days} active in last 7 days`}
        />
        <StatCard 
          icon={FileText} 
          label="Total Journal Entries" 
          value={stats.totalEntries}
          subtext={`${stats.entriesLast7Days} created in last 7 days`}
        />
        <StatCard 
          icon={Calendar} 
          label="Total Sessions" 
          value={stats.totalSessions}
        />
        <StatCard 
          icon={TrendingUp} 
          label="Avg Entries/User" 
          value={stats.avgEntriesPerUser}
        />
      </div>

      {/* Activity Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '16px', marginBottom: '32px' }}>
        <div style={{ 
          background: 'rgba(255,255,255,0.9)', 
          border: '1px solid #e9d5ff', 
          borderRadius: '16px', 
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#581c87', marginBottom: '16px' }}>7-Day Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>Active Users</p>
              <p style={{ fontSize: '24px', fontWeight: '600', color: '#581c87', margin: 0 }}>{stats.activeUsersLast7Days}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>New Entries</p>
              <p style={{ fontSize: '24px', fontWeight: '600', color: '#581c87', margin: 0 }}>{stats.entriesLast7Days}</p>
            </div>
          </div>
        </div>

        <div style={{ 
          background: 'rgba(255,255,255,0.9)', 
          border: '1px solid #e9d5ff', 
          borderRadius: '16px', 
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
        }}>
          <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#581c87', marginBottom: '16px' }}>30-Day Activity</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>Active Users</p>
              <p style={{ fontSize: '24px', fontWeight: '600', color: '#581c87', margin: 0 }}>{stats.activeUsersLast30Days}</p>
            </div>
            <div>
              <p style={{ fontSize: '12px', color: '#6b7280', margin: '0 0 4px 0' }}>New Entries</p>
              <p style={{ fontSize: '24px', fontWeight: '600', color: '#581c87', margin: 0 }}>{stats.entriesLast30Days}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Top Users */}
      <div style={{ 
        background: 'rgba(255,255,255,0.9)', 
        border: '1px solid #e9d5ff', 
        borderRadius: '16px', 
        padding: '24px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
      }}>
        <h3 style={{ fontSize: '18px', fontWeight: '500', color: '#581c87', marginBottom: '16px' }}>Top Users by Entries</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e9d5ff' }}>
                <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Rank</th>
                <th style={{ textAlign: 'left', padding: '12px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Email</th>
                <th style={{ textAlign: 'right', padding: '12px', fontSize: '12px', fontWeight: '500', color: '#6b7280' }}>Entries</th>
              </tr>
            </thead>
            <tbody>
              {stats.topUsers.map((user, index) => (
                <tr key={user.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                  <td style={{ padding: '12px', color: '#581c87' }}>{index + 1}</td>
                  <td style={{ padding: '12px', color: '#581c87' }}>{user.email || 'Unknown'}</td>
                  <td style={{ padding: '12px', textAlign: 'right', fontWeight: '600', color: '#9333ea' }}>{user.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        onClick={fetchStats}
        style={{
          marginTop: '24px',
          padding: '12px 24px',
          borderRadius: '12px',
          border: 'none',
          background: '#9333ea',
          color: 'white',
          fontWeight: '500',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
      >
        <BarChart3 size={20} />
        Refresh Stats
      </button>
    </div>
  );
}