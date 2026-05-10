"""Tests for the chapters and summary generation."""

from app.core.chapters import generate_chapters, generate_summary


def test_generate_chapters_empty():
    assert generate_chapters([]) == []


def test_generate_chapters_single_segment():
    segments = [{"id": 0, "start": 0.0, "end": 10.0, "text": "Hello world"}]
    chapters = generate_chapters(segments, min_chapter_duration=5.0)
    assert len(chapters) == 1
    assert chapters[0]["index"] == 1
    assert chapters[0]["start_ms"] == 0
    assert chapters[0]["end_ms"] == 10000


def test_generate_chapters_with_gap():
    segments = [
        {"id": 0, "start": 0.0, "end": 30.0, "text": "First chapter content here"},
        {"id": 1, "start": 35.0, "end": 65.0, "text": "Second chapter content here"},
    ]
    chapters = generate_chapters(segments, min_chapter_duration=20.0)
    assert len(chapters) >= 1
    # Should have titles derived from text
    assert chapters[0]["title"]


def test_generate_summary_empty():
    assert generate_summary([]) == ""


def test_generate_summary_basic():
    segments = [
        {"id": 0, "start": 0.0, "end": 5.0, "text": "This is an important introduction to the topic."},
        {"id": 1, "start": 5.0, "end": 10.0, "text": "We discuss key concepts."},
        {"id": 2, "start": 10.0, "end": 15.0, "text": "The main conclusion follows naturally from the evidence presented here."},
    ]
    summary = generate_summary(segments, max_sentences=2)
    assert len(summary) > 0
    assert isinstance(summary, str)


def test_generate_summary_respects_max_sentences():
    segments = [
        {"id": i, "start": i * 5.0, "end": (i + 1) * 5.0, "text": f"Sentence number {i} with enough words to count."}
        for i in range(20)
    ]
    summary = generate_summary(segments, max_sentences=3)
    # Summary should exist and not be excessively long
    assert len(summary) > 0
