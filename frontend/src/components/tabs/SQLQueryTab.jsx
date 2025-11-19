import { useState } from 'react';
import axios from 'axios';

function SQLQueryTab() {
  const [query, setQuery] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const executeQuery = async () => {
    if (!query.trim()) {
      setError('Please enter a SQL query');
      return;
    }

    setLoading(true);
    setError(null);
    setResult(null);

    try {
      const response = await axios.post('/api/execute-query', { query });
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    // Ctrl+Enter nebo Cmd+Enter pro spuštění
    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
      e.preventDefault();
      executeQuery();
    }
  };

  const loadExample = (exampleQuery) => {
    setQuery(exampleQuery);
    setResult(null);
    setError(null);
  };

  const examples = [
    { 
      name: 'Zobrazení všech aktivních relací', 
      query: `SELECT 
    sid,
    serial#,
    username,
    status,
    program,
    machine,
    sql_id,
    last_call_et,
    logon_time
FROM v$session
WHERE status = 'ACTIVE'
  AND username IS NOT NULL
ORDER BY last_call_et DESC` 
    },
    { 
      name: 'Celková statistika instance', 
      query: `SELECT 
    name,
    value
FROM v$sysstat
WHERE name IN (
    'user commits',
    'user rollbacks',
    'physical reads',
    'physical writes',
    'db block gets',
    'consistent gets',
    'redo size'
)
ORDER BY name` 
    },
    { 
      name: 'Top událostí čekání', 
      query: `SELECT 
    event,
    total_waits,
    total_timeouts,
    time_waited,
    average_wait
FROM v$system_event
WHERE wait_class != 'Idle'
ORDER BY time_waited DESC
FETCH FIRST 10 ROWS ONLY` 
    },
    { 
      name: 'Top SQL podle elapsed time', 
      query: `SELECT 
    sql_id,
    --sql_text,
    executions,
    elapsed_time / 1000000 as elapsed_sec,
    cpu_time / 1000000 as cpu_sec,
    buffer_gets,
    disk_reads,
    rows_processed
FROM v$sql
WHERE executions > 0
ORDER BY elapsed_time DESC
FETCH FIRST 10 ROWS ONLY` 
    },
    { 
      name: 'Komponenty SGA', 
      query: `SELECT 
    name,
    ROUND(bytes/1024/1024, 2) as size_mb
FROM v$sgastat
WHERE name IN (
    'buffer_cache',
    'shared_pool',
    'large_pool',
    'java_pool',
    'log_buffer'
)` 
    },
    { 
      name: 'Využití tablespace', 
      query: `SELECT 
    df.tablespace_name,
    ROUND(df.total_space / 1024 / 1024, 2) as total_mb,
    ROUND((df.total_space - fs.free_space) / 1024 / 1024, 2) as used_mb,
    ROUND(fs.free_space / 1024 / 1024, 2) as free_mb,
    ROUND(((df.total_space - fs.free_space) / df.total_space) * 100, 2) as pct_used
FROM 
    (SELECT tablespace_name, SUM(bytes) as total_space
     FROM dba_data_files
     GROUP BY tablespace_name) df,
    (SELECT tablespace_name, SUM(bytes) as free_space
     FROM dba_free_space
     GROUP BY tablespace_name) fs
WHERE df.tablespace_name = fs.tablespace_name
ORDER BY pct_used DESC` 
    },
    { 
      name: 'Statistiky tabulek', 
      query: `SELECT 
    table_name,
    num_rows,
    blocks,
    avg_row_len,
    last_analyzed
FROM dba_tables
WHERE owner = USER
ORDER BY num_rows DESC NULLS LAST` 
    },
    { 
      name: 'Statistiky indexů', 
      query: `SELECT 
    index_name,
    table_name,
    blevel,
    leaf_blocks,
    distinct_keys,
    clustering_factor,
    last_analyzed
FROM dba_indexes
WHERE owner = USER` 
    },
  ];

  return (
    <div className="sql-query-container">
      <div className="dashboard-card full-width">
        <h2>SQL Query Executor</h2>
        <p className="query-info">Execute custom SELECT queries against the database. Only SELECT statements are allowed.</p>

        {/* Example Queries */}
        <div className="example-queries">
          <span className="example-label">Ukázky:</span>
          {examples.map((ex, idx) => (
            <button 
              key={idx} 
              className="example-button"
              onClick={() => loadExample(ex.query)}
            >
              {ex.name}
            </button>
          ))}
        </div>

        {/* Query Input */}
        <div className="query-input-section">
          <textarea
            className="query-textarea"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Enter your SELECT query here... (Ctrl+Enter to execute)"
            rows={8}
          />
          <div className="query-actions">
            <button 
              className="execute-button" 
              onClick={executeQuery}
              disabled={loading || !query.trim()}
            >
              {loading ? 'Executing...' : 'Execute Query'}
            </button>
            <button 
              className="clear-button" 
              onClick={() => {
                setQuery('');
                setResult(null);
                setError(null);
              }}
            >
              Clear
            </button>
            <span className="keyboard-hint">Ctrl+Enter to execute</span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="query-error">
            <strong>Error:</strong> {error}
          </div>
        )}

        {/* Results Display */}
        {result && (
          <div className="query-results">
            <div className="results-header">
              <h3>Results</h3>
              <span className="row-count">{result.row_count} row{result.row_count !== 1 ? 's' : ''} returned</span>
            </div>

            {result.data.length > 0 ? (
              <div className="table-container">
                <table className="data-table query-result-table">
                  <thead>
                    <tr>
                      {result.columns.map((col, idx) => (
                        <th key={idx}>{col}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {result.data.map((row, rowIdx) => (
                      <tr key={rowIdx}>
                        {result.columns.map((col, colIdx) => (
                          <td key={colIdx}>
                            {row[col] !== null && row[col] !== undefined ? String(row[col]) : <span className="null-value">NULL</span>}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="no-data">Query executed successfully but returned no rows.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default SQLQueryTab;
