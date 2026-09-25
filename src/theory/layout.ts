import type { Continuation, Group, KeyContext } from "./types";

/** ViewBox is fixed at 720. Four rings, one fixed angle per scale degree. */
export const FRAME = {
  size: 720,
  c: 360,
  centerR: 52,
  rDiatonic: 120,
  rSecondary: 184,
  rBorrowed: 248,
  rPivot: 312,
  nodeDiatonic: 24,
  nodeSecondary: 22,
  nodeBorrowed: 22,
  nodePivot: 24,
} as const;

export const CENTER_TRANSITION_MS = 400;

/**
 * Cubic-bezier control points. Every component stays in [0, 1], so the
 * curve's convex hull cannot leave that range: the motion eases out and
 * does not overshoot or bounce.
 */
export const CENTER_EASE = [0.22, 1, 0.36, 1] as const;

export const DEGREE_STEP = 360 / 7;

const DEGREE_INDEX: Record<string, number> = {
  I: 0,
  i: 0,
  II: 1,
  ii: 1,
  "ii°": 1,
  bII: 1,
  III: 2,
  iii: 2,
  bIII: 2,
  IV: 3,
  iv: 3,
  V: 4,
  v: 4,
  VI: 5,
  vi: 5,
  bVI: 5,
  VII: 6,
  vii: 6,
  "vii°": 6,
  bVII: 6,
};

const RING_OF: Record<Group, 1 | 2 | 3 | 4> = {
  tonic: 1,
  subdominant: 1,
  dominant: 1,
  secondary: 2,
  borrowed: 3,
  pivot: 4,
};

export interface PlacedChord {
  continuation: Continuation;
  x: number;
  y: number;
  r: number;
  ring: 1 | 2 | 3 | 4;
  angle: number;
}

export interface RingLabel {
  id: string;
  text: string;
  x: number;
  y: number;
}

export function polar(cx: number, cy: number, radius: number, degFromTop: number): { x: number; y: number } {
  const rad = (degFromTop * Math.PI) / 180;
  return {
    x: cx + radius * Math.sin(rad),
    y: cy - radius * Math.cos(rad),
  };
}

export function angleForRoman(roman: string): number {
  const target = roman.includes("/") ? (roman.split("/").pop() ?? roman) : roman;
  const index = DEGREE_INDEX[target];
  if (index === undefined) return Number.NaN;
  return index * DEGREE_STEP;
}

function ringRadius(ring: 1 | 2 | 3 | 4): { radius: number; node: number } {
  switch (ring) {
    case 1:
      return { radius: FRAME.rDiatonic, node: FRAME.nodeDiatonic };
    case 2:
      return { radius: FRAME.rSecondary, node: FRAME.nodeSecondary };
    case 3:
      return { radius: FRAME.rBorrowed, node: FRAME.nodeBorrowed };
    case 4:
      return { radius: FRAME.rPivot, node: FRAME.nodePivot };
  }
}

export function layoutContinuations(moves: Continuation[], _key: KeyContext): PlacedChord[] {
  return moves.flatMap((move) => {
    const angle = angleForRoman(move.roman);
    if (Number.isNaN(angle)) return [];
    const ring = RING_OF[move.group];
    const { radius, node } = ringRadius(ring);
    const point = polar(FRAME.c, FRAME.c, radius, angle);
    return [{ continuation: move, x: point.x, y: point.y, r: node, ring, angle }];
  });
}

/** Bottom of the circle sits between IV and V, so the ring name does not cover a degree. */
export function ringLabels(): RingLabel[] {
  const specs: { id: string; text: string; radius: number; node: number }[] = [
    { id: "diatonic", text: "Diatônico", radius: FRAME.rDiatonic, node: FRAME.nodeDiatonic },
    { id: "secondary", text: "Secundária", radius: FRAME.rSecondary, node: FRAME.nodeSecondary },
    { id: "borrowed", text: "Empréstimo", radius: FRAME.rBorrowed, node: FRAME.nodeBorrowed },
    { id: "pivot", text: "Modulação", radius: FRAME.rPivot, node: FRAME.nodePivot },
  ];
  return specs.map((spec) => {
    const point = polar(FRAME.c, FRAME.c, spec.radius - spec.node - 13, 180);
    return { id: spec.id, text: spec.text, x: point.x, y: point.y };
  });
}

export function degreeRays(): { x1: number; y1: number; x2: number; y2: number }[] {
  return Array.from({ length: 7 }, (_, index) => {
    const angle = index * DEGREE_STEP;
    const inner = polar(FRAME.c, FRAME.c, FRAME.centerR + 8, angle);
    const outer = polar(FRAME.c, FRAME.c, FRAME.rPivot + FRAME.nodePivot + 8, angle);
    return { x1: inner.x, y1: inner.y, x2: outer.x, y2: outer.y };
  });
}
