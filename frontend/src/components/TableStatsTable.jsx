function TableStatsTable({ tables }) {
  if (!tables || tables.length === 0) {
    return <p className="no-data">No table statistics available</p>;
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Never';
    return new Date(dateString).toLocaleDateString('cs-CZ', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getAnalyzedClass = (dateString) => {
    if (!dateString) return 'never-analyzed';
    const daysSince = (Date.now() - new Date(dateString).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSince > 30) return 'old-analyzed';
    if (daysSince > 7) return 'moderate-analyzed';
    return 'recent-analyzed';
  };

  return (
    <div className="table-container">
      <table className="data-table table-stats-table">
        <thead>
          <tr>
            <th>Table Name</th>
            <th>Num Rows</th>
            <th>Blocks</th>
            <th>Avg Row Len</th>
            <th>Tablespace</th>
            <th>Last Analyzed</th>
          </tr>
        </thead>
        <tbody>
          {tables.map((table, index) => (
            <tr key={index}>
              <td className="table-name-cell">
                <strong>{table.table_name}</strong>
              </td>
              <td className="num-rows-cell">{table.num_rows.toLocaleString()}</td>
              <td className="blocks-cell">{table.blocks.toLocaleString()}</td>
              <td className="avg-row-cell">{table.avg_row_len}</td>
              <td className="tablespace-cell">{table.tablespace || 'N/A'}</td>
              <td className="analyzed-cell">
                <span className={`analyzed-badge ${getAnalyzedClass(table.last_analyzed)}`}>
                  {formatDate(table.last_analyzed)}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default TableStatsTable;
