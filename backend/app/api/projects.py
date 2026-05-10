from fastapi import APIRouter, HTTPException

from app.api.deps import DbSession
from app.models.project import Project
from app.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

router = APIRouter(prefix="/projects", tags=["projects"])


@router.post("", response_model=ProjectResponse, status_code=201)
def create_project(data: ProjectCreate, db: DbSession):
    project = Project(name=data.name)
    db.add(project)
    db.commit()
    db.refresh(project)
    return _to_response(project)


@router.get("", response_model=list[ProjectResponse])
def list_projects(db: DbSession):
    projects = db.query(Project).order_by(Project.updated_at.desc()).all()
    return [_to_response(p) for p in projects]


@router.get("/{project_id}", response_model=ProjectResponse)
def get_project(project_id: str, db: DbSession):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return _to_response(project)


@router.patch("/{project_id}", response_model=ProjectResponse)
def update_project(project_id: str, data: ProjectUpdate, db: DbSession):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    if data.name is not None:
        project.name = data.name
    if data.settings_json is not None:
        project.settings_json = data.settings_json

    db.commit()
    db.refresh(project)
    return _to_response(project)


@router.delete("/{project_id}", status_code=204)
def delete_project(project_id: str, db: DbSession):
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    db.delete(project)
    db.commit()


def _to_response(project: Project) -> ProjectResponse:
    return ProjectResponse(
        id=project.id,
        name=project.name,
        settings_json=project.settings_json,
        created_at=project.created_at,
        updated_at=project.updated_at,
        media_count=len(project.media_files),
    )
