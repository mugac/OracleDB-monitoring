import { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import Dashboard from './components/Dashboard';

function App() {
  const [metrics, setMetrics] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdate, setLastUpdate] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [sqlLimit, setSqlLimit] = useState(50);

  const fetchData = async () => {
    try {
      setError(null);
      const response = await axios.get(`/api/health?sql_limit=${sqlLimit}`);
      setMetrics(response.data);
      setLastUpdate(new Date());
      setLoading(false);
    } catch (err) {
      setError(err.response?.data?.error || err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // Refresh každých 30 sekund
    const interval = setInterval(fetchData, 30000);
    return () => clearInterval(interval);
  }, [sqlLimit]);

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-content">
          <div className="header-title">
            <h1>Oracle Database Monitor</h1>
            <span className="header-subtitle">Real-time Performance Dashboard</span>
          </div>
          <div className="header-info">
            {lastUpdate && (
              <span className="last-update">
                Last updated: {lastUpdate.toLocaleTimeString('cs-CZ')}
              </span>
            )}
            <button className="refresh-btn" onClick={fetchData} disabled={loading}>
              {loading ? 'Loading...' : 'Refresh'}
            </button>
          </div>
        </div>
      </header>

      <main className="app-main">
        {loading && !metrics ? (
          <div className="loading">
            <div className="spinner"></div>
            <p>Loading database metrics...</p>
          </div>
        ) : error ? (
          <div className="error">
            <div className="error-icon">!</div>
            <h2>Connection Error</h2>
            <p>{error}</p>
            <button onClick={fetchData}>Retry Connection</button>
          </div>
        ) : (
          <Dashboard 
            metrics={metrics} 
            activeTab={activeTab} 
            setActiveTab={setActiveTab}
            sqlLimit={sqlLimit}
            setSqlLimit={setSqlLimit}
          />
        )}
      </main>

      <footer className="app-footer">
        <p>Oracle Database Monitoring Dashboard v1.0</p>
      </footer>
    </div>
  );
}

export default App;
