from typing import Literal

from pydantic import BaseModel

ExportPreset = Literal[
    "original",
    "youtube",
    "tiktok",
    "instagram_portrait",
    "instagram_square",
]


class ExportRequest(BaseModel):
    media_id: str
    preset: ExportPreset
    output_name: str = "export.mp4"
