import os
from datetime import datetime
from flask import Flask, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import oracledb

# Načtení .env souboru
load_dotenv()

# Konfigurace
ORACLE_USER = os.getenv('ORACLE_USER', 'system')
ORACLE_PASSWORD = os.getenv('ORACLE_PASSWORD', 'oracle')
ORACLE_HOST = os.getenv('ORACLE_HOST', '10.0.21.14')
ORACLE_PORT = os.getenv('ORACLE_PORT', '1521')
ORACLE_SERVICE = os.getenv('ORACLE_SERVICE', 'FREEPDB1')

app = Flask(__name__)
CORS(app)  # Povolí CORS pro frontend


def get_oracle_connection():
    """Vytvoří nové připojení k Oracle DB v thin mode (bez Instant Client)"""
    try:
        conn = oracledb.connect(
            user=ORACLE_USER,
            password=ORACLE_PASSWORD,
            host=ORACLE_HOST,
            port=int(ORACLE_PORT),
            service_name=ORACLE_SERVICE
        )
        return conn
    except oracledb.Error as error:
        print(f"❌ Oracle connection error: {error}")
        raise


def fetch_metrics():
    """Načte aktuální metriky z Oracle DB"""
    try:
        conn = get_oracle_connection()
        cur = conn.cursor()

        # 1. Aktivní sessions
        cur.execute("SELECT COUNT(*) FROM V$SESSION WHERE STATUS='ACTIVE'")
        active_sessions = cur.fetchone()[0]

        # 2. Total sessions
        cur.execute("SELECT COUNT(*) FROM V$SESSION WHERE USERNAME IS NOT NULL")
        total_sessions = cur.fetchone()[0]

        # 3. Top wait events
        cur.execute("""
            SELECT EVENT, COUNT(*) as CNT 
            FROM V$SESSION_WAIT
            WHERE EVENT NOT LIKE '%idle%'
            GROUP BY EVENT
            ORDER BY CNT DESC 
            FETCH FIRST 10 ROWS ONLY
        """)
        wait_events = [{'event': row[0], 'count': row[1]} for row in cur]

        # 4. System-wide wait events
        cur.execute("""
            SELECT EVENT, TOTAL_WAITS, TIME_WAITED, AVERAGE_WAIT
            FROM V$SYSTEM_EVENT
            WHERE EVENT NOT LIKE '%SQL%' AND EVENT NOT LIKE '%Idle%'
            ORDER BY TIME_WAITED DESC
            FETCH FIRST 10 ROWS ONLY
        """)
        system_events = [{'event': r[0], 'total_waits': r[1], 'time_waited': r[2], 'avg_wait': r[3]} 
                         for r in cur]

        # 5. Top SQL podle CPU time
        cur.execute("""
            SELECT SQL_ID, EXECUTIONS, 
                   ROUND(CPU_TIME/1000000,2) as CPU_SEC,
                   ROUND(ELAPSED_TIME/1000000,2) as ELAPSED_SEC,
                   DISK_READS,
                   BUFFER_GETS,
                   SUBSTR(SQL_TEXT,1,100) as SQL_TEXT
            FROM V$SQL 
            WHERE EXECUTIONS > 0
            ORDER BY CPU_TIME DESC 
            FETCH FIRST 10 ROWS ONLY
        """)
        top_sql = [{'sql_id': r[0], 'executions': r[1], 'cpu_sec': r[2], 
                    'elapsed_sec': r[3], 'disk_reads': r[4], 
                    'buffer_gets': r[5], 'text': r[6]} 
                   for r in cur]

        # 6. SGA komponenty
        cur.execute("""
            SELECT COMPONENT, ROUND(CURRENT_SIZE/1024/1024,2) as SIZE_MB
            FROM V$SGA_DYNAMIC_COMPONENTS
            WHERE CURRENT_SIZE > 0 
            ORDER BY CURRENT_SIZE DESC
        """)
        sga_stats = [{'component': r[0], 'size_mb': r[1]} for r in cur]

        # 7. Tablespace usage
        cur.execute("""
            SELECT TABLESPACE_NAME, 
                   ROUND(100*USED_SPACE/TABLESPACE_SIZE,2) as PCT_USED,
                   ROUND(USED_SPACE*8192/1024/1024,2) as USED_MB,
                   ROUND(TABLESPACE_SIZE*8192/1024/1024,2) as TOTAL_MB
            FROM DBA_TABLESPACE_USAGE_METRICS
            ORDER BY PCT_USED DESC
        """)
        tablespaces = [{'name': r[0], 'pct_used': r[1], 'used_mb': r[2], 'total_mb': r[3]} 
                       for r in cur]

        # 8. Recent alerts (pokud existují)
        try:
            cur.execute("""
                SELECT MESSAGE_TEXT, MESSAGE_LEVEL, ORIGINATING_TIMESTAMP
                FROM V$DIAG_ALERT_EXT
                WHERE ORIGINATING_TIMESTAMP > SYSDATE - 1/24
                ORDER BY ORIGINATING_TIMESTAMP DESC
                FETCH FIRST 20 ROWS ONLY
            """)
            alerts = [{'message': r[0], 'level': r[1], 'timestamp': r[2].isoformat() if r[2] else None} 
                     for r in cur]
        except:
            alerts = []

        # 9. Dlouhodobě běžící SQL (SQL Monitor)
        try:
            cur.execute("""
                SELECT SQL_ID, 
                       SQL_EXEC_START,
                       ROUND(ELAPSED_TIME/1000000,2) as ELAPSED_SEC,
                       ROUND(CPU_TIME/1000000,2) as CPU_SEC,
                       BUFFER_GETS,
                       DISK_READS,
                       STATUS
                FROM V$SQL_MONITOR
                WHERE STATUS = 'EXECUTING'
                ORDER BY ELAPSED_TIME DESC
                FETCH FIRST 5 ROWS ONLY
            """)
            long_running = [{'sql_id': r[0], 'start_time': r[1].isoformat() if r[1] else None,
                           'elapsed_sec': r[2], 'cpu_sec': r[3], 
                           'buffer_gets': r[4], 'disk_reads': r[5], 'status': r[6]} 
                          for r in cur]
        except:
            long_running = []

        # 10. Database info
        cur.execute("SELECT NAME, OPEN_MODE, LOG_MODE FROM V$DATABASE")
        db_row = cur.fetchone()
        db_info = {'name': db_row[0], 'open_mode': db_row[1], 'log_mode': db_row[2]}

        cur.close()
        conn.close()
        
        return {
            'timestamp': datetime.now().isoformat(),
            'database': db_info,
            'active_sessions': active_sessions,
            'total_sessions': total_sessions,
            'wait_events': wait_events,
            'system_events': system_events,
            'top_sql': top_sql,
            'sga_stats': sga_stats,
            'tablespaces': tablespaces,
            'alerts': alerts,
            'long_running_sql': long_running
        }
    except oracledb.Error as error:
        print(f"❌ Oracle error: {error}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error: {e}")
        return None


def fetch_system_resources():
    """Načte systémové zdroje (CPU, Memory, I/O) z Oracle DB"""
    try:
        conn = get_oracle_connection()
        cur = conn.cursor()
        
        result = {
            'timestamp': datetime.now().isoformat(),
            'cpu': {},
            'memory': {},
            'io': {},
            'load': {}
        }
        
        # 1. CPU Utilization z V$OSSTAT
        try:
            cur.execute("""
                SELECT STAT_NAME, VALUE 
                FROM V$OSSTAT 
                WHERE STAT_NAME IN ('BUSY_TIME', 'IDLE_TIME', 'NUM_CPUS', 'NUM_CPU_CORES', 
                                    'PHYSICAL_MEMORY_BYTES', 'LOAD')
            """)
            os_stats = {row[0]: row[1] for row in cur}
            
            # CPU utilization calculation
            busy_time = os_stats.get('BUSY_TIME', 0)
            idle_time = os_stats.get('IDLE_TIME', 0)
            total_time = busy_time + idle_time
            
            if total_time > 0:
                cpu_utilization = round((busy_time / total_time) * 100, 2)
            else:
                cpu_utilization = 0
            
            result['cpu']['utilization_pct'] = cpu_utilization
            result['cpu']['num_cpus'] = os_stats.get('NUM_CPUS', 0)
            result['cpu']['num_cpu_cores'] = os_stats.get('NUM_CPU_CORES', 0)
            result['cpu']['busy_time'] = busy_time
            result['cpu']['idle_time'] = idle_time
            result['load']['load_average'] = os_stats.get('LOAD', 0)
            
            # Physical memory
            physical_memory_bytes = os_stats.get('PHYSICAL_MEMORY_BYTES', 0)
            result['memory']['physical_memory_gb'] = round(physical_memory_bytes / (1024**3), 2)
            
        except Exception as e:
            print(f"Warning: Could not fetch V$OSSTAT: {e}")
        
        # 2. CPU a Memory z V$SYSMETRIC (60-second average)
        try:
            cur.execute("""
                SELECT METRIC_NAME, VALUE
                FROM V$SYSMETRIC
                WHERE GROUP_ID = 2
                AND METRIC_NAME IN (
                    'Host CPU Utilization (%)',
                    'CPU Usage Per Sec',
                    'CPU Usage Per Txn',
                    'Database CPU Time Ratio',
                    'Host CPU Usage Per Sec',
                    'Physical Memory',
                    'Physical Memory GB'
                )
            """)
            sysmetrics = {row[0]: row[1] for row in cur}
            
            result['cpu']['host_cpu_utilization_pct'] = round(sysmetrics.get('Host CPU Utilization (%)', 0), 2)
            result['cpu']['cpu_usage_per_sec'] = round(sysmetrics.get('CPU Usage Per Sec', 0), 2)
            result['cpu']['db_cpu_time_ratio'] = round(sysmetrics.get('Database CPU Time Ratio', 0), 2)
            
        except Exception as e:
            print(f"Warning: Could not fetch V$SYSMETRIC: {e}")
        
        # 3. DB CPU Time Model
        try:
            cur.execute("""
                SELECT STAT_NAME, ROUND(VALUE/1000000, 2) as VALUE_SEC
                FROM V$SYS_TIME_MODEL
                WHERE STAT_NAME IN ('DB CPU', 'background cpu time', 'DB time')
            """)
            time_model = {row[0]: row[1] for row in cur}
            
            result['cpu']['db_cpu_time_sec'] = time_model.get('DB CPU', 0)
            result['cpu']['background_cpu_time_sec'] = time_model.get('background cpu time', 0)
            result['cpu']['db_time_sec'] = time_model.get('DB time', 0)
            
        except Exception as e:
            print(f"Warning: Could not fetch V$SYS_TIME_MODEL: {e}")
        
        # 4. Memory Stats z V$SGASTAT
        try:
            cur.execute("""
                SELECT POOL, SUM(BYTES)/(1024*1024) as MB
                FROM V$SGASTAT
                WHERE POOL IS NOT NULL
                GROUP BY POOL
            """)
            memory_pools = [{'pool': row[0], 'size_mb': round(row[1], 2)} for row in cur]
            result['memory']['sga_pools'] = memory_pools
            
            # Total SGA
            cur.execute("SELECT ROUND(SUM(VALUE)/1024/1024, 2) FROM V$SGA")
            result['memory']['total_sga_mb'] = cur.fetchone()[0]
            
        except Exception as e:
            print(f"Warning: Could not fetch memory stats: {e}")
        
        # 5. PGA Memory
        try:
            cur.execute("""
                SELECT NAME, ROUND(VALUE/1024/1024, 2) as MB
                FROM V$PGASTAT
                WHERE NAME IN ('total PGA allocated', 'total PGA inuse', 'maximum PGA allocated')
            """)
            pga_stats = {row[0]: row[1] for row in cur}
            result['memory']['pga_allocated_mb'] = pga_stats.get('total PGA allocated', 0)
            result['memory']['pga_inuse_mb'] = pga_stats.get('total PGA inuse', 0)
            result['memory']['pga_max_allocated_mb'] = pga_stats.get('maximum PGA allocated', 0)
            
        except Exception as e:
            print(f"Warning: Could not fetch PGA stats: {e}")
        
        # 6. I/O Stats
        try:
            cur.execute("""
                SELECT METRIC_NAME, VALUE
                FROM V$SYSMETRIC
                WHERE GROUP_ID = 2
                AND METRIC_NAME IN (
                    'Physical Reads Per Sec',
                    'Physical Writes Per Sec',
                    'Physical Read Bytes Per Sec',
                    'Physical Write Bytes Per Sec',
                    'I/O Megabytes per Second',
                    'I/O Requests per Second'
                )
            """)
            io_metrics = {row[0]: row[1] for row in cur}
            
            result['io']['physical_reads_per_sec'] = round(io_metrics.get('Physical Reads Per Sec', 0), 2)
            result['io']['physical_writes_per_sec'] = round(io_metrics.get('Physical Writes Per Sec', 0), 2)
            result['io']['read_bytes_per_sec'] = round(io_metrics.get('Physical Read Bytes Per Sec', 0), 2)
            result['io']['write_bytes_per_sec'] = round(io_metrics.get('Physical Write Bytes Per Sec', 0), 2)
            result['io']['io_mb_per_sec'] = round(io_metrics.get('I/O Megabytes per Second', 0), 2)
            result['io']['io_requests_per_sec'] = round(io_metrics.get('I/O Requests per Second', 0), 2)
            
        except Exception as e:
            print(f"Warning: Could not fetch I/O stats: {e}")
        
        cur.close()
        conn.close()
        
        return result
        
    except oracledb.Error as error:
        print(f"❌ Oracle error in fetch_system_resources: {error}")
        return None
    except Exception as e:
        print(f"❌ Unexpected error in fetch_system_resources: {e}")
        return None


@app.route('/api/health', methods=['GET'])
def get_health():
    """Vrátí aktuální stav databáze"""
    metrics = fetch_metrics()
    if metrics is None:
        return jsonify({
            'error': 'Failed to fetch metrics from Oracle',
            'timestamp': datetime.now().isoformat()
        }), 500
    return jsonify(metrics)


@app.route('/api/system-resources', methods=['GET'])
def get_system_resources():
    """Vrátí systémové zdroje (CPU, Memory, I/O)"""
    resources = fetch_system_resources()
    if resources is None:
        return jsonify({
            'error': 'Failed to fetch system resources from Oracle',
            'timestamp': datetime.now().isoformat()
        }), 500
    return jsonify(resources)


@app.route('/api/ping', methods=['GET'])
def ping():
    """Zdravotní check API"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'database': f"{ORACLE_USER}@{ORACLE_HOST}:{ORACLE_PORT}/{ORACLE_SERVICE}"
    })


@app.route('/', methods=['GET'])
def index():
    """Root endpoint"""
    return jsonify({
        'service': 'Oracle Database 23ai Free Monitoring API',
        'version': '1.0.0',
        'endpoints': {
            '/api/ping': 'Health check',
            '/api/health': 'Database metrics',
            '/api/system-resources': 'System resources (CPU, Memory, I/O)'
        }
    })


if __name__ == '__main__':
    print("=" * 60)
    print("🚀 Starting Oracle Monitoring Backend...")
    print(f"📊 Database: {ORACLE_USER}@{ORACLE_HOST}:{ORACLE_PORT}/{ORACLE_SERVICE}")
    print(f"🌐 API will be available at: http://localhost:5000")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
