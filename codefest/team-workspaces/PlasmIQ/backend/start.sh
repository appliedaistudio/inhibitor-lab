#!/bin/bash
# PlasmIQ Backend Startup Script

cd "$(dirname "$0")"

echo "🚀 Starting PlasmIQ Backend..."
echo ""

# Check for .env file
if [ ! -f ../.env ]; then
    echo "❌ Error: .env file not found"
    echo "Please create .env from .env.example"
    exit 1
fi

echo "📦 Environment configured"
echo "🗄️  Make sure MongoDB is running at localhost:27017"
echo ""

# Start the API server
echo "Starting FastAPI server on http://0.0.0.0:8000"
python3 -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
