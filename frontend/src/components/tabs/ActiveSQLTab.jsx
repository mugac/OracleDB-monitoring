import ActiveSQLTable from '../ActiveSQLTable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ScatterChart, Scatter, ZAxis } from 'recharts';

function ActiveSQLTab({ metrics, sqlLimit, setSqlLimit }) {
  // Prepare data for charts
  const topByCPU = metrics.active_sql.slice(0, 10).map(sql => ({
    name: sql.sql_id.substring(0, 10) + '...',
    'CPU (sec)': sql.cpu_sec,
    'Elapsed (sec)': sql.elapsed_sec
  }));

  const topByExecutions = metrics.active_sql.slice(0, 10).map(sql => ({
    name: sql.sql_id.substring(0, 10) + '...',
    'Executions': sql.executions
  }));

  // Scatter plot: CPU vs Executions (bubble size = elapsed time)
  const scatterData = metrics.active_sql.slice(0, 20).map(sql => ({
    x: sql.executions,
    y: sql.cpu_sec,
    z: sql.elapsed_sec,
    name: sql.sql_id.substring(0, 8)
  }));

  return (
    <div className="tab-grid">
      {/* CPU Time Chart */}
      <div className="dashboard-card chart-card">
        <h2>Top SQL by CPU Time</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={topByCPU}
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
            <YAxis label={{ value: 'Time (sec)', angle: -90, position: 'left' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="CPU (sec)" fill="#8b5cf6" />
            <Bar dataKey="Elapsed (sec)" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Executions Chart */}
      <div className="dashboard-card chart-card">
        <h2>Top SQL by Executions</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={topByExecutions}
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
            <YAxis label={{ value: 'Executions', angle: -90, position: 'left' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Executions" fill="#10b981" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* CPU vs Executions Scatter */}
      <div className="dashboard-card full-width chart-card">
        <h2>SQL Performance Analysis (CPU vs Executions)</h2>
        <ResponsiveContainer width="100%" height={400}>
          <ScatterChart margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis 
              type="number" 
              dataKey="x" 
              name="Executions" 
              label={{ value: 'Executions', position: 'bottom' }}
            />
            <YAxis 
              type="number" 
              dataKey="y" 
              name="CPU Time" 
              label={{ value: 'CPU (sec)', angle: -90, position: 'left' }}
            />
            <ZAxis type="number" dataKey="z" range={[50, 500]} name="Elapsed Time" />
            <Tooltip cursor={{ strokeDasharray: '3 3' }} />
            <Legend />
            <Scatter name="SQL Queries" data={scatterData} fill="#ec4899" />
          </ScatterChart>
        </ResponsiveContainer>
      </div>

      {/* Active SQL Table */}
      <div className="dashboard-card full-width">
        <div className="table-header-controls">
          <h2>Active SQL Commands ({metrics.active_sql.length})</h2>
          <div className="sql-limit-control">
            <label htmlFor="sql-limit">Rows to fetch:</label>
            <select 
              id="sql-limit" 
              value={sqlLimit} 
              onChange={(e) => setSqlLimit(Number(e.target.value))}
              className="sql-limit-dropdown"
            >
              <option value={10}>10</option>
              <option value={25}>25</option>
              <option value={50}>50</option>
              <option value={100}>100</option>
              <option value={200}>200</option>
              <option value={500}>500</option>
              <option value={999999}>ALL</option>
            </select>
          </div>
        </div>
        <ActiveSQLTable sqlData={metrics.active_sql} />
      </div>
    </div>
  );
}

export default ActiveSQLTab;
