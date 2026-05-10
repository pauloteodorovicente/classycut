FROM python:3.12-slim

# Install FFmpeg
RUN apt-get update && \
    apt-get install -y --no-install-recommends ffmpeg && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Install Python dependencies
COPY pyproject.toml ./
RUN pip install --no-cache-dir . && \
    pip install --no-cache-dir uvicorn[standard]

# Copy application code
COPY app/ ./app/

# Create storage directories
RUN mkdir -p /data/uploads /data/projects /data/exports /data/temp

# Environment defaults (override via docker-compose or .env)
ENV CLASSYCUT_DATABASE_URL="sqlite:////data/classycut.db" \
    CLASSYCUT_UPLOAD_DIR="/data/uploads" \
    CLASSYCUT_PROJECT_DIR="/data/projects" \
    CLASSYCUT_EXPORT_DIR="/data/exports" \
    CLASSYCUT_TEMP_DIR="/data/temp" \
    CLASSYCUT_DEBUG="false" \
    CLASSYCUT_CORS_ORIGINS='["http://localhost","http://localhost:80"]'

EXPOSE 8000

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "2"]
