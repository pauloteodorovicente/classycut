#!/bin/sh
set -e

echo "Running Alembic migrations..."
PYTHONPATH=/app alembic upgrade head

echo "Starting server on port 8000..."
exec uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers 2
