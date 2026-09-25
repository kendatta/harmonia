import { describe, expect, it } from "vitest";
import { getContinuations } from "./continuations";
import {
  CENTER_EASE,
  CENTER_TRANSITION_MS,
  FRAME,
  angleForRoman,
  captionPlace,
  captionPoint,
  layoutContinuations,
  minGapDegrees,
  spreadAngles,
  type PlacedChord,
} from "./layout";
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
  it("usa a tela e os raios da direção visual", () => {
    expect(FRAME.size).toBe(720);
    expect(FRAME.centerR).toBe(46);
    expect(FRAME.rDiatonic).toBe(118);
    expect(FRAME.rSecondary).toBe(186);
    expect(FRAME.rBorrowed).toBe(250);
    expect(FRAME.rPivot).toBe(312);
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
        expect(node.orbit).toBe(
          node.ring === 1 ? 118 : node.ring === 2 ? 186 : node.ring === 3 ? 250 : 312,
        );
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

  it("fixa o ângulo de cada grau e alinha V/x e empréstimos", () => {
    const key: Key = { tonic: "C", mode: "major" };
    const nodes = layoutContinuations(getContinuations("G7", key), key);
    const byId = (id: string) => nodes.find((node) => node.continuation.id === id);
    expect(angleOf(byId("diatonic-I")!)).toBeCloseTo(0, 5);
    expect(angleOf(byId("diatonic-iii")!)).toBeCloseTo(40, 5);
    expect(angleOf(byId("diatonic-V")!)).toBeCloseTo(100, 5);
    expect(angleOf(byId("diatonic-vii°")!)).toBeCloseTo(140, 5);
    expect(angleOf(byId("diatonic-ii")!)).toBeCloseTo(220, 5);
    expect(angleOf(byId("diatonic-IV")!)).toBeCloseTo(260, 5);
    expect(angleOf(byId("diatonic-vi")!)).toBeCloseTo(320, 5);
    expect(angleOf(byId("secondary-V7/V")!)).toBeCloseTo(angleForRoman("V"), 5);
    expect(angleOf(byId("borrowed-iv")!)).toBeCloseTo(angleForRoman("IV"), 5);
    expect(angleOf(byId("borrowed-bIII")!)).toBeCloseTo(40, 5);
    expect(angleOf(byId("pivot-fifth-up")!)).toBeCloseTo(30, 5);
    expect(angleOf(byId("pivot-fifth-down")!)).toBeCloseTo(330, 5);
    expect(angleOf(byId("pivot-parallel")!)).toBeCloseTo(270, 5);
    expect(angleOf(byId("pivot-relative")!)).toBeCloseTo(0, 5);
  });

  it("põe a legenda do anel 4 fora do anel, acima só no semicírculo superior", () => {
    expect(captionPlace(0)).toBe("above");
    expect(captionPlace(30)).toBe("above");
    expect(captionPlace(330)).toBe("above");
    expect(captionPlace(89)).toBe("above");
    expect(captionPlace(271)).toBe("above");
    expect(captionPlace(90)).toBe("below");
    expect(captionPlace(270)).toBe("below");
    expect(captionPlace(180)).toBe("below");

    const top = captionPoint(360, 48, 19, 0);
    expect(top).toEqual({ x: 360, y: 21, place: "above" });
    expect(top.y - 11).toBeCloseTo(10, 5);
    expect(captionPoint(48, 360, 19, 270)).toEqual({ x: 48, y: 387, place: "below" });
  });

  it("afasta as legendas do anel 3 e da borda em maior e menor", () => {
    const keys: { symbol: string; key: Key }[] = [
      { symbol: "C", key: { tonic: "C", mode: "major" } },
      { symbol: "Bbm", key: { tonic: "Bb", mode: "minor" } },
      { symbol: "F#", key: { tonic: "F#", mode: "major" } },
      { symbol: "Eb", key: { tonic: "Eb", mode: "major" } },
    ];
    for (const item of keys) {
      const nodes = layoutContinuations(getContinuations(item.symbol, item.key), item.key);
      const inner = nodes.filter((node) => node.ring === 3);
      for (const node of nodes) {
        if (!node.label) continue;
        const textTop = node.label.place === "above" ? node.label.y - 11 : node.label.y;
        const textBottom = textTop + 11;
        expect(textTop).toBeGreaterThanOrEqual(4);
        expect(textBottom).toBeLessThanOrEqual(FRAME.size - 4);
        if (node.label.place === "above") expect(node.label.y).toBeCloseTo(node.y - node.r - 8, 5);
        else expect(node.label.y).toBeCloseTo(node.y + node.r + 8, 5);
        const caption = node.continuation.caption ?? "";
        const half = Math.max(28, caption.length * 3.6);
        const box = { cx: node.label.x, cy: (textTop + textBottom) / 2, hw: half, hh: 5.5 };
        for (const other of inner) {
          const dx = Math.max(Math.abs(other.x - box.cx) - box.hw, 0);
          const dy = Math.max(Math.abs(other.y - box.cy) - box.hh, 0);
          expect(Math.hypot(dx, dy)).toBeGreaterThanOrEqual(other.r + 4);
        }
      }
    }
  });

  it("abre em leque só quando dois nós dividem o mesmo ângulo", () => {
    const gap = minGapDegrees(19, 312);
    expect(spreadAngles([0, 30, 270, 330], gap)).toEqual([0, 30, 270, 330]);
    const fanned = spreadAngles([0, 0], gap);
    expect(fanned[0]).toBeCloseTo(360 - gap / 2, 5);
    expect(fanned[1]).toBeCloseTo(gap / 2, 5);
  });
});
