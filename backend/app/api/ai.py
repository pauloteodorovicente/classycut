import json
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.api.deps import DbSession
from app.models.job import Job
from app.models.media import MediaFile
from app.models.project import Project
from app.schemas.ai import ChaptersRequest, HighlightsRequest, SummaryRequest

router = APIRouter(tags=["ai"])


@router.post("/projects/{project_id}/highlights", status_code=202)
def detect_highlights(
    project_id: str,
    data: HighlightsRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    media = db.query(MediaFile).filter(MediaFile.id == data.media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    job = Job(
        project_id=project_id,
        job_type="highlights",
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
        _run_highlights,
        job_id=job.id,
        file_path=media.file_path,
        sensitivity=data.sensitivity,
        min_duration=data.min_duration,
    )

    return {"job_id": job.id, "status": "queued"}


@router.post("/projects/{project_id}/chapters", status_code=202)
def auto_chapters(
    project_id: str,
    data: ChaptersRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    media = db.query(MediaFile).filter(MediaFile.id == data.media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Look for existing transcription job for this media
    transcription_job = (
        db.query(Job)
        .filter(
            Job.project_id == project_id,
            Job.job_type == "transcribe",
            Job.status == "done",
        )
        .order_by(Job.completed_at.desc())
        .first()
    )

    if not transcription_job or not transcription_job.result_json:
        raise HTTPException(
            status_code=400,
            detail="Transcription required. Run transcription first.",
        )

    transcription_result = json.loads(transcription_job.result_json)

    job = Job(
        project_id=project_id,
        job_type="chapters",
        status="queued",
        params_json=json.dumps({
            "media_id": data.media_id,
            "min_chapter_duration": data.min_chapter_duration,
        }),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        _run_chapters,
        job_id=job.id,
        transcription_segments=transcription_result.get("segments", []),
        min_chapter_duration=data.min_chapter_duration,
    )

    return {"job_id": job.id, "status": "queued"}


@router.post("/projects/{project_id}/summary", status_code=202)
def auto_summary(
    project_id: str,
    data: SummaryRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    media = db.query(MediaFile).filter(MediaFile.id == data.media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    # Look for existing transcription job for this media
    transcription_job = (
        db.query(Job)
        .filter(
            Job.project_id == project_id,
            Job.job_type == "transcribe",
            Job.status == "done",
        )
        .order_by(Job.completed_at.desc())
        .first()
    )

    if not transcription_job or not transcription_job.result_json:
        raise HTTPException(
            status_code=400,
            detail="Transcription required. Run transcription first.",
        )

    transcription_result = json.loads(transcription_job.result_json)

    job = Job(
        project_id=project_id,
        job_type="summary",
        status="queued",
        params_json=json.dumps({
            "media_id": data.media_id,
            "max_sentences": data.max_sentences,
        }),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        _run_summary,
        job_id=job.id,
        transcription_segments=transcription_result.get("segments", []),
        max_sentences=data.max_sentences,
    )

    return {"job_id": job.id, "status": "queued"}


def _run_highlights(
    job_id: str,
    file_path: str,
    sensitivity: float,
    min_duration: float,
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

        from app.core.highlights import detect_highlights

        highlights = detect_highlights(file_path, sensitivity, min_duration)

        job.status = "done"
        job.progress = 1.0
        job.completed_at = datetime.utcnow()
        job.result_json = json.dumps({
            "highlights": highlights,
            "count": len(highlights),
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


def _run_chapters(
    job_id: str,
    transcription_segments: list[dict],
    min_chapter_duration: float,
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

        from app.core.chapters import generate_chapters

        chapters = generate_chapters(transcription_segments, min_chapter_duration)

        job.status = "done"
        job.progress = 1.0
        job.completed_at = datetime.utcnow()
        job.result_json = json.dumps({
            "chapters": chapters,
            "count": len(chapters),
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


def _run_summary(
    job_id: str,
    transcription_segments: list[dict],
    max_sentences: int,
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

        from app.core.chapters import generate_summary

        summary = generate_summary(transcription_segments, max_sentences)

        job.status = "done"
        job.progress = 1.0
        job.completed_at = datetime.utcnow()
        job.result_json = json.dumps({
            "summary": summary,
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
