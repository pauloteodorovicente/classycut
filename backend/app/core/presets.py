"""Platform export presets for ClassyCut."""

from typing import TypedDict


class PlatformPreset(TypedDict, total=False):
    width: int
    height: int
    max_mb: float | None


PLATFORM_PRESETS: dict[str, PlatformPreset | None] = {
    "instagram_reels": {"width": 1080, "height": 1920, "max_mb": 650},
    "tiktok":          {"width": 1080, "height": 1920, "max_mb": 500},
    "youtube_shorts":  {"width": 1080, "height": 1920, "max_mb": 256},
    "whatsapp":        {"width": 640,  "height": 1136, "max_mb": 16},
    "youtube":         {"width": 1920, "height": 1080, "max_mb": None},
    "original":        None,
}


def get_vf_filter(platform: str) -> str | None:
    """
    Return an FFmpeg -vf filter string for the given platform,
    or None if no transformation is needed.

    The filter center-crops the source to match the target aspect ratio,
    then scales to the target resolution.
    """
    preset = PLATFORM_PRESETS.get(platform)
    if not preset:
        return None

    w = preset["width"]
    h = preset["height"]

    # Center-crop to target AR, then scale.
    # If source is wider than target AR → crop horizontally.
    # If source is taller than target AR → crop vertically.
    # setsar=1:1 forces square pixels — without it the encoder may inherit a
    # non-square SAR from the source (e.g. 404:405) which confuses players.
    vf = (
        f"crop=if(gt(iw/ih\\,{w}/{h})\\,trunc(ih*{w}/{h}/2)*2\\,iw)"
        f":if(gt(iw/ih\\,{w}/{h})\\,ih\\,trunc(iw*{h}/{w}/2)*2),"
        f"scale={w}:{h},"
        f"setsar=1:1"
    )
    return vf


def get_max_mb(platform: str) -> float | None:
    """Return the file size limit in MB for the given platform, or None."""
    preset = PLATFORM_PRESETS.get(platform)
    if not preset:
        return None
    return preset.get("max_mb")
