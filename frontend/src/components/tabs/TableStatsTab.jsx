import TableStatsTable from '../TableStatsTable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

function TableStatsTab({ metrics }) {
  // Prepare data for charts
  const topByRows = metrics.table_stats.slice(0, 10).map(table => ({
    name: table.table_name.length > 15 ? table.table_name.substring(0, 15) + '...' : table.table_name,
    'Rows': table.num_rows
  }));

  const topByBlocks = metrics.table_stats.slice(0, 10).map(table => ({
    name: table.table_name.length > 15 ? table.table_name.substring(0, 15) + '...' : table.table_name,
    'Blocks': table.blocks
  }));

  // Pie chart for tablespace distribution
  const tablespaceDistribution = {};
  metrics.table_stats.forEach(table => {
    const ts = table.tablespace || 'UNKNOWN';
    tablespaceDistribution[ts] = (tablespaceDistribution[ts] || 0) + 1;
  });
  const tablespaceData = Object.entries(tablespaceDistribution).map(([name, value]) => ({
    name,
    value
  }));

  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4', '#ef4444', '#f97316'];

  // Calculate statistics
  const totalRows = metrics.table_stats.reduce((sum, t) => sum + t.num_rows, 0);
  const totalBlocks = metrics.table_stats.reduce((sum, t) => sum + t.blocks, 0);
  const analyzedTables = metrics.table_stats.filter(t => t.last_analyzed).length;

  return (
    <div className="tab-grid">
      {/* Summary Cards */}
      <div className="dashboard-card">
        <h3>Total Tables</h3>
        <div className="metric-value-large">{metrics.table_stats.length}</div>
      </div>

      <div className="dashboard-card">
        <h3>Total Rows</h3>
        <div className="metric-value-large">{totalRows.toLocaleString()}</div>
      </div>

      <div className="dashboard-card">
        <h3>Total Blocks</h3>
        <div className="metric-value-large">{totalBlocks.toLocaleString()}</div>
      </div>

      <div className="dashboard-card">
        <h3>Analyzed Tables</h3>
        <div className="metric-value-large">{analyzedTables}</div>
        <div className="metric-label">{((analyzedTables / metrics.table_stats.length) * 100).toFixed(1)}% of total</div>
      </div>

      {/* Top Tables by Rows */}
      <div className="dashboard-card chart-card">
        <h2>Top Tables by Row Count</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={topByRows}
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
            <YAxis label={{ value: 'Number of Rows', angle: -90, position: 'left' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Rows" fill="#3b82f6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Top Tables by Blocks */}
      <div className="dashboard-card chart-card">
        <h2>Top Tables by Blocks</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={topByBlocks}
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
            <YAxis label={{ value: 'Blocks', angle: -90, position: 'left' }} />
            <Tooltip />
            <Legend />
            <Bar dataKey="Blocks" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tablespace Distribution */}
      <div className="dashboard-card full-width chart-card">
        <h2>Tables per Tablespace</h2>
        <ResponsiveContainer width="100%" height={400}>
          <PieChart>
            <Pie
              data={tablespaceData}
              cx="50%"
              cy="50%"
              labelLine={true}
              label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
              outerRadius={120}
              fill="#8884d8"
              dataKey="value"
            >
              {tablespaceData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>

      {/* Table Statistics Table */}
      <div className="dashboard-card full-width">
        <h2>Table Statistics ({metrics.table_stats.length})</h2>
        <TableStatsTable tables={metrics.table_stats} />
      </div>
    </div>
  );
}

export default TableStatsTab;
