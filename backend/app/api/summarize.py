import json

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.api.deps import CurrentUser, DbSession
from app.core.chapters import generate_summary
from app.models.job import Job
from app.models.project import Project

router = APIRouter(tags=["summarize"])


class SummarizeRequest(BaseModel):
    transcription_job_id: str
    max_sentences: int = 5


@router.post("/projects/{project_id}/summarize")
def summarize_project(
    project_id: str,
    data: SummarizeRequest,
    db: DbSession,
    current_user: CurrentUser,
):
    """Generate an extractive summary from an existing transcription job."""
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

    if data.max_sentences < 1 or data.max_sentences > 20:
        raise HTTPException(status_code=422, detail="max_sentences must be between 1 and 20")

    summary = generate_summary(segments, max_sentences=data.max_sentences)

    return {"summary": summary}
