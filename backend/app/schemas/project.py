from datetime import datetime

from pydantic import BaseModel


class ProjectCreate(BaseModel):
    name: str


class ProjectUpdate(BaseModel):
    name: str | None = None
    settings_json: str | None = None


class ProjectResponse(BaseModel):
    id: str
    name: str
    settings_json: str
    created_at: datetime
    updated_at: datetime
    media_count: int = 0

    model_config = {"from_attributes": True}


class ShareTokenResponse(BaseModel):
    share_token: str
    share_url: str


class SharedMediaFile(BaseModel):
    id: str
    filename: str
    media_type: str
    duration_ms: int | None = None
    file_size: int | None = None

    model_config = {"from_attributes": True}


class ProjectShareResponse(BaseModel):
    id: str
    name: str
    media_files: list[SharedMediaFile]

    model_config = {"from_attributes": True}
