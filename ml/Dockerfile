FROM python:3.11-slim

WORKDIR /app

# 1. Install dependencies
RUN pip install --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn==0.27.0 \
    "numpy<2.0.0" \
    "scipy<1.13.0" \
    fastdtw==0.3.4 \
    pydantic==2.6.0 \
    boto3

# 2. Copy application logic
COPY dtw_engine.py /app/
COPY main.py /app/
# (Optional) keep download_data.py but we won't use it for startup anymore
COPY download_data.py /app/

# Copy only the JSON mapping (11MB)
COPY data/WLASL_v0.3.json /app/data/WLASL_v0.3.json

RUN mkdir -p /app/data/landmarks
RUN mkdir -p /app/models

EXPOSE 8000

# Start command: BOOT IMMEDIATELY. 
# Landmarks will be lazy-downloaded from R2 on-demand.
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
