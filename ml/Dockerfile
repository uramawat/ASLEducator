FROM python:3.11-slim

WORKDIR /app

# 1. Install dependencies first (Pinned to avoid NaN/Incompatibility issues)
RUN pip install --no-cache-dir \
    fastapi==0.109.0 \
    uvicorn==0.27.0 \
    "numpy<2.0.0" \
    "scipy<1.13.0" \
    fastdtw==0.3.4 \
    pydantic==2.6.0

# 2. Explicitly copy the folders to ensure they aren't skipped by context
COPY data/ /app/data/
COPY dtw_engine.py /app/
COPY main.py /app/

# 3. Create models directory just in case it's needed by any imports
RUN mkdir -p /app/models

EXPOSE 8000

# Using --log-level debug to catch why the vocabulary might be empty in Render logs
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "8000", "--log-level", "debug"]
