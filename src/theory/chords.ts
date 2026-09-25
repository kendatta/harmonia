import { Chord, Note } from "tonal";
import { signatureAlteration } from "./layout";
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

/** Unicode accidentals so flats and sharps are glyphs, not the letters b and #. */
export function musicGlyphs(text: string): string {
  return text
    .replaceAll("##", "𝄪")
    .replaceAll("bb", "𝄫")
    .replaceAll("#", "♯")
    .replace(/([A-G])b/g, "$1♭")
    .replace(/b(?=[IViv])/g, "♭");
}

export function displaySymbol(symbol: string): string {
  return musicGlyphs(symbol.replaceAll("maj7", "Δ").replaceAll("dim", "°"));
}

export function displayRoman(roman: string): string {
  return musicGlyphs(roman);
}

export function qualityLabel(symbol: string): string {
  const type = Chord.get(symbol).type;
  return QUALITY_LABEL[type] ?? "acorde";
}

export function keyLabel(key: KeyContext): string {
  return `${musicGlyphs(key.tonic)} ${key.mode === "major" ? "maior" : "menor"}`;
}

export function sameKey(a: KeyContext, b: KeyContext): boolean {
  return a.tonic === b.tonic && a.mode === b.mode;
}

const MAJOR_TONICS = new Set(["C", "G", "D", "A", "E", "B", "F#", "C#", "F", "Bb", "Eb", "Ab", "Db", "Gb", "Cb"]);
const MINOR_TONICS = new Set(["A", "E", "B", "F#", "C#", "G#", "D#", "D", "G", "C", "F", "Bb", "Eb", "Ab"]);

/** Prefer a common key spelling. D#7 resolves to Ab major; Fb major becomes E major. Cb stays Cb. */
export function spellKey(tonic: string, mode: Mode): KeyContext {
  const allowed = mode === "major" ? MAJOR_TONICS : MINOR_TONICS;
  if (allowed.has(tonic)) return { tonic, mode };
  const other = Note.enharmonic(tonic);
  if (allowed.has(other)) return { tonic: other, mode };
  return { tonic, mode };
}

/** Twelve usual keys per mode. Sol♭ and Dó♭ major stay in the catalog, not in this picker. */
export const PICKER_MAJORS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"] as const;
export const PICKER_MINORS = ["A", "E", "B", "F#", "C#", "G#", "Eb", "Bb", "F", "C", "G", "D"] as const;

const MAJOR_STEPS = ["1P", "2M", "3M", "4P", "5P", "6M", "7M"] as const;
const NATURAL_MINOR_STEPS = ["1P", "2M", "3m", "4P", "5P", "6m", "7m"] as const;
/** Major-mode borrowings whose roots are not diatonic: ♭III, ♭VI, ♭VII. */
const MAJOR_BORROWED_STEPS = ["3m", "6m", "7m"] as const;

function flatAccidental(root: string): boolean {
  return /^[A-G]b/.test(root);
}

/**
 * Spellings the key already uses for a pitch: the scale (harmonic leading tone
 * in minor), then major-mode borrowings. First match wins; those sets do not share a pitch class.
 */
function preferredSpellings(key: KeyContext): string[] {
  if (key.mode === "major") {
    return [
      ...MAJOR_STEPS.map((step) => Note.transpose(key.tonic, step)),
      ...MAJOR_BORROWED_STEPS.map((step) => Note.transpose(key.tonic, step)),
    ];
  }
  return [...NATURAL_MINOR_STEPS.map((step) => Note.transpose(key.tonic, step)), Note.transpose(key.tonic, "7M")];
}

/**
 * Spell the root as the applied key spells that pitch.
 * F° on the Fá♯ maior chip becomes E♯°; Si in Mi♭ menor becomes Dó♭.
 * A pitch with no scale or borrowed degree keeps the signature direction.
 */
export function spellRootForKey(root: string, key: KeyContext): string {
  const chroma = Note.chroma(root);
  if (chroma === undefined || chroma === null) return root;
  const match = preferredSpellings(key).find((note) => Note.chroma(note) === chroma);
  if (match) return match;
  const alteration = signatureAlteration(key);
  if (root.includes("#") && alteration < 0) return Note.enharmonic(root);
  if (flatAccidental(root) && alteration > 0) return Note.enharmonic(root);
  return root;
}

/** The Tonalidade chip inferKey points at. Sol♭ maior is offered as Fá♯. */
export function pickerSuggestion(root: string, quality: Quality): KeyContext {
  return toPickerKey(inferKey(root, quality));
}

/** A chip chosen by hand stays put when only the quality changes. */
export function pickerKeyForQuality(manual: boolean, selected: KeyContext, root: string, quality: Quality): KeyContext {
  return manual ? selected : pickerSuggestion(root, quality);
}

/** Map a catalog key onto a picker chip. Gb major highlights Fá♯; D♯ minor highlights Mi♭. */
export function toPickerKey(key: KeyContext): KeyContext {
  const list = key.mode === "major" ? PICKER_MAJORS : PICKER_MINORS;
  if ((list as readonly string[]).includes(key.tonic)) return { tonic: key.tonic, mode: key.mode };
  const spelled = Note.enharmonic(key.tonic);
  if ((list as readonly string[]).includes(spelled)) return { tonic: spelled, mode: key.mode };
  return { tonic: key.tonic, mode: key.mode };
}

export function inferKey(root: string, quality: Quality): KeyContext {
  if (quality === "dim") {
    return spellKey(Note.transpose(root, "2m"), "major");
  }
  if (quality === "min" || quality === "m7") {
    return spellKey(root, "minor");
  }
  if (quality === "7") {
    return spellKey(Note.transpose(root, "-5P"), "major");
  }
  return spellKey(root, "major");
}

export function formatNotes(notes: string[]): string {
  return notes.map((note) => musicGlyphs(note)).join(" – ");
}

/** Close voicing from C3 upward, so the piano sample sits in a musical register. */
export function voicedMidis(pitchClasses: string[]): number[] {
  return voiceChord(pitchClasses).map((note) => {
    const midi = Note.midi(note);
    if (midi === null) throw new Error(`Nota inválida: ${note}`);
    return midi;
  });
}

/** C that begins a 2-octave window containing every voiced MIDI note. */
export function keyboardStart(midis: number[]): number {
  if (midis.length === 0) return 48;
  const lowest = Math.min(...midis);
  let start = lowest - (lowest % 12);
  const highest = Math.max(...midis);
  while (highest > start + 23) start += 12;
  return start;
}

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
