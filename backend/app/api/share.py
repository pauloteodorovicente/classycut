import uuid

from fastapi import APIRouter, HTTPException, Request

from app.api.deps import CurrentUser, DbSession
from app.models.project import Project
from app.schemas.project import ProjectShareResponse, ShareTokenResponse

router = APIRouter(tags=["share"])


@router.post("/projects/{project_id}/share", response_model=ShareTokenResponse)
def generate_share_link(project_id: str, request: Request, db: DbSession, current_user: CurrentUser):
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    token = uuid.uuid4().hex
    project.share_token = token
    db.commit()

    base_url = str(request.base_url).rstrip("/")
    return ShareTokenResponse(share_token=token, share_url=f"{base_url}/share/{token}")


@router.delete("/projects/{project_id}/share", status_code=204)
def revoke_share_link(project_id: str, db: DbSession, current_user: CurrentUser):
    project = (
        db.query(Project)
        .filter(Project.id == project_id, Project.user_id == current_user.id)
        .first()
    )
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    project.share_token = None
    db.commit()


@router.get("/share/{token}", response_model=ProjectShareResponse)
def get_shared_project(token: str, db: DbSession):
    project = db.query(Project).filter(Project.share_token == token).first()
    if not project:
        raise HTTPException(status_code=404, detail="Link invalido ou expirado")
    return project
