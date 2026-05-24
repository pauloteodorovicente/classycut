from pathlib import Path

from pydantic import model_validator
from pydantic_settings import BaseSettings

_PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
_DEFAULT_STORAGE = _PROJECT_ROOT / "storage"


class Settings(BaseSettings):
    app_name: str = "ClassyCut"
    debug: bool = True

    # Database
    database_url: str = ""

    # Storage paths — all overridable via CLASSYCUT_* env vars
    storage_dir: Path = _DEFAULT_STORAGE
    upload_dir: Path = _DEFAULT_STORAGE / "uploads"
    project_dir: Path = _DEFAULT_STORAGE / "projects"
    export_dir: Path = _DEFAULT_STORAGE / "exports"
    temp_dir: Path = _DEFAULT_STORAGE / "temp"

    # JWT authentication
    jwt_secret_key: str = "change-me-in-production-use-openssl-rand-hex-32"
    jwt_expire_days: int = 7

    # FFmpeg
    ffmpeg_path: str = "ffmpeg"
    ffprobe_path: str = "ffprobe"

    # Real-ESRGAN (optional, for AI upscaling)
    realesrgan_path: str = "realesrgan-ncnn-vulkan"

    # Upload limits
    max_upload_size_mb: int = 2048  # 2GB

    # CORS
    cors_origins: list[str] = ["http://localhost:5173"]

    @model_validator(mode="after")
    def set_default_database_url(self) -> "Settings":
        if not self.database_url:
            self.database_url = f"sqlite:///{self.storage_dir / 'classycut.db'}"
        return self

    model_config = {"env_prefix": "CLASSYCUT_", "env_file": ".env"}


settings = Settings()

# Ensure storage directories exist
for dir_path in [settings.upload_dir, settings.project_dir, settings.export_dir, settings.temp_dir]:
    dir_path.mkdir(parents=True, exist_ok=True)
