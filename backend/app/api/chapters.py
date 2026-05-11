import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.deps import CurrentUser, DbSession
from app.core.chapters import generate_chapters
from app.models.job import Job
from app.models.project import Project

router = APIRouter(tags=["chapters"])


class ChaptersRequest(BaseModel):
    transcription_job_id: str
    min_duration_s: float = 60.0


@router.post("/projects/{project_id}/generate-chapters")
def generate_project_chapters(
    project_id: str,
    data: ChaptersRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    """Generate chapters synchronously from an existing transcription job."""
    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    transcription_job = db.query(Job).filter(
        Job.id == data.transcription_job_id,
        Job.status == "done",
    ).first()
    if not transcription_job or not transcription_job.result_json:
        raise HTTPException(status_code=400, detail="Transcription job not found or not completed")

    result = json.loads(transcription_job.result_json)
    segments = result.get("segments", [])

    if not segments:
        raise HTTPException(status_code=422, detail="Transcription has no segments")

    if data.min_duration_s <= 0:
        raise HTTPException(status_code=422, detail="min_duration_s must be greater than 0")

    chapters = generate_chapters(segments, min_chapter_duration=data.min_duration_s)

    return {"chapters": chapters}
