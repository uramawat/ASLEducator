FROM python:3.11-slim

WORKDIR /app

# Install ONLY what is needed for the DTW Inference Engine
# (Removing TensorFlow, OpenCV, and MediaPipe saves ~1GB of image size and 800MB of RAM)
RUN pip install --no-cache-dir \
    fastapi \
    uvicorn \
    numpy \
    scipy \
    fastdtw \
    pydantic

COPY . .

# Expose FastAPI port
EXPOSE 8000

# Start server
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000"]
