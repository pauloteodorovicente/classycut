import json
import os
from datetime import datetime

from fastapi import APIRouter, BackgroundTasks, HTTPException

from app.api.deps import DbSession
from app.core.export import export_video
from app.core.ffmpeg import extract_metadata
from app.core.upscale import upscale_video
from app.models.job import Job
from app.models.media import MediaFile
from app.models.project import Project
from app.schemas.batch import BatchExportRequest, UpscaleRequest

router = APIRouter(tags=["batch"])


@router.post("/projects/{project_id}/batch-export", status_code=202)
def batch_export(
    project_id: str,
    data: BatchExportRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if not data.media_ids:
        raise HTTPException(status_code=400, detail="No media IDs provided")

    # Validate all media files exist
    media_files = []
    for media_id in data.media_ids:
        media = db.query(MediaFile).filter(MediaFile.id == media_id).first()
        if not media:
            raise HTTPException(status_code=404, detail=f"Media not found: {media_id}")
        media_files.append(media)

    # Create a parent job to track the batch
    parent_job = Job(
        project_id=project_id,
        job_type="batch_export",
        status="queued",
        params_json=json.dumps({
            "media_ids": data.media_ids,
            "preset": data.preset,
            "total": len(data.media_ids),
        }),
    )
    db.add(parent_job)
    db.commit()
    db.refresh(parent_job)

    # Create individual child jobs
    child_job_ids = []
    for media in media_files:
        child_job = Job(
            project_id=project_id,
            job_type="export",
            status="queued",
            params_json=json.dumps({
                "media_id": media.id,
                "preset": data.preset,
                "parent_job_id": parent_job.id,
            }),
        )
        db.add(child_job)
        db.commit()
        db.refresh(child_job)
        child_job_ids.append(child_job.id)

    background_tasks.add_task(
        _run_batch_export,
        parent_job_id=parent_job.id,
        child_job_ids=child_job_ids,
        project_id=project_id,
        media_files=[(m.id, m.file_path, m.filename) for m in media_files],
        preset=data.preset,
    )

    return {
        "job_id": parent_job.id,
        "child_job_ids": child_job_ids,
        "status": "queued",
        "total": len(data.media_ids),
    }


@router.post("/projects/{project_id}/upscale", status_code=202)
def upscale(
    project_id: str,
    data: UpscaleRequest,
    background_tasks: BackgroundTasks,
    db: DbSession,
):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    media = db.query(MediaFile).filter(MediaFile.id == data.media_id).first()
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")

    if data.scale_factor not in (2, 4):
        raise HTTPException(status_code=400, detail="Scale factor must be 2 or 4")

    job = Job(
        project_id=project_id,
        job_type="upscale",
        status="queued",
        params_json=json.dumps({
            "media_id": data.media_id,
            "scale_factor": data.scale_factor,
            "method": data.method,
            "output_name": data.output_name,
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
        scale_factor=data.scale_factor,
        method=data.method,
        output_name=data.output_name,
    )

    return {"job_id": job.id, "status": "queued"}


def _run_batch_export(
    parent_job_id: str,
    child_job_ids: list[str],
    project_id: str,
    media_files: list[tuple[str, str, str]],  # (media_id, file_path, filename)
    preset: str,
):
    from app.database import SessionLocal

    db = SessionLocal()
    try:
        parent_job = db.query(Job).filter(Job.id == parent_job_id).first()
        if not parent_job:
            return

        parent_job.status = "processing"
        parent_job.started_at = datetime.utcnow()
        db.commit()

        from app.config import settings

        completed = 0
        errors = []
        total = len(media_files)

        for i, (media_id, file_path, filename) in enumerate(media_files):
            child_job_id = child_job_ids[i]
            child_job = db.query(Job).filter(Job.id == child_job_id).first()
            if not child_job:
                continue

            child_job.status = "processing"
            child_job.started_at = datetime.utcnow()
            db.commit()

            try:
                # Generate output name
                stem = filename.rsplit(".", 1)[0] if "." in filename else filename
                ext = filename.rsplit(".", 1)[1] if "." in filename else "mp4"
                output_name = f"{stem}_{preset}.{ext}"
                output_path = settings.export_dir / project_id / output_name

                export_video(file_path, output_path, preset)

                metadata = extract_metadata(output_path)
                file_size = os.path.getsize(output_path)

                new_media = MediaFile(
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
                db.add(new_media)

                child_job.status = "done"
                child_job.progress = 1.0
                child_job.completed_at = datetime.utcnow()
                child_job.result_json = json.dumps({"media_id": new_media.id})
                db.commit()

                completed += 1

            except Exception as e:
                child_job.status = "error"
                child_job.error_message = str(e)
                child_job.completed_at = datetime.utcnow()
                db.commit()
                errors.append(f"{filename}: {e}")

            # Update parent progress
            parent_job.progress = (i + 1) / total
            db.commit()

        # Finalize parent job
        parent_job.completed_at = datetime.utcnow()
        if errors and completed == 0:
            parent_job.status = "error"
            parent_job.error_message = "; ".join(errors)
        else:
            parent_job.status = "done"
            parent_job.progress = 1.0
            parent_job.result_json = json.dumps({
                "completed": completed,
                "errors": len(errors),
                "total": total,
            })
            if errors:
                parent_job.error_message = "; ".join(errors)
        db.commit()

    except Exception as e:
        parent_job = db.query(Job).filter(Job.id == parent_job_id).first()
        if parent_job:
            parent_job.status = "error"
            parent_job.error_message = str(e)
            parent_job.completed_at = datetime.utcnow()
            db.commit()
    finally:
        db.close()


def _run_upscale(
    job_id: str,
    project_id: str,
    file_path: str,
    scale_factor: int,
    method: str,
    output_name: str,
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

        output_path = settings.export_dir / project_id / output_name
        upscale_video(file_path, output_path, scale_factor, method)

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
