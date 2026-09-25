import { describe, expect, it } from "vitest";
import { getContinuations } from "./continuations";
import { FRAME, layoutContinuations } from "./layout";
import type { KeyContext } from "./types";

const cases: { symbol: string; key: KeyContext }[] = [
  { symbol: "C", key: { tonic: "C", mode: "major" } },
  { symbol: "Am", key: { tonic: "A", mode: "minor" } },
  { symbol: "F#", key: { tonic: "F#", mode: "major" } },
  { symbol: "Bb", key: { tonic: "Bb", mode: "major" } },
  { symbol: "G7", key: { tonic: "C", mode: "major" } },
];

describe("geometria das continuações", () => {
  it("coloca cada caminho dentro da moldura, sem sobrepor os discos", () => {
    for (const item of cases) {
      const nodes = layoutContinuations(getContinuations(item.symbol, item.key), item.key);
      expect(nodes.length).toBeGreaterThan(12);
      const spots = new Set<string>();
      for (const node of nodes) {
        expect(node.x - node.r).toBeGreaterThan(4);
        expect(node.y - node.r).toBeGreaterThan(4);
        expect(node.x + node.r).toBeLessThan(FRAME.size - 4);
        expect(node.y + node.r).toBeLessThan(FRAME.size - 4);
        spots.add(`${Math.round(node.x)}:${Math.round(node.y)}`);
      }
      expect(spots.size).toBe(nodes.length);

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
});
