from typing import Literal

from pydantic import BaseModel

from app.schemas.export import ExportPreset

UpscaleMethod = Literal["ffmpeg", "realesrgan"]


class BatchExportRequest(BaseModel):
    media_ids: list[str]
    preset: ExportPreset


class UpscaleRequest(BaseModel):
    media_id: str
    scale_factor: int = 2  # 2 or 4
    method: UpscaleMethod = "ffmpeg"
    output_name: str = "upscaled.mp4"
