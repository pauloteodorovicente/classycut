import shutil
import subprocess
import tempfile
from pathlib import Path

from app.config import settings


def generate_preset_keyframes(
    preset: str,
    duration_ms: int,
) -> list[dict]:
    """Generate keyframes for a given preset based on video duration."""
    if preset == "punch_in":
        return [
            {"time_ms": 0, "x": 0.5, "y": 0.5, "scale": 1.0, "easing": "ease_in_out"},
            {"time_ms": duration_ms // 4, "x": 0.5, "y": 0.5, "scale": 1.5, "easing": "ease_in_out"},
            {"time_ms": duration_ms * 3 // 4, "x": 0.5, "y": 0.5, "scale": 1.5, "easing": "ease_in_out"},
            {"time_ms": duration_ms, "x": 0.5, "y": 0.5, "scale": 1.0, "easing": "ease_in_out"},
        ]
    elif preset == "pan_left_right":
        return [
            {"time_ms": 0, "x": 0.3, "y": 0.5, "scale": 1.3, "easing": "linear"},
            {"time_ms": duration_ms, "x": 0.7, "y": 0.5, "scale": 1.3, "easing": "linear"},
        ]
    elif preset == "pan_right_left":
        return [
            {"time_ms": 0, "x": 0.7, "y": 0.5, "scale": 1.3, "easing": "linear"},
            {"time_ms": duration_ms, "x": 0.3, "y": 0.5, "scale": 1.3, "easing": "linear"},
        ]
    elif preset == "ken_burns_in":
        return [
            {"time_ms": 0, "x": 0.5, "y": 0.5, "scale": 1.0, "easing": "ease_in_out"},
            {"time_ms": duration_ms, "x": 0.5, "y": 0.4, "scale": 1.4, "easing": "ease_in_out"},
        ]
    elif preset == "ken_burns_out":
        return [
            {"time_ms": 0, "x": 0.5, "y": 0.4, "scale": 1.4, "easing": "ease_in_out"},
            {"time_ms": duration_ms, "x": 0.5, "y": 0.5, "scale": 1.0, "easing": "ease_in_out"},
        ]
    else:
        raise ValueError(f"Unknown preset: {preset}")


def _ease(t: float, easing: str) -> float:
    """Apply easing function to a normalized time value 0..1."""
    t = max(0.0, min(1.0, t))
    if easing == "ease_in":
        return t * t
    elif easing == "ease_out":
        return 1 - (1 - t) * (1 - t)
    elif easing == "ease_in_out":
        return 3 * t * t - 2 * t * t * t
    return t


def _interpolate_midpoint(kf_a: dict, kf_b: dict) -> dict:
    """Get the interpolated midpoint between two keyframes (used for fixed crop per segment)."""
    easing = kf_a.get("easing", "linear")
    t = _ease(0.5, easing)
    return {
        "x": kf_a["x"] + (kf_b["x"] - kf_a["x"]) * t,
        "y": kf_a["y"] + (kf_b["y"] - kf_a["y"]) * t,
        "scale": kf_a["scale"] + (kf_b["scale"] - kf_a["scale"]) * t,
    }


def _build_segment_filter(
    kf_a: dict,
    kf_b: dict,
    fps: float,
    width: int,
    height: int,
    num_frames: int,
) -> str:
    """Build a crop+scale filter expression for a segment between two keyframes.

    Uses FFmpeg expression variables (n = frame number) to interpolate linearly
    between start and end crop parameters. Easing is baked into the start/end
    values by sampling at multiple points.
    """
    # Compute crop params at start and end of this segment
    scale_a = kf_a["scale"]
    scale_b = kf_b["scale"]

    # Crop dimensions at start and end
    cw_a = int(width / scale_a)
    cw_b = int(width / scale_b)
    ch_a = int(height / scale_a)
    ch_b = int(height / scale_b)

    # Crop positions at start and end
    cx_a = int(kf_a["x"] * (width - cw_a))
    cx_b = int(kf_b["x"] * (width - cw_b))
    cy_a = int(kf_a["y"] * (height - ch_a))
    cy_b = int(kf_b["y"] * (height - ch_b))

    easing = kf_a.get("easing", "linear")

    if num_frames <= 1 or (cw_a == cw_b and ch_a == ch_b and cx_a == cx_b and cy_a == cy_b):
        # Static crop — no animation needed
        cw = max(2, cw_a - (cw_a % 2))
        ch = max(2, ch_a - (ch_a % 2))
        cx = max(0, min(cx_a, width - cw))
        cy = max(0, min(cy_a, height - ch))
        return f"crop={cw}:{ch}:{cx}:{cy},scale={width}:{height}"

    # For easing, we use FFmpeg expressions with the 'n' variable
    # t = n / (num_frames - 1), then apply easing
    nf = max(1, num_frames - 1)
    t_expr = f"n/{nf}"

    if easing == "ease_in":
        # t^2
        te = f"({t_expr})*({t_expr})"
    elif easing == "ease_out":
        # 1-(1-t)^2
        te = f"(1-(1-{t_expr})*(1-{t_expr}))"
    elif easing == "ease_in_out":
        # 3t^2 - 2t^3
        te = f"(3*({t_expr})*({t_expr})-2*({t_expr})*({t_expr})*({t_expr}))"
    else:
        te = t_expr

    def lerp(a: int, b: int) -> str:
        if a == b:
            return str(a)
        return f"trunc({a}+({b}-{a})*{te})"

    # Use trunc() to get integer values, ensure even for w/h
    w_expr = lerp(cw_a, cw_b)
    h_expr = lerp(ch_a, ch_b)
    x_expr = lerp(cx_a, cx_b)
    y_expr = lerp(cy_a, cy_b)

    # Make w/h even: bitand(val, -2) clears lowest bit
    w_even = f"bitand({w_expr}+1\\,-2)" if cw_a != cw_b else str(cw_a - (cw_a % 2))
    h_even = f"bitand({h_expr}+1\\,-2)" if ch_a != ch_b else str(ch_a - (ch_a % 2))

    return f"crop={w_even}:{h_even}:{x_expr}:{y_expr},scale={width}:{height}"


def apply_zoom(
    file_path: str | Path,
    output_path: str | Path,
    keyframes: list[dict],
    fps: float,
    width: int,
    height: int,
    duration_ms: int,
) -> Path:
    """Apply zoom/pan effects segment-by-segment, then concatenate.

    For each pair of consecutive keyframes:
    1. Extract the video segment (with audio)
    2. Apply animated crop + scale
    3. Concatenate all processed segments
    """
    file_path = Path(file_path)
    output_path = Path(output_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)

    keyframes = sorted(keyframes, key=lambda kf: kf["time_ms"])

    # Ensure even output dimensions
    out_w = width + (width % 2)
    out_h = height + (height % 2)

    # If only one keyframe, apply static crop
    if len(keyframes) == 1:
        kf = keyframes[0]
        scale = kf["scale"]
        cw = max(2, int(out_w / scale) - (int(out_w / scale) % 2))
        ch = max(2, int(out_h / scale) - (int(out_h / scale) % 2))
        cx = max(0, min(int(kf["x"] * (out_w - cw)), out_w - cw))
        cy = max(0, min(int(kf["y"] * (out_h - ch)), out_h - ch))

        cmd = [
            settings.ffmpeg_path, "-y",
            "-i", str(file_path),
            "-vf", f"crop={cw}:{ch}:{cx}:{cy},scale={out_w}:{out_h}",
            "-c:v", "libx264", "-crf", "18", "-preset", "fast",
            "-c:a", "aac", "-b:a", "192k",
            "-movflags", "+faststart",
            str(output_path),
        ]
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg zoom failed: {result.stderr}")
        return output_path

    temp_dir = Path(tempfile.mkdtemp(dir=str(settings.temp_dir)))

    try:
        segment_files = []

        for i in range(len(keyframes) - 1):
            kf_a = keyframes[i]
            kf_b = keyframes[i + 1]

            start_sec = kf_a["time_ms"] / 1000.0
            end_sec = kf_b["time_ms"] / 1000.0
            duration_sec = end_sec - start_sec

            if duration_sec <= 0:
                continue

            num_frames = max(1, int(duration_sec * fps))
            seg_output = temp_dir / f"zoom_seg_{i:04d}.mp4"

            vf = _build_segment_filter(kf_a, kf_b, fps, out_w, out_h, num_frames)

            cmd = [
                settings.ffmpeg_path, "-y",
                "-ss", f"{start_sec:.6f}",
                "-i", str(file_path),
                "-t", f"{duration_sec:.6f}",
                "-vf", vf,
                "-c:v", "libx264", "-crf", "18", "-preset", "fast",
                "-c:a", "aac", "-b:a", "192k",
                "-avoid_negative_ts", "make_zero",
                "-movflags", "+faststart",
                str(seg_output),
            ]

            result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
            if result.returncode != 0:
                raise RuntimeError(
                    f"FFmpeg zoom segment {i} failed: {result.stderr[-500:]}"
                )

            segment_files.append(seg_output)

        if not segment_files:
            raise RuntimeError("No segments were produced")

        # If only one segment, just move it
        if len(segment_files) == 1:
            shutil.move(str(segment_files[0]), str(output_path))
            return output_path

        # Concatenate all segments
        concat_list = temp_dir / "concat_list.txt"
        with open(concat_list, "w") as f:
            for seg_path in segment_files:
                # Use forward slashes for FFmpeg
                safe_path = str(seg_path).replace("\\", "/")
                f.write(f"file '{safe_path}'\n")

        cmd = [
            settings.ffmpeg_path, "-y",
            "-f", "concat",
            "-safe", "0",
            "-i", str(concat_list),
            "-c", "copy",
            "-movflags", "+faststart",
            str(output_path),
        ]

        result = subprocess.run(cmd, capture_output=True, text=True, timeout=3600)
        if result.returncode != 0:
            raise RuntimeError(f"FFmpeg concat failed: {result.stderr[-500:]}")

        return output_path

    finally:
        shutil.rmtree(temp_dir, ignore_errors=True)
