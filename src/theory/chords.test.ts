import { describe, expect, it } from "vitest";
import { displayRoman, displaySymbol, formatNotes, inferKey, musicGlyphs, notesOf, voiceChord } from "./chords";

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
});
