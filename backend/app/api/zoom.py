import json
import os
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.api.deps import CurrentUser, DbSession
from app.core.ffmpeg import extract_metadata
from app.core.zoom import apply_zoom, generate_preset_keyframes
from app.models.job import Job
from app.models.media import MediaFile
from app.models.project import Project
from app.schemas.zoom import ZoomApplyRequest

router = APIRouter(tags=["zoom"])


@router.post("/projects/{project_id}/zoom-apply", status_code=202)
def zoom_apply(
    project_id: str,
    data: ZoomApplyRequest,
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

    if not data.keyframes and not data.preset:
        raise HTTPException(
            status_code=400,
            detail="Either keyframes or preset must be provided",
        )

    keyframes_dicts = None
    if data.keyframes:
        keyframes_dicts = [kf.model_dump() for kf in data.keyframes]

    job = Job(
        project_id=project_id,
        job_type="zoom_apply",
        status="queued",
        params_json=json.dumps({
            "media_id": data.media_id,
            "keyframes": keyframes_dicts,
            "preset": data.preset,
            "output_name": data.output_name,
        }),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        _run_zoom_apply,
        job_id=job.id,
        project_id=project_id,
        file_path=media.file_path,
        keyframes=keyframes_dicts,
        preset=data.preset,
        output_name=data.output_name,
        duration_ms=media.duration_ms,
        fps=media.fps,
        width=media.width,
        height=media.height,
    )

    return {"job_id": job.id, "status": "queued"}


def _run_zoom_apply(
    job_id: str,
    project_id: str,
    file_path: str,
    keyframes: list[dict] | None,
    preset: str | None,
    output_name: str,
    duration_ms: int | None,
    fps: float | None,
    width: int | None,
    height: int | None,
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

        # Generate keyframes from preset if needed
        if not keyframes and preset:
            keyframes = generate_preset_keyframes(preset, duration_ms or 0)

        if not keyframes:
            raise ValueError("No keyframes to apply")

        # Default FPS/dimensions if not available
        video_fps = fps or 30.0
        video_width = width or 1920
        video_height = height or 1080
        video_duration_ms = duration_ms or 0

        output_path = settings.export_dir / project_id / output_name

        apply_zoom(
            file_path=file_path,
            output_path=output_path,
            keyframes=keyframes,
            fps=video_fps,
            width=video_width,
            height=video_height,
            duration_ms=video_duration_ms,
        )

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
        db.flush()

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
