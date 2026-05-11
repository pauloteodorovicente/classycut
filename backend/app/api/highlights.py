import json
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.api.deps import CurrentUser, DbSession
from app.models.job import Job
from app.models.media import MediaFile
from app.models.project import Project

router = APIRouter(tags=["highlights"])


class HighlightsRequest(BaseModel):
    media_id: str
    sensitivity: float = 0.5
    min_duration: float = 3.0


@router.post("/projects/{project_id}/detect-highlights", status_code=202)
def detect_highlights(
    project_id: str,
    data: HighlightsRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
    current_user: CurrentUser,
):
    if not (0.0 <= data.sensitivity <= 1.0):
        raise HTTPException(status_code=422, detail="sensitivity must be between 0.0 and 1.0")
    if data.min_duration <= 0:
        raise HTTPException(status_code=422, detail="min_duration must be greater than 0")

    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    media = db.query(MediaFile).filter(MediaFile.id == data.media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    job = Job(
        project_id=project_id,
        job_type="detect_highlights",
        status="queued",
        params_json=json.dumps({
            "media_id": data.media_id,
            "sensitivity": data.sensitivity,
            "min_duration": data.min_duration,
        }),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        _run_detect_highlights,
        job_id=job.id,
        file_path=media.file_path,
        sensitivity=data.sensitivity,
        min_duration=data.min_duration,
    )

    return {"job_id": job.id, "status": "queued"}


def _run_detect_highlights(
    job_id: str,
    file_path: str,
    sensitivity: float,
    min_duration: float,
):
    from app.core.highlights import detect_highlights as _detect
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        job = db.query(Job).filter(Job.id == job_id).first()
        if not job:
            return

        job.status = "processing"
        job.started_at = datetime.utcnow()
        db.commit()

        highlights = _detect(file_path, sensitivity=sensitivity, min_duration=min_duration)

        job.status = "done"
        job.progress = 1.0
        job.completed_at = datetime.utcnow()
        job.result_json = json.dumps({"highlights": highlights})
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
