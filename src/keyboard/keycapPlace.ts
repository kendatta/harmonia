import { assignShortcuts, replayCodeForCenter, type ShortcutNode } from "./chordShortcuts";
import { SANS_WIDTH } from "./sansWidth";
import { displayRoman, musicGlyphs } from "../theory/chords";
import { describeChordInKey, getContinuations } from "../theory/continuations";
import {
  FRAME,
  SECTORS,
  ghostForRoman,
  layoutContinuations,
  polar,
  type PlacedChord,
} from "../theory/layout";
import { fittedSize, symbolParts } from "../theory/symbol";
import { keyPhrase, pivotLabel } from "../theory/speech";
import { nodeStroke } from "../theme/tokens";
import type { KeyContext } from "../theory/types";

/** Visual keycap after the half-pixel snap: 12×12 rect plus a 1px centered stroke. */
export const KEYCAP_SIZE = 13;
const CLEARANCE = 3;
const SIDE_GAP = 4;
const VIEW_MARGIN = 4;
const VIEW = FRAME.size;

export interface AxisBox {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export interface SceneCircle {
  id: string;
  x: number;
  y: number;
  outer: number;
}

export interface SceneText {
  id: string;
  box: AxisBox;
}

export type KeycapSlot = "below" | "left" | "right" | "fixed";

export interface SceneKeycap {
  nodeId: string | null;
  code: string;
  ring: 1 | 2 | 3 | 4;
  slot: KeycapSlot;
  /** Center before the component snaps the stroke onto a half pixel. */
  x: number;
  y: number;
  box: AxisBox;
  /** Disk the keycap is drawn on. Ring 4 clears every disk, including its own. */
  hostCircleId: string | null;
  /** Texts this keycap replaces (the degree, and the symbol it sits against). */
  hostTextIds: string[];
  captionTextId: string | null;
}

export interface KeycapScene {
  keycaps: SceneKeycap[];
  circles: SceneCircle[];
  texts: SceneText[];
  exhausted: string[];
}

type Weight = "400" | "500" | "600";

export function textWidth(text: string, size: number, weight: Weight, letterSpacingEm = 0): number {
  const table = SANS_WIDTH[weight];
  let width = 0;
  for (const ch of text) {
    const advance = table[ch as keyof typeof table];
    if (advance === undefined) throw new Error(`sem largura para ${JSON.stringify(ch)}`);
    width += (advance / 100) * size;
  }
  if (text.length > 1 && letterSpacingEm) width += letterSpacingEm * size * (text.length - 1);
  return width;
}

/** Chrome's SVG text box: ascent equals the font size, descent is round(size × 0.3). */
export function textBox(
  text: string,
  x: number,
  y: number,
  options: {
    size: number;
    weight: Weight;
    anchor: "start" | "middle";
    baseline: "alphabetic" | "hanging" | "central";
    letterSpacingEm?: number;
    width?: number;
    ascent?: number;
  },
): AxisBox {
  const width = options.width ?? textWidth(text, options.size, options.weight, options.letterSpacingEm ?? 0);
  const descent = Math.round(options.size * 0.3);
  const left = options.anchor === "middle" ? x - width / 2 : x;
  const right = left + width;
  if (options.baseline === "central") {
    const height = options.size + descent;
    return { left, right, top: y - height / 2, bottom: y + height / 2 };
  }
  const alphabetic = options.baseline === "hanging" ? y + options.size * 0.8 : y;
  const ascent = options.ascent ?? options.size;
  return { left, right, top: alphabetic - ascent, bottom: alphabetic + descent };
}

/** Snapped visual box. The rect origin is `round(center - 6.5) + 0.5` with a 12px side. */
export function keycapBox(cx: number, cy: number): AxisBox {
  const left = Math.round(cx - 6.5);
  const top = Math.round(cy - 6.5);
  return { left, top, right: left + KEYCAP_SIZE, bottom: top + KEYCAP_SIZE };
}

export function boxGap(a: AxisBox, b: AxisBox): number {
  const dx = Math.max(a.left - b.right, b.left - a.right);
  const dy = Math.max(a.top - b.bottom, b.top - a.bottom);
  if (dx < 0 && dy < 0) return Math.max(dx, dy);
  if (dx < 0) return dy;
  if (dy < 0) return dx;
  return Math.hypot(dx, dy);
}

export function circleGap(box: AxisBox, circle: { x: number; y: number; outer: number }): number {
  const x = Math.max(box.left, Math.min(circle.x, box.right));
  const y = Math.max(box.top, Math.min(circle.y, box.bottom));
  return Math.hypot(circle.x - x, circle.y - y) - circle.outer;
}

function fits(box: AxisBox, circles: SceneCircle[], texts: SceneText[], keycaps: AxisBox[]): boolean {
  if (box.left < VIEW_MARGIN || box.top < VIEW_MARGIN || box.right > VIEW - VIEW_MARGIN || box.bottom > VIEW - VIEW_MARGIN) {
    return false;
  }
  for (const circle of circles) {
    if (circleGap(box, circle) < CLEARANCE - 1e-6) return false;
  }
  for (const text of texts) {
    if (boxGap(box, text.box) < CLEARANCE - 1e-6) return false;
  }
  for (const keycap of keycaps) {
    if (boxGap(box, keycap) < CLEARANCE - 1e-6) return false;
  }
  return true;
}

function centered(cx: number, cy: number): { x: number; y: number } {
  return { x: Math.round(cx - 6.5) + 6.5, y: Math.round(cy - 6.5) + 6.5 };
}

/** First candidate that keeps 3px of clearance. Above: left, then right. Below: under, then left, then right. */
export function placeRing4Keycap(
  place: "above" | "below",
  caption: AxisBox,
  circles: SceneCircle[],
  texts: SceneText[],
  keycaps: AxisBox[],
): { slot: Exclude<KeycapSlot, "fixed">; x: number; y: number; box: AxisBox } | null {
  const midY = (caption.top + caption.bottom) / 2;
  const leftEdge = Math.floor(caption.left - SIDE_GAP - KEYCAP_SIZE + 1e-6);
  const rightEdge = Math.ceil(caption.right + SIDE_GAP - 1e-6);
  const sideY = Math.round(midY - 6.5) + 6.5;
  const underTop = Math.ceil(caption.bottom + CLEARANCE - 1e-6);
  const underX = (caption.left + caption.right) / 2;
  const left = { slot: "left" as const, ...centered(leftEdge + 6.5, sideY) };
  const right = { slot: "right" as const, ...centered(rightEdge + 6.5, sideY) };
  const below = { slot: "below" as const, x: Math.round(underX - 6.5) + 6.5, y: underTop + 6.5 };
  const order = place === "above" ? [left, right] : [below, left, right];
  for (const candidate of order) {
    const box = keycapBox(candidate.x, candidate.y);
    if (fits(box, circles, texts, keycaps)) return { ...candidate, box };
  }
  return null;
}

function chordBox(symbol: string, x: number, y: number, preferred: number, maxWidth: number): AxisBox {
  const { base, ext } = symbolParts(symbol);
  const size = fittedSize(base, ext, preferred, maxWidth);
  const width = textWidth(base, size, "600") + (ext ? textWidth(ext, size * 0.75, "600") : 0);
  return textBox(base, x, y, {
    size,
    weight: "600",
    anchor: "middle",
    baseline: "alphabetic",
    width,
    ascent: ext ? size * 1.15 : size,
  });
}

/** Glyphs ride the arc, so the obstacle is a chain of small boxes instead of one rectangle. */
function sectorBoxes(label: string, angle: number): AxisBox[] {
  const width = textWidth(label, 10, "600", 0.12);
  const half = ((width / 2) / 154) * (180 / Math.PI);
  const steps = Math.max(4, Math.ceil(width / 10));
  const boxes: AxisBox[] = [];
  for (let index = 0; index <= steps; index += 1) {
    const t = steps === 0 ? 0 : -1 + (2 * index) / steps;
    const point = polar(FRAME.c, FRAME.c, 154, angle + t * half);
    boxes.push({ left: point.x - 7, top: point.y - 7, right: point.x + 7, bottom: point.y + 7 });
  }
  return boxes;
}

const LEGEND_LABELS = [
  { label: "Diatônicos", x: 0 },
  { label: "Dom. secundárias", x: 118 },
  { label: "Emprestados", x: 276 },
  { label: "Pivôs", x: 412 },
] as const;

function outerRadius(node: PlacedChord): number {
  const stroke = node.continuation.strong ? nodeStroke.normal : nodeStroke.receded;
  return node.r + stroke / 2;
}

/** Keycap geometry for one map with the tonic at the center. Shared by the canvas and K15. */
export function layoutMapKeycaps(symbol: string, key: KeyContext): KeycapScene {
  const placed = layoutContinuations(getContinuations(symbol, key), key);
  const analysis = describeChordInKey(symbol, key);
  const nodes: ShortcutNode[] = placed.map((node) => ({
    id: node.continuation.id,
    ring: node.ring,
    roman: node.continuation.roman,
    angle: node.angle,
    caption: node.continuation.caption,
    pivotKind: node.continuation.pivotKind,
    symbol: node.continuation.symbol,
  }));
  const assigned = assignShortcuts(nodes);
  const byId = new Map(assigned.map((item) => [item.id, item]));
  const byCode = new Map(assigned.map((item) => [item.code, nodes.find((node) => node.id === item.id)!]));
  const replay = replayCodeForCenter(analysis.roman, analysis.group, byCode);

  const circles: SceneCircle[] = placed.map((node) => ({
    id: node.continuation.id,
    x: node.x,
    y: node.y,
    outer: outerRadius(node),
  }));
  circles.push({ id: "center", x: FRAME.c, y: FRAME.c, outer: FRAME.centerR });
  const ghost = ghostForRoman(
    analysis.roman,
    placed.filter((node) => node.ring === 1).map((node) => node.angle),
  );
  if (ghost) circles.push({ id: "ghost", x: ghost.x, y: ghost.y, outer: FRAME.nodeDiatonic + 0.5 });

  const texts: SceneText[] = [];
  for (const node of placed) {
    const preferred = node.ring === 1 ? 14 : 13;
    const symbolY = node.y + (node.ring === 4 ? 4 : -3);
    texts.push({
      id: `symbol:${node.continuation.id}`,
      box: chordBox(node.continuation.symbol, node.x, symbolY, preferred, node.r * 1.6),
    });
    if (node.ring !== 4) {
      texts.push({
        id: `roman:${node.continuation.id}`,
        box: textBox(displayRoman(node.continuation.roman), node.x, node.y + 10, {
          size: 10,
          weight: "500",
          anchor: "middle",
          baseline: "alphabetic",
          letterSpacingEm: 0.02,
        }),
      });
    }
    if (node.label) {
      const caption = musicGlyphs(node.continuation.caption || pivotLabel(node.continuation.nextKey));
      texts.push({
        id: `caption:${node.continuation.id}`,
        box: textBox(caption, node.label.x, node.label.y, {
          size: 11,
          weight: "500",
          anchor: "middle",
          baseline: node.label.place === "below" ? "hanging" : "alphabetic",
        }),
      });
    }
  }
  texts.push({
    id: "center-symbol",
    box: chordBox(symbol, FRAME.c, FRAME.c - 6, 28, FRAME.centerR * 1.6),
  });
  texts.push({
    id: "center-meta",
    box: textBox(`${displayRoman(analysis.roman)} · ${keyPhrase(key)}`, FRAME.c, FRAME.c + 16, {
      size: 10,
      weight: "500",
      anchor: "middle",
      baseline: "alphabetic",
      letterSpacingEm: 0.02,
    }),
  });
  for (const sector of SECTORS) {
    sectorBoxes(sector.label, sector.angle).forEach((box, index) => {
      texts.push({ id: `sector:${sector.id}:${index}`, box });
    });
  }
  for (const item of LEGEND_LABELS) {
    texts.push({
      id: `legend:${item.label}`,
      box: textBox(item.label, 32 + item.x, 700, { size: 12, weight: "400", anchor: "start", baseline: "alphabetic" }),
    });
  }

  const keycaps: SceneKeycap[] = [];
  const occupied: AxisBox[] = [];
  const pushFixed = (
    nodeId: string | null,
    code: string,
    ring: 1 | 2 | 3 | 4,
    x: number,
    y: number,
    hostCircleId: string | null,
    hostTextIds: string[],
  ) => {
    const at = centered(x, y);
    const box = keycapBox(at.x, at.y);
    keycaps.push({
      nodeId,
      code,
      ring,
      slot: "fixed",
      x: at.x,
      y: at.y,
      box,
      hostCircleId,
      hostTextIds,
      captionTextId: null,
    });
    occupied.push(box);
  };

  for (const node of placed) {
    const shortcut = byId.get(node.continuation.id);
    if (!shortcut || node.ring === 4) continue;
    pushFixed(node.continuation.id, shortcut.code, node.ring, node.x, node.y + 10, node.continuation.id, [
      `roman:${node.continuation.id}`,
      `symbol:${node.continuation.id}`,
    ]);
  }
  if (ghost && replay) pushFixed(null, replay, 1, ghost.x, ghost.y, "ghost", []);

  const exhausted: string[] = [];
  for (const item of assigned) {
    if (item.ring !== 4) continue;
    const node = placed.find((entry) => entry.continuation.id === item.id);
    const caption = texts.find((entry) => entry.id === `caption:${item.id}`);
    if (!node?.label || !caption) {
      exhausted.push(item.code);
      continue;
    }
    const placedCap = placeRing4Keycap(node.label.place, caption.box, circles, texts, occupied);
    if (!placedCap) {
      exhausted.push(item.code);
      continue;
    }
    keycaps.push({
      nodeId: item.id,
      code: item.code,
      ring: 4,
      slot: placedCap.slot,
      x: placedCap.x,
      y: placedCap.y,
      box: placedCap.box,
      hostCircleId: null,
      hostTextIds: [],
      captionTextId: caption.id,
    });
    occupied.push(placedCap.box);
  }

  return { keycaps, circles, texts, exhausted };
}
