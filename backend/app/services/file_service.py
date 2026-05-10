import shutil
import uuid
from pathlib import Path

from fastapi import UploadFile

from app.config import settings


def save_upload(file: UploadFile, project_id: str) -> Path:
    """Save an uploaded file to storage and return the path."""
    project_upload_dir = settings.upload_dir / project_id
    project_upload_dir.mkdir(parents=True, exist_ok=True)

    # Generate unique filename preserving extension
    ext = Path(file.filename or "unknown").suffix
    unique_name = f"{uuid.uuid4().hex}{ext}"
    dest = project_upload_dir / unique_name

    with open(dest, "wb") as buffer:
        shutil.copyfileobj(file.file, buffer)

    return dest


def delete_file(file_path: str | Path) -> None:
    """Delete a file from storage."""
    path = Path(file_path)
    if path.exists():
        path.unlink()
