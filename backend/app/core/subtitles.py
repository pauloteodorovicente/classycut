import subprocess
import tempfile
from pathlib import Path

from app.config import settings
from app.core.transcription import generate_srt

# SSA alignment: 2 = bottom-center, 8 = top-center
_ALIGNMENT = {"bottom": 2, "top": 8}
_FONT_SIZES = {"small": 16, "medium": 22, "large": 28}


def _escape_srt_path(path: str) -> str:
    """Escape SRT file path for use inside FFmpeg -vf subtitles= filter.

    FFmpeg's libavfilter parses the filter string before the OS sees it,
    so on Windows the drive-letter colon and backslashes must be escaped.
    """
    # Convert all backslashes to forward slashes first
    p = path.replace("\\", "/")
    # Escape the colon in the Windows drive letter (e.g. C:/ → C\:/)
    if len(p) >= 2 and p[1] == ":":
        p = p[0] + "\\:" + p[2:]
    return p


def burn_subtitles(
    video_path: str | Path,
    segments: list[dict],
    output_path: str | Path,
    font_size: str = "medium",
    position: str = "bottom",
) -> None:
    """Burn subtitles into a video using FFmpeg subtitles filter.

    Args:
        video_path: Input video file.
        segments: Transcription segments (list of {start, end, text}).
        output_path: Where to save the result.
        font_size: "small" | "medium" | "large".
        position: "bottom" | "top".
    """
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    px = _FONT_SIZES.get(font_size, 22)
    alignment = _ALIGNMENT.get(position, 2)

    srt_content = generate_srt(segments)

    # Write SRT to a temp file; suffix ensures FFmpeg detects the format
    tmp = tempfile.NamedTemporaryFile(
        mode="w", suffix=".srt", delete=False, encoding="utf-8"
    )
    try:
        tmp.write(srt_content)
        tmp.flush()
        tmp.close()

        srt_escaped = _escape_srt_path(tmp.name)
        vf = (
            f"subtitles='{srt_escaped}'"
            f":force_style='FontSize={px},Alignment={alignment},MarginV=20,"
            f"PrimaryColour=&H00FFFFFF,OutlineColour=&H00000000,Outline=2,Shadow=1'"
        )

        cmd = [
            settings.ffmpeg_path, "-y",
            "-i", str(video_path),
            "-vf", vf,
            "-c:v", "libx264", "-crf", "18", "-preset", "fast",
            "-c:a", "copy",
            str(output_path),
        ]

        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg subtitles burn-in failed:\n{result.stderr[-600:]}")
    finally:
        try:
            Path(tmp.name).unlink(missing_ok=True)
        except Exception:
            pass
