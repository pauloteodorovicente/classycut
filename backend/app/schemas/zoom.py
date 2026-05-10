from typing import Literal

from pydantic import BaseModel, Field


ZoomEasing = Literal["linear", "ease_in", "ease_out", "ease_in_out"]

ZoomPreset = Literal[
    "punch_in",
    "pan_left_right",
    "pan_right_left",
    "ken_burns_in",
    "ken_burns_out",
    "custom",
]


class ZoomKeyframe(BaseModel):
    time_ms: int
    x: float = Field(default=0.5, ge=0.0, le=1.0)
    y: float = Field(default=0.5, ge=0.0, le=1.0)
    scale: float = Field(default=1.0, ge=1.0, le=4.0)
    easing: ZoomEasing = "linear"


class ZoomApplyRequest(BaseModel):
    media_id: str
    keyframes: list[ZoomKeyframe] | None = None
    preset: ZoomPreset | None = None
    output_name: str = "zoom_output.mp4"
