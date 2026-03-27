FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for OpenCV and MediaPipe
RUN apt-get update && apt-get install -y libgl1 libglib2.0-0 && rm -rf /var/lib/apt/lists/*

# Install dependencies using pip (matches what was mapped via uv)
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    mediapipe==0.10.14 \
    "numpy<2.0.0" \
    opencv-python-headless \
    pandas \
    psycopg2-binary \
    python-dotenv \
    python-multipart \
    requests \
    "tensorflow==2.15.0" \
    tqdm \
    yt-dlp \
    scikit-learn \
    scipy \
    fastdtw

COPY . .

# Expose FastAPI port
EXPOSE 8000

# Start server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
