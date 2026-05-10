from fastapi import APIRouter, HTTPException

from app.api.deps import DbSession
from app.models.job import Job
from app.schemas.job import JobResponse

router = APIRouter(prefix="/jobs", tags=["jobs"])


@router.get("", response_model=list[JobResponse])
def list_jobs(db: DbSession, status: str | None = None, project_id: str | None = None):
    query = db.query(Job)
    if status:
        query = query.filter(Job.status == status)
    if project_id:
        query = query.filter(Job.project_id == project_id)
    return query.order_by(Job.created_at.desc()).all()


@router.get("/{job_id}", response_model=JobResponse)
def get_job(job_id: str, db: DbSession):
    job = db.query(Job).filter(Job.id == job_id).first()
    if not job:
        raise HTTPException(status_code=404, detail="Job not found")
    return job
