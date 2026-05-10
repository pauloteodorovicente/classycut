import json
import os
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException, Query
from fastapi.responses import PlainTextResponse
from pydantic import BaseModel

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

    result = json.loads(job.result_json)
    result["job_id"] = job.id
    return result


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


class BurnSubtitlesRequest(BaseModel):
    media_id: str
    transcription_job_id: str
    font_size: str = "medium"   # small | medium | large
    position: str = "bottom"    # bottom | top
    output_name: str | None = None


@router.post("/projects/{project_id}/burn-subtitles", status_code=202)
def burn_subtitles_endpoint(
    project_id: str,
    data: BurnSubtitlesRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
    current_user: CurrentUser,
):
    """Burn transcription subtitles directly into the video frames."""
    project = db.query(Project).filter(
        Project.id == project_id, Project.user_id == current_user.id
    ).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    media = db.query(MediaFile).filter(MediaFile.id == data.media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    transcription_job = db.query(Job).filter(
        Job.id == data.transcription_job_id,
        Job.status == "done",
    ).first()
    if not transcription_job or not transcription_job.result_json:
        raise HTTPException(status_code=400, detail="Transcription job not found or not completed")

    ext = media.filename.rsplit(".", 1)[-1] if "." in media.filename else "mp4"
    base = media.filename.rsplit(".", 1)[0] if "." in media.filename else media.filename
    output_name = data.output_name or f"{base}_legendado.{ext}"

    job = Job(
        project_id=project_id,
        job_type="burn_subtitles",
        status="queued",
        params_json=json.dumps({
            "media_id": data.media_id,
            "transcription_job_id": data.transcription_job_id,
            "font_size": data.font_size,
            "position": data.position,
            "output_name": output_name,
        }),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        _run_burn_subtitles,
        job_id=job.id,
        project_id=project_id,
        video_path=media.file_path,
        segments=json.loads(transcription_job.result_json).get("segments", []),
        font_size=data.font_size,
        position=data.position,
        output_name=output_name,
    )

    return {"job_id": job.id, "status": "queued"}


def _run_burn_subtitles(
    job_id: str,
    project_id: str,
    video_path: str,
    segments: list[dict],
    font_size: str,
    position: str,
    output_name: str,
) -> None:
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
        from app.core.subtitles import burn_subtitles
        from app.core.ffmpeg import extract_metadata

        output_path = settings.export_dir / project_id / output_name
        burn_subtitles(video_path, segments, output_path, font_size, position)

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
