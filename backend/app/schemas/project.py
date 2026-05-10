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
