import { Chord, Note } from "tonal";
import { keyLabel, notesOfSymbol, sameKey } from "./chords";
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

function catalogChords(key: KeyContext): Continuation[] {
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

  moves.push(...pivotMoves(key));
  return moves;
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
      detail: "VII · subtônica do modo natural. O tom de referência continua.",
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

function pivotMoves(key: KeyContext): Continuation[] {
  if (key.mode === "major") {
    const relative = Note.transpose(key.tonic, "-3m");
    const up = Note.transpose(key.tonic, "5P");
    const down = Note.transpose(key.tonic, "-5P");
    return [
      pivot(key, {
        id: "pivot-relative",
        kind: "relative",
        symbol: `${relative}m`,
        roman: "vi",
        detail: `Modulação ao relativo. O vi passa a ser i em ${relative} menor.`,
        nextKey: { tonic: relative, mode: "minor" },
      }),
      pivot(key, {
        id: "pivot-parallel",
        kind: "parallel",
        symbol: `${key.tonic}m`,
        roman: "i",
        detail: `Modulação ao paralelo. O centro tonal passa a ${key.tonic} menor.`,
        nextKey: { tonic: key.tonic, mode: "minor" },
      }),
      pivot(key, {
        id: "pivot-fifth-up",
        kind: "fifth-up",
        symbol: up,
        roman: "V",
        detail: `Vizinho da quinta acima no ciclo. O V passa a ser I em ${up} maior.`,
        nextKey: { tonic: up, mode: "major" },
      }),
      pivot(key, {
        id: "pivot-fifth-down",
        kind: "fifth-down",
        symbol: down,
        roman: "IV",
        detail: `Vizinho da quinta abaixo no ciclo. O IV passa a ser I em ${down} maior.`,
        nextKey: { tonic: down, mode: "major" },
      }),
    ];
  }

  const relative = Note.transpose(key.tonic, "3m");
  const up = Note.transpose(key.tonic, "5P");
  const down = Note.transpose(key.tonic, "-5P");
  return [
    pivot(key, {
      id: "pivot-relative",
      kind: "relative",
      symbol: relative,
      roman: "III",
      detail: `Modulação ao relativo. O III passa a ser I em ${relative} maior.`,
      nextKey: { tonic: relative, mode: "major" },
    }),
    pivot(key, {
      id: "pivot-parallel",
      kind: "parallel",
      symbol: key.tonic,
      roman: "I",
      detail: `Modulação ao paralelo. O centro tonal passa a ${key.tonic} maior.`,
      nextKey: { tonic: key.tonic, mode: "major" },
    }),
    pivot(key, {
      id: "pivot-fifth-up",
      kind: "fifth-up",
      symbol: `${up}m`,
      roman: "v",
      detail: `Vizinho da quinta acima no ciclo. O v passa a ser i em ${up} menor.`,
      nextKey: { tonic: up, mode: "minor" },
    }),
    pivot(key, {
      id: "pivot-fifth-down",
      kind: "fifth-down",
      symbol: `${down}m`,
      roman: "iv",
      detail: `Vizinho da quinta abaixo no ciclo. O iv passa a ser i em ${down} menor.`,
      nextKey: { tonic: down, mode: "minor" },
    }),
  ];
}

function pivot(
  _key: KeyContext,
  spec: {
    id: string;
    kind: PivotKind;
    symbol: string;
    roman: string;
    detail: string;
    nextKey: KeyContext;
  },
): Continuation {
  return makeMove({
    id: spec.id,
    symbol: spec.symbol,
    group: "pivot",
    roman: spec.roman,
    detail: spec.detail,
    nextKey: spec.nextKey,
    pivotKind: spec.kind,
  });
}

function originOf(symbol: string, catalog: Continuation[]): { group: Group | "chromatic"; roman: string | null } {
  const stay = catalog.find((chord) => chord.symbol === symbol && !chord.pivotKind);
  if (stay) return { group: stay.group, roman: stay.roman };

  const parsed = Chord.get(symbol);
  if (!parsed.empty && parsed.tonic && (parsed.type === "dominant seventh" || parsed.type === "major seventh" || parsed.type === "minor seventh")) {
    const triadSymbol =
      parsed.quality === "Minor" ? `${parsed.tonic}m` : parsed.quality === "Diminished" ? `${parsed.tonic}dim` : parsed.tonic;
    const triad = catalog.find((chord) => chord.symbol === triadSymbol && !chord.pivotKind);
    if (triad) return { group: triad.group, roman: triad.roman };
  }
  return { group: "chromatic", roman: null };
}

function strongRomans(group: Group | "chromatic", centerRoman: string | null): Set<string> {
  if (group === "dominant") return new Set(["I", "i", "vi", "VI"]);
  if (group === "subdominant") return new Set(["V", "I", "i", "vii°"]);
  if (group === "secondary") {
    const target = centerRoman?.split("/")[1];
    const romans = new Set(["I", "i", "V"]);
    if (target) romans.add(target);
    return romans;
  }
  return new Set(["ii", "ii°", "IV", "iv", "V", "vi", "VI", "VII"]);
}

const STRONG_APPLIED = new Set(["V7/V", "V7/ii", "V7/vi", "V7/iv", "V7/VI"]);

export function getContinuations(centerSymbol: string, key: KeyContext): Continuation[] {
  const catalog = catalogChords(key);
  const origin = originOf(centerSymbol, catalog);
  const wanted = strongRomans(origin.group, origin.roman);

  return catalog
    .filter((move) => !(move.symbol === centerSymbol && sameKey(move.nextKey, key)))
    .map((move) => ({
      ...move,
      strong:
        wanted.has(move.roman) ||
        move.pivotKind === "relative" ||
        move.pivotKind === "fifth-up" ||
        (move.group === "secondary" && STRONG_APPLIED.has(move.roman)),
    }));
}

export function describeChordInKey(symbol: string, key: KeyContext): ChordAnalysis {
  const catalog = catalogChords(key);
  const stay = catalog.find((chord) => chord.symbol === symbol && !chord.pivotKind);
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
