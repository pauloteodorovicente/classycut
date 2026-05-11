from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.app_name,
        version="0.1.0",
        docs_url="/api/docs",
        openapi_url="/api/openapi.json",
    )

    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    from app.api.auth import router as auth_router
    from app.api.projects import router as projects_router
    from app.api.media import router as media_router
    from app.api.jobs import router as jobs_router
    from app.api.silence import router as silence_router
    from app.api.transcription import router as transcription_router
    from app.api.export import router as export_router
    from app.api.zoom import router as zoom_router
    from app.api.ai import router as ai_router
    from app.api.batch import router as batch_router
    from app.api.share import router as share_router
    from app.api.compression import router as compression_router
    from app.api.upscale import router as upscale_router
    from app.api.highlights import router as highlights_router
    from app.api.chapters import router as chapters_router

    app.include_router(auth_router, prefix="/api/v1")
    app.include_router(projects_router, prefix="/api/v1")
    app.include_router(media_router, prefix="/api/v1")
    app.include_router(jobs_router, prefix="/api/v1")
    app.include_router(silence_router, prefix="/api/v1")
    app.include_router(transcription_router, prefix="/api/v1")
    app.include_router(export_router, prefix="/api/v1")
    app.include_router(zoom_router, prefix="/api/v1")
    app.include_router(ai_router, prefix="/api/v1")
    app.include_router(batch_router, prefix="/api/v1")
    app.include_router(share_router, prefix="/api/v1")
    app.include_router(compression_router, prefix="/api/v1")
    app.include_router(upscale_router, prefix="/api/v1")
    app.include_router(highlights_router, prefix="/api/v1")
    app.include_router(chapters_router, prefix="/api/v1")

    @app.get("/api/health")
    def health_check():
        return {"status": "ok", "app": settings.app_name}

    return app


app = create_app()
