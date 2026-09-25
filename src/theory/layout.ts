import { Key } from "tonal";
import type { Continuation, Group, KeyContext } from "./types";

/** ViewBox 720. Center (360, 360). 0° is 12 o'clock, clockwise. */
export const FRAME = {
  size: 720,
  c: 360,
  centerR: 46,
  centerRing: 56,
  rDiatonic: 118,
  rSecondary: 186,
  rBorrowed: 250,
  rPivot: 312,
  nodeDiatonic: 27,
  nodeSecondary: 23,
  nodeBorrowed: 21,
  nodePivot: 19,
} as const;

export const CENTER_TRANSITION_MS = 420;

/** Cubic-bezier stays inside [0, 1], so the motion cannot overshoot. */
export const CENTER_EASE = [0.22, 1, 0.36, 1] as const;

export const ENTER_DELAY = { 1: 0.12, 2: 0.16, 3: 0.2, 4: 0.24 } as const;

/** Fixed angle per scale degree. The map does not rotate. */
const DEGREE_ANGLE: Record<number, number> = {
  1: 0,
  2: 220,
  3: 40,
  4: 260,
  5: 100,
  6: -40,
  7: 140,
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
  orbit: number;
  angle: number;
  label?: { x: number; y: number; anchor: "start" | "middle" | "end" };
}

export function polar(cx: number, cy: number, radius: number, degFromTop: number): { x: number; y: number } {
  const rad = (degFromTop * Math.PI) / 180;
  return {
    x: cx + radius * Math.sin(rad),
    y: cy - radius * Math.cos(rad),
  };
}

export function normAngle(angle: number): number {
  return ((angle % 360) + 360) % 360;
}

export function degreeNumber(roman: string): number | null {
  const target = roman.includes("/") ? (roman.split("/").pop() ?? roman) : roman;
  const stripped = target.replace(/[0-9Δ°ø]/g, "").replace(/^♭/, "").replace(/^b/, "");
  const map: Record<string, number> = {
    I: 1,
    i: 1,
    II: 2,
    ii: 2,
    III: 3,
    iii: 3,
    IV: 4,
    iv: 4,
    V: 5,
    v: 5,
    VI: 6,
    vi: 6,
    VII: 7,
    vii: 7,
  };
  return map[stripped] ?? null;
}

export function angleForDegree(degree: number): number {
  const angle = DEGREE_ANGLE[degree];
  if (angle === undefined) return Number.NaN;
  return normAngle(angle);
}

export function angleForRoman(roman: string): number {
  const degree = degreeNumber(roman);
  if (!degree) return Number.NaN;
  return angleForDegree(degree);
}

export function signatureAlteration(key: KeyContext): number {
  const named = key.mode === "major" ? Key.majorKey(key.tonic) : Key.minorKey(key.tonic);
  return named.alteration;
}

/** Sharps clockwise, flats counterclockwise. One fifth = 30°. */
export function pivotAngle(from: KeyContext, to: KeyContext): number {
  return normAngle((signatureAlteration(to) - signatureAlteration(from)) * 30);
}

function ringMetrics(ring: 1 | 2 | 3 | 4): { orbit: number; node: number } {
  switch (ring) {
    case 1:
      return { orbit: FRAME.rDiatonic, node: FRAME.nodeDiatonic };
    case 2:
      return { orbit: FRAME.rSecondary, node: FRAME.nodeSecondary };
    case 3:
      return { orbit: FRAME.rBorrowed, node: FRAME.nodeBorrowed };
    case 4:
      return { orbit: FRAME.rPivot, node: FRAME.nodePivot };
  }
}

export function layoutKey(symbol: string, group: string): string {
  return `${symbol}|${group}`;
}

/** Minimum angular gap, in degrees, so disks stay 12px apart on this orbit. */
export function minGapDegrees(nodeRadius: number, orbit: number): number {
  return ((nodeRadius * 2 + 12) / orbit) * (180 / Math.PI);
}

/**
 * Opens a cluster into a fan around its mean angle. Isolated nodes stay put,
 * which keeps the designer's degree angles when nothing collides.
 */
export function spreadAngles(input: number[], minGap: number): number[] {
  const count = input.length;
  const normalized = input.map((angle) => normAngle(angle));
  if (count <= 1) return normalized;

  const order = normalized.map((angle, index) => ({ angle, index })).sort((a, b) => a.angle - b.angle);
  const parent = order.map((_, index) => index);
  const find = (index: number): number => (parent[index] === index ? index : (parent[index] = find(parent[index])));
  const unite = (a: number, b: number) => {
    const pa = find(a);
    const pb = find(b);
    if (pa !== pb) parent[pb] = pa;
  };

  for (let index = 0; index < count; index += 1) {
    const next = (index + 1) % count;
    const gap = next === 0 ? order[0].angle + 360 - order[index].angle : order[next].angle - order[index].angle;
    if (gap < minGap - 1e-6) unite(index, next);
  }

  const clusters = new Map<number, number[]>();
  for (let index = 0; index < count; index += 1) {
    const root = find(index);
    const list = clusters.get(root) ?? [];
    list.push(index);
    clusters.set(root, list);
  }

  const result = [...normalized];
  for (const members of clusters.values()) {
    if (members.length < 2) continue;
    const sorted = [...members].sort((a, b) => order[a].angle - order[b].angle);
    let sx = 0;
    let sy = 0;
    for (const member of sorted) {
      const rad = (order[member].angle * Math.PI) / 180;
      sx += Math.cos(rad);
      sy += Math.sin(rad);
    }
    const mean = normAngle((Math.atan2(sy, sx) * 180) / Math.PI);
    sorted.forEach((member, offset) => {
      const shift = (offset - (sorted.length - 1) / 2) * minGap;
      result[order[member].index] = normAngle(mean + shift);
    });
  }
  return result;
}

function chordDistance(a: { x: number; y: number; r: number }, b: { x: number; y: number; r: number }): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function labelAnchor(angle: number): "start" | "middle" | "end" {
  const value = normAngle(angle);
  if (value > 20 && value < 160) return "start";
  if (value > 200 && value < 340) return "end";
  return "middle";
}

export function layoutContinuations(moves: Continuation[], key: KeyContext): PlacedChord[] {
  const drafted = moves.flatMap((move) => {
    const ring = RING_OF[move.group];
    const metrics = ringMetrics(ring);
    const raw = move.group === "pivot" ? pivotAngle(key, move.nextKey) : angleForRoman(move.roman);
    if (Number.isNaN(raw)) return [];
    return [{ move, ring, orbit: metrics.orbit, r: metrics.node, angle: normAngle(raw) }];
  });

  const byRing = new Map<1 | 2 | 3 | 4, typeof drafted>();
  for (const item of drafted) {
    const list = byRing.get(item.ring) ?? [];
    list.push(item);
    byRing.set(item.ring, list);
  }

  for (const list of byRing.values()) {
    let gap = minGapDegrees(list[0]?.r ?? 17, list[0]?.orbit ?? 1);
    let angles = spreadAngles(
      list.map((item) => item.angle),
      gap,
    );
    let radius = list[0]?.r ?? 17;
    const orbit = list[0]?.orbit ?? 1;
    const points = () =>
      angles.map((angle) => ({
        ...polar(FRAME.c, FRAME.c, orbit, angle),
        r: radius,
      }));
    let placed = points();
    const collided = () =>
      placed.some((point, index) => placed.slice(index + 1).some((other) => chordDistance(point, other) < point.r + other.r + 11.5));
    if (collided() && radius > 17) {
      radius = Math.max(17, radius * 0.9);
      gap = minGapDegrees(radius, orbit);
      angles = spreadAngles(
        list.map((item) => item.angle),
        gap,
      );
      placed = points();
    }
    list.forEach((item, index) => {
      item.angle = angles[index] ?? item.angle;
      item.r = radius;
    });
  }

  return drafted.map((item) => {
    const point = polar(FRAME.c, FRAME.c, item.orbit, item.angle);
    const placed: PlacedChord = {
      continuation: item.move,
      x: point.x,
      y: point.y,
      r: item.r,
      ring: item.ring,
      orbit: item.orbit,
      angle: item.angle,
    };
    if (item.move.group === "pivot") {
      const outward = item.orbit + item.r + 14;
      const outwardPoint = polar(FRAME.c, FRAME.c, outward, item.angle);
      const clips =
        outwardPoint.x < 36 || outwardPoint.x > FRAME.size - 36 || outwardPoint.y < 18 || outwardPoint.y > FRAME.size - 18;
      if (!clips) {
        placed.label = { x: outwardPoint.x, y: outwardPoint.y, anchor: labelAnchor(item.angle) };
      } else {
        const node = polar(FRAME.c, FRAME.c, item.orbit, item.angle);
        const rad = (item.angle * Math.PI) / 180;
        const tx = Math.cos(rad);
        const ty = Math.sin(rad);
        const gap = item.r + 18;
        const above = { x: node.x + tx * gap, y: node.y + ty * gap };
        const below = { x: node.x - tx * gap, y: node.y - ty * gap };
        const room = (point: { x: number; y: number }) => Math.min(point.x, point.y, FRAME.size - point.x, FRAME.size - point.y);
        const labelPoint = room(above) >= room(below) ? above : below;
        placed.label = { x: labelPoint.x, y: labelPoint.y, anchor: "middle" };
      }
    }
    return placed;
  });
}

function angularDistance(a: number, b: number): number {
  const delta = Math.abs(normAngle(a) - normAngle(b));
  return Math.min(delta, 360 - delta);
}

export function ghostForRoman(roman: string, occupiedAngles: number[]): { x: number; y: number } | null {
  const angle = angleForRoman(roman);
  if (Number.isNaN(angle)) return null;
  if (occupiedAngles.some((occupied) => angularDistance(occupied, angle) < 1)) return null;
  return polar(FRAME.c, FRAME.c, FRAME.rDiatonic, angle);
}

export const SECTORS = [
  { id: "tonic", label: "TÔNICA", angle: 0 },
  { id: "dominant", label: "DOMINANTE", angle: 120 },
  // 240° is the bisector, but the long label covers ii and V7/ii. 188° stays in the sector.
  { id: "subdominant", label: "SUBDOMINANTE", angle: 188 },
] as const;

export const SECTOR_RAYS = [60, 180, 300] as const;
