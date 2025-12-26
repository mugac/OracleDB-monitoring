from flask import Blueprint, jsonify, request
from datetime import datetime
from services import fetch_metrics, fetch_system_resources, run_custom_query
from config import Config

api = Blueprint('api', __name__)

@api.route('/api/health', methods=['GET'])
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


@api.route('/api/system-resources', methods=['GET'])
def get_system_resources():
    """Vrátí systémové zdroje (CPU, Memory, I/O)"""
    resources = fetch_system_resources()
    if resources is None:
        return jsonify({
            'error': 'Failed to fetch system resources from Oracle',
            'timestamp': datetime.now().isoformat()
        }), 500
    return jsonify(resources)


@api.route('/api/ping', methods=['GET'])
def ping():
    """Zdravotní check API"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat(),
        'database': f"{Config.ORACLE_USER}@{Config.ORACLE_HOST}:{Config.ORACLE_PORT}/{Config.ORACLE_SERVICE}"
    })


@api.route('/api/execute-query', methods=['POST'])
def execute_query():
    """Vykoná vlastní SQL dotaz (pouze SELECT)"""
    data = request.get_json()
    query = data.get('query', '').strip()
    
    if not query:
        return jsonify({'error': 'Query is required'}), 400
    
    result = run_custom_query(query)
    
    if 'error' in result:
        status = result.get('status', 500)
        # Remove status from result before sending
        if 'status' in result:
            del result['status']
        return jsonify(result), status
        
    return jsonify(result)

@api.route('/', methods=['GET'])
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
