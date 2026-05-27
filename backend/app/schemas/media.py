from datetime import datetime

from pydantic import BaseModel


class MediaResponse(BaseModel):
    id: str
    project_id: str
    filename: str
    file_path: str
    media_type: str
    duration_ms: int | None = None
    width: int | None = None
    height: int | None = None
    fps: float | None = None
    codec: str | None = None
    file_size: int | None = None
    has_audio: bool = False
    is_deleted: bool = False
    created_at: datetime

    model_config = {"from_attributes": True}


class MergeRequest(BaseModel):
    video_media_id: str
    audio_media_id: str
    output_name: str = "merged_output.mp4"
