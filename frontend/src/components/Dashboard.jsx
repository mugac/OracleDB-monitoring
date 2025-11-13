import SessionsCard from './SessionsCard';
import WaitEventsTable from './WaitEventsTable';
import TopSQLTable from './TopSQLTable';
import SGAStatsTable from './SGAStatsTable';
import TablespacesTable from './TablespacesTable';
import SystemEventsTable from './SystemEventsTable';
import LongRunningSQLTable from './LongRunningSQLTable';
import AlertsTable from './AlertsTable';
import DatabaseInfo from './DatabaseInfo';
import OverviewTab from './tabs/OverviewTab';
import PerformanceTab from './tabs/PerformanceTab';
import StorageTab from './tabs/StorageTab';
import SQLTab from './tabs/SQLTab';
import SystemResourcesTab from './tabs/SystemResourcesTab';

function Dashboard({ metrics, activeTab, setActiveTab }) {
  if (!metrics) return null;

  const tabs = [
    { id: 'overview', label: 'Overview' },
    { id: 'performance', label: 'Performance' },
    { id: 'system', label: 'System Resources' },
    { id: 'storage', label: 'Storage' },
    { id: 'sql', label: 'SQL Analysis' },
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
        {activeTab === 'performance' && <PerformanceTab metrics={metrics} />}
        {activeTab === 'system' && <SystemResourcesTab />}
        {activeTab === 'storage' && <StorageTab metrics={metrics} />}
        {activeTab === 'sql' && <SQLTab metrics={metrics} />}
      </div>
    </div>
  );
}

export default Dashboard;
