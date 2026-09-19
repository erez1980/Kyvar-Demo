#!/usr/bin/env python3
"""Convert the PNGs `tools/shoot.mjs` produced into the site's WebP assets.

    python3 tools/install-shots.py <dir of PNGs>

Then run `tools/crop-shots.py`, which trims each one to its own content.
"""
from __future__ import annotations

import sys
from pathlib import Path

from PIL import Image

SHOTS = Path(__file__).resolve().parent.parent / "assets" / "screenshots"


def main() -> int:
    if len(sys.argv) < 2:
        print(__doc__)
        return 2
    src = Path(sys.argv[1])
    n = 0
    for png in sorted(src.glob("*.png")):
        target = SHOTS / (png.stem + ".webp")
        with Image.open(png) as im:
            im.convert("RGB").save(target, "WEBP", quality=88, method=6)
        print(f"{png.name} -> {target.name}  {im.size[0]}x{im.size[1]}")
        n += 1
    print(f"\n{n} installed — now run tools/crop-shots.py")
    return 0


if __name__ == "__main__":
    sys.exit(main())
