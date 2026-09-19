#!/usr/bin/env python3
"""Trim the empty page gutter from the product screenshots.

Every console shot was captured at a 1600px viewport, but the app's own
content column stops at ~1200px — so a quarter of each image is empty
background, and on the site that empty quarter is scaled down along with
the part people are trying to read. Measured before writing this: eleven of
the fourteen dark shots carry content only between x=199 and x=1400.

Cropping to the content makes the UI 1.33x larger at the same rendered
width, with nothing fabricated and nothing redrawn.

Two rules worth keeping:

- **The dark shot measures, and its light twin follows.** The light theme
  paints a brand-tinted wash across the page, so "differs from the corner
  colour" finds no gutter there at all. Both variants are the same page at
  the same viewport, so the horizontal bounds are identical by construction
  — measuring the one that can be measured and applying it to both is more
  reliable than a cleverer detector.
- **Horizontal only.** The vertical bounds are already tight (a 25px band
  at most), and a shot's height legitimately differs between themes because
  the content does.

Idempotent: a shot already cropped to within MARGIN of its content is left
alone, so this can run after every re-shoot.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

SHOTS = Path(__file__).resolve().parent.parent / "assets" / "screenshots"
MARGIN = 24          # breathing room so the UI is not flush against the frame
TOLERANCE = 12       # per-channel distance from the background colour


def content_columns(im: Image.Image) -> tuple[int, int]:
    """First and last column that is not page background."""
    im = im.convert("RGB")
    w, h = im.size
    px = im.load()
    bg = px[2, h // 2]

    def has_content(x: int) -> bool:
        for y in range(0, h, 3):
            p = px[x, y]
            if any(abs(p[i] - bg[i]) > TOLERANCE for i in range(3)):
                return True
        return False

    left = 0
    while left < w and not has_content(left):
        left += 1
    right = w - 1
    while right > left and not has_content(right):
        right -= 1
    return left, right


def main() -> int:
    changed = []
    for dark in sorted(SHOTS.glob("*.webp")):
        if dark.name.endswith("-light.webp"):
            continue
        with Image.open(dark) as im:
            width = im.size[0]
            left, right = content_columns(im)

        # 2px of slack: WebP is lossy, so re-measuring a cropped shot can
        # move a bound by a pixel, and without the slack every run would
        # re-encode (and re-degrade) an image that is already right.
        if left <= MARGIN + 2 and right >= width - 1 - MARGIN - 2:
            print(f"{dark.name:28s} already tight ({left}..{right} of {width})")
            continue

        box_l = max(0, left - MARGIN)
        box_r = min(width, right + 1 + MARGIN)

        for path in (dark, dark.with_name(dark.stem + "-light.webp")):
            if not path.exists():
                continue
            with Image.open(path) as im:
                if im.size[0] != width:
                    print(f"  ! {path.name} is {im.size[0]}px wide, not {width} — skipped")
                    continue
                im.crop((box_l, 0, box_r, im.size[1])).save(path, "WEBP", quality=88, method=6)
            changed.append(path.name)
        print(f"{dark.name:28s} {width} -> {box_r - box_l}  (content {left}..{right})")

    print(f"\n{len(changed)} file(s) rewritten")
    return 0


if __name__ == "__main__":
    sys.exit(main())
