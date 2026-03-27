#!/bin/bash
set -e

echo "==========================================="
echo "   ASLExperiment ML Pipeline Automation    "
echo "==========================================="

cd ml

echo "Step 1: Downloading WLASL Top 500 & Extracting Landmarks..."
uv run python pipeline_step1_data.py --vocab_size 500

echo "Step 2: Training the LSTM Model..."
uv run python pipeline_step2_train.py

echo "==========================================="
echo "Pipeline Complete! The model is saved to ml/models/asl_model.keras."
echo "You can now start the ML microservice by running:"
echo "cd ml && uv run uvicorn main:app --host 0.0.0.0 --port 8000"
echo "==========================================="
