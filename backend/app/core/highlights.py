import struct
import subprocess
from pathlib import Path

from app.config import settings


def detect_highlights(
    file_path: str | Path,
    sensitivity: float = 0.5,
    min_duration: float = 3.0,
) -> list[dict]:
    """Detect high-energy audio moments in a media file.

    Uses FFmpeg to extract raw PCM audio, computes RMS energy per window,
    and finds segments where energy exceeds a dynamic threshold.

    Returns a list of dicts with start_ms, end_ms, duration_ms, energy (0.0-1.0).
    """
    file_path = Path(file_path)
    sample_rate = 8000
    window_sec = 0.5  # half-second windows for energy analysis

    # Extract raw PCM audio at 8kHz mono
    cmd = [
        settings.ffmpeg_path,
        "-i", str(file_path),
        "-af", f"aresample={sample_rate}",
        "-ac", "1",
        "-f", "s16le",
        "-vn",
        "pipe:1",
    ]
    result = subprocess.run(cmd, capture_output=True, timeout=120)
    raw = result.stdout

    if not raw or len(raw) < 2:
        return []

    # Compute RMS energy per window
    samples_per_window = int(sample_rate * window_sec)
    bytes_per_window = samples_per_window * 2
    num_windows = len(raw) // bytes_per_window
    max_val = 32768.0

    energies: list[float] = []
    for i in range(num_windows):
        start_byte = i * bytes_per_window
        chunk = raw[start_byte:start_byte + bytes_per_window]
        aligned = chunk[:(len(chunk) // 2) * 2]
        values = struct.unpack(f"<{len(aligned) // 2}h", aligned)
        rms = (sum(v * v for v in values) / len(values)) ** 0.5 if values else 0.0
        energies.append(rms / max_val)

    if not energies:
        return []

    # Determine threshold based on sensitivity
    # sensitivity=0 → top 5% only, sensitivity=1 → top 40%
    sorted_energies = sorted(energies, reverse=True)
    percentile = 0.05 + sensitivity * 0.35  # 5% to 40%
    cutoff_idx = max(1, int(len(sorted_energies) * percentile))
    threshold = sorted_energies[min(cutoff_idx, len(sorted_energies) - 1)]

    # Find windows above threshold
    above = [e >= threshold for e in energies]

    # Merge adjacent high-energy windows into segments
    segments: list[dict] = []
    in_segment = False
    seg_start = 0

    for i, is_high in enumerate(above):
        if is_high and not in_segment:
            seg_start = i
            in_segment = True
        elif not is_high and in_segment:
            _add_segment(segments, seg_start, i, window_sec, min_duration, energies)
            in_segment = False

    # Handle segment that runs to the end
    if in_segment:
        _add_segment(segments, seg_start, len(above), window_sec, min_duration, energies)

    # Sort by energy (strongest first)
    segments.sort(key=lambda s: s["energy"], reverse=True)

    return segments


def _add_segment(
    segments: list[dict],
    start_idx: int,
    end_idx: int,
    window_sec: float,
    min_duration: float,
    energies: list[float],
) -> None:
    """Add a highlight segment if it meets the minimum duration."""
    start_sec = start_idx * window_sec
    end_sec = end_idx * window_sec
    duration_sec = end_sec - start_sec

    if duration_sec < min_duration:
        return

    # Average energy for the segment
    seg_energies = energies[start_idx:end_idx]
    avg_energy = sum(seg_energies) / len(seg_energies) if seg_energies else 0.0

    segments.append({
        "start_ms": int(start_sec * 1000),
        "end_ms": int(end_sec * 1000),
        "duration_ms": int(duration_sec * 1000),
        "energy": round(avg_energy, 4),
    })
