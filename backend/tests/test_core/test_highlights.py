"""Tests for highlights detection (requires FFmpeg)."""

import pytest

from app.core.highlights import detect_highlights


def test_detect_highlights_with_video(sample_video_file):
    """Test highlight detection on a real video file."""
    highlights = detect_highlights(
        str(sample_video_file),
        sensitivity=0.8,
        min_duration=0.5,
    )
    # A 1-second black video with null audio may or may not produce highlights
    assert isinstance(highlights, list)
    for h in highlights:
        assert "start_ms" in h
        assert "end_ms" in h
        assert "energy" in h
        assert h["end_ms"] > h["start_ms"]
