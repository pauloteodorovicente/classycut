import json
import os
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.api.deps import CurrentUser, DbSession
from app.models.job import Job
from app.models.media import MediaFile
from app.models.project import Project

router = APIRouter(tags=["compression"])

MIN_TARGET_MB = 1.0
MAX_TARGET_MB = 4096.0


class CompressRequest(BaseModel):
    media_id: str
    target_mb: float
    output_name: str | None = None


@router.post("/projects/{project_id}/compress", status_code=202)
def compress_video(
    project_id: str,
    data: CompressRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
    current_user: CurrentUser,
):
    if not (MIN_TARGET_MB <= data.target_mb <= MAX_TARGET_MB):
        raise HTTPException(status_code=422, detail=f"target_mb must be between {MIN_TARGET_MB} and {MAX_TARGET_MB}")

    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    media = db.query(MediaFile).filter(MediaFile.id == data.media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    if media.media_type == "audio":
        raise HTTPException(status_code=422, detail="Compression is only available for video files")

    output_name = data.output_name or f"{media.filename.rsplit('.', 1)[0]}_compressed.mp4"

    job = Job(
        project_id=project_id,
        job_type="compress",
        status="queued",
        params_json=json.dumps({
            "media_id": data.media_id,
            "target_mb": data.target_mb,
            "output_name": output_name,
        }),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        _run_compress,
        job_id=job.id,
        project_id=project_id,
        file_path=media.file_path,
        duration_s=(media.duration_ms or 0) / 1000,
        target_mb=data.target_mb,
        output_name=output_name,
        original_size=media.file_size or 0,
    )

    return {"job_id": job.id, "status": "queued"}


def _run_compress(
    job_id: str,
    project_id: str,
    file_path: str,
    duration_s: float,
    target_mb: float,
    output_name: str,
    original_size: int,
):
    from app.config import settings
    from app.core.compression import compress_video
    from app.core.ffmpeg import extract_metadata
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return

        job.status = "processing"
        job.started_at = datetime.utcnow()
        db.commit()

        output_path = settings.upload_dir / project_id / output_name
        output_path.parent.mkdir(parents=True, exist_ok=True)

        def _update_progress(p: float):
            db.query(Job).filter(Job.id == job_id).update({"progress": round(p, 3)})
            db.commit()

        compress_video(file_path, output_path, target_mb, duration_s, progress_callback=_update_progress)

        metadata = extract_metadata(output_path)
        result_size = os.path.getsize(output_path)

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
            file_size=result_size,
            has_audio=metadata["has_audio"],
        )
        db.add(media)

        job.status = "done"
        job.progress = 1.0
        job.completed_at = datetime.utcnow()
        job.result_json = json.dumps({
            "media_id": media.id,
            "original_size": original_size,
            "result_size": result_size,
        })
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
