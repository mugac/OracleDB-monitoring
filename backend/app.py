import os
from datetime import datetime
from flask import Flask, jsonify, request
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
        # Pokud se připojujeme jako SYS, použijeme SYSDBA mode
        if ORACLE_USER.upper() == 'SYS':
            conn = oracledb.connect(
                user=ORACLE_USER,
                password=ORACLE_PASSWORD,
                host=ORACLE_HOST,
                port=int(ORACLE_PORT),
                service_name=ORACLE_SERVICE,
                mode=oracledb.AUTH_MODE_SYSDBA
            )
        else:
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


def fetch_metrics(sql_limit=50):
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

        # 5. SGA komponenty
        cur.execute("""
            SELECT COMPONENT, ROUND(CURRENT_SIZE/1024/1024,2) as SIZE_MB
            FROM V$SGA_DYNAMIC_COMPONENTS
            WHERE CURRENT_SIZE > 0 
            ORDER BY CURRENT_SIZE DESC
        """)
        sga_stats = [{'component': r[0], 'size_mb': r[1]} for r in cur]

        # 6. Tablespace usage
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

        # 11. User sessions with resource usage
        cur.execute("""
            SELECT 
                s.USERNAME,
                s.OSUSER,
                s.MACHINE,
                s.PROGRAM,
                COUNT(*) as SESSION_COUNT,
                SUM(CASE WHEN s.STATUS='ACTIVE' THEN 1 ELSE 0 END) as ACTIVE_COUNT,
                SUM(se.PHYSICAL_READS) as TOTAL_PHYSICAL_READS,
                SUM(se.BLOCK_GETS) as TOTAL_BLOCK_GETS,
                SUM(se.CONSISTENT_GETS) as TOTAL_CONSISTENT_GETS,
                SUM(NVL(ss.VALUE, 0)) as TOTAL_CPU_CENTISEC
            FROM V$SESSION s
            LEFT JOIN V$SESS_IO se ON s.SID = se.SID
            LEFT JOIN (
                SELECT SID, VALUE
                FROM V$SESSTAT
                WHERE STATISTIC# = (SELECT STATISTIC# FROM V$STATNAME WHERE NAME = 'CPU used by this session')
            ) ss ON s.SID = ss.SID
            WHERE s.USERNAME IS NOT NULL
            GROUP BY s.USERNAME, s.OSUSER, s.MACHINE, s.PROGRAM
            ORDER BY TOTAL_CPU_CENTISEC DESC NULLS LAST
        """)
        user_sessions = [{'username': r[0], 'osuser': r[1], 'machine': r[2], 
                         'program': r[3], 'session_count': r[4], 'active_count': r[5],
                         'physical_reads': r[6] or 0, 'block_gets': r[7] or 0, 
                         'consistent_gets': r[8] or 0, 'cpu_sec': round((r[9] or 0) / 100, 2)} 
                        for r in cur]

        # 12. Detailed session list
        cur.execute("""
            SELECT 
                s.SID,
                s.SERIAL#,
                s.USERNAME,
                s.OSUSER,
                s.MACHINE,
                s.PROGRAM,
                s.STATUS,
                s.EVENT,
                s.SECONDS_IN_WAIT,
                s.LOGON_TIME,
                se.PHYSICAL_READS,
                se.BLOCK_GETS,
                NVL(ss.VALUE, 0) as CPU_CENTISEC
            FROM V$SESSION s
            LEFT JOIN V$SESS_IO se ON s.SID = se.SID
            LEFT JOIN (
                SELECT SID, VALUE
                FROM V$SESSTAT
                WHERE STATISTIC# = (SELECT STATISTIC# FROM V$STATNAME WHERE NAME = 'CPU used by this session')
            ) ss ON s.SID = ss.SID
            WHERE s.USERNAME IS NOT NULL
            ORDER BY s.LOGON_TIME DESC
        """)
        session_details = [{'sid': r[0], 'serial': r[1], 'username': r[2], 'osuser': r[3],
                           'machine': r[4], 'program': r[5], 'status': r[6], 'event': r[7],
                           'wait_sec': r[8] or 0, 'logon_time': r[9].isoformat() if r[9] else None,
                           'physical_reads': r[10] or 0, 'block_gets': r[11] or 0, 'cpu_sec': round((r[12] or 0) / 100, 2)}
                          for r in cur]

        # 13. Active SQL commands
        cur.execute(f"""
            SELECT 
                s.sql_id,
                s.sql_text,
                s.executions,
                s.elapsed_time / 1000000 as elapsed_sec,
                s.cpu_time / 1000000 as cpu_sec,
                s.buffer_gets,
                s.disk_reads,
                s.rows_processed,
                s.parsing_schema_name,
                sess.username as last_active_user
            FROM v$sql s
            LEFT JOIN (
                SELECT sql_id, username, ROW_NUMBER() OVER (PARTITION BY sql_id ORDER BY last_call_et DESC) as rn
                FROM v$session
                WHERE sql_id IS NOT NULL AND username IS NOT NULL
            ) sess ON s.sql_id = sess.sql_id AND sess.rn = 1
            WHERE s.executions > 0
            ORDER BY s.elapsed_time DESC
            FETCH FIRST {sql_limit} ROWS ONLY
        """)
        active_sql = [{'sql_id': r[0], 'sql_text': r[1], 'executions': r[2],
                      'elapsed_sec': round(r[3], 2), 'cpu_sec': round(r[4], 2),
                      'buffer_gets': r[5] or 0, 'disk_reads': r[6] or 0, 'rows_processed': r[7] or 0,
                      'parsing_schema': r[8], 'last_user': r[9]}
                     for r in cur]

        # 14. Table statistics
        cur.execute("""
            SELECT 
                table_name,
                num_rows,
                blocks,
                avg_row_len,
                last_analyzed,
                tablespace_name
            FROM dba_tables
            WHERE owner = USER
            ORDER BY num_rows DESC NULLS LAST
            FETCH FIRST 100 ROWS ONLY
        """)
        table_stats = [{'table_name': r[0], 'num_rows': r[1] or 0, 'blocks': r[2] or 0,
                       'avg_row_len': r[3] or 0, 
                       'last_analyzed': r[4].isoformat() if r[4] else None,
                       'tablespace': r[5]}
                      for r in cur]

        cur.close()
        conn.close()
        
        return {
            'timestamp': datetime.now().isoformat(),
            'database': db_info,
            'active_sessions': active_sessions,
            'total_sessions': total_sessions,
            'wait_events': wait_events,
            'system_events': system_events,
            'sga_stats': sga_stats,
            'tablespaces': tablespaces,
            'alerts': alerts,
            'long_running_sql': long_running,
            'user_sessions': user_sessions,
            'session_details': session_details,
            'active_sql': active_sql,
            'table_stats': table_stats
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
    """Vrátí aktuální zdraví DB a metriky"""
    sql_limit = request.args.get('sql_limit', default=50, type=int)
    # Omezit na rozumné hodnoty (999999 = ALL)
    if sql_limit == 999999:
        sql_limit = 999999  # Použije se pro ALL
    else:
        sql_limit = max(10, min(sql_limit, 500))
    
    metrics = fetch_metrics(sql_limit=sql_limit)
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


@app.route('/api/execute-query', methods=['POST'])
def execute_query():
    """Vykoná vlastní SQL dotaz (pouze SELECT)"""
    try:
        data = request.get_json()
        query = data.get('query', '').strip()
        
        if not query:
            return jsonify({'error': 'Query is required'}), 400
        
        # Bezpečnostní kontrola - pouze SELECT dotazy
        query_upper = query.upper().strip()
        if not query_upper.startswith('SELECT'):
            return jsonify({'error': 'Only SELECT queries are allowed'}), 403
        
        # Zakázané klíčová slova pro větší bezpečnost
        dangerous_keywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE']
        for keyword in dangerous_keywords:
            if keyword in query_upper:
                return jsonify({'error': f'Keyword {keyword} is not allowed'}), 403
        
        conn = get_oracle_connection()
        cur = conn.cursor()
        
        # Vykonání dotazu
        cur.execute(query)
        
        # Získání názvů sloupců
        columns = [desc[0] for desc in cur.description] if cur.description else []
        
        # Získání dat
        rows = cur.fetchall()
        
        # Konverze dat na JSON-serializable formát
        result_data = []
        for row in rows:
            row_dict = {}
            for i, col in enumerate(columns):
                value = row[i]
                # Konverze datetime objektů
                if hasattr(value, 'isoformat'):
                    value = value.isoformat()
                row_dict[col] = value
            result_data.append(row_dict)
        
        cur.close()
        conn.close()
        
        return jsonify({
            'success': True,
            'columns': columns,
            'data': result_data,
            'row_count': len(result_data),
            'timestamp': datetime.now().isoformat()
        })
        
    except oracledb.Error as error:
        return jsonify({
            'error': f'Oracle error: {str(error)}',
            'timestamp': datetime.now().isoformat()
        }), 500
    except Exception as e:
        return jsonify({
            'error': f'Error: {str(e)}',
            'timestamp': datetime.now().isoformat()
        }), 500


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
