# Oracle Database 23ai Free Monitoring Dashboard

Real-time monitoring dashboard for Oracle Database 23ai Free without Enterprise Manager or licensed diagnostic packs.

## Overview

This application provides a web-based monitoring interface for Oracle Database 23ai Free, featuring real-time metrics, session monitoring, performance statistics, and SQL query execution.

**Key Features:**

- Real-time database metrics and session monitoring
- Active SQL and wait events tracking
- Tablespace and storage management
- System resource visualization
- SQL query interface with export capabilities
- No Oracle Instant Client required (uses python-oracledb thin mode)

**Technology Stack:**

- Backend: Python 3.9+, Flask, Flask-CORS, python-oracledb
- Frontend: React 18, Vite, Recharts
- Database: Oracle Database 23ai Free

## Prerequisites

- Python 3.9 or higher
- Node.js 18 or higher
- Oracle Database 23ai Free (running and accessible)

## Installation

### 1. Clone the repository

```bash
git clone https://github.com/mugac/sdbs-monitoring.git
cd sdbs-monitoring
```

### 2. Backend Setup

Navigate to the backend directory and install Python dependencies. Using a virtual environment is strongly recommended:

```bash
cd backend
python -m venv venv

# Activate virtual environment
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt
```

#### Configure Database Connection

Create a `.env` file in the `backend` directory:

#### Configure Database Connection

Create a `.env` file in the `backend` directory:

```
ORACLE_USER=system
ORACLE_PASSWORD=your_password
ORACLE_HOST=localhost
ORACLE_PORT=1521
ORACLE_SERVICE=FREEPDB1
```

**Required Database Privileges:**

The database user needs SELECT privileges on system views:

```sql
GRANT SELECT ON V_$SESSION TO your_user;
GRANT SELECT ON V_$SESSION_WAIT TO your_user;
GRANT SELECT ON V_$SQL TO your_user;
GRANT SELECT ON V_$SGA_DYNAMIC_COMPONENTS TO your_user;
GRANT SELECT ON DBA_TABLESPACES TO your_user;
GRANT SELECT ON DBA_DATA_FILES TO your_user;
GRANT SELECT ON DBA_FREE_SPACE TO your_user;
GRANT SELECT ON DBA_TABLES TO your_user;
GRANT SELECT ON DBA_SEGMENTS TO your_user;
```

### 3. Frontend Setup

Navigate to the frontend directory and install dependencies:

```bash
cd frontend
npm install
```

## Running the Application

### Option 1: Using start.bat (Windows)

The simplest way to start both backend and frontend:

```bash
start.bat
```

This will start the backend on `http://localhost:5000` and frontend on `http://localhost:5173`.

### Option 2: Manual Start (Recommended for Development)

Start backend and frontend in separate terminal windows:

**Terminal 1 - Backend:**

```bash
cd backend
venv\Scripts\activate  # Windows
# source venv/bin/activate  # Linux/macOS
python app.py
```

**Terminal 2 - Frontend:**

```bash
cd frontend
npm i # install dependencies
npm run dev
```

### Accessing the Application

Open your browser and navigate to: `http://localhost:5173`

## Project Structure

```
dbsmonitoring/
├── backend/
│   ├── app.py                  # Flask backend application
│   ├── requirements.txt        # Python dependencies
│   ├── test_connection.py      # Database connection test
│   └── .env                    # Database configuration (create this)
├── frontend/
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── tabs/          # Tab components
│   │   │   └── ...            # Various dashboard components
│   │   ├── App.jsx            # Main application component
│   │   └── main.jsx           # Application entry point
│   ├── package.json           # Node.js dependencies
│   └── vite.config.js         # Vite configuration
├── start.bat                  # Windows startup script
├── stop.bat                   # Windows shutdown script
└── README.md                  # This file
```

## Features

### Dashboard Tabs

1. **Overview** - Database information and system status
2. **Sessions** - Active and user sessions monitoring
3. **Performance** - Wait events and system resource metrics
4. **Active SQL** - Currently executing SQL statements
5. **SQL Query** - Execute custom queries with export functionality
6. **Storage** - Tablespace usage and management
7. **Table Stats** - Table and segment statistics
8. **System Resources** - SGA components and system events

## Troubleshooting

### Backend Connection Issues

- Verify Oracle Database is running: `lsnrctl status`
- Check `.env` file credentials are correct
- Ensure port 1521 is accessible
- Verify service name matches your database configuration

### Frontend Not Receiving Data

- Confirm backend is running on port 5000
- Check browser console (F12) for network errors
- Verify proxy configuration in `vite.config.js`

### CORS Errors

- Ensure `flask-cors` is installed: `pip install flask-cors`
- Verify `CORS(app)` is present in `app.py`

## Dependencies

### Backend (requirements.txt)

- flask==3.0.0
- flask-cors==4.0.0
- oracledb==2.0.0
- python-dotenv==1.0.0

### Frontend (package.json)

- react: ^18.2.0
- react-dom: ^18.2.0
- axios: ^1.6.2
- recharts: ^3.4.1
- vite: ^5.0.8

## License

This project is open source and available for educational and development purposes.
