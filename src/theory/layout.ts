import { Note } from "tonal";
import type { Continuation, KeyContext, PivotKind } from "./types";

export const FRAME = {
  size: 720,
  c: 360,
  centerR: 64,
  rDiatonic: 158,
  rColor: 230,
  rPivot: 308,
  nodeDiatonic: 30,
  nodeColor: 27,
  nodePivot: 34,
  nodeParallel: 32,
} as const;

const SHARP_WHEEL = ["C", "G", "D", "A", "E", "B", "F#", "C#", "G#", "D#", "A#", "F"];
const FLAT_WHEEL = ["C", "G", "D", "A", "E", "B", "Gb", "Db", "Ab", "Eb", "Bb", "F"];

const FUNCTION_SECTORS = {
  tonic: { start: 310, span: 100 },
  dominant: { start: 70, span: 100 },
  subdominant: { start: 190, span: 100 },
} as const;

const COLOR_SECTORS = {
  secondary: { start: 48, span: 120 },
  borrowed: { start: 200, span: 120 },
} as const;

export interface PlacedChord {
  continuation: Continuation;
  x: number;
  y: number;
  r: number;
}

export interface FifthMarker {
  label: string;
  angle: number;
  x: number;
  y: number;
  tonic: boolean;
}

export function polar(cx: number, cy: number, radius: number, degFromTop: number): { x: number; y: number } {
  const rad = (degFromTop * Math.PI) / 180;
  return {
    x: cx + radius * Math.sin(rad),
    y: cy - radius * Math.cos(rad),
  };
}

export function arcPath(cx: number, cy: number, radius: number, start: number, span: number): string {
  const from = polar(cx, cy, radius, start);
  const to = polar(cx, cy, radius, start + span);
  const large = span > 180 ? 1 : 0;
  return `M ${from.x} ${from.y} A ${radius} ${radius} 0 ${large} 1 ${to.x} ${to.y}`;
}

function norm(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function anglesInSector(start: number, span: number, count: number, maxStep: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [norm(start + span / 2)];
  const step = Math.min(maxStep, span / count);
  const used = step * (count - 1);
  const origin = start + (span - used) / 2;
  return Array.from({ length: count }, (_, index) => norm(origin + index * step));
}

export function pivotAngle(kind: PivotKind, mode: KeyContext["mode"]): number {
  switch (kind) {
    case "fifth-up":
      return 30;
    case "fifth-down":
      return 330;
    case "parallel":
      return 180;
    case "relative":
      return mode === "major" ? 90 : 270;
  }
}

export function fifthsWheel(tonic: string): string[] {
  const preferFlats = tonic.includes("b") || tonic === "F";
  const circle = preferFlats ? FLAT_WHEEL : SHARP_WHEEL;
  const chroma = Note.chroma(tonic);
  let index = circle.findIndex((note) => note === tonic);
  if (index < 0) index = circle.findIndex((note) => Note.chroma(note) === chroma);
  if (index < 0) index = 0;
  return [...circle.slice(index), ...circle.slice(0, index)];
}

export function layoutContinuations(moves: Continuation[], key: KeyContext): PlacedChord[] {
  const { c, rDiatonic, rColor, rPivot, nodeDiatonic, nodeColor, nodePivot, nodeParallel } = FRAME;
  const placed: PlacedChord[] = [];

  const functional = (["tonic", "subdominant", "dominant"] as const).map((group) => ({
    group,
    moves: moves.filter((move) => move.group === group),
  }));

  for (const bucket of functional) {
    const sector = FUNCTION_SECTORS[bucket.group];
    const angles = anglesInSector(sector.start, sector.span, bucket.moves.length, 36);
    bucket.moves.forEach((move, index) => {
      const point = polar(c, c, rDiatonic, angles[index] ?? sector.start);
      placed.push({ continuation: move, x: point.x, y: point.y, r: nodeDiatonic });
    });
  }

  for (const group of ["secondary", "borrowed"] as const) {
    const bucket = moves.filter((move) => move.group === group);
    const sector = COLOR_SECTORS[group];
    const angles = anglesInSector(sector.start, sector.span, bucket.length, 26);
    bucket.forEach((move, index) => {
      const point = polar(c, c, rColor, angles[index] ?? sector.start);
      placed.push({ continuation: move, x: point.x, y: point.y, r: nodeColor });
    });
  }

  for (const move of moves) {
    if (move.group !== "pivot" || !move.pivotKind) continue;
    const angle = pivotAngle(move.pivotKind, key.mode);
    const onDiatonicRing = move.pivotKind === "parallel";
    const point = polar(c, c, onDiatonicRing ? rDiatonic : rPivot, angle);
    placed.push({
      continuation: move,
      x: point.x,
      y: point.y,
      r: onDiatonicRing ? nodeParallel : nodePivot,
    });
  }

  return placed;
}

export function fifthMarkers(key: KeyContext, nodes: PlacedChord[]): FifthMarker[] {
  const wheel = fifthsWheel(key.tonic);
  const blocked = new Set(
    nodes
      .filter((node) => node.continuation.pivotKind && node.continuation.pivotKind !== "parallel")
      .map((node) => pivotAngle(node.continuation.pivotKind!, key.mode)),
  );

  return wheel.flatMap((label, index) => {
    const angle = index * 30;
    if ([...blocked].some((used) => angularDistance(used, angle) < 12)) return [];
    const point = polar(FRAME.c, FRAME.c, FRAME.rPivot, angle);
    return [{ label, angle, x: point.x, y: point.y, tonic: index === 0 }];
  });
}

function angularDistance(a: number, b: number): number {
  const delta = Math.abs(norm(a) - norm(b));
  return Math.min(delta, 360 - delta);
}
