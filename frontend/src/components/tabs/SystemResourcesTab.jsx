import { useState, useEffect } from 'react';
import axios from 'axios';

const SystemResourcesTab = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/system-resources');
      setData(response.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching system resources:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000); // Refresh every 5 seconds
    return () => clearInterval(interval);
  }, []);

  if (loading) {
    return <div className="loading">Loading system resources...</div>;
  }

  if (error) {
    return <div className="error">Error: {error}</div>;
  }

  if (!data) {
    return <div className="error">No data available</div>;
  }

  const { cpu, memory, io, load } = data;

  // Helper function to get status color based on percentage
  const getStatusColor = (value, warning = 70, critical = 90) => {
    if (value >= critical) return '#ef4444'; // red
    if (value >= warning) return '#f59e0b'; // orange
    return '#10b981'; // green
  };

  // Helper function to format large numbers
  const formatNumber = (num) => {
    if (num >= 1000000) return (num / 1000000).toFixed(2) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(2) + 'K';
    return num.toFixed(2);
  };

  return (
    <div className="system-resources-tab">
      <div className="section-header">
        <h2>System Resources</h2>
        <p className="subtitle">Real-time performance monitoring and resource utilization metrics</p>
      </div>

      {/* CPU Section */}
      <div className="resource-section">
        <div className="section-title">
          <h3>CPU Performance</h3>
          <span className="section-badge">Live</span>
        </div>

        {/* CPU Overview Cards */}
        <div className="metrics-grid-clean">
          <div className="metric-card-clean primary-metric">
            <div className="metric-label-top">Host CPU Utilization</div>
            <div className="metric-value-large" style={{ color: getStatusColor(cpu.host_cpu_utilization_pct || 0) }}>
              {cpu.host_cpu_utilization_pct || 0}<span className="unit">%</span>
            </div>
            <div className="progress-bar-clean">
              <div 
                className="progress-fill-clean" 
                style={{ 
                  width: `${cpu.host_cpu_utilization_pct || 0}%`,
                  backgroundColor: getStatusColor(cpu.host_cpu_utilization_pct || 0)
                }}
              ></div>
            </div>
            <div className="metric-sublabel">Current system CPU usage</div>
          </div>

          <div className="metric-card-clean">
            <div className="metric-label-top">CPU Cores</div>
            <div className="metric-value-clean">{cpu.num_cpu_cores || cpu.num_cpus || 'N/A'}</div>
            <div className="metric-sublabel">Available processing units</div>
          </div>

          {load.load_average !== undefined && (
            <div className="metric-card-clean">
              <div className="metric-label-top">Load Average</div>
              <div className="metric-value-clean">{load.load_average.toFixed(2)}</div>
              <div className="metric-sublabel">System load</div>
            </div>
          )}

          {cpu.db_cpu_time_ratio !== undefined && (
            <div className="metric-card-clean">
              <div className="metric-label-top">DB CPU Efficiency</div>
              <div className="metric-value-clean">{cpu.db_cpu_time_ratio}<span className="unit">%</span></div>
              <div className="metric-sublabel">Database CPU time ratio</div>
            </div>
          )}
        </div>

        {/* CPU Time Chart */}
        {cpu.db_cpu_time_sec !== undefined && (
          <div className="chart-section">
            <div className="chart-header">
              <h4>CPU Time Distribution</h4>
              <span className="chart-info">Cumulative values</span>
            </div>
            <div className="horizontal-chart">
              <div className="chart-row">
                <div className="chart-row-label">DB CPU Time</div>
                <div className="chart-row-bar">
                  <div 
                    className="chart-bar-segment cpu-bar" 
                    style={{ width: `${(cpu.db_cpu_time_sec / Math.max(cpu.db_time_sec, 1)) * 100}%` }}
                  >
                    <span className="bar-label">{formatNumber(cpu.db_cpu_time_sec)} sec</span>
                  </div>
                </div>
              </div>
              <div className="chart-row">
                <div className="chart-row-label">Background CPU</div>
                <div className="chart-row-bar">
                  <div 
                    className="chart-bar-segment bg-cpu-bar" 
                    style={{ width: `${(cpu.background_cpu_time_sec / Math.max(cpu.db_time_sec, 1)) * 100}%` }}
                  >
                    <span className="bar-label">{formatNumber(cpu.background_cpu_time_sec || 0)} sec</span>
                  </div>
                </div>
              </div>
              <div className="chart-row">
                <div className="chart-row-label">Total DB Time</div>
                <div className="chart-row-bar">
                  <div className="chart-bar-segment total-time-bar" style={{ width: '100%' }}>
                    <span className="bar-label">{formatNumber(cpu.db_time_sec)} sec</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Memory Section */}
      <div className="resource-section">
        <div className="section-title">
          <h3>Memory Allocation</h3>
          <span className="section-badge">Live</span>
        </div>

        <div className="metrics-grid-clean">
          {memory.physical_memory_gb !== undefined && (
            <div className="metric-card-clean primary-metric">
              <div className="metric-label-top">Physical Memory</div>
              <div className="metric-value-large">{memory.physical_memory_gb}<span className="unit">GB</span></div>
              <div className="metric-sublabel">Total RAM available</div>
            </div>
          )}

          {memory.total_sga_mb !== undefined && (
            <div className="metric-card-clean">
              <div className="metric-label-top">Total SGA</div>
              <div className="metric-value-clean">{memory.total_sga_mb}<span className="unit">MB</span></div>
              <div className="metric-sublabel">System Global Area</div>
            </div>
          )}

          {memory.pga_allocated_mb !== undefined && (
            <div className="metric-card-clean">
              <div className="metric-label-top">PGA Allocated</div>
              <div className="metric-value-clean">{memory.pga_allocated_mb}<span className="unit">MB</span></div>
              <div className="metric-sublabel">In use: {memory.pga_inuse_mb || 0} MB</div>
            </div>
          )}

          {memory.pga_max_allocated_mb !== undefined && (
            <div className="metric-card-clean">
              <div className="metric-label-top">PGA Maximum</div>
              <div className="metric-value-clean">{memory.pga_max_allocated_mb}<span className="unit">MB</span></div>
              <div className="metric-sublabel">Peak allocation</div>
            </div>
          )}
        </div>

        {/* Memory Allocation Chart */}
        {memory.sga_pools && memory.sga_pools.length > 0 && (
          <div className="chart-section">
            <div className="chart-header">
              <h4>SGA Memory Pool Distribution</h4>
              <span className="chart-info">Total: {memory.total_sga_mb} MB</span>
            </div>
            <div className="horizontal-chart">
              {memory.sga_pools.map((pool, idx) => {
                const percentage = (pool.size_mb / memory.total_sga_mb) * 100;
                return (
                  <div key={idx} className="chart-row">
                    <div className="chart-row-label">{pool.pool}</div>
                    <div className="chart-row-bar">
                      <div 
                        className="chart-bar-segment memory-bar"
                        style={{ width: `${percentage}%` }}
                      >
                        <span className="bar-label">{pool.size_mb.toFixed(0)} MB ({percentage.toFixed(1)}%)</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* I/O Section */}
      <div className="resource-section">
        <div className="section-title">
          <h3>I/O Performance</h3>
          <span className="section-badge">Live</span>
        </div>

        <div className="metrics-grid-clean">
          <div className="metric-card-clean primary-metric">
            <div className="metric-label-top">I/O Throughput</div>
            <div className="metric-value-large">{io.io_mb_per_sec || 0}<span className="unit">MB/s</span></div>
            <div className="metric-sublabel">Total bandwidth</div>
          </div>

          <div className="metric-card-clean">
            <div className="metric-label-top">I/O Operations</div>
            <div className="metric-value-clean">{formatNumber(io.io_requests_per_sec || 0)}<span className="unit">/s</span></div>
            <div className="metric-sublabel">IOPS</div>
          </div>

          <div className="metric-card-clean">
            <div className="metric-label-top">Physical Reads</div>
            <div className="metric-value-clean">{formatNumber(io.physical_reads_per_sec || 0)}<span className="unit">/s</span></div>
            <div className="metric-sublabel">{formatNumber(io.read_bytes_per_sec || 0)} bytes/s</div>
          </div>

          <div className="metric-card-clean">
            <div className="metric-label-top">Physical Writes</div>
            <div className="metric-value-clean">{formatNumber(io.physical_writes_per_sec || 0)}<span className="unit">/s</span></div>
            <div className="metric-sublabel">{formatNumber(io.write_bytes_per_sec || 0)} bytes/s</div>
          </div>
        </div>

        {/* I/O Chart */}
        <div className="chart-section">
          <div className="chart-header">
            <h4>I/O Operations Breakdown</h4>
            <span className="chart-info">Read vs Write distribution</span>
          </div>
          <div className="horizontal-chart">
            <div className="chart-row">
              <div className="chart-row-label">Reads per Second</div>
              <div className="chart-row-bar">
                <div 
                  className="chart-bar-segment reads-bar"
                  style={{ 
                    width: `${Math.min((io.physical_reads_per_sec / Math.max(io.physical_reads_per_sec + io.physical_writes_per_sec, 1)) * 100, 100)}%` 
                  }}
                >
                  <span className="bar-label">{formatNumber(io.physical_reads_per_sec || 0)}</span>
                </div>
              </div>
            </div>
            <div className="chart-row">
              <div className="chart-row-label">Writes per Second</div>
              <div className="chart-row-bar">
                <div 
                  className="chart-bar-segment writes-bar"
                  style={{ 
                    width: `${Math.min((io.physical_writes_per_sec / Math.max(io.physical_reads_per_sec + io.physical_writes_per_sec, 1)) * 100, 100)}%` 
                  }}
                >
                  <span className="bar-label">{formatNumber(io.physical_writes_per_sec || 0)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Timestamp */}
      <div className="update-info">
        <span className="update-label">Last updated:</span>
        <span className="update-time">{new Date(data.timestamp).toLocaleString()}</span>
      </div>
    </div>
  );
};

export default SystemResourcesTab;
