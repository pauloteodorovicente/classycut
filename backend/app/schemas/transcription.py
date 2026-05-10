from pydantic import BaseModel


class TranscribeRequest(BaseModel):
    media_id: str
    model_size: str = "base"  # tiny, base, small, medium, large-v3
    language: str | None = None  # None = auto-detect


class WordTimestamp(BaseModel):
    word: str
    start: float
    end: float
    probability: float


class TranscriptionSegment(BaseModel):
    id: int
    start: float
    end: float
    text: str
    words: list[WordTimestamp] = []


class TranscriptionResult(BaseModel):
    language: str
    segments: list[TranscriptionSegment]
