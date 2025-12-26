from flask import Flask
from flask_cors import CORS
from config import Config
from routes import api

app = Flask(__name__)
CORS(app)  # Povolí CORS pro frontend

# Register Blueprint
app.register_blueprint(api)

if __name__ == '__main__':
    print("=" * 60)
    print("Starting Oracle Monitoring Backend...")
    print(f"Database: {Config.ORACLE_USER}@{Config.ORACLE_HOST}:{Config.ORACLE_PORT}/{Config.ORACLE_SERVICE}")
    print(f"API will be available at: http://localhost:5000")
    print("=" * 60)
    app.run(host='0.0.0.0', port=5000, debug=True)
