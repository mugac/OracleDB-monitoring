import oracledb
from config import Config

def get_oracle_connection():
    """Vytvoří nové připojení k Oracle DB v thin mode (bez Instant Client)"""
    try:
        # Pokud se připojujeme jako SYS, použijeme SYSDBA mode
        if Config.ORACLE_USER.upper() == 'SYS':
            conn = oracledb.connect(
                user=Config.ORACLE_USER,
                password=Config.ORACLE_PASSWORD,
                host=Config.ORACLE_HOST,
                port=int(Config.ORACLE_PORT),
                service_name=Config.ORACLE_SERVICE,
                mode=oracledb.AUTH_MODE_SYSDBA
            )
        else:
            conn = oracledb.connect(
                user=Config.ORACLE_USER,
                password=Config.ORACLE_PASSWORD,
                host=Config.ORACLE_HOST,
                port=int(Config.ORACLE_PORT),
                service_name=Config.ORACLE_SERVICE
            )
        return conn
    except oracledb.Error as error:
        print(f"Oracle connection error: {error}")
        raise
