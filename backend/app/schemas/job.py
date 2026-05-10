from datetime import datetime

from pydantic import BaseModel


class JobResponse(BaseModel):
    id: str
    project_id: str | None = None
    job_type: str
    status: str
    progress: float
    params_json: str | None = None
    result_json: str | None = None
    error_message: str | None = None
    created_at: datetime
    started_at: datetime | None = None
    completed_at: datetime | None = None

    model_config = {"from_attributes": True}
