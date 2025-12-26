# Metriky
SQL_ACTIVE_SESSIONS = "SELECT COUNT(*) FROM V$SESSION WHERE STATUS='ACTIVE'"

SQL_TOTAL_SESSIONS = "SELECT COUNT(*) FROM V$SESSION WHERE USERNAME IS NOT NULL"

SQL_WAIT_EVENTS = """
    SELECT EVENT, COUNT(*) as CNT 
    FROM V$SESSION_WAIT
    WHERE EVENT NOT LIKE '%idle%'
    GROUP BY EVENT
    ORDER BY CNT DESC 
    FETCH FIRST 10 ROWS ONLY
"""

SQL_SYSTEM_EVENTS = """
    SELECT EVENT, TOTAL_WAITS, TIME_WAITED, AVERAGE_WAIT
    FROM V$SYSTEM_EVENT
    WHERE EVENT NOT LIKE '%SQL%' AND EVENT NOT LIKE '%Idle%'
    ORDER BY TIME_WAITED DESC
    FETCH FIRST 10 ROWS ONLY
"""

SQL_SGA_COMPONENTS = """
    SELECT COMPONENT, ROUND(CURRENT_SIZE/1024/1024,2) as SIZE_MB
    FROM V$SGA_DYNAMIC_COMPONENTS
    WHERE CURRENT_SIZE > 0 
    ORDER BY CURRENT_SIZE DESC
"""

SQL_TABLESPACE_USAGE = """
    SELECT TABLESPACE_NAME, 
           ROUND(100*USED_SPACE/TABLESPACE_SIZE,2) as PCT_USED,
           ROUND(USED_SPACE*8192/1024/1024,2) as USED_MB,
           ROUND(TABLESPACE_SIZE*8192/1024/1024,2) as TOTAL_MB
    FROM DBA_TABLESPACE_USAGE_METRICS
    ORDER BY PCT_USED DESC
"""

SQL_RECENT_ALERTS = """
    SELECT MESSAGE_TEXT, MESSAGE_LEVEL, ORIGINATING_TIMESTAMP
    FROM V$DIAG_ALERT_EXT
    WHERE ORIGINATING_TIMESTAMP > SYSDATE - 1/24
    ORDER BY ORIGINATING_TIMESTAMP DESC
    FETCH FIRST 20 ROWS ONLY
"""

SQL_LONG_RUNNING_SQL = """
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
"""

SQL_DATABASE_INFO = "SELECT NAME, OPEN_MODE, LOG_MODE FROM V$DATABASE"

SQL_USER_SESSIONS = """
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
"""

SQL_SESSION_DETAILS = """
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
"""

def get_active_sql_query(limit):
    return f"""
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
        FETCH FIRST {limit} ROWS ONLY
    """

SQL_TABLE_STATS = """
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
"""

# System Resources
SQL_OS_STAT = """
    SELECT STAT_NAME, VALUE 
    FROM V$OSSTAT 
    WHERE STAT_NAME IN ('BUSY_TIME', 'IDLE_TIME', 'NUM_CPUS', 'NUM_CPU_CORES', 
                        'PHYSICAL_MEMORY_BYTES', 'LOAD')
"""

SQL_SYSMETRIC = """
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
"""

SQL_SYS_TIME_MODEL = """
    SELECT STAT_NAME, ROUND(VALUE/1000000, 2) as VALUE_SEC
    FROM V$SYS_TIME_MODEL
    WHERE STAT_NAME IN ('DB CPU', 'background cpu time', 'DB time')
"""

SQL_SGA_STAT = """
    SELECT POOL, SUM(BYTES)/(1024*1024) as MB
    FROM V$SGASTAT
    WHERE POOL IS NOT NULL
    GROUP BY POOL
"""

SQL_TOTAL_SGA = "SELECT ROUND(SUM(VALUE)/1024/1024, 2) FROM V$SGA"

SQL_PGA_STAT = """
    SELECT NAME, ROUND(VALUE/1024/1024, 2) as MB
    FROM V$PGASTAT
    WHERE NAME IN ('total PGA allocated', 'total PGA inuse', 'maximum PGA allocated')
"""

SQL_IO_METRICS = """
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
"""
