#!/bin/bash

# Oracle DB Monitoring Dashboard - Start Script (Linux)


echo "oracle monitoring dashboard"
echo ""

# cleanup
cleanup() {
    echo ""
    echo "stopping services..."
    if [ -n "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo "be stopped."
    fi
    if [ -n "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo "fe stopped."
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

# do you have all directories?
if [ ! -f "./backend/app.py" ]; then
    echo "backend/app.py not found!"
    echo "run this script from the project root folder (dbsmonitoring)."
    exit 1
fi

if [ ! -f "./frontend/package.json" ]; then
    echo "frontend/package.json not found!"
    echo "run this script from the project root folder (dbsmonitoring)."
    exit 1
fi

# do you even have python?
if [ ! -f "./backend/venv/bin/python" ]; then
    echo "venv not found. creating"
    echo ""
    cd backend
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
    deactivate
    cd ..
    echo "venv created"
    echo ""
fi

# you forgot to run "npm install" now i have to do it
if [ ! -d "./frontend/node_modules" ]; then
    echo "frontend dependencies not found. installing"
    echo ""
    cd frontend
    npm install
    cd ..
    echo "frontend dependencies installed"
    echo ""
fi

# please set up your .env file
if [ ! -f "./backend/.env" ]; then
    echo "env not found copying example"
    cp "./backend/.env.example" "./backend/.env"
    read -p "continue? (y/n) " response
    if [[ "$response" != "y" && "$response" != "Y" ]]; then
        echo "cancelled by user"
        exit 0
    fi
fi

cd backend
source venv/bin/activate
export PYTHONUNBUFFERED=1
python3 app.py > ../backend.log 2>&1 &
BACKEND_PID=$!
cd ..

echo "be started pid: $BACKEND_PID"
sleep 3

cd frontend
npm run dev > ../frontend.log 2>&1 &
FRONTEND_PID=$!
cd ..

echo "fe started pid: $FRONTEND_PID"
echo ""

echo "app started"
echo ""
echo "api:  http://localhost:5000"
echo "fe:    http://localhost:5173"
echo ""
echo "dash: http://localhost:5173"
echo ""
echo "press ctrl+c to stop servers"

# help on
echo "wait 5 seconds"
sleep 5

# browser open
echo "trying to open browser"
if command -v xdg-open &> /dev/null; then
    xdg-open "http://localhost:5173"
elif command -v gnome-open &> /dev/null; then
    gnome-open "http://localhost:5173"
else
    echo "please open manually http://localhost:5173"
fi

echo ""
echo "logs stored in backend.log and frontend.log"
echo "do not close this terminal window"

# Wait for processes
wait
