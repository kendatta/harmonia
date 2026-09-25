import { Chord, Note } from "tonal";
import { musicGlyphs } from "./chords";
import { degreeNumber } from "./layout";
import type { Group, KeyContext } from "./types";

const NAMES: Record<string, string> = {
  C: "Dó",
  D: "Ré",
  E: "Mi",
  F: "Fá",
  G: "Sol",
  A: "Lá",
  B: "Si",
};

const ORDINALS = ["", "primeiro", "segundo", "terceiro", "quarto", "quinto", "sexto", "sétimo"];

const INTERVALS = ["T", "2m", "2M", "3m", "3M", "4J", "5d", "5J", "6m", "6M", "7m", "7M"];

export function solfegePitch(note: string): string {
  const glyph = musicGlyphs(note);
  const letter = glyph[0] ?? "";
  const name = NAMES[letter];
  if (!name) return glyph;
  return `${name}${glyph.slice(1)}`;
}

export function keyPhrase(key: KeyContext): string {
  return `${solfegePitch(key.tonic)} ${key.mode === "major" ? "maior" : "menor"}`;
}

/** Minor destinations keep the mode, so "→ Dó m" is not the same label as the major tonic. */
export function pivotLabel(key: KeyContext): string {
  const name = solfegePitch(key.tonic);
  return key.mode === "minor" ? `→ ${name} m` : `→ ${name}`;
}

export function spokenChord(symbol: string): string {
  const chord = Chord.get(symbol);
  const root = solfegePitch(chord.tonic || symbol);
  switch (chord.type) {
    case "major":
      return `${root} maior`;
    case "minor":
      return `${root} menor`;
    case "diminished":
      return `${root} diminuto`;
    case "augmented":
      return `${root} aumentado`;
    case "dominant seventh":
      return `${root} com sétima`;
    case "major seventh":
      return `${root} maior com sétima maior`;
    case "minor seventh":
      return `${root} menor com sétima`;
    default:
      return root;
  }
}

export function intervalLabel(root: string, note: string): string {
  const from = Note.chroma(root);
  const to = Note.chroma(note);
  if (from === null || from === undefined || to === null || to === undefined) return "";
  return INTERVALS[(to - from + 12) % 12] ?? "";
}

function ordinal(roman: string): string {
  const degree = degreeNumber(roman);
  if (!degree) return "grau";
  return ORDINALS[degree] ?? "grau";
}

export function familySpoken(group: Group | "chromatic"): string {
  if (group === "secondary") return "dominante secundária";
  if (group === "borrowed") return "emprestado";
  if (group === "pivot") return "pivô";
  if (group === "chromatic") return "cromático";
  return "diatônico";
}

export function chordAria(input: {
  symbol: string;
  roman: string;
  group: Group | "chromatic";
  nextKey?: KeyContext;
}): string {
  const spoken = spokenChord(input.symbol);
  if (input.group === "pivot" && input.nextKey) {
    return `${spoken}, pivô para ${keyPhrase(input.nextKey)}`;
  }
  if (input.group === "secondary" && input.roman.includes("/")) {
    const target = input.roman.split("/")[1] ?? input.roman;
    return `${spoken}, dominante do ${ordinal(target)} grau, dominante secundária`;
  }
  return `${spoken}, ${ordinal(input.roman)} grau, ${familySpoken(input.group)}`;
}
