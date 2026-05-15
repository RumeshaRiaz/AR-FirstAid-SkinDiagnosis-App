#!/bin/bash
echo "Starting DokTap Disease Detection Server..."
echo "Server will be accessible at:"
echo "  - Local: http://localhost:8000"
echo "  - Android Emulator: http://10.0.2.2:8000"
echo "  - Network: http://0.0.0.0:8000"
echo ""
cd "$(dirname "$0")"
uvicorn main:app --reload --host 0.0.0.0 --port 8000

