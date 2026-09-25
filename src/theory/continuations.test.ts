import { describe, expect, it } from "vitest";
import { familyName, functionName } from "../components/groupMeta";
import { FLAT_ROOTS, QUALITY_OPTIONS, SHARP_ROOTS, inferKey, spellRootForKey, symbolFrom, toPickerKey } from "./chords";
import { describeChordInKey, getContinuations } from "./continuations";
import { degreeNumber, layoutContinuations } from "./layout";
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

  it("abre portas por acorde comum, e marca o paralelo como modulação direta", () => {
    expect(byId(moves, "pivot-fifth-up")).toMatchObject({
      symbol: "Am",
      caption: "vi = ii (Sol)",
      nextKey: { tonic: "G", mode: "major" },
    });
    expect(byId(moves, "pivot-fifth-down")).toMatchObject({
      symbol: "Dm",
      caption: "ii = vi (Fá)",
      nextKey: { tonic: "F", mode: "major" },
    });
    expect(byId(moves, "pivot-relative")).toMatchObject({
      symbol: "F",
      caption: "IV = VI (Lá m)",
      nextKey: { tonic: "A", mode: "minor" },
    });
    expect(byId(moves, "pivot-parallel")).toMatchObject({
      symbol: "Cm",
      caption: "mod. direta",
      nextKey: { tonic: "C", mode: "minor" },
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

  it("modula por acorde comum, sem repetir a tônica de destino", () => {
    expect(byId(moves, "pivot-relative")).toMatchObject({
      symbol: "Dm",
      caption: "iv = ii (Dó)",
      nextKey: { tonic: "C", mode: "major" },
    });
    expect(byId(moves, "pivot-parallel")).toMatchObject({
      symbol: "A",
      caption: "mod. direta",
      nextKey: { tonic: "A", mode: "major" },
    });
    expect(byId(moves, "pivot-fifth-up")).toMatchObject({
      symbol: "C",
      nextKey: { tonic: "E", mode: "minor" },
    });
    expect(byId(moves, "pivot-fifth-down").nextKey).toEqual({ tonic: "D", mode: "minor" });
    expect(byId(moves, "pivot-fifth-down").symbol).not.toBe("Dm");
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

  it("aponta o relativo, o paralelo e as quintas vizinhas por acorde comum", () => {
    expect(byId(moves, "pivot-relative").nextKey).toEqual({ tonic: "D#", mode: "minor" });
    expect(byId(moves, "pivot-relative").symbol).not.toBe("D#m");
    expect(byId(moves, "pivot-relative").caption).toContain("=");
    expect(byId(moves, "pivot-parallel")).toMatchObject({
      symbol: "F#m",
      caption: "mod. direta",
      nextKey: { tonic: "F#", mode: "minor" },
    });
    expect(byId(moves, "pivot-fifth-up").nextKey).toEqual({ tonic: "C#", mode: "major" });
    expect(byId(moves, "pivot-fifth-up").symbol).not.toBe("C#");
    expect(byId(moves, "pivot-fifth-down").nextKey).toEqual({ tonic: "B", mode: "major" });
    expect(byId(moves, "pivot-fifth-down").symbol).not.toBe("B");
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
    expect(byId(moves, "pivot-fifth-down").symbol).not.toBe("Eb");
    expect(byId(moves, "pivot-relative").nextKey).toEqual({ tonic: "G", mode: "minor" });
    expect(byId(moves, "pivot-relative").symbol).not.toBe("Gm");
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

  it("destaca continuações diferentes para G e para Mi bemol em Dó maior", () => {
    const strongIds = (symbol: string) =>
      getContinuations(symbol, Cmaj)
        .filter((move) => move.strong)
        .map((move) => move.id)
        .sort();
    const fromG = strongIds("G");
    const fromEb = strongIds("Eb");
    expect(fromG).not.toEqual(fromEb);
    expect(fromG).toContain("diatonic-I");
    expect(fromEb).not.toContain("diatonic-I");
    expect(fromEb).toEqual(["borrowed-bVI", "borrowed-bVII", "borrowed-iv"]);
    expect(fromG).not.toContain("diatonic-ii");
  });

  it("analisa G7 como V7 e Cmaj7 como IΔ em C maior", () => {
    expect(describeChordInKey("G7", Cmaj)).toMatchObject({ roman: "V7", group: "dominant" });
    expect(describeChordInKey("Cmaj7", Cmaj)).toMatchObject({ roman: "IΔ", group: "tonic" });
    expect(describeChordInKey("F#", Fsharp).roman).toBe("I");
    expect(describeChordInKey("Cm", Cmaj)).toMatchObject({ roman: "i", group: "pivot" });
    expect(describeChordInKey("Am", { tonic: "G", mode: "major" })).toMatchObject({ roman: "ii", group: "subdominant" });
  });
});

function strongSymbols(symbol: string, key: KeyContext = Cmaj): string[] {
  return getContinuations(symbol, key)
    .filter((move) => move.strong)
    .map((move) => move.symbol)
    .sort();
}

describe("continuações por centro em Dó maior", () => {
  it("I vai a IV, V, vi e ii", () => {
    expect(strongSymbols("C")).toEqual(["Am", "Dm", "F", "G"]);
  });

  it("ii vai a V e vii°", () => {
    expect(strongSymbols("Dm")).toEqual(["Bdim", "G"]);
  });

  it("iii vai a vi e IV", () => {
    expect(strongSymbols("Em")).toEqual(["Am", "F"]);
  });

  it("IV vai a V, I, ii e iv", () => {
    expect(strongSymbols("F")).toEqual(["C", "Dm", "Fm", "G"]);
  });

  it("V e V7 vão a I e vi", () => {
    expect(strongSymbols("G")).toEqual(["Am", "C"]);
    expect(strongSymbols("G7")).toEqual(["Am", "C"]);
  });

  it("vi vai a ii, IV e V", () => {
    expect(strongSymbols("Am")).toEqual(["Dm", "F", "G"]);
  });

  it("vii° vai a I", () => {
    expect(strongSymbols("Bdim")).toEqual(["C"]);
  });

  it("V7/V vai ao V e à resolução enganosa", () => {
    expect(strongSymbols("D7")).toEqual(["Em", "G"]);
    expect(getContinuations("D7", Cmaj).find((move) => move.symbol === "A7")?.strong).toBe(false);
  });

  it("as outras dominantes secundárias resolvem no grau e na enganosa", () => {
    expect(strongSymbols("A7")).toEqual(["Bdim", "Dm"]);
    expect(strongSymbols("E7")).toEqual(["Am", "F"]);
    expect(strongSymbols("C7")).toEqual(["Dm", "F"]);
    expect(strongSymbols("B7")).toEqual(["C", "Em"]);
  });

  it("iv vai a I e V", () => {
    expect(strongSymbols("Fm")).toEqual(["C", "G"]);
  });

  it("bVII vai a I", () => {
    expect(strongSymbols("Bb")).toEqual(["C"]);
  });

  it("bVI vai a bVII, V e I", () => {
    expect(strongSymbols("Ab")).toEqual(["Bb", "C", "G"]);
  });

  it("bIII vai a iv, bVI e bVII", () => {
    expect(strongSymbols("Eb")).toEqual(["Ab", "Bb", "Fm"]);
  });

  it("Dó, Mi menor e Mi bemol produzem conjuntos diferentes", () => {
    const fromC = strongSymbols("C");
    const fromEm = strongSymbols("Em");
    const fromEb = strongSymbols("Eb");
    expect(fromC).not.toEqual(fromEm);
    expect(fromC).not.toEqual(fromEb);
    expect(fromEm).not.toEqual(fromEb);
    expect(getContinuations("C", Cmaj).filter((move) => move.strong && move.pivotKind)).toEqual([]);
  });
});

describe("o seletor Recomeçar", () => {
  const roots = [...new Set([...SHARP_ROOTS, ...FLAT_ROOTS])];

  it("cobre as 102 combinações de fundamental e qualidade", () => {
    expect(roots.length * QUALITY_OPTIONS.length).toBe(102);
  });

  it("nenhuma combinação abre cromática sem caminho provável", () => {
    const stuck: string[] = [];
    for (const root of roots) {
      for (const quality of QUALITY_OPTIONS) {
        const key = toPickerKey(inferKey(root, quality.id));
        const symbol = symbolFrom(spellRootForKey(root, key), quality.id);
        const analysis = describeChordInKey(symbol, key);
        const strong = getContinuations(symbol, key).filter((move) => move.strong);
        if (analysis.group === "chromatic" && strong.length === 0) {
          stuck.push(`${symbol} em ${key.tonic} ${key.mode} (de ${root} ${quality.id})`);
        }
      }
    }
    expect(stuck).toEqual([]);
    console.log(`${roots.length * QUALITY_OPTIONS.length} combinações: nenhuma abre como cromática sem caminho provável`);
  });

  it("reescreve D♯7 como E♭7 em Lá bemol, e D♭7 no chip de Fá sustenido", () => {
    const ab = toPickerKey(inferKey("D#", "7"));
    expect(ab).toEqual({ tonic: "Ab", mode: "major" });
    expect(symbolFrom(spellRootForKey("D#", ab), "7")).toBe("Eb7");
    expect(describeChordInKey("Eb7", ab).group).toBe("dominant");
    expect(getContinuations("Eb7", ab).some((move) => move.strong)).toBe(true);

    const fsharp = toPickerKey(inferKey("Db", "7"));
    expect(fsharp).toEqual({ tonic: "F#", mode: "major" });
    expect(symbolFrom(spellRootForKey("Db", fsharp), "7")).toBe("C#7");
    expect(describeChordInKey("C#7", fsharp).group).not.toBe("chromatic");

    const bmajor = toPickerKey(inferKey("Gb", "7"));
    expect(bmajor).toEqual({ tonic: "B", mode: "major" });
    expect(symbolFrom(spellRootForKey("Gb", bmajor), "7")).toBe("F#7");
    expect(describeChordInKey("F#7", bmajor).group).not.toBe("chromatic");
  });
});

describe("o mesmo par grupo+grau no menor", () => {
  it("repete os destinos de Dó maior a partir de cada função", () => {
    const pair = (symbol: string, key: KeyContext) =>
      getContinuations(symbol, key)
        .filter((move) => move.strong)
        .map((move) => `${move.group}:${degreeNumber(move.roman)}`)
        .sort();
    expect(pair("Am", Amin)).toEqual(pair("C", Cmaj));
    expect(pair("Bdim", Amin)).toEqual(pair("Dm", Cmaj));
    expect(pair("C", Amin)).toEqual(pair("Em", Cmaj));
    expect(pair("Dm", Amin)).toEqual(pair("F", Cmaj));
    expect(pair("E", Amin)).toEqual(pair("G", Cmaj));
    expect(pair("E7", Amin)).toEqual(pair("G7", Cmaj));
    expect(pair("F", Amin)).toEqual(pair("Am", Cmaj));
    expect(pair("G#dim", Amin)).toEqual(pair("Bdim", Cmaj));
    expect(pair("Dm", Amin)).toEqual(["borrowed:4", "dominant:5", "subdominant:2", "tonic:1"]);
  });

  it("trata VII como a mesma coleção de III e o deixa no anel 3", () => {
    expect(familyName("borrowed", "VII")).toBe("Diatônico");
    expect(functionName("borrowed", "VII")).toBe("Diatônico");
    expect(functionName("borrowed", "bVII")).toBe("Emprestado");
    expect(familyName("tonic", "III")).toBe("Diatônico");
    expect(byId(getContinuations("Am", Amin), "borrowed-VII").detail).toContain("III");
    const placed = layoutContinuations(getContinuations("Am", Amin), Amin);
    expect(placed.find((node) => node.continuation.id === "borrowed-VII")?.ring).toBe(3);
    expect(placed.find((node) => node.continuation.id === "diatonic-vii°")?.angle).toBeCloseTo(140, 5);
    expect(placed.find((node) => node.continuation.id === "diatonic-III")?.continuation.group).toBe("tonic");
  });
});

describe("símbolo repetido leva legenda dupla", () => {
  it("não desenha o mesmo símbolo duas vezes sem caption", () => {
    const keys: KeyContext[] = [Cmaj, Amin, Fsharp, Bbmaj, Dbmaj, { tonic: "C", mode: "minor" }, { tonic: "E", mode: "major" }];
    for (const key of keys) {
      const tonic = key.mode === "minor" ? `${key.tonic}m` : key.tonic;
      const groups = new Map<string, Continuation[]>();
      for (const move of getContinuations(tonic, key)) {
        const list = groups.get(move.symbol) ?? [];
        list.push(move);
        groups.set(move.symbol, list);
      }
      for (const list of groups.values()) {
        if (list.length < 2) continue;
        const unlabeled = list.filter((move) => !move.caption);
        expect(unlabeled).toHaveLength(1);
        expect(list.filter((move) => move.caption).every((move) => move.pivotKind && move.caption)).toBe(true);
      }
    }
  });
});

describe("outras tonalidades", () => {
  it("soletra Sol maior e Fá maior", () => {
    const g = getContinuations("G", { tonic: "G", mode: "major" });
    expect(byId(g, "diatonic-V").symbol).toBe("D");
    expect(byId(g, "diatonic-ii").symbol).toBe("Am");
    expect(byId(g, "diatonic-vii°").symbol).toBe("F#dim");
    const f = getContinuations("F", { tonic: "F", mode: "major" });
    expect(byId(f, "diatonic-IV").symbol).toBe("Bb");
    expect(byId(f, "diatonic-V").symbol).toBe("C");
    expect(byId(f, "secondary-V7/V").symbol).toBe("G7");
    expect(byId(f, "borrowed-iv").symbol).toBe("Bbm");
  });

  it("soletra Mi bemol maior com Dó bemol", () => {
    const moves = getContinuations("Eb", { tonic: "Eb", mode: "major" });
    expect(byId(moves, "secondary-V7/V")).toMatchObject({ symbol: "F7" });
    expect(byId(moves, "secondary-V7/ii")).toMatchObject({ symbol: "C7" });
    expect(byId(moves, "borrowed-bVI").symbol).toBe("Cb");
    expect(byId(moves, "borrowed-iv")).toMatchObject({ symbol: "Abm", notes: ["Ab", "Cb", "Eb"] });
  });

  it("soletra Mi maior com Fá dobrado sustenido", () => {
    const moves = getContinuations("E", { tonic: "E", mode: "major" });
    expect(byId(moves, "secondary-V7/iii")).toMatchObject({ symbol: "D#7" });
    expect(byId(moves, "secondary-V7/iii").notes).toContain("F##");
  });

  it("soletra Fá sustenido maior com Mi sustenido", () => {
    const moves = getContinuations("F#", Fsharp);
    expect(byId(moves, "diatonic-vii°").symbol).toBe("E#dim");
    expect(byId(moves, "secondary-V7/iii").symbol).toBe("E#7");
  });

  it("soletra Dó menor e Fá sustenido menor", () => {
    const c = getContinuations("Cm", { tonic: "C", mode: "minor" });
    expect(byId(c, "diatonic-III").symbol).toBe("Eb");
    expect(byId(c, "diatonic-V").symbol).toBe("G");
    expect(byId(c, "diatonic-vii°").symbol).toBe("Bdim");
    expect(byId(c, "borrowed-VII").symbol).toBe("Bb");
    const fs = getContinuations("F#m", { tonic: "F#", mode: "minor" });
    expect(byId(fs, "diatonic-III").symbol).toBe("A");
    expect(byId(fs, "diatonic-vii°").symbol).toBe("E#dim");
    expect(byId(fs, "diatonic-VI").symbol).toBe("D");
    expect(fs.some((move) => move.nextKey.tonic === "Fb")).toBe(false);
  });

  it("não chega em Fá bemol maior por uma cadeia de pivôs", () => {
    const moves = getContinuations("Cb", { tonic: "Cb", mode: "major" });
    expect(byId(moves, "pivot-fifth-down").nextKey).toEqual({ tonic: "E", mode: "major" });
    expect(moves.some((move) => move.nextKey.tonic === "Fb")).toBe(false);
  });
});
