import re
import subprocess
import tempfile
from pathlib import Path

from app.config import settings


def _calculate_target_bitrate(duration_s: float, target_mb: float, audio_kbps: int = 128) -> int:
    """Calculate video bitrate (kbps) needed to hit target file size."""
    total_kbps = (target_mb * 8192) / duration_s
    video_kbps = int(total_kbps - audio_kbps)
    return max(video_kbps, 200)  # minimum 200 kbps


def _parse_time_seconds(time_str: str) -> float | None:
    """Parse FFmpeg time string HH:MM:SS.ss into total seconds."""
    match = re.search(r"time=(\d+):(\d+):([\d.]+)", time_str)
    if not match:
        return None
    h, m, s = int(match.group(1)), int(match.group(2)), float(match.group(3))
    return h * 3600 + m * 60 + s


def compress_video(
    input_path: str | Path,
    output_path: str | Path,
    target_mb: float,
    duration_s: float,
    progress_callback=None,
) -> None:
    """
    Two-pass H.264 encoding to hit target_mb file size.

    progress_callback(float): called with 0.0-1.0 as encoding progresses.
    Pass 1 is 0-50%, pass 2 is 50-100%.
    """
    input_path = str(input_path)
    output_path = str(output_path)
    bitrate = _calculate_target_bitrate(duration_s, target_mb)

    with tempfile.TemporaryDirectory() as tmpdir:
        passlogfile = str(Path(tmpdir) / "ffmpeg2pass")

        # Pass 1
        cmd_pass1 = [
            settings.ffmpeg_path,
            "-y",
            "-i", input_path,
            "-c:v", "libx264",
            "-b:v", f"{bitrate}k",
            "-pass", "1",
            "-passlogfile", passlogfile,
            "-an",
            "-f", "null",
            "/dev/null",
        ]
        proc1 = subprocess.Popen(
            cmd_pass1,
            stderr=subprocess.PIPE,
            stdout=subprocess.DEVNULL,
            text=True,
        )
        for line in proc1.stderr:
            if progress_callback and duration_s > 0:
                t = _parse_time_seconds(line)
                if t is not None:
                    progress_callback(min(t / duration_s, 1.0) * 0.5)
        proc1.wait()
        if proc1.returncode != 0:
            raise RuntimeError("FFmpeg two-pass compression failed at pass 1")

        # Pass 2
        cmd_pass2 = [
            settings.ffmpeg_path,
            "-y",
            "-i", input_path,
            "-c:v", "libx264",
            "-b:v", f"{bitrate}k",
            "-pass", "2",
            "-passlogfile", passlogfile,
            "-c:a", "aac",
            "-b:a", "128k",
            output_path,
        ]
        proc2 = subprocess.Popen(
            cmd_pass2,
            stderr=subprocess.PIPE,
            stdout=subprocess.DEVNULL,
            text=True,
        )
        for line in proc2.stderr:
            if progress_callback and duration_s > 0:
                t = _parse_time_seconds(line)
                if t is not None:
                    progress_callback(0.5 + min(t / duration_s, 1.0) * 0.5)
        proc2.wait()
        if proc2.returncode != 0:
            raise RuntimeError("FFmpeg two-pass compression failed at pass 2")
