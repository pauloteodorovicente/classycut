from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    app_name: str = "ClassyCut"
    debug: bool = True

    # Database — defaults to storage/classycut.db relative to the project.
    # Override with CLASSYCUT_DATABASE_URL env var (e.g. postgresql://... in production).
    database_url: str = ""

    # Storage paths
    base_dir: Path = Path(__file__).resolve().parent.parent.parent
    storage_dir: Path = base_dir / "storage"

    @model_validator(mode="after")
    def set_default_database_url(self) -> "Settings":
        if not self.database_url:
            self.database_url = f"sqlite:///{self.storage_dir / 'classycut.db'}"
        return self
    upload_dir: Path = storage_dir / "uploads"
    project_dir: Path = storage_dir / "projects"
    export_dir: Path = storage_dir / "exports"
    temp_dir: Path = storage_dir / "temp"

    # FFmpeg
    ffmpeg_path: str = "ffmpeg"
    ffprobe_path: str = "ffprobe"

    # Real-ESRGAN (optional, for AI upscaling)
    realesrgan_path: str = "realesrgan-ncnn-vulkan"

    # Upload limits
    max_upload_size_mb: int = 2048  # 2GB

    # CORS
    cors_origins: list[str] = ["http://localhost:5173"]

    model_config = {"env_prefix": "CLASSYCUT_", "env_file": ".env"}


settings = Settings()

# Ensure storage directories exist
for dir_path in [settings.upload_dir, settings.project_dir, settings.export_dir, settings.temp_dir]:
    dir_path.mkdir(parents=True, exist_ok=True)
