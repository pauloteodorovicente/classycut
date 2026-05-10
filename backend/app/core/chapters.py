def generate_chapters(
    transcription_segments: list[dict],
    min_chapter_duration: float = 30.0,
) -> list[dict]:
    """Generate chapters from transcription segments.

    Detects natural chapter boundaries by finding large gaps between
    transcription segments (indicating pauses/topic changes).
    Titles are derived from the first words of each chapter.

    Returns a list of dicts with index, start_ms, end_ms, title.
    """
    if not transcription_segments:
        return []

    # Calculate gaps between consecutive segments
    gaps: list[tuple[int, float]] = []  # (index, gap_seconds)
    for i in range(1, len(transcription_segments)):
        prev_end = transcription_segments[i - 1]["end"]
        curr_start = transcription_segments[i]["start"]
        gap = curr_start - prev_end
        if gap > 0:
            gaps.append((i, gap))

    # Sort gaps by size (largest first) to find natural break points
    gaps.sort(key=lambda g: g[1], reverse=True)

    # Find break points that respect minimum chapter duration
    total_duration = transcription_segments[-1]["end"] - transcription_segments[0]["start"]
    max_chapters = max(1, int(total_duration / min_chapter_duration))

    break_indices: set[int] = set()
    for seg_idx, gap_sec in gaps:
        if len(break_indices) >= max_chapters - 1:
            break
        # Only use gap if it creates chapters of sufficient length
        break_indices.add(seg_idx)

    # Validate break points produce valid chapter durations
    break_list = sorted(break_indices)
    valid_breaks: list[int] = []
    prev_start = transcription_segments[0]["start"]

    for brk in break_list:
        chapter_end = transcription_segments[brk - 1]["end"]
        if chapter_end - prev_start >= min_chapter_duration:
            valid_breaks.append(brk)
            prev_start = transcription_segments[brk]["start"]

    # Also check the last chapter is long enough
    if valid_breaks:
        last_start = transcription_segments[valid_breaks[-1]]["start"]
        last_end = transcription_segments[-1]["end"]
        if last_end - last_start < min_chapter_duration:
            valid_breaks.pop()

    # Build chapter list
    chapters: list[dict] = []
    chapter_boundaries = [0] + valid_breaks + [len(transcription_segments)]

    for i in range(len(chapter_boundaries) - 1):
        start_seg_idx = chapter_boundaries[i]
        end_seg_idx = chapter_boundaries[i + 1] - 1

        start_ms = int(transcription_segments[start_seg_idx]["start"] * 1000)
        end_ms = int(transcription_segments[end_seg_idx]["end"] * 1000)

        # Generate title from first few words of the chapter
        title = _generate_title(transcription_segments, start_seg_idx, end_seg_idx)

        chapters.append({
            "index": i + 1,
            "start_ms": start_ms,
            "end_ms": end_ms,
            "title": title,
        })

    return chapters


def _generate_title(
    segments: list[dict],
    start_idx: int,
    end_idx: int,
    max_words: int = 8,
) -> str:
    """Generate a chapter title from the first words of its segments."""
    words: list[str] = []
    for i in range(start_idx, min(end_idx + 1, start_idx + 3)):
        text = segments[i].get("text", "").strip()
        if text:
            words.extend(text.split())
        if len(words) >= max_words:
            break

    if not words:
        return f"Capítulo"

    title = " ".join(words[:max_words])
    # Capitalize first letter and add ellipsis if truncated
    title = title[0].upper() + title[1:] if title else title
    if len(words) > max_words:
        title += "..."

    return title


def generate_summary(
    transcription_segments: list[dict],
    max_sentences: int = 5,
) -> str:
    """Generate an extractive summary from transcription segments.

    Selects the most representative sentences based on length,
    position, and keyword frequency.

    Returns a summary string.
    """
    if not transcription_segments:
        return ""

    # Collect all sentences
    sentences: list[dict] = []
    for seg in transcription_segments:
        text = seg.get("text", "").strip()
        if not text:
            continue
        # Split on sentence-ending punctuation
        parts = _split_sentences(text)
        for part in parts:
            part = part.strip()
            if len(part.split()) >= 3:  # skip very short fragments
                sentences.append({
                    "text": part,
                    "start": seg["start"],
                    "word_count": len(part.split()),
                })

    if not sentences:
        # Fallback: just concatenate all segment texts
        full_text = " ".join(s["text"] for s in transcription_segments if s.get("text"))
        return full_text[:500] if full_text else ""

    # Score sentences
    total = len(sentences)
    word_freq = _compute_word_freq(sentences)

    for i, sent in enumerate(sentences):
        score = 0.0

        # Position score: first and last sentences are often important
        if i < total * 0.2:
            score += 2.0  # intro sentences
        elif i > total * 0.8:
            score += 1.0  # closing sentences

        # Length score: prefer medium-length sentences
        wc = sent["word_count"]
        if 5 <= wc <= 25:
            score += 1.5
        elif wc > 25:
            score += 0.5

        # Keyword score: sentences with frequent words are more central
        words = sent["text"].lower().split()
        keyword_score = sum(word_freq.get(w, 0) for w in words) / max(len(words), 1)
        score += keyword_score * 2

        sent["score"] = score

    # Select top sentences and sort by original order
    sentences.sort(key=lambda s: s["score"], reverse=True)
    selected = sentences[:max_sentences]
    selected.sort(key=lambda s: s["start"])

    return " ".join(s["text"] for s in selected)


def _split_sentences(text: str) -> list[str]:
    """Split text into sentences on common punctuation."""
    import re
    parts = re.split(r'(?<=[.!?])\s+', text)
    return [p for p in parts if p]


def _compute_word_freq(sentences: list[dict]) -> dict[str, float]:
    """Compute normalized word frequency across all sentences."""
    freq: dict[str, int] = {}
    stop_words = {
        "a", "o", "e", "de", "do", "da", "que", "em", "um", "uma", "para",
        "com", "no", "na", "se", "os", "as", "é", "por", "mais", "mas",
        "the", "a", "an", "and", "or", "is", "in", "to", "of", "it",
        "i", "you", "he", "she", "we", "they", "this", "that", "was",
    }
    total = 0
    for sent in sentences:
        for word in sent["text"].lower().split():
            cleaned = word.strip(".,!?;:\"'()[]")
            if cleaned and cleaned not in stop_words and len(cleaned) > 2:
                freq[cleaned] = freq.get(cleaned, 0) + 1
                total += 1

    # Normalize
    if total > 0:
        return {w: c / total for w, c in freq.items()}
    return {}
