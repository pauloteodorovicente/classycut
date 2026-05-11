import json
import os
import re
import subprocess
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException
from pydantic import BaseModel

from app.api.deps import CurrentUser, DbSession
from app.core.upscale import is_realesrgan_available
from app.models.job import Job
from app.models.media import MediaFile
from app.models.project import Project

router = APIRouter(tags=["upscale"])

VALID_FACTORS = {2, 4}
VALID_METHODS = {"ffmpeg", "realesrgan"}


class UpscaleRequest(BaseModel):
    media_id: str
    factor: int = 2
    method: str = "ffmpeg"
    output_name: str | None = None


@router.get("/upscale/check-realesrgan")
def check_realesrgan():
    """Return whether the Real-ESRGAN binary is installed on the host."""
    return {"available": is_realesrgan_available()}


@router.post("/projects/{project_id}/upscale", status_code=202)
def upscale_video(
    project_id: str,
    data: UpscaleRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
    current_user: CurrentUser,
):
    if data.factor not in VALID_FACTORS:
        raise HTTPException(status_code=422, detail=f"factor must be one of {VALID_FACTORS}")
    if data.method not in VALID_METHODS:
        raise HTTPException(status_code=422, detail=f"method must be one of {VALID_METHODS}")
    if data.method == "realesrgan" and not is_realesrgan_available():
        raise HTTPException(status_code=422, detail="Real-ESRGAN binary is not installed on this server")

    project = db.query(Project).filter(Project.id == project_id, Project.user_id == current_user.id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    media = db.query(MediaFile).filter(MediaFile.id == data.media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    if media.media_type == "audio":
        raise HTTPException(status_code=422, detail="Upscale is only available for video files")

    suffix = "mp4" if data.method == "ffmpeg" else "mp4"
    output_name = data.output_name or f"{media.filename.rsplit('.', 1)[0]}_{data.factor}x.{suffix}"

    job = Job(
        project_id=project_id,
        job_type="upscale",
        status="queued",
        params_json=json.dumps({
            "media_id": data.media_id,
            "factor": data.factor,
            "method": data.method,
            "output_name": output_name,
        }),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        _run_upscale,
        job_id=job.id,
        project_id=project_id,
        file_path=media.file_path,
        duration_s=(media.duration_ms or 0) / 1000,
        factor=data.factor,
        method=data.method,
        output_name=output_name,
        original_width=media.width,
        original_height=media.height,
    )

    return {"job_id": job.id, "status": "queued"}


def _parse_time_seconds(line: str) -> float | None:
    match = re.search(r"time=(\d+):(\d+):([\d.]+)", line)
    if not match:
        return None
    h, m, s = int(match.group(1)), int(match.group(2)), float(match.group(3))
    return h * 3600 + m * 60 + s


def _run_upscale(
    job_id: str,
    project_id: str,
    file_path: str,
    duration_s: float,
    factor: int,
    method: str,
    output_name: str,
    original_width: int | None,
    original_height: int | None,
):
    from app.config import settings
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

        if method == "ffmpeg":
            # FFmpeg with Popen for progress tracking
            cmd = [
                settings.ffmpeg_path,
                "-y",
                "-i", file_path,
                "-vf", f"scale=iw*{factor}:ih*{factor}:flags=lanczos",
                "-c:v", "libx264",
                "-crf", "18",
                "-preset", "fast",
                "-c:a", "copy",
                "-movflags", "+faststart",
                str(output_path),
            ]
            proc = subprocess.Popen(cmd, stderr=subprocess.PIPE, stdout=subprocess.DEVNULL, text=True)
            for line in proc.stderr:
                if duration_s > 0:
                    t = _parse_time_seconds(line)
                    if t is not None:
                        progress = min(t / duration_s, 0.99)
                        db.query(Job).filter(Job.id == job_id).update({"progress": round(progress, 3)})
                        db.commit()
            proc.wait()
            if proc.returncode != 0:
                raise RuntimeError(f"FFmpeg upscale failed (exit {proc.returncode})")
        else:
            # Real-ESRGAN — no granular progress, update to 0.1 when starting
            db.query(Job).filter(Job.id == job_id).update({"progress": 0.1})
            db.commit()
            from app.core.upscale import upscale_video
            upscale_video(file_path, output_path, scale_factor=factor, method="realesrgan")

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
            "original_width": original_width,
            "original_height": original_height,
            "result_width": metadata["width"],
            "result_height": metadata["height"],
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
