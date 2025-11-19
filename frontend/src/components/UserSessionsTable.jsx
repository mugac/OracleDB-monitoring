function UserSessionsTable({ users }) {
  if (!users || users.length === 0) {
    return <p className="no-data">No user sessions</p>;
  }

  return (
    <div className="table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Username</th>
            <th>OS User</th>
            <th>Machine</th>
            <th>Program</th>
            <th>Sessions</th>
            <th>Active</th>
            <th>CPU (sec)</th>
            <th>Physical Reads</th>
            <th>Block Gets</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user, index) => (
            <tr key={index}>
              <td className="username-cell">
                <strong>{user.username}</strong>
              </td>
              <td className="osuser-cell">{user.osuser}</td>
              <td className="machine-cell">{user.machine}</td>
              <td className="program-cell">{user.program}</td>
              <td className="session-count">{user.session_count}</td>
              <td className="active-count">
                <span className={user.active_count > 0 ? 'active-badge' : 'inactive-badge'}>
                  {user.active_count}
                </span>
              </td>
              <td className="cpu-usage">{user.cpu_sec}</td>
              <td className="io-reads">{user.physical_reads.toLocaleString()}</td>
              <td className="io-gets">{user.block_gets.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default UserSessionsTable;
