# build v2
FROM mwader/static-ffmpeg:7.0 AS ffmpeg-builder

FROM python:3.12-slim

# Copy statically compiled ffmpeg binaries (no apt-get needed)
COPY --from=ffmpeg-builder /ffmpeg /usr/local/bin/ffmpeg
COPY --from=ffmpeg-builder /ffprobe /usr/local/bin/ffprobe

WORKDIR /app

# Install Python dependencies
# Paths are relative to the repository root (Railway build context)
COPY backend/pyproject.toml ./pyproject.toml
RUN pip install --no-cache-dir . && \
    pip install --no-cache-dir uvicorn[standard]

# Copy application code and startup script
COPY backend/app/ ./app/
COPY backend/alembic.ini ./alembic.ini
COPY backend/start.sh ./start.sh
RUN chmod +x start.sh

# Create storage directories
RUN mkdir -p /data/uploads /data/projects /data/exports /data/temp

# Environment defaults (override via Railway Variables)
ENV CLASSYCUT_DATABASE_URL="sqlite:////data/classycut.db" \
    CLASSYCUT_UPLOAD_DIR="/data/uploads" \
    CLASSYCUT_PROJECT_DIR="/data/projects" \
    CLASSYCUT_EXPORT_DIR="/data/exports" \
    CLASSYCUT_TEMP_DIR="/data/temp" \
    CLASSYCUT_DEBUG="false" \
    CLASSYCUT_CORS_ORIGINS='["*"]'

EXPOSE 8000

CMD ["sh", "start.sh"]
