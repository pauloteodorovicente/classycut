import json
import os
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.api.deps import CurrentUser, DbSession
from app.core.export import export_video
from app.core.ffmpeg import extract_metadata
from app.models.job import Job
from app.models.media import MediaFile
from app.models.project import Project
from app.schemas.export import ExportRequest

router = APIRouter(tags=["export"])


@router.post("/projects/{project_id}/export", status_code=202)
def export(
    project_id: str,
    data: ExportRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
    current_user: CurrentUser,
):
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    media = db.query(MediaFile).filter(MediaFile.id == data.media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    job = Job(
        project_id=project_id,
        job_type="export",
        status="queued",
        params_json=json.dumps({
            "media_id": data.media_id,
            "preset": data.preset,
            "output_name": data.output_name,
        }),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        _run_export,
        job_id=job.id,
        project_id=project_id,
        file_path=media.file_path,
        preset=data.preset,
        output_name=data.output_name,
    )

    return {"job_id": job.id, "status": "queued"}


def _run_export(
    job_id: str,
    project_id: str,
    file_path: str,
    preset: str,
    output_name: str,
):
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return

        job.status = "processing"
        job.started_at = datetime.utcnow()
        db.commit()

        from app.config import settings

        output_path = settings.export_dir / project_id / output_name
        export_video(file_path, output_path, preset)

        metadata = extract_metadata(output_path)
        file_size = os.path.getsize(output_path)

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
