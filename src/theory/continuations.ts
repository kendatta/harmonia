import { Chord, Note } from "tonal";
import { keyLabel, notesOfSymbol, sameKey, spellKey } from "./chords";
import { degreeNumber } from "./layout";
import { solfegePitch } from "./speech";
import type { ChordAnalysis, Continuation, Group, KeyContext, PivotKind } from "./types";

const MAJOR_STEPS = ["1P", "2M", "3M", "4P", "5P", "6M", "7M"] as const;
const NATURAL_MINOR_STEPS = ["1P", "2M", "3m", "4P", "5P", "6m", "7m"] as const;
const HARMONIC_MINOR_STEPS = ["1P", "2M", "3m", "4P", "5P", "6m", "7M"] as const;

type ScaleName = "major" | "natural" | "harmonic";
type TriadQuality = "maj" | "min" | "dim";

interface DegreeSpec {
  roman: string;
  group: "tonic" | "subdominant" | "dominant";
  scale: ScaleName;
  index: number;
  quality: TriadQuality;
}

const MAJOR_DEGREES: DegreeSpec[] = [
  { roman: "I", group: "tonic", scale: "major", index: 0, quality: "maj" },
  { roman: "ii", group: "subdominant", scale: "major", index: 1, quality: "min" },
  { roman: "iii", group: "tonic", scale: "major", index: 2, quality: "min" },
  { roman: "IV", group: "subdominant", scale: "major", index: 3, quality: "maj" },
  { roman: "V", group: "dominant", scale: "major", index: 4, quality: "maj" },
  { roman: "vi", group: "tonic", scale: "major", index: 5, quality: "min" },
  { roman: "vii°", group: "dominant", scale: "major", index: 6, quality: "dim" },
];

/** Common-practice minor: natural collection, with V and vii° from the harmonic minor. */
const MINOR_DEGREES: DegreeSpec[] = [
  { roman: "i", group: "tonic", scale: "natural", index: 0, quality: "min" },
  { roman: "ii°", group: "subdominant", scale: "natural", index: 1, quality: "dim" },
  { roman: "III", group: "tonic", scale: "natural", index: 2, quality: "maj" },
  { roman: "iv", group: "subdominant", scale: "natural", index: 3, quality: "min" },
  { roman: "V", group: "dominant", scale: "harmonic", index: 4, quality: "maj" },
  { roman: "VI", group: "tonic", scale: "natural", index: 5, quality: "maj" },
  { roman: "vii°", group: "dominant", scale: "harmonic", index: 6, quality: "dim" },
];

interface BorrowedSpec {
  interval: string;
  quality: TriadQuality;
  roman: string;
  detail: string;
}

function degreeRoot(tonic: string, scale: ScaleName, index: number): string {
  const steps = scale === "major" ? MAJOR_STEPS : scale === "natural" ? NATURAL_MINOR_STEPS : HARMONIC_MINOR_STEPS;
  return Note.transpose(tonic, steps[index]);
}

function triad(root: string, quality: TriadQuality): string {
  if (quality === "maj") return root;
  if (quality === "min") return `${root}m`;
  return `${root}dim`;
}

function makeMove(
  partial: Omit<Continuation, "notes" | "strong">,
): Continuation {
  return {
    ...partial,
    notes: notesOfSymbol(partial.symbol),
    strong: false,
  };
}

function diatonicDetail(roman: string, group: Group, key: KeyContext): string {
  const place = keyLabel(key);
  if (group === "tonic") {
    return `${roman} em ${place}. Função de tônica: repouso, ou um substituto da tônica.`;
  }
  if (group === "subdominant") {
    return `${roman} em ${place}. Função de subdominante: afastamento que prepara a dominante.`;
  }
  return `${roman} em ${place}. Função de dominante: tensão que pede a tônica.`;
}

function fieldChords(key: KeyContext): Continuation[] {
  const degrees = key.mode === "major" ? MAJOR_DEGREES : MINOR_DEGREES;
  const place = keyLabel(key);
  const moves: Continuation[] = [];

  for (const degree of degrees) {
    const root = degreeRoot(key.tonic, degree.scale, degree.index);
    moves.push(
      makeMove({
        id: `diatonic-${degree.roman}`,
        symbol: triad(root, degree.quality),
        group: degree.group,
        roman: degree.roman,
        detail: diatonicDetail(degree.roman, degree.group, key),
        nextKey: key,
      }),
    );
  }

  for (const degree of degrees) {
    if (degree.index === 0 || degree.quality === "dim") continue;
    const targetRoot = degreeRoot(key.tonic, degree.scale, degree.index);
    const dominantRoot = Note.transpose(targetRoot, "5P");
    const roman = `V7/${degree.roman}`;
    moves.push(
      makeMove({
        id: `secondary-${roman}`,
        symbol: `${dominantRoot}7`,
        group: "secondary",
        roman,
        detail: `${roman} em ${place}. Dominante secundária: toniciza o ${degree.roman} sem trocar de tom.`,
        nextKey: key,
      }),
    );
  }

  for (const borrowed of borrowedSpecs(key)) {
    const root = Note.transpose(key.tonic, borrowed.interval);
    moves.push(
      makeMove({
        id: `borrowed-${borrowed.roman}`,
        symbol: triad(root, borrowed.quality),
        group: "borrowed",
        roman: borrowed.roman,
        detail: borrowed.detail,
        nextKey: key,
      }),
    );
  }

  return moves;
}

function catalogChords(key: KeyContext): Continuation[] {
  return [...fieldChords(key), ...pivotMoves(key)];
}

function borrowedSpecs(key: KeyContext): BorrowedSpec[] {
  if (key.mode === "major") {
    const parallel = keyLabel({ tonic: key.tonic, mode: "minor" });
    return [
      {
        interval: "3m",
        quality: "maj",
        roman: "bIII",
        detail: `bIII · empréstimo do ${parallel} natural. A cor muda; o tom de referência continua.`,
      },
      {
        interval: "4P",
        quality: "min",
        roman: "iv",
        detail: `iv · empréstimo do ${parallel} natural. A cor muda; o tom de referência continua.`,
      },
      {
        interval: "6m",
        quality: "maj",
        roman: "bVI",
        detail: `bVI · empréstimo do ${parallel} natural. A cor muda; o tom de referência continua.`,
      },
      {
        interval: "7m",
        quality: "maj",
        roman: "bVII",
        detail: `bVII · empréstimo do ${parallel} natural. A cor muda; o tom de referência continua.`,
      },
    ];
  }

  const parallel = keyLabel({ tonic: key.tonic, mode: "major" });
  return [
    {
      interval: "5P",
      quality: "min",
      roman: "v",
      detail: "v · dominante menor, vinda do modo natural. O tom de referência continua.",
    },
    {
      interval: "7m",
      quality: "maj",
      roman: "VII",
      detail: "VII · subtônica do modo natural, a mesma coleção de III. O tom de referência continua.",
    },
    {
      interval: "1P",
      quality: "maj",
      roman: "I",
      detail: `I · empréstimo do ${parallel}. O tom de referência continua.`,
    },
    {
      interval: "4P",
      quality: "maj",
      roman: "IV",
      detail: `IV · empréstimo do ${parallel}. O tom de referência continua.`,
    },
  ];
}

function spellNoteForHome(note: string, home: KeyContext): string {
  const flatHome = home.tonic.includes("b") || home.tonic === "F";
  const sharpHome = home.tonic.includes("#");
  if (flatHome && note.includes("#")) return Note.enharmonic(note);
  if (sharpHome && note.includes("b")) return Note.enharmonic(note);
  return note;
}

function destinationTag(key: KeyContext): string {
  const name = solfegePitch(key.tonic);
  return key.mode === "minor" ? `${name} m` : name;
}

function pitchKey(symbol: string): string {
  return Chord.get(symbol)
    .notes.map((note) => String(Note.chroma(note)))
    .sort()
    .join(".");
}

interface CommonChord {
  symbol: string;
  oldRoman: string;
  newRoman: string;
  oldGroup: Group;
  newGroup: Group;
}

function diatonicField(key: KeyContext): Continuation[] {
  return fieldChords(key).filter((chord) => chord.group === "tonic" || chord.group === "subdominant" || chord.group === "dominant");
}

/** A chord that already belongs to both keys, excluding the destination tonic. */
function commonChords(from: KeyContext, to: KeyContext): CommonChord[] {
  const oldField = diatonicField(from);
  const newField = diatonicField(to);
  const destination = newField.find((chord) => chord.roman === "I" || chord.roman === "i");
  const destinationSet = destination ? pitchKey(destination.symbol) : "";
  const seen = new Set<string>();
  const found: CommonChord[] = [];
  for (const oldChord of oldField) {
    const set = pitchKey(oldChord.symbol);
    if (seen.has(set) || set === destinationSet) continue;
    const arrival = newField.find((chord) => pitchKey(chord.symbol) === set);
    if (!arrival) continue;
    seen.add(set);
    found.push({
      symbol: oldChord.symbol,
      oldRoman: oldChord.roman,
      newRoman: arrival.roman,
      oldGroup: oldChord.group,
      newGroup: arrival.group,
    });
  }
  return found;
}

function commonScore(chord: CommonChord): number {
  let score = 0;
  if (chord.oldRoman === "I" || chord.oldRoman === "i") score -= 80;
  if (chord.newGroup === "subdominant") score += 50;
  else if (chord.newRoman === "vi" || chord.newRoman === "VI" || chord.newRoman === "iii" || chord.newRoman === "III") score += 20;
  if (chord.oldGroup === "subdominant") score += 5;
  if (chord.symbol.includes("dim")) score -= 30;
  return score;
}

function pivotMoves(key: KeyContext): Continuation[] {
  const relative = key.mode === "major" ? spellKey(Note.transpose(key.tonic, "-3m"), "minor") : spellKey(Note.transpose(key.tonic, "3m"), "major");
  const up = spellKey(Note.transpose(key.tonic, "5P"), key.mode);
  const down = spellKey(Note.transpose(key.tonic, "-5P"), key.mode);
  const parallel = spellKey(key.tonic, key.mode === "major" ? "minor" : "major");
  const used = new Set<string>();
  const doors: Continuation[] = [];

  const addCommon = (id: string, kind: PivotKind, nextKey: KeyContext) => {
    const ranked = commonChords(key, nextKey)
      .map((chord) => ({ chord, score: commonScore(chord) - (used.has(pitchKey(chord.symbol)) ? 100 : 0) }))
      .sort((a, b) => b.score - a.score);
    const best = ranked[0]?.chord;
    if (!best) return;
    used.add(pitchKey(best.symbol));
    const place = keyLabel(nextKey);
    doors.push(
      makeMove({
        id,
        symbol: best.symbol,
        group: "pivot",
        roman: best.oldRoman,
        caption: `${best.oldRoman} = ${best.newRoman} (${destinationTag(nextKey)})`,
        detail: `${best.oldRoman} aqui é ${best.newRoman} em ${place}. Acorde comum: o som fica, a função muda.`,
        nextKey,
        pivotKind: kind,
      }),
    );
  };

  addCommon("pivot-fifth-up", "fifth-up", up);
  addCommon("pivot-fifth-down", "fifth-down", down);
  addCommon("pivot-relative", "relative", relative);

  const parallelRoot = spellNoteForHome(parallel.tonic, key);
  const parallelSymbol = parallel.mode === "minor" ? `${parallelRoot}m` : parallelRoot;
  doors.push(
    makeMove({
      id: "pivot-parallel",
      symbol: parallelSymbol,
      group: "pivot",
      roman: parallel.mode === "minor" ? "i" : "I",
      caption: "mod. direta",
      detail: `Modulação direta ao ${parallel.mode === "minor" ? "menor" : "maior"} paralelo, por mistura. Não é um acorde comum aos dois campos.`,
      nextKey: parallel,
      pivotKind: "parallel",
    }),
  );
  return doors;
}

interface Origin {
  group: Group | "chromatic";
  roman: string | null;
  degree: number | null;
}

function originOf(symbol: string, catalog: Continuation[]): Origin {
  const set = pitchKey(symbol);
  const stay =
    catalog.find((chord) => chord.symbol === symbol && !chord.pivotKind) ??
    catalog.find((chord) => !chord.pivotKind && pitchKey(chord.symbol) === set);
  if (stay) return { group: stay.group, roman: stay.roman, degree: degreeNumber(stay.roman) };

  const parsed = Chord.get(symbol);
  if (!parsed.empty && parsed.tonic && (parsed.type === "dominant seventh" || parsed.type === "major seventh" || parsed.type === "minor seventh")) {
    const triadSymbol =
      parsed.quality === "Minor" ? `${parsed.tonic}m` : parsed.quality === "Diminished" ? `${parsed.tonic}dim` : parsed.tonic;
    const triad = catalog.find((chord) => chord.symbol === triadSymbol && !chord.pivotKind);
    if (triad) return { group: triad.group, roman: triad.roman, degree: degreeNumber(triad.roman) };
  }
  return { group: "chromatic", roman: null, degree: null };
}

interface Slot {
  degree: number;
  group: "tonic" | "subdominant" | "dominant" | "borrowed";
}

/** Likely next chords, keyed by origin group and scale degree — not by the roman spelling. */
const NEXT_BY_FUNCTION: Record<string, Slot[]> = {
  "tonic:1": [
    { degree: 4, group: "subdominant" },
    { degree: 5, group: "dominant" },
    { degree: 6, group: "tonic" },
    { degree: 2, group: "subdominant" },
  ],
  "subdominant:2": [
    { degree: 5, group: "dominant" },
    { degree: 7, group: "dominant" },
  ],
  "tonic:3": [
    { degree: 6, group: "tonic" },
    { degree: 4, group: "subdominant" },
  ],
  "subdominant:4": [
    { degree: 5, group: "dominant" },
    { degree: 1, group: "tonic" },
    { degree: 2, group: "subdominant" },
    { degree: 4, group: "borrowed" },
  ],
  "dominant:5": [
    { degree: 1, group: "tonic" },
    { degree: 6, group: "tonic" },
  ],
  "tonic:6": [
    { degree: 2, group: "subdominant" },
    { degree: 4, group: "subdominant" },
    { degree: 5, group: "dominant" },
  ],
  "dominant:7": [{ degree: 1, group: "tonic" }],
  "borrowed:4": [
    { degree: 1, group: "tonic" },
    { degree: 5, group: "dominant" },
  ],
  "borrowed:7": [{ degree: 1, group: "tonic" }],
  "borrowed:6": [
    { degree: 7, group: "borrowed" },
    { degree: 5, group: "dominant" },
    { degree: 1, group: "tonic" },
  ],
  "borrowed:3": [
    { degree: 4, group: "borrowed" },
    { degree: 6, group: "borrowed" },
    { degree: 7, group: "borrowed" },
  ],
};

function degreeUp(degree: number, steps: number): number {
  return ((degree - 1 + steps) % 7) + 1;
}

function diatonicSlot(key: KeyContext, degree: number): Slot {
  const specs = key.mode === "major" ? MAJOR_DEGREES : MINOR_DEGREES;
  const spec = specs.find((item) => item.index === degree - 1);
  return { degree, group: spec?.group ?? "tonic" };
}

function slotsFor(origin: Origin, key: KeyContext): Slot[] {
  if (origin.group === "secondary" && origin.degree) {
    return [diatonicSlot(key, origin.degree), diatonicSlot(key, degreeUp(origin.degree, 5))];
  }
  if (!origin.degree || origin.group === "chromatic" || origin.group === "pivot") return [];
  return NEXT_BY_FUNCTION[`${origin.group}:${origin.degree}`] ?? [];
}

function matchesSlot(move: Continuation, slot: Slot): boolean {
  if (move.pivotKind) return false;
  return move.group === slot.group && degreeNumber(move.roman) === slot.degree;
}

export function getContinuations(centerSymbol: string, key: KeyContext): Continuation[] {
  const catalog = catalogChords(key);
  const slots = slotsFor(originOf(centerSymbol, catalog), key);

  return catalog
    .filter((move) => !(move.symbol === centerSymbol && sameKey(move.nextKey, key)))
    .map((move) => ({
      ...move,
      strong: slots.some((slot) => matchesSlot(move, slot)),
    }));
}

export function symbolInKey(symbol: string, key: KeyContext): string {
  const catalog = fieldChords(key);
  const set = pitchKey(symbol);
  return catalog.find((chord) => pitchKey(chord.symbol) === set)?.symbol ?? symbol;
}

export function describeChordInKey(symbol: string, key: KeyContext): ChordAnalysis {
  const catalog = catalogChords(key);
  const set = pitchKey(symbol);
  const stay =
    catalog.find((chord) => chord.symbol === symbol && !chord.pivotKind) ??
    catalog.find((chord) => !chord.pivotKind && pitchKey(chord.symbol) === set);
  if (stay) return { roman: stay.roman, group: stay.group, detail: stay.detail };

  const parsed = Chord.get(symbol);
  if (!parsed.empty && parsed.tonic) {
    if (parsed.type === "dominant seventh") {
      const triad = catalog.find((chord) => chord.symbol === parsed.tonic && !chord.pivotKind);
      if (triad && Chord.get(triad.symbol).quality === "Major") {
        return {
          roman: `${triad.roman}7`,
          group: triad.group,
          detail: `${triad.roman}7 em ${keyLabel(key)}. Sétima de dominante sobre um grau maior.`,
        };
      }
    }
    if (parsed.type === "major seventh" || parsed.type === "minor seventh") {
      const triadSymbol = parsed.quality === "Minor" ? `${parsed.tonic}m` : parsed.tonic;
      const triad = catalog.find((chord) => chord.symbol === triadSymbol && !chord.pivotKind);
      if (triad) {
        const suffix = parsed.type === "major seventh" ? "Δ" : "7";
        return {
          roman: `${triad.roman}${suffix}`,
          group: triad.group,
          detail: `Extensão de ${triad.roman} em ${keyLabel(key)}.`,
        };
      }
    }
  }

  const pivotHit = catalog.find((chord) => chord.symbol === symbol);
  if (pivotHit) return { roman: pivotHit.roman, group: pivotHit.group, detail: pivotHit.detail };

  return {
    roman: "—",
    group: "chromatic",
    detail: `Fora do campo harmônico de ${keyLabel(key)}. Os caminhos ao redor seguem esse tom mesmo assim.`,
  };
}
