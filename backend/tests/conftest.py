"""Shared fixtures for all tests."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# Import Base and models so metadata is populated
from app.database import Base
from app.models.project import Project  # noqa: F401
from app.models.media import MediaFile  # noqa: F401
from app.models.job import Job  # noqa: F401


@pytest.fixture(scope="session")
def tmp_storage(tmp_path_factory):
    """Create temporary storage directories for tests."""
    base = tmp_path_factory.mktemp("storage")
    for subdir in ["uploads", "projects", "exports", "temp"]:
        (base / subdir).mkdir()
    return base


@pytest.fixture()
def db_engine():
    """Create an in-memory SQLite engine with shared connection pool."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def db_session(db_engine):
    """Create a fresh database session for each test."""
    Session = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = Session()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_engine, tmp_storage, monkeypatch):
    """Create a test client with isolated database and storage."""
    import app.database as db_mod

    # Patch storage paths
    monkeypatch.setattr("app.config.settings.upload_dir", tmp_storage / "uploads")
    monkeypatch.setattr("app.config.settings.export_dir", tmp_storage / "exports")
    monkeypatch.setattr("app.config.settings.temp_dir", tmp_storage / "temp")
    monkeypatch.setattr("app.config.settings.debug", False)

    # Patch database to use in-memory engine with StaticPool
    TestSession = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    monkeypatch.setattr(db_mod, "SessionLocal", TestSession)
    monkeypatch.setattr(db_mod, "engine", db_engine)

    from app.main import create_app

    app = create_app()

    with TestClient(app, raise_server_exceptions=False) as c:
        yield c


@pytest.fixture()
def sample_project(client):
    """Create a sample project and return its data."""
    res = client.post("/api/v1/projects", json={"name": "Test Project"})
    assert res.status_code == 201, f"Failed to create project: {res.status_code} {res.text}"
    return res.json()


@pytest.fixture()
def sample_video_file(tmp_storage):
    """Create a minimal valid MP4 file for testing (1s black screen)."""
    import subprocess

    video_path = tmp_storage / "test_video.mp4"
    if video_path.exists():
        return video_path

    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", "color=c=black:s=320x240:d=1",
        "-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono",
        "-t", "1",
        "-c:v", "libx264", "-preset", "ultrafast",
        "-c:a", "aac",
        str(video_path),
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=30)
    if result.returncode != 0:
        pytest.skip("FFmpeg not available for generating test video")
    return video_path
