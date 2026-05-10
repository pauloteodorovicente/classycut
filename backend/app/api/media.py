import json
import os
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException, UploadFile
from fastapi.responses import FileResponse, StreamingResponse

from app.api.deps import CurrentUser, DbSession
from app.core.ffmpeg import extract_metadata, merge_video_audio, extract_waveform
from app.models.job import Job
from app.models.media import MediaFile
from app.models.project import Project
from app.schemas.media import MediaResponse, MergeRequest
from app.services.file_service import save_upload

router = APIRouter(tags=["media"])


@router.post("/projects/{project_id}/media", response_model=list[MediaResponse], status_code=201)
def upload_media(project_id: str, files: list[UploadFile], db: DbSession, current_user: CurrentUser):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    results = []
    for file in files:
        # Save file to disk
        file_path = save_upload(file, project_id)

        # Extract metadata
        metadata = extract_metadata(file_path)
        file_size = os.path.getsize(file_path)

        # Create DB record
        media = MediaFile(
            project_id=project_id,
            filename=file.filename or "unknown",
            file_path=str(file_path),
            media_type=metadata["media_type"],
            duration_ms=metadata["duration_ms"],
            width=metadata["width"],
            height=metadata["height"],
            fps=metadata["fps"],
            codec=metadata["codec"],
            file_size=file_size,
            has_audio=metadata["has_audio"],
        )
        db.add(media)
        results.append(media)

    db.commit()
    for media in results:
        db.refresh(media)

    return results


@router.get("/projects/{project_id}/media", response_model=list[MediaResponse])
def list_media(project_id: str, db: DbSession, current_user: CurrentUser):
    media_files = (
        db.query(MediaFile)
        .filter(MediaFile.project_id == project_id)
        .order_by(MediaFile.created_at.desc())
        .all()
    )
    return media_files


@router.get("/media/{media_id}", response_model=MediaResponse)
def get_media(media_id: str, db: DbSession, current_user: CurrentUser):
    media = db.query(MediaFile).filter(MediaFile.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    return media


@router.get("/media/{media_id}/waveform")
def get_waveform(media_id: str, db: DbSession, current_user: CurrentUser, samples: int = 800):
    """Return normalized waveform amplitude data for visualization."""
    media = db.query(MediaFile).filter(MediaFile.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    data = extract_waveform(media.file_path, samples)
    return {"samples": data}


@router.get("/media/{media_id}/stream")
def stream_media(media_id: str, db: DbSession, current_user: CurrentUser):
    """Stream media file with range request support for video playback."""
    media = db.query(MediaFile).filter(MediaFile.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    file_path = Path(media.file_path)
    if not file_path.exists():
        raise HTTPException(status_code=404, detail="File not found on disk")

    # Determine content type
    ext = file_path.suffix.lower()
    content_types = {
        ".mp4": "video/mp4",
        ".mov": "video/quicktime",
        ".m4a": "audio/mp4",
        ".mp3": "audio/mpeg",
        ".wav": "audio/wav",
        ".webm": "video/webm",
    }
    content_type = content_types.get(ext, "application/octet-stream")

    return FileResponse(
        path=str(file_path),
        media_type=content_type,
        filename=media.filename,
    )


@router.delete("/media/{media_id}", status_code=204)
def delete_media(media_id: str, db: DbSession, current_user: CurrentUser):
    media = db.query(MediaFile).filter(MediaFile.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Delete file from disk
    file_path = Path(media.file_path)
    if file_path.exists():
        file_path.unlink()

    db.delete(media)
    db.commit()


@router.post("/projects/{project_id}/merge", response_model=dict, status_code=202)
def merge_media(
    project_id: str,
    data: MergeRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
    current_user: CurrentUser,
):
    """Merge a video file with an audio file in the background."""
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    video = db.query(MediaFile).filter(MediaFile.id == data.video_media_id).first()
    audio = db.query(MediaFile).filter(MediaFile.id == data.audio_media_id).first()

    if not video:
        raise HTTPException(status_code=404, detail="Video media not found")
    if not audio:
        raise HTTPException(status_code=404, detail="Audio media not found")

    # Create job
    job = Job(
        project_id=project_id,
        job_type="merge",
        status="queued",
        params_json=json.dumps({
            "video_media_id": data.video_media_id,
            "audio_media_id": data.audio_media_id,
            "output_name": data.output_name,
        }),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    # Run merge in background
    background_tasks.add_task(
        _run_merge,
        job_id=job.id,
        project_id=project_id,
        video_path=video.file_path,
        audio_path=audio.file_path,
        output_name=data.output_name,
        db_url=str(db.bind.url) if db.bind else "sqlite:///./storage/classycut.db",
    )

    return {"job_id": job.id, "status": "queued"}


def _run_merge(
    job_id: str,
    project_id: str,
    video_path: str,
    audio_path: str,
    output_name: str,
    db_url: str,
):
    """Background task to merge video and audio."""
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return

        job.status = "processing"
        job.started_at = datetime.utcnow()
        db.commit()

        # Determine output path
        from app.config import settings

        output_path = settings.upload_dir / project_id / output_name

        # Run merge
        merge_video_audio(video_path, audio_path, output_path)

        # Extract metadata of merged file
        metadata = extract_metadata(output_path)
        file_size = os.path.getsize(output_path)

        # Create media record for the result
        media = MediaFile(
            project_id=project_id,
            filename=output_name,
            file_path=str(output_path),
            media_type=metadata["media_type"],
            duration_ms=metadata["duration_ms"],
            width=metadata["width"],
            height=metadata["height"],
            fps=metadata["fps"],
            codec=metadata["codec"],
            file_size=file_size,
            has_audio=metadata["has_audio"],
        )
        db.add(media)

        # Update job
        job.status = "done"
        job.progress = 1.0
        job.completed_at = datetime.utcnow()
        job.result_json = json.dumps({"media_id": media.id})
        db.commit()

    except Exception as e:
        job = db.query(Job).filter(Job.id == job_id).first()
        if job:
            job.status = "error"
            job.error_message = str(e)
            job.completed_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()
