import { Chord, Note } from "tonal";
import type { KeyContext, Mode, Quality } from "./types";

export const SHARP_ROOTS = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"] as const;
export const FLAT_ROOTS = ["C", "Db", "D", "Eb", "E", "F", "Gb", "G", "Ab", "A", "Bb", "B"] as const;

export const QUALITY_OPTIONS: { id: Quality; label: string; hint: string }[] = [
  { id: "maj", label: "Maior", hint: "Tríade maior" },
  { id: "min", label: "Menor", hint: "Tríade menor" },
  { id: "7", label: "7", hint: "Dominante com sétima" },
  { id: "maj7", label: "Maior 7", hint: "Maior com sétima maior" },
  { id: "m7", label: "Menor 7", hint: "Menor com sétima menor" },
  { id: "dim", label: "Diminuto", hint: "Tríade diminuta" },
];

const QUALITY_LABEL: Record<string, string> = {
  major: "maior",
  minor: "menor",
  diminished: "diminuto",
  augmented: "aumentado",
  "dominant seventh": "dominante 7",
  "major seventh": "maior 7",
  "minor seventh": "menor 7",
};

export function symbolFrom(root: string, quality: Quality): string {
  switch (quality) {
    case "maj":
      return root;
    case "min":
      return `${root}m`;
    case "7":
      return `${root}7`;
    case "maj7":
      return `${root}maj7`;
    case "m7":
      return `${root}m7`;
    case "dim":
      return `${root}dim`;
  }
}

export function notesOfSymbol(symbol: string): string[] {
  const chord = Chord.get(symbol);
  if (chord.empty || chord.notes.length === 0) {
    throw new Error(`Acorde inválido: ${symbol}`);
  }
  return [...chord.notes];
}

export function notesOf(root: string, quality: Quality): string[] {
  return notesOfSymbol(symbolFrom(root, quality));
}

export function displaySymbol(symbol: string): string {
  return symbol.replaceAll("maj7", "Δ").replaceAll("dim", "°");
}

export function qualityLabel(symbol: string): string {
  const type = Chord.get(symbol).type;
  return QUALITY_LABEL[type] ?? "acorde";
}

export function keyLabel(key: KeyContext): string {
  return `${key.tonic} ${key.mode === "major" ? "maior" : "menor"}`;
}

export function sameKey(a: KeyContext, b: KeyContext): boolean {
  return a.tonic === b.tonic && a.mode === b.mode;
}

export function inferKey(root: string, quality: Quality): KeyContext {
  if (quality === "min" || quality === "m7" || quality === "dim") {
    return { tonic: root, mode: "minor" };
  }
  if (quality === "7") {
    return { tonic: Note.transpose(root, "-5P"), mode: "major" };
  }
  return { tonic: root, mode: "major" };
}

export function formatNotes(notes: string[]): string {
  return notes.join(" – ");
}

/** Close voicing from C3 upward, so the piano sample sits in a musical register. */
export function voiceChord(pitchClasses: string[]): string[] {
  if (pitchClasses.length === 0) return [];
  const chromas = pitchClasses.map((pitch) => {
    const chroma = Note.chroma(pitch);
    if (chroma === null || chroma === undefined) {
      throw new Error(`Nota inválida: ${pitch}`);
    }
    return chroma;
  });
  const midis = [48 + chromas[0]];
  for (let index = 1; index < chromas.length; index += 1) {
    let midi = 48 + chromas[index];
    while (midi <= midis[index - 1]) midi += 12;
    midis.push(midi);
  }
  return midis.map((midi) => Note.fromMidi(midi));
}

export function modeName(mode: Mode): string {
  return mode === "major" ? "maior" : "menor";
}
