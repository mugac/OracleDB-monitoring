function ActiveSQLTable({ sqlData }) {
  if (!sqlData || sqlData.length === 0) {
    return <p className="no-data">No active SQL commands</p>;
  }

  const truncateSQL = (text, maxLength = 100) => {
    if (!text) return 'N/A';
    return text.length > maxLength ? text.substring(0, maxLength) + '...' : text;
  };

  return (
    <div className="table-container">
      <table className="data-table sql-table">
        <thead>
          <tr>
            <th>SQL ID</th>
            <th>SQL Text</th>
            <th>User</th>
            <th>Schema</th>
            <th>Executions</th>
            <th>Elapsed (sec)</th>
            <th>CPU (sec)</th>
            <th>Buffer Gets</th>
            <th>Disk Reads</th>
            <th>Rows</th>
          </tr>
        </thead>
        <tbody>
          {sqlData.map((sql, index) => (
            <tr key={index}>
              <td className="sql-id-cell">
                <code>{sql.sql_id}</code>
              </td>
              <td className="sql-text-cell" title={sql.sql_text}>
                <code>{truncateSQL(sql.sql_text)}</code>
              </td>
              <td className="user-cell">
                {sql.last_user ? <span className="user-badge">{sql.last_user}</span> : <span className="na-text">N/A</span>}
              </td>
              <td className="schema-cell">{sql.parsing_schema || 'N/A'}</td>
              <td className="exec-count">{sql.executions.toLocaleString()}</td>
              <td className="elapsed-time">{sql.elapsed_sec.toFixed(2)}</td>
              <td className="cpu-time">{sql.cpu_sec.toFixed(2)}</td>
              <td className="buffer-gets">{sql.buffer_gets.toLocaleString()}</td>
              <td className="disk-reads">{sql.disk_reads.toLocaleString()}</td>
              <td className="rows-processed">{sql.rows_processed.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default ActiveSQLTable;
