"""Build small accidental fonts with text-baseline metrics.

DejaVu Sans supplies ♭ ♯ and Δ, which already match a capital letter.
Noto Music supplies 𝄪 and 𝄫; those glyphs are scaled up onto the text
baseline so they do not sit like subscripts.
"""

from pathlib import Path

from fontTools.subset import Subsetter
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "public" / "fonts"


def rename(font: TTFont, family: str) -> None:
    name = font["name"]
    for rec in list(name.names):
        if rec.nameID in (1, 4, 6, 16):
            value = family.replace(" ", "") if rec.nameID == 6 else family
            name.setName(value, rec.nameID, rec.platformID, rec.platEncID, rec.langID)


def subset(font: TTFont, codepoints: list[int]) -> None:
    sub = Subsetter()
    sub.populate(unicodes=codepoints)
    sub.subset(font)


def scale_simple(font: TTFont, codepoint: int, target_top: int) -> None:
    name = font.getBestCmap()[codepoint]
    glyph = font["glyf"][name]
    if glyph.isComposite():
        raise SystemExit(f"{name} is composite; scale it by hand")
    bottom = min(0, glyph.yMin)
    height = glyph.yMax - bottom
    scale = target_top / height
    shift = -bottom * scale
    glyph.coordinates.scale((scale, scale))
    glyph.coordinates.translate((0, shift))
    for index, (x, y) in enumerate(glyph.coordinates):
        glyph.coordinates[index] = (round(x), round(y))
    glyph.recalcBounds(font["glyf"])
    advance, lsb = font["hmtx"][name]
    font["hmtx"][name] = (max(1, round(advance * scale)), round(lsb * scale))


def text_metrics(font: TTFont, ascent: int, descent: int) -> None:
    os2 = font["OS/2"]
    os2.sTypoAscender = ascent
    os2.sTypoDescender = -descent
    os2.sTypoLineGap = 0
    os2.usWinAscent = ascent
    os2.usWinDescent = descent
    os2.fsSelection |= 0x80
    hhea = font["hhea"]
    hhea.ascent = ascent
    hhea.descent = -descent
    hhea.lineGap = 0


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    deja = TTFont("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf")
    subset(deja, [0x266D, 0x266F, 0x0394])
    rename(deja, "Text Accidentals")
    deja.save(OUT / "text-accidentals.ttf")

    music = TTFont("/usr/share/fonts/truetype/noto/NotoMusic-Regular.ttf")
    for codepoint in (0x1D12A, 0x1D12B):
        scale_simple(music, codepoint, target_top=720)
    text_metrics(music, ascent=800, descent=200)
    subset(music, [0x1D12A, 0x1D12B])
    rename(music, "Double Accidentals")
    music.save(OUT / "double-accidentals.ttf")


if __name__ == "__main__":
    main()
