from datetime import datetime
import oracledb
from db import get_oracle_connection
import queries

def fetch_metrics(sql_limit=50):
    """Načte aktuální metriky z Oracle DB"""
    try:
        conn = get_oracle_connection()
        cur = conn.cursor()

        # 1. Aktivní sessions
        cur.execute(queries.SQL_ACTIVE_SESSIONS)
        active_sessions = cur.fetchone()[0]

        # 2. Total sessions
        cur.execute(queries.SQL_TOTAL_SESSIONS)
        total_sessions = cur.fetchone()[0]

        # 3. Top wait events
        cur.execute(queries.SQL_WAIT_EVENTS)
        wait_events = [{'event': row[0], 'count': row[1]} for row in cur]

        # 4. System-wide wait events
        cur.execute(queries.SQL_SYSTEM_EVENTS)
        system_events = [{'event': r[0], 'total_waits': r[1], 'time_waited': r[2], 'avg_wait': r[3]} 
                         for r in cur]

        # 5. SGA komponenty
        cur.execute(queries.SQL_SGA_COMPONENTS)
        sga_stats = [{'component': r[0], 'size_mb': r[1]} for r in cur]

        # 6. Tablespace usage
        cur.execute(queries.SQL_TABLESPACE_USAGE)
        tablespaces = [{'name': r[0], 'pct_used': r[1], 'used_mb': r[2], 'total_mb': r[3]} 
                       for r in cur]

        # 8. Recent alerts (pokud existují)
        try:
            cur.execute(queries.SQL_RECENT_ALERTS)
            alerts = [{'message': r[0], 'level': r[1], 'timestamp': r[2].isoformat() if r[2] else None} 
                     for r in cur]
        except:
            alerts = []

        # 9. Dlouhodobě běžící SQL (SQL Monitor)
        try:
            cur.execute(queries.SQL_LONG_RUNNING_SQL)
            long_running = [{'sql_id': r[0], 'start_time': r[1].isoformat() if r[1] else None,
                           'elapsed_sec': r[2], 'cpu_sec': r[3], 
                           'buffer_gets': r[4], 'disk_reads': r[5], 'status': r[6]} 
                          for r in cur]
        except:
            long_running = []

        # 10. Database info
        cur.execute(queries.SQL_DATABASE_INFO)
        db_row = cur.fetchone()
        db_info = {'name': db_row[0], 'open_mode': db_row[1], 'log_mode': db_row[2]}

        # 11. User sessions with resource usage
        cur.execute(queries.SQL_USER_SESSIONS)
        user_sessions = [{'username': r[0], 'osuser': r[1], 'machine': r[2], 
                         'program': r[3], 'session_count': r[4], 'active_count': r[5],
                         'physical_reads': r[6] or 0, 'block_gets': r[7] or 0, 
                         'consistent_gets': r[8] or 0, 'cpu_sec': round((r[9] or 0) / 100, 2)} 
                        for r in cur]

        # 12. Detailed session list
        cur.execute(queries.SQL_SESSION_DETAILS)
        session_details = [{'sid': r[0], 'serial': r[1], 'username': r[2], 'osuser': r[3],
                           'machine': r[4], 'program': r[5], 'status': r[6], 'event': r[7],
                           'wait_sec': r[8] or 0, 'logon_time': r[9].isoformat() if r[9] else None,
                           'physical_reads': r[10] or 0, 'block_gets': r[11] or 0, 'cpu_sec': round((r[12] or 0) / 100, 2)}
                          for r in cur]

        # 13. Active SQL commands
        cur.execute(queries.get_active_sql_query(sql_limit))
        active_sql = [{'sql_id': r[0], 'sql_text': r[1], 'executions': r[2],
                      'elapsed_sec': round(r[3], 2), 'cpu_sec': round(r[4], 2),
                      'buffer_gets': r[5] or 0, 'disk_reads': r[6] or 0, 'rows_processed': r[7] or 0,
                      'parsing_schema': r[8], 'last_user': r[9]}
                     for r in cur]

        # 14. Table statistics
        cur.execute(queries.SQL_TABLE_STATS)
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
        print(f"Oracle error: {error}")
        return None
    except Exception as e:
        print(f"Unexpected error: {e}")
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
            cur.execute(queries.SQL_OS_STAT)
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
            cur.execute(queries.SQL_SYSMETRIC)
            sysmetrics = {row[0]: row[1] for row in cur}
            
            result['cpu']['host_cpu_utilization_pct'] = round(sysmetrics.get('Host CPU Utilization (%)', 0), 2)
            result['cpu']['cpu_usage_per_sec'] = round(sysmetrics.get('CPU Usage Per Sec', 0), 2)
            result['cpu']['db_cpu_time_ratio'] = round(sysmetrics.get('Database CPU Time Ratio', 0), 2)
            
        except Exception as e:
            print(f"Warning: Could not fetch V$SYSMETRIC: {e}")
        
        # 3. DB CPU Time Model
        try:
            cur.execute(queries.SQL_SYS_TIME_MODEL)
            time_model = {row[0]: row[1] for row in cur}
            
            result['cpu']['db_cpu_time_sec'] = time_model.get('DB CPU', 0)
            result['cpu']['background_cpu_time_sec'] = time_model.get('background cpu time', 0)
            result['cpu']['db_time_sec'] = time_model.get('DB time', 0)
            
        except Exception as e:
            print(f"Warning: Could not fetch V$SYS_TIME_MODEL: {e}")
        
        # 4. Memory Stats z V$SGASTAT
        try:
            cur.execute(queries.SQL_SGA_STAT)
            memory_pools = [{'pool': row[0], 'size_mb': round(row[1], 2)} for row in cur]
            result['memory']['sga_pools'] = memory_pools
            
            # Total SGA
            cur.execute(queries.SQL_TOTAL_SGA)
            result['memory']['total_sga_mb'] = cur.fetchone()[0]
            
        except Exception as e:
            print(f"Warning: Could not fetch memory stats: {e}")
        
        # 5. PGA Memory
        try:
            cur.execute(queries.SQL_PGA_STAT)
            pga_stats = {row[0]: row[1] for row in cur}
            result['memory']['pga_allocated_mb'] = pga_stats.get('total PGA allocated', 0)
            result['memory']['pga_inuse_mb'] = pga_stats.get('total PGA inuse', 0)
            result['memory']['pga_max_allocated_mb'] = pga_stats.get('maximum PGA allocated', 0)
            
        except Exception as e:
            print(f"Warning: Could not fetch PGA stats: {e}")
        
        # 6. I/O Stats
        try:
            cur.execute(queries.SQL_IO_METRICS)
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
        print(f"Oracle error in fetch_system_resources: {error}")
        return None
    except Exception as e:
        print(f"Unexpected error in fetch_system_resources: {e}")
        return None

def run_custom_query(query):
    """Vykoná vlastní SQL dotaz (pouze SELECT)"""
    try:
        # Bezpečnostní kontrola - pouze SELECT dotazy
        query_upper = query.upper().strip()
        if not query_upper.startswith('SELECT'):
            return {'error': 'Only SELECT queries are allowed', 'status': 403}
        
        # Zakázané klíčová slova pro větší bezpečnost
        dangerous_keywords = ['INSERT', 'UPDATE', 'DELETE', 'DROP', 'CREATE', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE']
        for keyword in dangerous_keywords:
            if keyword in query_upper:
                return {'error': f'Keyword {keyword} is not allowed', 'status': 403}
        
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
        
        return {
            'success': True,
            'columns': columns,
            'data': result_data,
            'row_count': len(result_data),
            'timestamp': datetime.now().isoformat()
        }
        
    except oracledb.Error as error:
        return {'error': f'Oracle error: {str(error)}', 'timestamp': datetime.now().isoformat(), 'status': 500}
    except Exception as e:
        return {'error': f'Error: {str(e)}', 'timestamp': datetime.now().isoformat(), 'status': 500}
