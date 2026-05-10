import json
import subprocess
from pathlib import Path

from app.config import settings


def probe(file_path: str | Path) -> dict:
    """Run ffprobe and return media metadata."""
    cmd = [
        settings.ffprobe_path,
        "-v", "quiet",
        "-print_format", "json",
        "-show_format",
        "-show_streams",
        str(file_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=30)
    if result.returncode != 0:
        raise RuntimeError(f"ffprobe failed: {result.stderr}")
    return json.loads(result.stdout)


def extract_metadata(file_path: str | Path) -> dict:
    """Extract useful metadata from a media file."""
    info = probe(file_path)
    result = {
        "duration_ms": None,
        "width": None,
        "height": None,
        "fps": None,
        "codec": None,
        "has_audio": False,
        "media_type": "video",
    }

    # Duration from format
    if "format" in info and "duration" in info["format"]:
        result["duration_ms"] = int(float(info["format"]["duration"]) * 1000)

    for stream in info.get("streams", []):
        codec_type = stream.get("codec_type")

        if codec_type == "video":
            result["width"] = stream.get("width")
            result["height"] = stream.get("height")
            result["codec"] = stream.get("codec_name")

            # Parse FPS from r_frame_rate (e.g., "30/1")
            r_frame_rate = stream.get("r_frame_rate", "0/1")
            if "/" in r_frame_rate:
                num, den = r_frame_rate.split("/")
                if int(den) > 0:
                    result["fps"] = round(int(num) / int(den), 2)

        elif codec_type == "audio":
            result["has_audio"] = True

    # Determine media type
    has_video = any(s.get("codec_type") == "video" for s in info.get("streams", []))
    has_audio = result["has_audio"]

    if has_video:
        result["media_type"] = "video"
    elif has_audio:
        result["media_type"] = "audio"
    else:
        result["media_type"] = "image"

    return result


def merge_video_audio(
    video_path: str | Path,
    audio_path: str | Path,
    output_path: str | Path,
) -> Path:
    """Merge a video file (no audio) with a separate audio file."""
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        settings.ffmpeg_path,
        "-y",
        "-i", str(video_path),
        "-i", str(audio_path),
        "-c:v", "copy",
        "-c:a", "aac",
        "-shortest",
        "-movflags", "+faststart",
        str(output_path),
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
    if result.returncode != 0:
        raise RuntimeError(f"FFmpeg merge failed: {result.stderr}")

    return output_path


def detect_silence(
    file_path: str | Path,
    noise_db: float = -30,
    min_duration: float = 0.5,
) -> list[dict]:
    """Detect silent segments in a media file using ffmpeg silencedetect."""
    import re

    cmd = [
        settings.ffmpeg_path,
        "-i", str(file_path),
        "-af", f"silencedetect=noise={noise_db}dB:d={min_duration}",
        "-f", "null",
        "-",
    ]
    result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)

    # Parse silence_start / silence_end / silence_duration from stderr
    starts = re.findall(r"silence_start: ([\d.]+)", result.stderr)
    ends = re.findall(r"silence_end: ([\d.]+)", result.stderr)
    durations = re.findall(r"silence_duration: ([\d.]+)", result.stderr)

    segments = []
    for i in range(min(len(starts), len(ends), len(durations))):
        segments.append({
            "start_ms": int(float(starts[i]) * 1000),
            "end_ms": int(float(ends[i]) * 1000),
            "duration_ms": int(float(durations[i]) * 1000),
        })

    return segments


def extract_waveform(file_path: str | Path, num_samples: int = 800) -> list[float]:
    """Extract normalized amplitude data for waveform visualization."""
    import struct

    cmd = [
        settings.ffmpeg_path,
        "-i", str(file_path),
        "-af", "aresample=8000",
        "-ac", "1",
        "-f", "s16le",
        "-vn",
        "pipe:1",
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=120)

    raw = result.stdout
    if not raw or len(raw) < 2:
        return [0.0] * num_samples

    num_pcm = len(raw) // 2
    samples_per_window = max(1, num_pcm // num_samples)
    max_val = 32768.0
    waveform = []

    for i in range(num_samples):
        start_byte = i * samples_per_window * 2
        end_byte = start_byte + samples_per_window * 2
        chunk = raw[start_byte:end_byte]
        if not chunk:
            waveform.append(0.0)
            continue
        aligned = chunk[: (len(chunk) // 2) * 2]
        values = struct.unpack(f"<{len(aligned) // 2}h", aligned)
        rms = (sum(v * v for v in values) / len(values)) ** 0.5 if values else 0.0
        waveform.append(min(1.0, rms / max_val))

    return waveform


def cut_segments(
    file_path: str | Path,
    keep_segments: list[dict],
    output_path: str | Path,
) -> Path:
    """Cut and concatenate segments from a media file using concat demuxer (no re-encode)."""
    import tempfile

    file_path = Path(file_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    temp_dir = Path(tempfile.mkdtemp(dir=str(settings.temp_dir)))

    try:
        segment_files = []
        for idx, seg in enumerate(keep_segments):
            start_sec = seg["start_ms"] / 1000
            end_sec = seg["end_ms"] / 1000
            duration_sec = end_sec - start_sec
            seg_path = temp_dir / f"seg_{idx:04d}{file_path.suffix}"

            cmd = [
                settings.ffmpeg_path,
                "-y",
                "-ss", str(start_sec),
                "-i", str(file_path),
                "-t", str(duration_sec),
                "-c", "copy",
                "-avoid_negative_ts", "make_zero",
                str(seg_path),
            ]
            res = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
            if res.returncode != 0:
                raise RuntimeError(f"FFmpeg segment extraction failed: {res.stderr}")
            segment_files.append(seg_path)

        # Create concat list
        concat_list = temp_dir / "concat_list.txt"
        with open(concat_list, "w") as f:
            for seg_path in segment_files:
                f.write(f"file '{seg_path}'\n")

        # Concatenate
        cmd = [
            settings.ffmpeg_path,
            "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_list),
            "-c", "copy",
            "-movflags", "+faststart",
            str(output_path),
        ]
        res = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
        if res.returncode != 0:
            raise RuntimeError(f"FFmpeg concat failed: {res.stderr}")

        return output_path

    finally:
        # Clean up temp segment files
        import shutil
        shutil.rmtree(temp_dir, ignore_errors=True)
