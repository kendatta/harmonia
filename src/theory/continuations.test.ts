import { describe, expect, it } from "vitest";
import { describeChordInKey, getContinuations } from "./continuations";
import type { Continuation, KeyContext } from "./types";

function byId(moves: Continuation[], id: string): Continuation {
  const found = moves.find((move) => move.id === id);
  if (!found) throw new Error(`Movimento ausente: ${id}`);
  return found;
}

function symbols(moves: Continuation[], group?: Continuation["group"]): string[] {
  return moves.filter((move) => (group ? move.group === group : true)).map((move) => move.symbol);
}

const Cmaj: KeyContext = { tonic: "C", mode: "major" };
const Amin: KeyContext = { tonic: "A", mode: "minor" };
const Fsharp: KeyContext = { tonic: "F#", mode: "major" };
const Bbmaj: KeyContext = { tonic: "Bb", mode: "major" };
const Dbmaj: KeyContext = { tonic: "Db", mode: "major" };

describe("continuações em C maior", () => {
  const moves = getContinuations("C", Cmaj);

  it("mostra o campo diatônico sem repetir a tônica que já está no centro", () => {
    expect(symbols(moves, "tonic").sort()).toEqual(["Am", "Em"]);
    expect(symbols(moves, "subdominant").sort()).toEqual(["Dm", "F"]);
    expect(symbols(moves, "dominant").sort()).toEqual(["Bdim", "G"]);
    expect(moves.some((move) => move.symbol === "C" && !move.pivotKind)).toBe(false);
  });

  it("marca as funções com algarismos romanos", () => {
    expect(byId(moves, "diatonic-ii")).toMatchObject({ symbol: "Dm", group: "subdominant", roman: "ii" });
    expect(byId(moves, "diatonic-V")).toMatchObject({ symbol: "G", group: "dominant", roman: "V", notes: ["G", "B", "D"] });
    expect(byId(moves, "diatonic-vi")).toMatchObject({ symbol: "Am", group: "tonic", roman: "vi" });
  });

  it("gera dominantes secundárias dos graus maiores e menores", () => {
    expect(byId(moves, "secondary-V7/ii")).toMatchObject({ symbol: "A7", roman: "V7/ii", notes: ["A", "C#", "E", "G"] });
    expect(byId(moves, "secondary-V7/V")).toMatchObject({ symbol: "D7", roman: "V7/V" });
    expect(byId(moves, "secondary-V7/vi")).toMatchObject({ symbol: "E7" });
    expect(byId(moves, "secondary-V7/IV")).toMatchObject({ symbol: "C7" });
    expect(byId(moves, "secondary-V7/iii")).toMatchObject({ symbol: "B7" });
  });

  it("empresta iv, bIII, bVI e bVII do menor paralelo", () => {
    expect(byId(moves, "borrowed-iv")).toMatchObject({ symbol: "Fm", notes: ["F", "Ab", "C"] });
    expect(byId(moves, "borrowed-bIII")).toMatchObject({ symbol: "Eb", notes: ["Eb", "G", "Bb"] });
    expect(byId(moves, "borrowed-bVI")).toMatchObject({ symbol: "Ab" });
    expect(byId(moves, "borrowed-bVII")).toMatchObject({ symbol: "Bb" });
  });

  it("abre portas para relativo, paralelo e vizinhos de quinta", () => {
    expect(byId(moves, "pivot-relative")).toMatchObject({
      symbol: "Am",
      roman: "vi",
      nextKey: { tonic: "A", mode: "minor" },
    });
    expect(byId(moves, "pivot-parallel")).toMatchObject({
      symbol: "Cm",
      roman: "i",
      nextKey: { tonic: "C", mode: "minor" },
    });
    expect(byId(moves, "pivot-fifth-up")).toMatchObject({
      symbol: "G",
      roman: "V",
      nextKey: { tonic: "G", mode: "major" },
    });
    expect(byId(moves, "pivot-fifth-down")).toMatchObject({
      symbol: "F",
      roman: "IV",
      nextKey: { tonic: "F", mode: "major" },
    });
  });

  it("destaca caminhos prováveis a partir da tônica", () => {
    expect(byId(moves, "diatonic-V").strong).toBe(true);
    expect(byId(moves, "diatonic-IV").strong).toBe(true);
    expect(byId(moves, "diatonic-vi").strong).toBe(true);
    expect(byId(moves, "diatonic-ii").strong).toBe(true);
    expect(byId(moves, "diatonic-iii").strong).toBe(false);
    expect(byId(moves, "diatonic-vii°").strong).toBe(false);
  });
});

describe("continuações a partir da dominante", () => {
  const moves = getContinuations("G", Cmaj);

  it("deixa a tônica disponível e esconde o V que já é o centro", () => {
    expect(byId(moves, "diatonic-I")).toMatchObject({ symbol: "C", roman: "I", strong: true });
    expect(moves.some((move) => move.id === "diatonic-V")).toBe(false);
    expect(byId(moves, "pivot-fifth-up").nextKey).toEqual({ tonic: "G", mode: "major" });
  });
});

describe("A menor", () => {
  const moves = getContinuations("Am", Amin);

  it("usa a dominante maior da menor harmônica", () => {
    expect(byId(moves, "diatonic-V")).toMatchObject({
      symbol: "E",
      roman: "V",
      group: "dominant",
      notes: ["E", "G#", "B"],
    });
    expect(byId(moves, "diatonic-vii°")).toMatchObject({ symbol: "G#dim", notes: ["G#", "B", "D"] });
    expect(byId(moves, "diatonic-III")).toMatchObject({ symbol: "C", roman: "III" });
    expect(byId(moves, "diatonic-iv")).toMatchObject({ symbol: "Dm" });
    expect(byId(moves, "diatonic-VI")).toMatchObject({ symbol: "F" });
    expect(byId(moves, "diatonic-ii°")).toMatchObject({ symbol: "Bdim" });
  });

  it("separa o v natural e a subtônica do empréstimo", () => {
    expect(byId(moves, "borrowed-v")).toMatchObject({ symbol: "Em", notes: ["E", "G", "B"] });
    expect(byId(moves, "borrowed-VII")).toMatchObject({ symbol: "G", roman: "VII" });
    expect(byId(moves, "borrowed-I")).toMatchObject({ symbol: "A" });
    expect(byId(moves, "borrowed-IV")).toMatchObject({ symbol: "D" });
  });

  it("modula para o relativo maior e para os vizinhos menores", () => {
    expect(byId(moves, "pivot-relative").nextKey).toEqual({ tonic: "C", mode: "major" });
    expect(byId(moves, "pivot-parallel").nextKey).toEqual({ tonic: "A", mode: "major" });
    expect(byId(moves, "pivot-fifth-up")).toMatchObject({
      symbol: "Em",
      nextKey: { tonic: "E", mode: "minor" },
    });
    expect(byId(moves, "pivot-fifth-down")).toMatchObject({
      symbol: "Dm",
      nextKey: { tonic: "D", mode: "minor" },
    });
  });
});

describe("F# maior", () => {
  const moves = getContinuations("F#", Fsharp);

  it("soletra o campo com sustenidos, inclusive o vii° como E#°", () => {
    expect(byId(moves, "diatonic-ii").symbol).toBe("G#m");
    expect(byId(moves, "diatonic-iii").symbol).toBe("A#m");
    expect(byId(moves, "diatonic-IV").symbol).toBe("B");
    expect(byId(moves, "diatonic-V").symbol).toBe("C#");
    expect(byId(moves, "diatonic-vi").symbol).toBe("D#m");
    expect(byId(moves, "diatonic-vii°")).toMatchObject({
      symbol: "E#dim",
      notes: ["E#", "G#", "B"],
    });
  });

  it("aponta o relativo, o paralelo e as quintas vizinhas", () => {
    expect(byId(moves, "pivot-relative")).toMatchObject({
      symbol: "D#m",
      nextKey: { tonic: "D#", mode: "minor" },
    });
    expect(byId(moves, "pivot-parallel")).toMatchObject({
      symbol: "F#m",
      nextKey: { tonic: "F#", mode: "minor" },
    });
    expect(byId(moves, "pivot-fifth-up").nextKey).toEqual({ tonic: "C#", mode: "major" });
    expect(byId(moves, "pivot-fifth-down").nextKey).toEqual({ tonic: "B", mode: "major" });
  });

  it("empresta do menor paralelo sem confundir com o campo maior", () => {
    expect(byId(moves, "borrowed-bIII").symbol).toBe("A");
    expect(byId(moves, "borrowed-iv").symbol).toBe("Bm");
    expect(byId(moves, "borrowed-bVI").symbol).toBe("D");
    expect(byId(moves, "borrowed-bVII").symbol).toBe("E");
  });
});

describe("Bb maior e Db maior", () => {
  it("mantém bemóis em Bb maior", () => {
    const moves = getContinuations("Bb", Bbmaj);
    expect(byId(moves, "diatonic-ii").symbol).toBe("Cm");
    expect(byId(moves, "diatonic-IV").symbol).toBe("Eb");
    expect(byId(moves, "diatonic-vii°").symbol).toBe("Adim");
    expect(byId(moves, "secondary-V7/V").symbol).toBe("C7");
    expect(byId(moves, "borrowed-bVI").symbol).toBe("Gb");
    expect(byId(moves, "pivot-fifth-down").nextKey).toEqual({ tonic: "Eb", mode: "major" });
    expect(byId(moves, "pivot-relative").nextKey).toEqual({ tonic: "G", mode: "minor" });
  });

  it("não troca Db maior por sustenidos enarmônicos", () => {
    const moves = getContinuations("Db", Dbmaj);
    expect(symbols(moves, "subdominant")).toEqual(expect.arrayContaining(["Ebm", "Gb"]));
    expect(symbols(moves, "tonic")).toEqual(expect.arrayContaining(["Fm", "Bbm"]));
    expect(byId(moves, "diatonic-V").symbol).toBe("Ab");
    expect(byId(moves, "diatonic-vii°").symbol).toBe("Cdim");
    expect(moves.some((move) => move.symbol.includes("#"))).toBe(false);
  });
});

describe("identidade e análise", () => {
  it("não repete ids e não oferece um passo que não muda nada", () => {
    for (const [symbol, key] of [
      ["C", Cmaj],
      ["Am", Amin],
      ["F#", Fsharp],
      ["Bb", Bbmaj],
      ["G7", Cmaj],
    ] as const) {
      const moves = getContinuations(symbol, key);
      const ids = moves.map((move) => move.id);
      expect(new Set(ids).size).toBe(ids.length);
      expect(moves.every((move) => move.notes.length >= 3)).toBe(true);
      expect(moves.some((move) => move.symbol === symbol && move.nextKey.tonic === key.tonic && move.nextKey.mode === key.mode)).toBe(false);
    }
  });

  it("analisa G7 como V7 e Cmaj7 como IΔ em C maior", () => {
    expect(describeChordInKey("G7", Cmaj)).toMatchObject({ roman: "V7", group: "dominant" });
    expect(describeChordInKey("Cmaj7", Cmaj)).toMatchObject({ roman: "IΔ", group: "tonic" });
    expect(describeChordInKey("F#", Fsharp).roman).toBe("I");
    expect(describeChordInKey("Cm", Cmaj)).toMatchObject({ roman: "i", group: "pivot" });
  });
});
