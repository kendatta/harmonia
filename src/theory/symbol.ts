import { musicGlyphs } from "./chords";

export function symbolParts(symbol: string): { base: string; ext: string } {
  const glyph = musicGlyphs(symbol.replaceAll("dim", "°"));
  if (glyph.endsWith("maj7")) return { base: `${glyph.slice(0, -4)}maj`, ext: "7" };
  if (glyph.endsWith("m7")) return { base: glyph.slice(0, -1), ext: "7" };
  if (glyph.endsWith("7")) return { base: glyph.slice(0, -1), ext: "7" };
  return { base: glyph, ext: "" };
}

export function plainSymbol(symbol: string): string {
  const { base, ext } = symbolParts(symbol);
  return ext ? `${base}${ext}` : base;
}

export function fittedSize(base: string, ext: string, size: number, maxWidth: number): number {
  let font = size;
  const width = (value: number) => (base.length + ext.length * 0.75) * value * 0.58;
  while (font > 11 && width(font) > maxWidth) font -= 1;
  return font;
}
