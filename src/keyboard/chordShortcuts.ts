import { degreeNumber, normAngle } from "../theory/layout";
import type { PivotKind } from "../theory/types";

/** Physical rows. `code` order is the assignment order; labels are the US/ABNT2 glyphs for those keys. */
export const SHORTCUT_ROWS = {
  1: ["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0"],
  2: ["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP"],
  3: ["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL"],
  4: ["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM"],
} as const;

export type ShortcutRing = keyof typeof SHORTCUT_ROWS;

export const SHORTCUTS_STORAGE_KEY = "harmonia.shortcuts";

export type Keyhint = "off" | "temp" | "pinned";

export interface ShortcutNode {
  id: string;
  ring: ShortcutRing;
  roman: string;
  /** Clockwise degrees from 12 o'clock. */
  angle: number;
  caption?: string;
  pivotKind?: PivotKind;
  symbol?: string;
}

export interface ShortcutAssignment {
  id: string;
  code: string;
  label: string;
  aria: string;
  ring: ShortcutRing;
}

export interface ShortcutKeyEvent {
  code: string;
  key: string;
  metaKey?: boolean;
  ctrlKey?: boolean;
  altKey?: boolean;
  shiftKey?: boolean;
  repeat?: boolean;
  isComposing?: boolean;
  getModifierState?: (key: string) => boolean;
  target?: EventTarget | null;
  preventDefault: () => void;
}

export interface ShortcutHandlerContext {
  byCode: Map<string, ShortcutNode>;
  replayCode: string | null;
  playing: boolean;
  popoverOpen: boolean;
  onPick: (node: ShortcutNode) => void;
  onReplay: () => void;
  onHint: () => void;
  onEscape: () => void;
}

export function shortcutLabel(code: string): string {
  if (code.startsWith("Digit")) return code.slice("Digit".length);
  if (code.startsWith("Key")) return code.slice("Key".length);
  return "";
}

export function shortcutAria(code: string): string {
  return shortcutLabel(code).toLowerCase();
}

/** Degree used to order a node inside its ring. Ring 4 reads the current-key half of the caption. */
export function shortcutDegree(node: ShortcutNode): number | null {
  if (node.ring === 4) {
    if (node.pivotKind === "parallel" || node.caption === "mod. direta") return 1;
    const caption = node.caption ?? "";
    const eq = caption.indexOf("=");
    if (eq >= 0) return degreeNumber(caption.slice(0, eq).trim());
  }
  return degreeNumber(node.roman);
}

function assignment(node: ShortcutNode, code: string): ShortcutAssignment {
  return { id: node.id, code, label: shortcutLabel(code), aria: shortcutAria(code), ring: node.ring };
}

/**
 * Keys for one map. Ring 1 keeps a fixed slot per degree (1 = I … 7 = vii).
 * Rings 2–4 pack from the start of the row, degree first, then clockwise angle from 0°.
 * Nodes past the row length are omitted.
 */
export function assignShortcuts(nodes: ShortcutNode[]): ShortcutAssignment[] {
  const assigned: ShortcutAssignment[] = [];
  for (const ring of [1, 2, 3, 4] as const) {
    const row = SHORTCUT_ROWS[ring];
    const mine = nodes.filter((node) => node.ring === ring);
    if (ring === 1) {
      const used = new Set<string>();
      const sorted = [...mine].sort((a, b) => normAngle(a.angle) - normAngle(b.angle));
      for (const node of sorted) {
        const degree = shortcutDegree(node);
        if (degree == null || degree < 1 || degree > 7) continue;
        const code = row[degree - 1];
        if (!code || used.has(code)) continue;
        used.add(code);
        assigned.push(assignment(node, code));
      }
      continue;
    }
    const sorted = [...mine].sort((a, b) => {
      const da = shortcutDegree(a) ?? 99;
      const db = shortcutDegree(b) ?? 99;
      if (da !== db) return da - db;
      return normAngle(a.angle) - normAngle(b.angle);
    });
    sorted.slice(0, row.length).forEach((node, index) => {
      const code = row[index];
      if (code) assigned.push(assignment(node, code));
    });
  }
  return assigned;
}

export function indexByCode(nodes: ShortcutNode[], assigned = assignShortcuts(nodes)): Map<string, ShortcutNode> {
  const byId = new Map(nodes.map((node) => [node.id, node]));
  const byCode = new Map<string, ShortcutNode>();
  for (const item of assigned) {
    const node = byId.get(item.id);
    if (node) byCode.set(item.code, node);
  }
  return byCode;
}

/** Ring-1 key of a diatonic center, when that degree is the ghost rather than a node. */
export function replayCodeForCenter(roman: string, group: string, byCode: Map<string, ShortcutNode>): string | null {
  if (group !== "tonic" && group !== "subdominant" && group !== "dominant") return null;
  const degree = degreeNumber(roman);
  if (degree == null || degree < 1 || degree > 7) return null;
  const code = SHORTCUT_ROWS[1][degree - 1];
  if (!code || byCode.has(code)) return null;
  return code;
}

export function shortcutProps(code: string | null | undefined): { "data-shortcut"?: string; "aria-keyshortcuts"?: string } {
  if (!code) return {};
  return { "data-shortcut": code, "aria-keyshortcuts": shortcutAria(code) };
}

function isTypingTarget(target: EventTarget | null | undefined): boolean {
  if (!target || typeof target !== "object") return false;
  const element = target as { tagName?: string; isContentEditable?: boolean; type?: string; getAttribute?: (name: string) => string | null };
  const tag = element.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (element.isContentEditable) return true;
  const editable = element.getAttribute?.("contenteditable");
  if (editable != null && editable.toLowerCase() !== "false") return true;
  if (tag === "INPUT") {
    const type = (element.type || "text").toLowerCase();
    return type !== "range" && type !== "checkbox" && type !== "radio" && type !== "button";
  }
  return false;
}

/** §3.4. These cases produce no action and must not call preventDefault. */
export function shortcutIgnored(event: ShortcutKeyEvent): boolean {
  if (event.metaKey || event.ctrlKey || event.altKey || event.shiftKey) return true;
  if (event.getModifierState?.("AltGraph")) return true;
  if (event.repeat || event.isComposing) return true;
  if (isTypingTarget(event.target)) return true;
  return false;
}

export function handleShortcutKeydown(event: ShortcutKeyEvent, context: ShortcutHandlerContext): void {
  if (event.key === "Escape") {
    if (!shortcutIgnored(event) && !context.popoverOpen) context.onEscape();
    return;
  }
  if (shortcutIgnored(event) || context.popoverOpen || context.playing) return;
  const node = context.byCode.get(event.code);
  if (node) {
    event.preventDefault();
    context.onHint();
    context.onPick(node);
    return;
  }
  if (context.replayCode && event.code === context.replayCode) {
    event.preventDefault();
    context.onHint();
    context.onReplay();
  }
}

/** Keycap center beside a caption. Flips to the right when the left edge would leave the viewBox. */
export function keycapBesideLabel(textLeft: number, textRight: number, midY: number): { x: number; y: number } {
  const half = 6.5;
  const leftCenter = textLeft - 4 - half;
  if (leftCenter - half < 4) return { x: textRight + 4 + half, y: midY };
  return { x: leftCenter, y: midY };
}

export function shortcutsLabel(pinned: boolean): string {
  return pinned ? "Ocultar atalhos" : "Mostrar atalhos";
}

export interface ShortcutStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function readShortcutsPinned(storage: ShortcutStorage): boolean {
  try {
    return storage.getItem(SHORTCUTS_STORAGE_KEY) === "on";
  } catch {
    return false;
  }
}

/** Writes only while pinned. A refused write leaves the in-memory state untouched. */
export function writeShortcutsPinned(storage: ShortcutStorage, pinned: boolean): boolean {
  try {
    if (pinned) storage.setItem(SHORTCUTS_STORAGE_KEY, "on");
    else storage.removeItem(SHORTCUTS_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export interface HintMachine {
  getMode(): Keyhint;
  isPinned(): boolean;
  subscribe(listener: (mode: Keyhint) => void): () => void;
  shortcut(): void;
  setFocused(focused: boolean): void;
  escape(): void;
  setPinned(pinned: boolean): void;
}

export function createHintMachine<T>(timers: {
  set: (fn: () => void, ms: number) => T;
  clear: (id: T) => void;
}): HintMachine {
  let pinned = false;
  let focused = false;
  let suppressFocus = false;
  let timer: T | null = null;
  let mode: Keyhint = "off";
  const listeners = new Set<(next: Keyhint) => void>();

  const publish = () => {
    const next: Keyhint = pinned ? "pinned" : !suppressFocus && (focused || timer !== null) ? "temp" : "off";
    if (next === mode) return;
    mode = next;
    listeners.forEach((listener) => listener(mode));
  };

  return {
    getMode: () => mode,
    isPinned: () => pinned,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    shortcut() {
      if (pinned) return;
      suppressFocus = false;
      if (timer !== null) timers.clear(timer);
      timer = timers.set(() => {
        timer = null;
        publish();
      }, 2000);
      publish();
    },
    setFocused(next) {
      focused = next;
      if (!next) suppressFocus = false;
      publish();
    },
    escape() {
      if (timer !== null) timers.clear(timer);
      timer = null;
      if (focused) suppressFocus = true;
      publish();
    },
    setPinned(next) {
      pinned = next;
      publish();
    },
  };
}
