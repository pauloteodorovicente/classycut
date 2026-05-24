import shutil
import subprocess
import tempfile
from pathlib import Path

from app.config import settings


def is_realesrgan_available() -> bool:
    from app.config import settings
    return shutil.which(settings.realesrgan_path) is not None


def upscale_video(
    file_path: str | Path,
    output_path: str | Path,
    scale_factor: int = 2,
    method: str = "ffmpeg",
) -> Path:
    """Upscale a video file using the specified method.

    Methods:
    - ffmpeg: Uses FFmpeg lanczos scaling (always available)
    - realesrgan: Uses Real-ESRGAN AI upscaling (requires realesrgan-ncnn-vulkan)
    """
    file_path = Path(file_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    if method == "realesrgan":
        return _upscale_realesrgan(file_path, output_path, scale_factor)
    return _upscale_ffmpeg(file_path, output_path, scale_factor)


def _upscale_ffmpeg(
    file_path: Path,
    output_path: Path,
    scale_factor: int,
) -> Path:
    """Upscale using FFmpeg with lanczos filter."""
    vf = f"scale=iw*{scale_factor}:ih*{scale_factor}:flags=lanczos"

    cmd = [
        settings.ffmpeg_path,
        "-y",
        "-i", str(file_path),
        "-vf", vf,
        "-c:v", "libx264",
        "-crf", "18",
        "-preset", "slow",
        "-c:a", "copy",
        "-movflags", "+faststart",
        str(output_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=7200)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg upscale failed: {result.stderr}")

    return output_path


def _upscale_realesrgan(
    file_path: Path,
    output_path: Path,
    scale_factor: int,
) -> Path:
    """Upscale using Real-ESRGAN via frame extraction and reassembly."""
    from app.core.ffmpeg import probe

    # Check if realesrgan binary is available
    realesrgan_bin = shutil.which(settings.realesrgan_path)
    if not realesrgan_bin:
        raise RuntimeError(
            f"Real-ESRGAN binary not found: {settings.realesrgan_path}. "
            "Install realesrgan-ncnn-vulkan or use the 'ffmpeg' method."
        )

    # Get video info for fps
    info = probe(file_path)
    fps = "30"
    for stream in info.get("streams", []):
        if stream.get("codec_type") == "video":
            r_frame_rate = stream.get("r_frame_rate", "30/1")
            if "/" in r_frame_rate:
                num, den = r_frame_rate.split("/")
                if int(den) > 0:
                    fps = str(round(int(num) / int(den), 2))
            break

    temp_dir = Path(tempfile.mkdtemp(dir=str(settings.temp_dir)))
    frames_dir = temp_dir / "frames"
    upscaled_dir = temp_dir / "upscaled"
    frames_dir.mkdir()
    upscaled_dir.mkdir()

    try:
        # Step 1: Extract frames
        cmd_extract = [
            settings.ffmpeg_path,
            "-i", str(file_path),
            "-qscale:v", "1",
            "-qmin", "1",
            "-qmax", "1",
            "-vsync", "0",
            str(frames_dir / "%08d.png"),
        ]
        res = subprocess.run(cmd_extract, capture_output=True, text=True, timeout=3600)
        if res.returncode != 0:
            raise RuntimeError(f"Frame extraction failed: {res.stderr}")

        # Step 2: Upscale frames with Real-ESRGAN
        model = "realesrgan-x4plus" if scale_factor == 4 else "realesrgan-x4plus"
        cmd_upscale = [
            realesrgan_bin,
            "-i", str(frames_dir),
            "-o", str(upscaled_dir),
            "-n", model,
            "-s", str(scale_factor),
            "-f", "png",
        ]
        res = subprocess.run(cmd_upscale, capture_output=True, text=True, timeout=7200)
        if res.returncode != 0:
            raise RuntimeError(f"Real-ESRGAN upscale failed: {res.stderr}")

        # Step 3: Reassemble video with audio from original
        cmd_reassemble = [
            settings.ffmpeg_path,
            "-y",
            "-framerate", fps,
            "-i", str(upscaled_dir / "%08d.png"),
            "-i", str(file_path),
            "-map", "0:v",
            "-map", "1:a?",
            "-c:v", "libx264",
            "-crf", "18",
            "-preset", "slow",
            "-c:a", "aac",
            "-b:a", "192k",
            "-movflags", "+faststart",
            str(output_path),
        ]
        res = subprocess.run(cmd_reassemble, capture_output=True, text=True, timeout=3600)
        if res.returncode != 0:
            raise RuntimeError(f"Video reassembly failed: {res.stderr}")

        return output_path

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
