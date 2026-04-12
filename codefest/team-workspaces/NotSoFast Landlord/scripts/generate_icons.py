"""Generate PWA icons for NotSoFast Landlord.

Produces a simple shield-themed icon at the sizes the Next.js PWA manifest
references. Run once after `pip install pillow` (Pillow is in requirements.txt).

Usage:
    cd backend && source .venv/bin/activate
    python ../scripts/generate_icons.py
"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

BRAND = (14, 122, 95)      # #0E7A5F
BRAND_DARK = (10, 90, 70)
WHITE = (255, 255, 255)

OUT_DIR = Path(__file__).parent.parent / "frontend" / "public" / "icons"
OUT_DIR.mkdir(parents=True, exist_ok=True)


def make_icon(size: int) -> Image.Image:
    img = Image.new("RGBA", (size, size), BRAND)
    draw = ImageDraw.Draw(img)

    # Outer ring
    margin = size // 10
    draw.rounded_rectangle(
        (margin, margin, size - margin, size - margin),
        radius=size // 6,
        outline=WHITE,
        width=max(2, size // 40),
    )

    # Shield shape (simplified)
    cx = size // 2
    top = size * 0.28
    bot = size * 0.78
    w = size * 0.28
    shield = [
        (cx, top),
        (cx + w, top + (bot - top) * 0.25),
        (cx + w * 0.75, bot),
        (cx, bot + size * 0.03),
        (cx - w * 0.75, bot),
        (cx - w, top + (bot - top) * 0.25),
    ]
    draw.polygon(shield, fill=WHITE)

    # "N" monogram inside shield
    try:
        font = ImageFont.truetype(
            "/System/Library/Fonts/Helvetica.ttc", int(size * 0.28)
        )
    except Exception:
        font = ImageFont.load_default()
    bbox = draw.textbbox((0, 0), "N", font=font)
    tw = bbox[2] - bbox[0]
    th = bbox[3] - bbox[1]
    draw.text(
        ((size - tw) / 2, size * 0.42 - th / 2),
        "N",
        fill=BRAND_DARK,
        font=font,
    )

    return img


if __name__ == "__main__":
    for size in (192, 512):
        icon = make_icon(size)
        path = OUT_DIR / f"icon-{size}.png"
        icon.save(path, "PNG")
        print(f"wrote {path}")
