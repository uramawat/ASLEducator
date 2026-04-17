#!/bin/bash

# 1. Start Python ML service in the background
echo "Starting Python ML Service on port 8000..."
uvicorn main:app --host 0.0.0.0 --port 8000 &

# 2. Start Rust Backend on the port provided by Render (defaulting to 3000)
# We use the PORT environment variable which Render sets automatically
echo "Starting Rust Backend on port ${PORT:-3000}..."
./backend
