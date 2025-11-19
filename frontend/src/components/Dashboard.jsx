import SessionsCard from './SessionsCard';
import WaitEventsTable from './WaitEventsTable';
import SGAStatsTable from './SGAStatsTable';
import TablespacesTable from './TablespacesTable';
import SystemEventsTable from './SystemEventsTable';
import LongRunningSQLTable from './LongRunningSQLTable';
import AlertsTable from './AlertsTable';
import DatabaseInfo from './DatabaseInfo';
import OverviewTab from './tabs/OverviewTab';
import PerformanceTab from './tabs/PerformanceTab';
import StorageTab from './tabs/StorageTab';
import SessionsTab from './tabs/SessionsTab';
import ActiveSQLTab from './tabs/ActiveSQLTab';
import TableStatsTab from './tabs/TableStatsTab';
import SQLQueryTab from './tabs/SQLQueryTab';

function Dashboard({ metrics, activeTab, setActiveTab, sqlLimit, setSqlLimit }) {
  if (!metrics) return null;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'sessions', label: 'Sessions' },
    { id: 'activesql', label: 'Active SQL' },
    { id: 'tablestats', label: 'Table Stats' },
    { id: 'sqlquery', label: 'SQL Query' },
    { id: 'performance', label: 'Performance' },
    { id: 'storage', label: 'Storage' },
  ];

  return (
    <div className="dashboard">
      {/* Database Info Bar */}
      <DatabaseInfo dbInfo={metrics.database} timestamp={metrics.timestamp} />

      {/* Tab Navigation */}
      <div className="tab-navigation">
        {tabs.map(tab => (
          <button
            key={tab.id}
            className={`tab-button ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            <span className="tab-label">{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && <OverviewTab metrics={metrics} />}
        {activeTab === 'sessions' && <SessionsTab metrics={metrics} />}
        {activeTab === 'activesql' && <ActiveSQLTab metrics={metrics} sqlLimit={sqlLimit} setSqlLimit={setSqlLimit} />}
        {activeTab === 'tablestats' && <TableStatsTab metrics={metrics} />}
        {activeTab === 'sqlquery' && <SQLQueryTab />}
        {activeTab === 'performance' && <PerformanceTab metrics={metrics} />}
        {activeTab === 'storage' && <StorageTab metrics={metrics} />}
      </div>
    </div>
  );
}

export default Dashboard;
