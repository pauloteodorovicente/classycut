from pydantic import BaseModel


class HighlightsRequest(BaseModel):
    media_id: str
    sensitivity: float = 0.5  # 0.0 (fewer) to 1.0 (more highlights)
    min_duration: float = 3.0  # minimum highlight duration in seconds


class ChaptersRequest(BaseModel):
    media_id: str
    min_chapter_duration: float = 30.0  # minimum chapter length in seconds


class SummaryRequest(BaseModel):
    media_id: str
    max_sentences: int = 5
