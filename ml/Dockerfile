FROM python:3.11-slim

WORKDIR /app

# 1. Install dependencies (Added boto3 for R2 support)
RUN pip install --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn==0.27.0 \
    "numpy<2.0.0" \
    "scipy<1.13.0" \
    fastdtw==0.3.4 \
    pydantic==2.6.0 \
    boto3

# 2. Copy application logic (NOT data anymore!)
COPY dtw_engine.py /app/
COPY main.py /app/
COPY download_data.py /app/

# Copy only the JSON mapping (small 11MB file is fine for Git)
COPY data/WLASL_v0.3.json /app/data/WLASL_v0.3.json

RUN mkdir -p /app/data/landmarks
RUN mkdir -p /app/models

EXPOSE 8000

# Start command: Sync data from R2, then start server
CMD python download_data.py && uvicorn main:app --host 0.0.0.0 --port 8000
