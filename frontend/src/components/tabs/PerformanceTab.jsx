import { useState, useEffect } from 'react';
import SystemEventsTable from '../SystemEventsTable';
import LongRunningSQLTable from '../LongRunningSQLTable';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

function PerformanceTab({ metrics }) {
  const [systemResources, setSystemResources] = useState(null);

  useEffect(() => {
    const fetchSystemResources = async () => {
      try {
        const response = await fetch(`${API_URL}/api/system-resources`);
        const data = await response.json();
        setSystemResources(data);
      } catch (error) {
        console.error('Error fetching system resources:', error);
      }
    };

    fetchSystemResources();
    const interval = setInterval(fetchSystemResources, 5000);
    return () => clearInterval(interval);
  }, []);

  // Prepare data for system events chart
  const systemEventsData = metrics.system_events.slice(0, 8).map(event => ({
    name: event.event.substring(0, 25),
    'Time (ms)': parseFloat((event.time_waited * 10).toFixed(2)),
    'Avg (ms)': parseFloat((event.avg_wait * 10).toFixed(2))
  }));

  return (
    <div className="tab-grid">
      {/* CPU Performance Section */}
      <div className="dashboard-card full-width" style={{ borderLeft: '4px solid #ff6b35' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>CPU PERFORMANCE</h2>
          <span style={{ 
            backgroundColor: '#000', 
            color: '#fff', 
            padding: '4px 12px', 
            borderRadius: '4px',
            fontSize: '0.75em',
            fontWeight: 'bold'
          }}>LIVE</span>
        </div>
        {systemResources?.cpu ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75em', color: '#666', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
                  HOST CPU UTILIZATION
                </div>
                <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#2c3e50' }}>
                  {(systemResources.cpu.host_cpu_utilization_pct || systemResources.cpu.utilization_pct || 0).toFixed(0)}
                  <span style={{ fontSize: '0.4em' }}>%</span>
                </div>
                <div style={{ fontSize: '0.85em', color: '#999', marginTop: '4px' }}>Current system CPU usage</div>
              </div>
              
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75em', color: '#666', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
                  CPU CORES
                </div>
                <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#2c3e50' }}>
                  {systemResources.cpu.num_cpu_cores || systemResources.cpu.num_cpus}
                </div>
                <div style={{ fontSize: '0.85em', color: '#999', marginTop: '4px' }}>Available processing units</div>
              </div>
              
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75em', color: '#666', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
                  LOAD AVERAGE
                </div>
                <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#2c3e50' }}>
                  {systemResources.load?.load_average?.toFixed(2) || '0.00'}
                </div>
                <div style={{ fontSize: '0.85em', color: '#999', marginTop: '4px' }}>System load</div>
              </div>
              
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75em', color: '#666', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
                  DB CPU EFFICIENCY
                </div>
                <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#2c3e50' }}>
                  {systemResources.cpu.db_cpu_time_ratio?.toFixed(0) || '0'}
                  <span style={{ fontSize: '0.4em' }}>%</span>
                </div>
                <div style={{ fontSize: '0.85em', color: '#999', marginTop: '4px' }}>Database CPU time ratio</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75em', color: '#666', textTransform: 'uppercase', marginBottom: '15px', fontWeight: '600' }}>
                CPU TIME DISTRIBUTION
                <span style={{ float: 'right', fontWeight: 'normal', textTransform: 'none' }}>Cumulative values</span>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ width: '150px', fontSize: '0.9em' }}>DB CPU Time</span>
                  <div style={{ 
                    flex: 1, 
                    height: '40px', 
                    backgroundColor: '#e9ecef', 
                    borderRadius: '4px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      width: `${Math.min((systemResources.cpu.db_cpu_time_sec / (systemResources.cpu.db_time_sec || 1)) * 100, 100)}%`,
                      height: '100%', 
                      backgroundColor: '#ff6b35',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '10px',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '0.9em',
                      transition: 'width 0.3s ease'
                    }}>
                      {systemResources.cpu.db_cpu_time_sec?.toFixed(2) || '0.00'} sec
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ width: '150px', fontSize: '0.9em' }}>Background CPU</span>
                  <div style={{ 
                    flex: 1, 
                    height: '40px', 
                    backgroundColor: '#e9ecef', 
                    borderRadius: '4px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      width: `${Math.min((systemResources.cpu.background_cpu_time_sec / (systemResources.cpu.db_time_sec || 1)) * 100, 100)}%`,
                      height: '100%', 
                      backgroundColor: '#8b5cf6',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '10px',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '0.9em',
                      transition: 'width 0.3s ease'
                    }}>
                      {systemResources.cpu.background_cpu_time_sec?.toFixed(2) || '0.00'} sec
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ width: '150px', fontSize: '0.9em' }}>Total DB Time</span>
                  <div style={{ 
                    flex: 1, 
                    height: '40px', 
                    backgroundColor: '#e9ecef', 
                    borderRadius: '4px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      width: '100%',
                      height: '100%', 
                      backgroundColor: '#17a2b8',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '10px',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '0.9em',
                      transition: 'width 0.3s ease'
                    }}>
                      {systemResources.cpu.db_time_sec?.toFixed(2) || '0.00'} sec
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p>Loading CPU metrics...</p>
        )}
      </div>

      {/* Memory Allocation Section */}
      <div className="dashboard-card full-width" style={{ borderLeft: '4px solid #ff6b35' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>MEMORY ALLOCATION</h2>
          <span style={{ 
            backgroundColor: '#000', 
            color: '#fff', 
            padding: '4px 12px', 
            borderRadius: '4px',
            fontSize: '0.75em',
            fontWeight: 'bold'
          }}>LIVE</span>
        </div>
        {systemResources?.memory ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75em', color: '#666', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
                  PHYSICAL MEMORY
                </div>
                <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#2c3e50' }}>
                  {systemResources.memory.physical_memory_gb?.toFixed(0) || '0'}
                  <span style={{ fontSize: '0.4em' }}>GB</span>
                </div>
                <div style={{ fontSize: '0.85em', color: '#999', marginTop: '4px' }}>Total RAM available</div>
              </div>
              
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75em', color: '#666', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
                  TOTAL SGA
                </div>
                <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#2c3e50' }}>
                  {systemResources.memory.total_sga_mb?.toFixed(1) || '0.0'}
                  <span style={{ fontSize: '0.4em' }}>MB</span>
                </div>
                <div style={{ fontSize: '0.85em', color: '#999', marginTop: '4px' }}>System Global Area</div>
              </div>
              
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75em', color: '#666', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
                  PGA ALLOCATED
                </div>
                <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#2c3e50' }}>
                  {systemResources.memory.pga_allocated_mb?.toFixed(2) || '0.00'}
                  <span style={{ fontSize: '0.4em' }}>MB</span>
                </div>
                <div style={{ fontSize: '0.85em', color: '#999', marginTop: '4px' }}>In use: {systemResources.memory.pga_inuse_mb?.toFixed(2) || '0.00'} MB</div>
              </div>
              
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75em', color: '#666', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
                  PGA MAXIMUM
                </div>
                <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#2c3e50' }}>
                  {systemResources.memory.pga_max_allocated_mb?.toFixed(2) || '0.00'}
                  <span style={{ fontSize: '0.4em' }}>MB</span>
                </div>
                <div style={{ fontSize: '0.85em', color: '#999', marginTop: '4px' }}>Peak allocation</div>
              </div>
            </div>

            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75em', color: '#666', textTransform: 'uppercase', marginBottom: '15px', fontWeight: '600' }}>
                SGA MEMORY POOL DISTRIBUTION
                <span style={{ float: 'right', fontWeight: 'normal', textTransform: 'none' }}>
                  Total: {systemResources.memory.total_sga_mb?.toFixed(1) || '0.0'} MB
                </span>
              </div>
              
              {systemResources.memory.sga_pools?.map((pool, idx) => {
                const colors = ['#10b981', '#3b82f6'];
                const percentage = ((pool.size_mb / systemResources.memory.total_sga_mb) * 100).toFixed(1);
                return (
                  <div key={idx} style={{ marginBottom: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                      <span style={{ width: '150px', fontSize: '0.9em' }}>{pool.pool}</span>
                      <div style={{ 
                        flex: 1, 
                        height: '40px', 
                        backgroundColor: '#e9ecef', 
                        borderRadius: '4px',
                        overflow: 'hidden',
                        position: 'relative'
                      }}>
                        <div style={{ 
                          width: `${percentage}%`,
                          height: '100%', 
                          backgroundColor: colors[idx % colors.length],
                          display: 'flex',
                          alignItems: 'center',
                          paddingLeft: '10px',
                          color: '#fff',
                          fontWeight: 'bold',
                          fontSize: '0.9em',
                          transition: 'width 0.3s ease'
                        }}>
                          {pool.size_mb.toFixed(0)} MB ({percentage}%)
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p>Loading memory metrics...</p>
        )}
      </div>

      {/* I/O Performance Section */}
      <div className="dashboard-card full-width" style={{ borderLeft: '4px solid #ff6b35' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2>I/O PERFORMANCE</h2>
          <span style={{ 
            backgroundColor: '#000', 
            color: '#fff', 
            padding: '4px 12px', 
            borderRadius: '4px',
            fontSize: '0.75em',
            fontWeight: 'bold'
          }}>LIVE</span>
        </div>
        {systemResources?.io ? (
          <>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75em', color: '#666', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
                  I/O THROUGHPUT
                </div>
                <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#2c3e50' }}>
                  {systemResources.io.io_mb_per_sec?.toFixed(0) || '0'}
                  <span style={{ fontSize: '0.4em' }}>MB/s</span>
                </div>
                <div style={{ fontSize: '0.85em', color: '#999', marginTop: '4px' }}>Total bandwidth</div>
              </div>
              
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75em', color: '#666', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
                  I/O OPERATIONS
                </div>
                <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#2c3e50' }}>
                  {systemResources.io.io_requests_per_sec?.toFixed(2) || '0.00'}
                  <span style={{ fontSize: '0.4em' }}>/s</span>
                </div>
                <div style={{ fontSize: '0.85em', color: '#999', marginTop: '4px' }}>IOPS</div>
              </div>
              
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75em', color: '#666', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
                  PHYSICAL READS
                </div>
                <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#2c3e50' }}>
                  {systemResources.io.physical_reads_per_sec?.toFixed(2) || '0.00'}
                  <span style={{ fontSize: '0.4em' }}>/s</span>
                </div>
                <div style={{ fontSize: '0.85em', color: '#999', marginTop: '4px' }}>
                  {(systemResources.io.read_bytes_per_sec / 1024).toFixed(2)} bytes/s
                </div>
              </div>
              
              <div style={{ padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                <div style={{ fontSize: '0.75em', color: '#666', textTransform: 'uppercase', marginBottom: '8px', fontWeight: '600' }}>
                  PHYSICAL WRITES
                </div>
                <div style={{ fontSize: '2.5em', fontWeight: 'bold', color: '#2c3e50' }}>
                  {systemResources.io.physical_writes_per_sec?.toFixed(2) || '0.00'}
                  <span style={{ fontSize: '0.4em' }}>/s</span>
                </div>
                <div style={{ fontSize: '0.85em', color: '#999', marginTop: '4px' }}>
                  {(systemResources.io.write_bytes_per_sec / 1024).toFixed(2)} bytes/s
                </div>
              </div>
            </div>

            <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px' }}>
              <div style={{ fontSize: '0.75em', color: '#666', textTransform: 'uppercase', marginBottom: '15px', fontWeight: '600' }}>
                I/O OPERATIONS BREAKDOWN
                <span style={{ float: 'right', fontWeight: 'normal', textTransform: 'none' }}>Read vs Write distribution</span>
              </div>
              
              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ width: '150px', fontSize: '0.9em' }}>Reads per Second</span>
                  <div style={{ 
                    flex: 1, 
                    height: '40px', 
                    backgroundColor: '#e9ecef', 
                    borderRadius: '4px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      width: `${Math.min((systemResources.io.physical_reads_per_sec / Math.max(systemResources.io.physical_reads_per_sec, systemResources.io.physical_writes_per_sec, 1)) * 100, 100)}%`,
                      height: '100%', 
                      backgroundColor: '#3b82f6',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '10px',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '0.9em',
                      transition: 'width 0.3s ease'
                    }}>
                      {systemResources.io.physical_reads_per_sec?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '12px' }}>
                <div style={{ display: 'flex', alignItems: 'center', marginBottom: '8px' }}>
                  <span style={{ width: '150px', fontSize: '0.9em' }}>Writes per Second</span>
                  <div style={{ 
                    flex: 1, 
                    height: '40px', 
                    backgroundColor: '#e9ecef', 
                    borderRadius: '4px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{ 
                      width: `${Math.min((systemResources.io.physical_writes_per_sec / Math.max(systemResources.io.physical_reads_per_sec, systemResources.io.physical_writes_per_sec, 1)) * 100, 100)}%`,
                      height: '100%', 
                      backgroundColor: '#ec4899',
                      display: 'flex',
                      alignItems: 'center',
                      paddingLeft: '10px',
                      color: '#fff',
                      fontWeight: 'bold',
                      fontSize: '0.9em',
                      transition: 'width 0.3s ease'
                    }}>
                      {systemResources.io.physical_writes_per_sec?.toFixed(2) || '0.00'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </>
        ) : (
          <p>Loading I/O metrics...</p>
        )}
      </div>

      {/* System Events Chart */}
      <div className="dashboard-card full-width chart-card">
        <h2>System-Wide Wait Events</h2>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart
            data={systemEventsData}
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
            <Bar dataKey="Time (ms)" fill="#3b82f6" />
            <Bar dataKey="Avg (ms)" fill="#8b5cf6" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* System Events Table */}
      <div className="dashboard-card full-width">
        <h2>System Events Details</h2>
        <SystemEventsTable events={metrics.system_events} />
      </div>

      {/* Long Running SQL */}
      {metrics.long_running_sql && metrics.long_running_sql.length > 0 && (
        <div className="dashboard-card full-width">
          <h2>Long Running Queries</h2>
          <LongRunningSQLTable sqlData={metrics.long_running_sql} />
        </div>
      )}
    </div>
  );
}

export default PerformanceTab;
