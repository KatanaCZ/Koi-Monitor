#!/usr/bin/env python3
"""Generate Koi Monitor wordmark icon (SlashTitle static style) via Pillow."""

from __future__ import annotations

import math
import shutil
import sys
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter, ImageFont

ROOT = Path(__file__).resolve().parent.parent
SCRIPT_DIR = Path(__file__).resolve().parent
FONT_PATH = SCRIPT_DIR / "assets" / "fonts" / "GeistSans-SemiBold.ttf"
ICONS_DIR = ROOT / "src-tauri" / "icons"
PUBLIC_DIR = ROOT / "public"

CANVAS = 1024
BG = (0x0A, 0x0E, 0x18)
NEON_PINK = (0xFF, 0x2D, 0x95)
NEON_PURPLE = (0x9D, 0x4E, 0xDD)
NEON_CYAN = (0x00, 0xD4, 0xFF)

# Matches .slash-title-static-koi / .splash-title-gradient (105deg)
GRADIENT_STOPS: list[tuple[float, tuple[int, int, int]]] = [
    (0.0, NEON_PINK),
    (0.42, NEON_PURPLE),
    (0.78, NEON_CYAN),
    (1.0, NEON_PINK),
]
GRADIENT_ANGLE = 105.0
TEXT = "Koi"
ICO_SIZES = [(16, 16), (32, 32), (48, 48), (256, 256)]


def squircle_mask(size: int, corner_ratio: float = 0.22) -> Image.Image:
    mask = Image.new("L", (size, size), 0)
    draw = ImageDraw.Draw(mask)
    radius = int(size * corner_ratio)
    draw.rounded_rectangle([0, 0, size - 1, size - 1], radius=radius, fill=255)
    return mask


def lerp_rgb(t: float, stops: list[tuple[float, tuple[int, int, int]]]) -> tuple[int, int, int]:
    t = max(0.0, min(1.0, t))
    for i in range(len(stops) - 1):
        t0, c0 = stops[i]
        t1, c1 = stops[i + 1]
        if t0 <= t <= t1:
            span = t1 - t0
            u = (t - t0) / span if span > 0 else 0.0
            return tuple(int(c0[j] + (c1[j] - c0[j]) * u) for j in range(3))
    return stops[-1][1]


def linear_gradient_rgba(
    width: int,
    height: int,
    angle_deg: float,
    stops: list[tuple[float, tuple[int, int, int]]],
) -> Image.Image:
    """CSS-like linear gradient (0deg = to top, 90deg = to right)."""
    img = Image.new("RGBA", (width, height))
    pixels = img.load()
    rad = math.radians(angle_deg)
    # Unit vector along gradient line (CSS convention)
    ux = math.sin(rad)
    uy = -math.cos(rad)
    cx, cy = width / 2.0, height / 2.0
    half = max(
        abs(ux) * width / 2.0 + abs(uy) * height / 2.0,
        1.0,
    )
    for y in range(height):
        for x in range(width):
            proj = ((x - cx) * ux + (y - cy) * uy) / half
            t = (proj + 1.0) / 2.0
            rgb = lerp_rgb(t, stops)
            pixels[x, y] = rgb + (255,)
    return img


def measure_text(text: str, font: ImageFont.FreeTypeFont) -> tuple[int, int, int, int]:
    dummy = Image.new("L", (1, 1))
    return ImageDraw.Draw(dummy).textbbox((0, 0), text, font=font)


def render_text_layer(
    text: str,
    font: ImageFont.FreeTypeFont,
    gradient_stops: list[tuple[float, tuple[int, int, int]]],
    angle: float,
) -> Image.Image:
    bbox = measure_text(text, font)
    pad = max(4, int(font.size * 0.15))
    w = bbox[2] - bbox[0] + pad * 2
    h = bbox[3] - bbox[1] + pad * 2
    ox, oy = pad - bbox[0], pad - bbox[1]

    alpha = Image.new("L", (w, h), 0)
    ImageDraw.Draw(alpha).text((ox, oy), text, font=font, fill=255)

    gradient = linear_gradient_rgba(w, h, angle, gradient_stops)
    gradient.putalpha(alpha)
    return gradient


def tinted_glow(source: Image.Image, color: tuple[int, int, int], blur: int, opacity: float) -> Image.Image:
    alpha = source.split()[3]
    glow = Image.new("RGBA", source.size, color + (0,))
    glow.putalpha(alpha)
    glow = glow.filter(ImageFilter.GaussianBlur(blur))
    if opacity < 1.0:
        a = glow.split()[3].point(lambda p: int(p * opacity))
        glow.putalpha(a)
    return glow


def render_icon(canvas_size: int = CANVAS) -> Image.Image:
    if not FONT_PATH.is_file():
        raise FileNotFoundError(f"Font missing: {FONT_PATH}")

    font_size = int(canvas_size * 0.36)
    font = ImageFont.truetype(str(FONT_PATH), font_size)

    text_layer = render_text_layer(TEXT, font, GRADIENT_STOPS, GRADIENT_ANGLE)

    # Slight inner highlight (lighter lilac center)
    highlight_stops = [
        (0.0, (255, 180, 230)),
        (0.5, (220, 160, 255)),
        (1.0, (160, 220, 255)),
    ]
    highlight = render_text_layer(TEXT, font, highlight_stops, GRADIENT_ANGLE)
    h_alpha = highlight.split()[3].point(lambda p: int(p * 0.35))
    highlight.putalpha(h_alpha)

    canvas = Image.new("RGBA", (canvas_size, canvas_size), BG + (255,))
    canvas.putalpha(squircle_mask(canvas_size))

    tx = (canvas_size - text_layer.width) // 2
    ty = (canvas_size - text_layer.height) // 2 + int(canvas_size * 0.015)

    comp = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))

    blur_outer = max(2, int(canvas_size * 0.045))
    blur_mid = max(2, int(canvas_size * 0.028))
    blur_inner = max(1, int(canvas_size * 0.012))

    for glow, blur, opacity in (
        (NEON_PURPLE, blur_outer, 0.55),
        (NEON_CYAN, blur_mid, 0.28),
        (NEON_PINK, blur_inner, 0.22),
    ):
        g = tinted_glow(text_layer, glow, blur, opacity)
        layer = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
        layer.alpha_composite(g, (tx, ty))
        comp = Image.alpha_composite(comp, layer)

    comp.alpha_composite(highlight, (tx, ty))
    comp.alpha_composite(text_layer, (tx, ty))

    out = Image.new("RGBA", (canvas_size, canvas_size), (0, 0, 0, 0))
    out.alpha_composite(canvas)
    out.alpha_composite(comp)
    out.putalpha(ImageChops.multiply(out.split()[3], canvas.split()[3]))
    return out


def save_master(icon: Image.Image, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    icon.save(path, format="PNG", optimize=True)
    print(f"  wrote {path.relative_to(ROOT)}")


def save_ico(icon: Image.Image, path: Path) -> None:
    frames = [icon.resize(size, Image.Resampling.LANCZOS) for size in ICO_SIZES]
    path.parent.mkdir(parents=True, exist_ok=True)
    frames[0].save(
        path,
        format="ICO",
        sizes=[(f.width, f.height) for f in frames],
        append_images=frames[1:],
    )
    print(f"  wrote {path.relative_to(ROOT)}")


def sync_public() -> None:
    ico_src = ICONS_DIR / "icon.ico"
    png32_src = ICONS_DIR / "32x32.png"
    if ico_src.is_file():
        shutil.copy2(ico_src, PUBLIC_DIR / "favicon.ico")
        print(f"  synced {PUBLIC_DIR.relative_to(ROOT)}/favicon.ico")
    if png32_src.is_file():
        shutil.copy2(png32_src, PUBLIC_DIR / "icon-32.png")
        print(f"  synced {PUBLIC_DIR.relative_to(ROOT)}/icon-32.png")


def main() -> int:
    sync_only = "--sync-public-only" in sys.argv
    if sync_only:
        print("Syncing public favicon assets…")
        sync_public()
        return 0

    print("Generating Koi wordmark icon…")
    icon = render_icon(CANVAS)

    master = ICONS_DIR / "icon-source.png"
    save_master(icon, master)
    save_ico(icon, ICONS_DIR / "icon.ico")

    preview = ICONS_DIR / "icon-preview-256.png"
    icon.resize((256, 256), Image.Resampling.LANCZOS).save(preview, format="PNG")
    print(f"  wrote {preview.relative_to(ROOT)}")

    print("\nNext: npm run icons")
    print("Then: py -3 scripts/generate_koi_icon.py --sync-public-only")
    if "--sync-public" in sys.argv:
        sync_public()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
