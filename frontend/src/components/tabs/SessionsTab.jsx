import UserSessionsTable from '../UserSessionsTable';
import SessionDetailsTable from '../SessionDetailsTable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function SessionsTab({ metrics }) {
  // Prepare data for user sessions chart
  const userSessionsData = metrics.user_sessions.slice(0, 10).map(user => ({
    name: user.username,
    'Sessions': user.session_count,
    'Active': user.active_count,
    'CPU (sec)': user.cpu_sec
  }));

  // Prepare pie chart for sessions by user
  const sessionsByUser = metrics.user_sessions.slice(0, 8).map(user => ({
    name: user.username,
    value: user.session_count
  }));

  // Prepare resource usage data
  const resourceUsageData = metrics.user_sessions.slice(0, 10).map(user => ({
    name: user.username,
    'Physical Reads': user.physical_reads,
    'Block Gets': user.block_gets / 1000, // Scale down for better visibility
  }));

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#f97316'];

  // Active sessions list - deduplicate by SID
  const activeSessionsRaw = metrics.session_details.filter(s => s.status === 'ACTIVE');
  const activeSessionsMap = new Map();
  activeSessionsRaw.forEach(session => {
    if (!activeSessionsMap.has(session.sid)) {
      activeSessionsMap.set(session.sid, session);
    }
  });
  const activeSessions = Array.from(activeSessionsMap.values());

  return (
    <div className="tab-grid">
      {/* Sessions by User Chart */}
      <div className="dashboard-card chart-card">
        <h2>Sessions by User</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={userSessionsData}
            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={100}
              interval={0}
            />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="Sessions" fill="#3b82f6" />
            <Bar dataKey="Active" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Session Distribution Pie */}
      <div className="dashboard-card chart-card">
        <h2>Session Distribution</h2>
        <ResponsiveContainer width="100%" height={350}>
          <PieChart>
            <Pie
              data={sessionsByUser}
              cx="50%"
              cy="50%"
              labelLine={false}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={100}
              fill="#8884d8"
              dataKey="value"
            >
              {sessionsByUser.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Active Sessions List */}
      <div className="dashboard-card chart-card">
        <h2>Active Sessions ({activeSessions.length})</h2>
        <div className="active-sessions-list">
          {activeSessions.length > 0 ? (
            activeSessions.map((session, index) => (
              <div key={index} className="active-session-item">
                <span className="session-username">{session.username}</span>
                <span className="session-sid">SID: {session.sid}</span>
              </div>
            ))
          ) : (
            <p className="no-data">No active sessions</p>
          )}
        </div>
      </div>

      {/* CPU Usage by User */}
      <div className="dashboard-card full-width chart-card">
        <h2>CPU Usage by User (seconds)</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={userSessionsData}
            margin={{ top: 20, right: 30, left: 80, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={100}
              interval={0}
            />
            <YAxis label={{ value: 'CPU (sec)', angle: -90, position: 'left', style: { textAnchor: 'middle' } }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="CPU (sec)" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Resource Usage Chart */}
      <div className="dashboard-card full-width chart-card">
        <h2>I/O Resource Usage by User</h2>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={resourceUsageData}
            margin={{ top: 20, right: 30, left: 80, bottom: 80 }}
          >
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              dataKey="name" 
              angle={-45} 
              textAnchor="end" 
              height={100}
              interval={0}
            />
            <YAxis label={{ value: 'Operations', angle: -90, position: 'left', style: { textAnchor: 'middle' } }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Physical Reads" fill="#ec4899" />
            <Bar dataKey="Block Gets" fill="#f59e0b" name="Block Gets (K)" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* User Sessions Summary Table */}
      <div className="dashboard-card full-width">
        <h2>User Sessions Summary</h2>
        <UserSessionsTable users={metrics.user_sessions} />
      </div>

      {/* Detailed Session List */}
      <div className="dashboard-card full-width">
        <h2>Active Session Details</h2>
        <SessionDetailsTable sessions={metrics.session_details} />
      </div>
    </div>
  );
}

export default SessionsTab;
