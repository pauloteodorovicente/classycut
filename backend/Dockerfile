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

# Copy application code and startup script
COPY app/ ./app/
COPY alembic.ini ./
COPY start.sh ./
RUN chmod +x start.sh

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

CMD ["sh", "start.sh"]
