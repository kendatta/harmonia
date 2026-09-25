import { describe, expect, it } from "vitest";
import { displayRoman, displaySymbol, formatNotes, inferKey, keyboardStart, musicGlyphs, notesOf, spellKey, toPickerKey, voiceChord, voicedMidis } from "./chords";

describe("notas dos acordes", () => {
  it("soletra a tríade maior de C", () => {
    expect(notesOf("C", "maj")).toEqual(["C", "E", "G"]);
  });

  it("soletra a tríade menor de A", () => {
    expect(notesOf("A", "min")).toEqual(["A", "C", "E"]);
  });

  it("soletra F# maior com sustenidos", () => {
    expect(notesOf("F#", "maj")).toEqual(["F#", "A#", "C#"]);
  });

  it("soletra F# maior com sétima maior, incluindo E#", () => {
    expect(notesOf("F#", "maj7")).toEqual(["F#", "A#", "C#", "E#"]);
  });

  it("soletra Bb7 com bemóis", () => {
    expect(notesOf("Bb", "7")).toEqual(["Bb", "D", "F", "Ab"]);
  });

  it("soletra Eb menor", () => {
    expect(notesOf("Eb", "min")).toEqual(["Eb", "Gb", "Bb"]);
  });
});

describe("tom sugerido", () => {
  it("lê G7 como dominante de C maior", () => {
    expect(inferKey("G", "7")).toEqual({ tonic: "C", mode: "major" });
  });

  it("lê A menor como tônica de A menor", () => {
    expect(inferKey("A", "min")).toEqual({ tonic: "A", mode: "minor" });
  });

  it("lê F# maior como tônica de F# maior", () => {
    expect(inferKey("F#", "maj")).toEqual({ tonic: "F#", mode: "major" });
  });

  it("lê Bb7 como dominante de Eb maior", () => {
    expect(inferKey("Bb", "7")).toEqual({ tonic: "Eb", mode: "major" });
  });

  it("lê Bdim como vii° de Dó maior, e D#7 como dominante de Lá bemol", () => {
    expect(inferKey("B", "dim")).toEqual({ tonic: "C", mode: "major" });
    expect(inferKey("D#", "7")).toEqual({ tonic: "Ab", mode: "major" });
    expect(spellKey("Fb", "major")).toEqual({ tonic: "E", mode: "major" });
    expect(spellKey("Cb", "major")).toEqual({ tonic: "Cb", mode: "major" });
  });

  it("aponta Sol♭ e Dó♭ maior para o chip enarmônico, e Ré♯ menor para Mi♭", () => {
    expect(toPickerKey({ tonic: "Gb", mode: "major" })).toEqual({ tonic: "F#", mode: "major" });
    expect(toPickerKey({ tonic: "Cb", mode: "major" })).toEqual({ tonic: "B", mode: "major" });
    expect(toPickerKey({ tonic: "D#", mode: "minor" })).toEqual({ tonic: "Eb", mode: "minor" });
    expect(toPickerKey({ tonic: "Db", mode: "minor" })).toEqual({ tonic: "C#", mode: "minor" });
    expect(toPickerKey({ tonic: "C", mode: "major" })).toEqual({ tonic: "C", mode: "major" });
  });
});

describe("glifos de acidente", () => {
  it("troca sustenido, bemol e dobrados por sinais reais", () => {
    expect(musicGlyphs("F#")).toBe("F♯");
    expect(musicGlyphs("Bb")).toBe("B♭");
    expect(musicGlyphs("F##")).toBe("F𝄪");
    expect(musicGlyphs("Bbb")).toBe("B𝄫");
    expect(musicGlyphs("bIII")).toBe("♭III");
    expect(musicGlyphs("bvii")).toBe("♭vii");
    expect(displaySymbol("F#dim")).toBe("F♯°");
    expect(displaySymbol("Cmaj7")).toBe("CΔ");
    expect(displayRoman("V7/bVI")).toBe("V7/♭VI");
    expect(formatNotes(["Bb", "D", "F"])).toBe("B♭ – D – F");
  });
});

describe("voicing", () => {
  it("empilha as notas em ordem crescente a partir de C3", () => {
    expect(voiceChord(["C", "E", "G"])).toEqual(["C3", "E3", "G3"]);
    expect(voiceChord(["A", "C", "E"])).toEqual(["A3", "C4", "E4"]);
  });

  it("acende só as notas do voicing, na oitava tocada", () => {
    const g = voicedMidis(["G", "B", "D"]);
    expect(g).toEqual([55, 59, 62]);
    const start = keyboardStart(g);
    const window = Array.from({ length: 24 }, (_, index) => start + index);
    expect(window.filter((midi) => g.includes(midi))).toEqual(g);
    expect(voicedMidis(["C", "Eb", "G"])[1]).toBe(51);
  });
});
