function SessionDetailsTable({ sessions }) {
  if (!sessions || sessions.length === 0) {
    return <p className="no-data">No active sessions</p>;
  }

  const getStatusClass = (status) => {
    return status === 'ACTIVE' ? 'status-active' : 'status-inactive';
  };

  return (
    <div className="table-container">
      <table className="data-table session-table">
        <thead>
          <tr>
            <th>SID</th>
            <th>Serial#</th>
            <th>Username</th>
            <th>OS User</th>
            <th>Machine</th>
            <th>Program</th>
            <th>Status</th>
            <th>Event</th>
            <th>Wait (sec)</th>
            <th>Logon Time</th>
            <th>CPU (sec)</th>
            <th>Physical Reads</th>
          </tr>
        </thead>
        <tbody>
          {sessions.map((session, index) => (
            <tr key={index} className={session.status === 'ACTIVE' ? 'active-session-row' : ''}>
              <td className="sid-cell">{session.sid}</td>
              <td className="serial-cell">{session.serial}</td>
              <td className="username-cell"><strong>{session.username}</strong></td>
              <td className="osuser-cell">{session.osuser}</td>
              <td className="machine-cell">{session.machine}</td>
              <td className="program-cell">{session.program}</td>
              <td className="status-cell">
                <span className={`status-badge ${getStatusClass(session.status)}`}>
                  {session.status}
                </span>
              </td>
              <td className="event-cell">{session.event}</td>
              <td className="wait-cell">{session.wait_sec}</td>
              <td className="logon-cell">
                {session.logon_time ? new Date(session.logon_time).toLocaleString() : 'N/A'}
              </td>
              <td className="cpu-cell">{session.cpu_sec}</td>
              <td className="reads-cell">{session.physical_reads.toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default SessionDetailsTable;
