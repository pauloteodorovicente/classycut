import subprocess
from pathlib import Path

from app.config import settings


def export_video(
    file_path: str | Path,
    output_path: str | Path,
    preset: str,
) -> Path:
    """Export a video file with the given platform preset."""
    file_path = Path(file_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if preset == "original":
        cmd = [
            settings.ffmpeg_path,
            "-y",
            "-i", str(file_path),
            "-c", "copy",
            "-movflags", "+faststart",
            str(output_path),
        ]
    elif preset == "youtube":
        # 1920x1080 (16:9) — scale + pad to preserve aspect ratio
        vf = (
            "scale=1920:1080:force_original_aspect_ratio=decrease,"
            "pad=1920:1080:(ow-iw)/2:(oh-ih)/2:black"
        )
        cmd = [
            settings.ffmpeg_path,
            "-y",
            "-i", str(file_path),
            "-vf", vf,
            "-c:v", "libx264",
            "-crf", "18",
            "-preset", "fast",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            str(output_path),
        ]
    elif preset == "tiktok":
        # 1080x1920 (9:16) — scale + crop centered
        vf = (
            "scale=1080:1920:force_original_aspect_ratio=increase,"
            "crop=1080:1920"
        )
        cmd = [
            settings.ffmpeg_path,
            "-y",
            "-i", str(file_path),
            "-vf", vf,
            "-c:v", "libx264",
            "-crf", "18",
            "-preset", "fast",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            str(output_path),
        ]
    elif preset == "instagram_portrait":
        # 1080x1350 (4:5) — scale + crop centered
        vf = (
            "scale=1080:1350:force_original_aspect_ratio=increase,"
            "crop=1080:1350"
        )
        cmd = [
            settings.ffmpeg_path,
            "-y",
            "-i", str(file_path),
            "-vf", vf,
            "-c:v", "libx264",
            "-crf", "18",
            "-preset", "fast",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            str(output_path),
        ]
    elif preset == "instagram_square":
        # 1080x1080 (1:1) — scale + crop centered
        vf = (
            "scale=1080:1080:force_original_aspect_ratio=increase,"
            "crop=1080:1080"
        )
        cmd = [
            settings.ffmpeg_path,
            "-y",
            "-i", str(file_path),
            "-vf", vf,
            "-c:v", "libx264",
            "-crf", "18",
            "-preset", "fast",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            str(output_path),
        ]
    else:
        raise ValueError(f"Unknown preset: {preset}")

    result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg export failed: {result.stderr}")

    return output_path
