"""Converts the @fontsource WOFF files used by the web UI into TTF for the native app.

Run from the repo root (needs `pip install fonttools`):
    python native/tools/gen-fonts.py
"""
from pathlib import Path

from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[2]
OUT = ROOT / "native" / "assets" / "fonts"
OUT.mkdir(parents=True, exist_ok=True)

FONTS = {
    "geist-sans": [400, 500, 600, 700],
    "jetbrains-mono": [500, 700],
}

for family, weights in FONTS.items():
    for weight in weights:
        source = ROOT / "node_modules" / "@fontsource" / family / "files" / f"{family}-latin-{weight}-normal.woff"
        font = TTFont(source)
        font.flavor = None
        target = OUT / f"{family}-{weight}.ttf"
        font.save(target)
        names = {n.nameID: n.toUnicode() for n in font["name"].names if n.nameID in (1, 16)}
        print(f"{target.name}: family={names.get(16, names.get(1))} weight={font['OS/2'].usWeightClass}")
