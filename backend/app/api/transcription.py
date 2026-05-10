import json
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import PlainTextResponse

from app.api.deps import CurrentUser, DbSession
from app.core.transcription import transcribe_media, generate_srt, generate_vtt
from app.models.job import Job
from app.models.media import MediaFile
from app.models.project import Project
from app.schemas.transcription import TranscribeRequest

router = APIRouter(tags=["transcription"])


@router.post("/projects/{project_id}/transcribe", status_code=202)
def start_transcription(
    project_id: str,
    data: TranscribeRequest,
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
        job_type="transcribe",
        status="queued",
        params_json=json.dumps({
            "media_id": data.media_id,
            "model_size": data.model_size,
            "language": data.language,
        }),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        _run_transcription,
        job_id=job.id,
        file_path=media.file_path,
        model_size=data.model_size,
        language=data.language,
    )

    return {"job_id": job.id, "status": "queued"}


@router.get("/media/{media_id}/transcription")
def get_transcription(media_id: str, db: DbSession, current_user: CurrentUser):
    """Get the latest completed transcription for a media file."""
    media = db.query(MediaFile).filter(MediaFile.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    job = (
        db.query(Job)
        .filter(
            Job.job_type == "transcribe",
            Job.status == "done",
            Job.params_json.contains(media_id),
        )
        .order_by(Job.completed_at.desc())
        .first()
    )

    if not job or not job.result_json:
        raise HTTPException(status_code=404, detail="No transcription found for this media")

    return json.loads(job.result_json)


@router.get("/media/{media_id}/subtitles")
def download_subtitles(
    media_id: str,
    db: DbSession,
    current_user: CurrentUser,
    format: str = Query("srt", pattern="^(srt|vtt)$"),
):
    """Download subtitles as SRT or VTT file."""
    media = db.query(MediaFile).filter(MediaFile.id == media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    job = (
        db.query(Job)
        .filter(
            Job.job_type == "transcribe",
            Job.status == "done",
            Job.params_json.contains(media_id),
        )
        .order_by(Job.completed_at.desc())
        .first()
    )

    if not job or not job.result_json:
        raise HTTPException(status_code=404, detail="No transcription found for this media")

    result = json.loads(job.result_json)
    segments = result["segments"]

    if format == "vtt":
        content = generate_vtt(segments)
        media_type = "text/vtt"
        ext = "vtt"
    else:
        content = generate_srt(segments)
        media_type = "application/x-subrip"
        ext = "srt"

    base_name = media.filename.rsplit(".", 1)[0] if "." in media.filename else media.filename

    return PlainTextResponse(
        content=content,
        media_type=media_type,
        headers={"Content-Disposition": f'attachment; filename="{base_name}.{ext}"'},
    )


def _run_transcription(
    job_id: str,
    file_path: str,
    model_size: str,
    language: str | None,
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

        result = transcribe_media(file_path, model_size, language)

        job.status = "done"
        job.progress = 1.0
        job.completed_at = datetime.utcnow()
        job.result_json = json.dumps(result, ensure_ascii=False)
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
