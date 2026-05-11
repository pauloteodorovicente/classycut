from pydantic import BaseModel


class SilenceDetectRequest(BaseModel):
    media_id: str
    noise_db: float = -30.0
    min_duration: float = 0.5


class SilenceSegment(BaseModel):
    start_ms: int
    end_ms: int
    duration_ms: int
    type: str  # "silence" or "speech"
    keep: bool


class SegmentRange(BaseModel):
    start_ms: int
    end_ms: int


class SilenceCutRequest(BaseModel):
    media_id: str
    segments_to_keep: list[SegmentRange]
    output_name: str = "cut_output.mp4"
    platform: str | None = None
