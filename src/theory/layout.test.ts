import { describe, expect, it } from "vitest";
import { getContinuations } from "./continuations";
import { CENTER_EASE, CENTER_TRANSITION_MS, FRAME, angleForRoman, layoutContinuations, type PlacedChord } from "./layout";
import type { KeyContext as Key } from "./types";

const cases: { symbol: string; key: Key }[] = [
  { symbol: "C", key: { tonic: "C", mode: "major" } },
  { symbol: "Am", key: { tonic: "A", mode: "minor" } },
  { symbol: "F#", key: { tonic: "F#", mode: "major" } },
  { symbol: "Bb", key: { tonic: "Bb", mode: "major" } },
  { symbol: "G7", key: { tonic: "C", mode: "major" } },
];

function angleOf(node: PlacedChord): number {
  const dx = node.x - FRAME.c;
  const dy = FRAME.c - node.y;
  const deg = (Math.atan2(dx, dy) * 180) / Math.PI;
  return (deg + 360) % 360;
}

describe("geometria das continuações", () => {
  it("usa uma tela de 720 e quatro raios de anel", () => {
    expect(FRAME.size).toBe(720);
    const radii = [FRAME.rDiatonic, FRAME.rSecondary, FRAME.rBorrowed, FRAME.rPivot];
    expect(new Set(radii).size).toBe(4);
    expect(CENTER_TRANSITION_MS).toBeLessThanOrEqual(450);
    for (const value of CENTER_EASE) {
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThanOrEqual(1);
    }
  });

  it("coloca cada caminho dentro da moldura, sem sobrepor os discos", () => {
    for (const item of cases) {
      const nodes = layoutContinuations(getContinuations(item.symbol, item.key), item.key);
      expect(nodes.length).toBeGreaterThan(12);
      const rings = new Set(nodes.map((node) => node.ring));
      expect(rings).toEqual(new Set([1, 2, 3, 4]));
      for (const node of nodes) {
        expect(node.x - node.r).toBeGreaterThan(4);
        expect(node.y - node.r).toBeGreaterThan(4);
        expect(node.x + node.r).toBeLessThan(FRAME.size - 4);
        expect(node.y + node.r).toBeLessThan(FRAME.size - 4);
      }
      for (let i = 0; i < nodes.length; i += 1) {
        for (let j = i + 1; j < nodes.length; j += 1) {
          const a = nodes[i];
          const b = nodes[j];
          const distance = Math.hypot(a.x - b.x, a.y - b.y);
          expect(distance).toBeGreaterThan(a.r + b.r + 4);
        }
      }
    }
  });

  it("fixa o ângulo pelo grau da escala, em qualquer anel", () => {
    const nodes = layoutContinuations(getContinuations("C", { tonic: "C", mode: "major" }), {
      tonic: "C",
      mode: "major",
    });
    const byId = (id: string) => nodes.find((node) => node.continuation.id === id);
    const fifth = angleForRoman("V");
    for (const id of ["diatonic-V", "secondary-V7/V", "pivot-fifth-up"]) {
      const node = byId(id);
      expect(node).toBeTruthy();
      expect(angleOf(node!)).toBeCloseTo(fifth, 5);
    }
    expect(angleOf(byId("diatonic-IV")!)).toBeCloseTo(angleForRoman("IV"), 5);
    expect(angleOf(byId("borrowed-iv")!)).toBeCloseTo(angleForRoman("IV"), 5);
    expect(angleOf(byId("pivot-fifth-down")!)).toBeCloseTo(angleForRoman("IV"), 5);
    expect(angleOf(byId("borrowed-bIII")!)).toBeCloseTo(angleForRoman("III"), 5);
    expect(angleOf(byId("pivot-parallel")!)).toBeCloseTo(0, 5);
  });
});
