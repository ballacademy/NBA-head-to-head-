#!/usr/bin/env python3
"""Generate public/og-share.png to match the Draft Day GM site chrome."""

from __future__ import annotations

import urllib.request
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "og-share.png"
# Versioned copy referenced by index.html meta tags (cache-bust for crawlers).
OUT_VERSIONED = ROOT / "public" / "og-share-v6.png"
WORDMARK = ROOT / "public" / "draft-day-gm-wordmark-v5.png"
FONT_DIR = Path(__file__).resolve().parent / "fonts"

WIDTH, HEIGHT = 1200, 630
BG = (0, 0, 0)
TAGLINE_COLOR = (226, 232, 240)  # #e2e8f0
RULE = (148, 163, 184)  # #94a3b8

FONT_SOURCES = {
    "Montserrat-SemiBold.ttf": (
        "https://github.com/JulietaUla/Montserrat/raw/master/fonts/ttf/"
        "Montserrat-SemiBold.ttf"
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


def main() -> None:
    fonts = ensure_fonts()
    tagline_font = ImageFont.truetype(str(fonts["Montserrat-SemiBold.ttf"]), size=36)

    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)

    wordmark = Image.open(WORDMARK).convert("RGBA")
    target_w = 920
    scale = target_w / wordmark.width
    wordmark = wordmark.resize(
        (target_w, max(1, int(wordmark.height * scale))),
        Image.Resampling.LANCZOS,
    )

    tagline = "Draft. Match up. Prove your GM eye."
    tag_bbox = draw.textbbox((0, 0), tagline, font=tagline_font)
    tag_w = tag_bbox[2] - tag_bbox[0]
    tag_h = tag_bbox[3] - tag_bbox[1]

    gap_mark_rule = 28
    gap_rule_tag = 22
    rule_h = 3
    rule_w = min(420, tag_w)
    block_h = wordmark.height + gap_mark_rule + rule_h + gap_rule_tag + tag_h
    top = (HEIGHT - block_h) // 2

    mark_x = (WIDTH - wordmark.width) // 2
    image.paste(wordmark, (mark_x, top), wordmark)

    rule_y = top + wordmark.height + gap_mark_rule
    rule_x = (WIDTH - rule_w) // 2
    draw.rounded_rectangle(
        (rule_x, rule_y, rule_x + rule_w, rule_y + rule_h),
        radius=1,
        fill=RULE,
    )

    tag_x = (WIDTH - tag_w) // 2 - tag_bbox[0]
    tag_y = rule_y + rule_h + gap_rule_tag - tag_bbox[1]
    draw.text((tag_x, tag_y), tagline, font=tagline_font, fill=TAGLINE_COLOR)

    OUT.parent.mkdir(parents=True, exist_ok=True)
    image.save(OUT, format="PNG", optimize=True)
    image.save(OUT_VERSIONED, format="PNG", optimize=True)
    print(f"Wrote {OUT} ({OUT.stat().st_size} bytes)")
    print(f"Wrote {OUT_VERSIONED} ({OUT_VERSIONED.stat().st_size} bytes)")


if __name__ == "__main__":
    main()
