#!/usr/bin/env python3
"""Generate public/og-share.png to match the Draft Day GM site chrome."""

from __future__ import annotations

import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "og-share.png"
# Versioned copy referenced by index.html meta tags (cache-bust for crawlers).
OUT_VERSIONED = ROOT / "public" / "og-share-v4.png"
LOGO = ROOT / "public" / "draft-day-gm-logo-v4.png"
FONT_DIR = Path(__file__).resolve().parent / "fonts"

WIDTH, HEIGHT = 1200, 630

# Site tokens: page body #171b22 → #0b0d11, nudged darker for OG punch.
BG_TOP = (18, 21, 26)  # near #12151a
BG_BOTTOM = (11, 13, 17)  # #0b0d11
TEXT = (248, 250, 252)  # #f8fafc
MUTED = (203, 213, 225)  # #cbd5e1
RULE = (148, 163, 184)  # #94a3b8
URL = (226, 232, 240)  # #e2e8f0

FONT_SOURCES = {
    # Static TTFs (variable-font weight picking is awkward in Pillow).
    "Montserrat-Black.ttf": (
        "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/"
        "Montserrat-Black.ttf"
    ),
    "Montserrat-SemiBold.ttf": (
        "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/"
        "Montserrat-SemiBold.ttf"
    ),
    "Montserrat-Bold.ttf": (
        "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/"
        "Montserrat-Bold.ttf"
    ),
}


def ensure_fonts() -> dict[str, Path]:
    FONT_DIR.mkdir(parents=True, exist_ok=True)
    paths: dict[str, Path] = {}
    for name, url in FONT_SOURCES.items():
        dest = FONT_DIR / name
        if not dest.exists() or dest.stat().st_size < 1000:
            print(f"Downloading {name}…")
            urllib.request.urlretrieve(url, dest)
        paths[name] = dest
    return paths


def vertical_gradient(size: tuple[int, int], top: tuple[int, int, int], bottom: tuple[int, int, int]) -> Image.Image:
    width, height = size
    image = Image.new("RGB", size, top)
    pixels = image.load()
    assert pixels is not None
    for y in range(height):
        t = y / max(height - 1, 1)
        color = tuple(int(a + (b - a) * t) for a, b in zip(top, bottom))
        for x in range(width):
            pixels[x, y] = color
    return image


def add_site_texture(image: Image.Image) -> None:
    """Subtle dotted sheen similar to hub chrome / tier chips."""
    overlay = Image.new("RGBA", image.size, (0, 0, 0, 0))
    draw = ImageDraw.Draw(overlay)
    width, height = image.size

    # Soft cool sheen from upper-left.
    for y in range(height):
        for x in range(0, width, 3):
            dx = x / width
            dy = y / height
            strength = max(0.0, 0.10 - 0.14 * (dx * 0.55 + dy * 0.7))
            if strength <= 0:
                continue
            alpha = int(255 * strength)
            if (x // 3 + y // 3) % 2 == 0:
                draw.point((x, y), fill=(186, 200, 220, alpha))

    # Concentric arcs (kept quiet; no yellow accents).
    cx, cy = int(width * 0.82), int(height * 0.5)
    for radius in range(120, 720, 48):
        alpha = max(10, 34 - radius // 28)
        draw.ellipse(
            (cx - radius, cy - radius, cx + radius, cy + radius),
            outline=(148, 163, 184, alpha),
            width=2,
        )

    # Diagonal hairlines.
    for offset in (-220, -40, 140, 320):
        draw.line(
            (offset, 0, offset + height, height),
            fill=(148, 163, 184, 18),
            width=2,
        )

    base = image.convert("RGBA")
    composed = Image.alpha_composite(base, overlay)
    image.paste(composed.convert("RGB"))


def load_font(path: Path, size: int) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(path), size=size)


def main() -> None:
    fonts = ensure_fonts()
    title_font = load_font(fonts["Montserrat-Black.ttf"], 84)
    tagline_font = load_font(fonts["Montserrat-SemiBold.ttf"], 32)
    url_font = load_font(fonts["Montserrat-Bold.ttf"], 26)

    image = vertical_gradient((WIDTH, HEIGHT), BG_TOP, BG_BOTTOM)
    add_site_texture(image)
    draw = ImageDraw.Draw(image)

    logo = Image.open(LOGO).convert("RGBA")
    logo_size = 280
    logo = logo.resize((logo_size, logo_size), Image.Resampling.LANCZOS)
    logo_x, logo_y = 88, (HEIGHT - logo_size) // 2
    image.paste(logo, (logo_x, logo_y), logo)

    text_x = logo_x + logo_size + 56
    title = "DRAFT DAY GM"
    tagline = "Draft. Match up. Prove your GM eye."
    url = "draftdaygm.com"

    title_bbox = draw.textbbox((0, 0), title, font=title_font)
    tag_bbox = draw.textbbox((0, 0), tagline, font=tagline_font)
    url_bbox = draw.textbbox((0, 0), url, font=url_font)
    # textbbox top can be negative; use ink bottom offsets when stacking.
    title_ink_h = title_bbox[3] - title_bbox[1]
    tag_ink_h = tag_bbox[3] - tag_bbox[1]
    url_ink_h = url_bbox[3] - url_bbox[1]

    gap_title_rule = 18
    gap_rule_tag = 22
    gap_tag_url = 28
    rule_h = 3
    block_h = (
        title_ink_h
        + gap_title_rule
        + rule_h
        + gap_rule_tag
        + tag_ink_h
        + gap_tag_url
        + url_ink_h
    )
    y = (HEIGHT - block_h) // 2 - title_bbox[1]

    # Open tracking to match hub title treatment.
    title_tracking = 6
    cursor_x = text_x
    for index, char in enumerate(title):
        draw.text((cursor_x, y), char, font=title_font, fill=TEXT)
        char_w = draw.textlength(char, font=title_font)
        cursor_x += char_w + (title_tracking if index < len(title) - 1 else 0)
    tracked_title_w = cursor_x - text_x

    rule_y = y + title_bbox[3] + gap_title_rule
    draw.rounded_rectangle(
        (text_x, rule_y, text_x + tracked_title_w, rule_y + rule_h),
        radius=1,
        fill=RULE,
    )

    tag_y = rule_y + rule_h + gap_rule_tag - tag_bbox[1]
    draw.text((text_x, tag_y), tagline, font=tagline_font, fill=MUTED)

    url_y = tag_y + tag_bbox[3] + gap_tag_url - url_bbox[1]
    draw.text((text_x, url_y), url, font=url_font, fill=URL)

    # Quiet slate edge lines instead of yellow top bar.
    draw.rectangle((0, 0, WIDTH, 2), fill=(36, 42, 54))
    draw.rectangle((0, HEIGHT - 2, WIDTH, HEIGHT), fill=(36, 42, 54))

    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT, format="PNG", optimize=True)
    image.save(OUT_VERSIONED, format="PNG", optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
    print(f"Wrote {OUT_VERSIONED} ({OUT_VERSIONED.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
