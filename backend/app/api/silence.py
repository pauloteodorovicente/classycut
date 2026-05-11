import json
import os
from datetime import datetime
from pathlib import Path

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.api.deps import CurrentUser, DbSession
from app.core.ffmpeg import detect_silence, cut_segments, extract_metadata
from app.models.job import Job
from app.models.media import MediaFile
from app.models.project import Project
from app.schemas.silence import SilenceDetectRequest, SilenceCutRequest

router = APIRouter(tags=["silence"])


@router.post("/projects/{project_id}/silence-detect", status_code=202)
def silence_detect(
    project_id: str,
    data: SilenceDetectRequest,
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
        job_type="silence_detect",
        status="queued",
        params_json=json.dumps({
            "media_id": data.media_id,
            "noise_db": data.noise_db,
            "min_duration": data.min_duration,
        }),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        _run_silence_detect,
        job_id=job.id,
        file_path=media.file_path,
        noise_db=data.noise_db,
        min_duration=data.min_duration,
        duration_ms=media.duration_ms,
    )

    return {"job_id": job.id, "status": "queued"}


@router.post("/projects/{project_id}/silence-cut", status_code=202)
def silence_cut(
    project_id: str,
    data: SilenceCutRequest,
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

    segments_dicts = [seg.model_dump() for seg in data.segments_to_keep]

    job = Job(
        project_id=project_id,
        job_type="silence_cut",
        status="queued",
        params_json=json.dumps({
            "media_id": data.media_id,
            "segments_to_keep": segments_dicts,
            "output_name": data.output_name,
        }),
    )
    db.add(job)
    db.commit()
    db.refresh(job)

    background_tasks.add_task(
        _run_silence_cut,
        job_id=job.id,
        project_id=project_id,
        file_path=media.file_path,
        segments_to_keep=segments_dicts,
        output_name=data.output_name,
        platform=data.platform,
        duration_s=(media.duration_ms or 0) / 1000,
    )

    return {"job_id": job.id, "status": "queued"}


def _run_silence_detect(
    job_id: str,
    file_path: str,
    noise_db: float,
    min_duration: float,
    duration_ms: int | None,
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

        silence_segments = detect_silence(file_path, noise_db, min_duration)

        # Build full segment list (speech + silence) for the frontend
        total_duration = duration_ms or 0
        all_segments = []
        cursor = 0

        for seg in silence_segments:
            # Speech before this silence
            if seg["start_ms"] > cursor:
                all_segments.append({
                    "start_ms": cursor,
                    "end_ms": seg["start_ms"],
                    "duration_ms": seg["start_ms"] - cursor,
                    "type": "speech",
                    "keep": True,
                })
            # The silence segment
            all_segments.append({
                "start_ms": seg["start_ms"],
                "end_ms": seg["end_ms"],
                "duration_ms": seg["duration_ms"],
                "type": "silence",
                "keep": False,
            })
            cursor = seg["end_ms"]

        # Speech after last silence
        if total_duration > 0 and cursor < total_duration:
            all_segments.append({
                "start_ms": cursor,
                "end_ms": total_duration,
                "duration_ms": total_duration - cursor,
                "type": "speech",
                "keep": True,
            })

        job.status = "done"
        job.progress = 1.0
        job.completed_at = datetime.utcnow()
        job.result_json = json.dumps({"segments": all_segments})
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


def _run_silence_cut(
    job_id: str,
    project_id: str,
    file_path: str,
    segments_to_keep: list[dict],
    output_name: str,
    platform: str | None = None,
    duration_s: float = 0,
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
        from app.core.presets import get_max_mb, get_vf_filter

        output_path = settings.upload_dir / project_id / output_name

        cut_segments(file_path, segments_to_keep, output_path)

        # Apply platform crop+scale if requested
        vf = get_vf_filter(platform) if platform else None
        if vf:
            import subprocess
            scaled_path = output_path.with_name(output_path.stem + "_scaled.mp4")
            cmd = [
                settings.ffmpeg_path,
                "-y",
                "-i", str(output_path),
                "-vf", vf,
                "-c:v", "libx264",
                "-crf", "23",
                "-c:a", "aac",
                "-b:a", "128k",
                str(scaled_path),
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
            if res.returncode != 0:
                raise RuntimeError(f"FFmpeg platform filter failed: {res.stderr}")
            output_path.unlink(missing_ok=True)
            scaled_path.rename(output_path)

        # Apply compression for platforms with max file size (e.g. WhatsApp 16 MB)
        max_mb = get_max_mb(platform) if platform else None
        if max_mb:
            current_size_mb = os.path.getsize(output_path) / 1024 / 1024
            if current_size_mb > max_mb:
                from app.core.compression import compress_video
                compressed_path = output_path.with_name(output_path.stem + "_cmp.mp4")
                compress_video(str(output_path), str(compressed_path), max_mb, duration_s)
                output_path.unlink(missing_ok=True)
                compressed_path.rename(output_path)

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
