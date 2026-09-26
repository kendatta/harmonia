// @vitest-environment jsdom
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../audio/piano", () => ({
  playChord: vi.fn(async () => true),
  silence: vi.fn(),
}));

import { playChord } from "../audio/piano";
import { getContinuations } from "../theory/continuations";
import { layoutContinuations } from "../theory/layout";
import type { KeyContext } from "../theory/types";
import { createHarmonyStore } from "../store/useHarmonyStore";
import {
  SHORTCUT_ROWS,
  SHORTCUTS_STORAGE_KEY,
  assignShortcuts,
  createHintMachine,
  handleShortcutKeydown,
  indexByCode,
  keycapBesideLabel,
  readShortcutsPinned,
  replayCodeForCenter,
  shortcutAria,
  shortcutProps,
  shortcutsLabel,
  writeShortcutsPinned,
  type ShortcutHandlerContext,
  type ShortcutKeyEvent,
  type ShortcutNode,
  type ShortcutStorage,
} from "./chordShortcuts";

const Cmaj: KeyContext = { tonic: "C", mode: "major" };
const Amin: KeyContext = { tonic: "A", mode: "minor" };

function nodesOf(symbol: string, key: KeyContext): ShortcutNode[] {
  return layoutContinuations(getContinuations(symbol, key), key).map((node) => ({
    id: node.continuation.id,
    ring: node.ring,
    roman: node.continuation.roman,
    angle: node.angle,
    caption: node.continuation.caption,
    pivotKind: node.continuation.pivotKind,
    symbol: node.continuation.symbol,
  }));
}

function keyEvent(partial: Partial<ShortcutKeyEvent> & Pick<ShortcutKeyEvent, "code" | "key">): ShortcutKeyEvent & { preventDefault: ReturnType<typeof vi.fn> } {
  const preventDefault = vi.fn();
  return {
    metaKey: false,
    ctrlKey: false,
    altKey: false,
    shiftKey: false,
    repeat: false,
    isComposing: false,
    getModifierState: () => false,
    target: document.body,
    ...partial,
    preventDefault,
  };
}

function contextFor(symbol: string, key: KeyContext, extra?: Partial<ShortcutHandlerContext>): ShortcutHandlerContext {
  const nodes = nodesOf(symbol, key);
  const byCode = extra?.byCode ?? indexByCode(nodes);
  return {
    byCode,
    replayCode: extra?.replayCode ?? replayCodeForCenter(symbol === "Am" && key.mode === "minor" ? "i" : "I", "tonic", byCode),
    playing: extra?.playing ?? false,
    popoverOpen: extra?.popoverOpen ?? false,
    onPick: extra?.onPick ?? vi.fn(),
    onReplay: extra?.onReplay ?? vi.fn(),
    onHint: extra?.onHint ?? vi.fn(),
    onEscape: extra?.onEscape ?? vi.fn(),
  };
}

describe("atalhos de teclado", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    document.body.innerHTML = "";
  });

  it("K1 as quatro fileiras são as da spec", () => {
    expect([...SHORTCUT_ROWS[1]]).toEqual(["Digit1", "Digit2", "Digit3", "Digit4", "Digit5", "Digit6", "Digit7", "Digit8", "Digit9", "Digit0"]);
    expect([...SHORTCUT_ROWS[2]]).toEqual(["KeyQ", "KeyW", "KeyE", "KeyR", "KeyT", "KeyY", "KeyU", "KeyI", "KeyO", "KeyP"]);
    expect([...SHORTCUT_ROWS[3]]).toEqual(["KeyA", "KeyS", "KeyD", "KeyF", "KeyG", "KeyH", "KeyJ", "KeyK", "KeyL"]);
    expect([...SHORTCUT_ROWS[4]]).toEqual(["KeyZ", "KeyX", "KeyC", "KeyV", "KeyB", "KeyN", "KeyM"]);
    expect(SHORTCUT_ROWS[1]).toHaveLength(10);
    expect(SHORTCUT_ROWS[2]).toHaveLength(10);
    expect(SHORTCUT_ROWS[3]).toHaveLength(9);
    expect(SHORTCUT_ROWS[4]).toHaveLength(7);
  });

  it("K2 anel 1 tem posição fixa em Dó maior e Lá menor", () => {
    for (const [symbol, key, tonicRoman] of [
      ["C", Cmaj, "I"],
      ["Am", Amin, "i"],
    ] as const) {
      const nodes = nodesOf(symbol, key);
      const byCode = indexByCode(nodes);
      const replay = replayCodeForCenter(tonicRoman, "tonic", byCode);
      expect(replay).toBe("Digit1");
      expect(byCode.has("Digit1")).toBe(false);
      for (let degree = 2; degree <= 7; degree += 1) {
        const code = `Digit${degree}`;
        const node = byCode.get(code);
        expect(node?.ring).toBe(1);
        const roman = node?.roman ?? "";
        const value = roman.includes("/") ? roman.split("/").pop() : roman;
        const stripped = (value ?? "").replace(/[0-9Δ°ø]/g, "").replace(/^♭/, "").replace(/^b/, "");
        const map: Record<string, number> = { I: 1, i: 1, II: 2, ii: 2, III: 3, iii: 3, IV: 4, iv: 4, V: 5, v: 5, VI: 6, vi: 6, VII: 7, vii: 7 };
        expect(map[stripped]).toBe(degree);
      }
      expect(byCode.has("Digit8")).toBe(false);
      expect(byCode.has("Digit9")).toBe(false);
      expect(byCode.has("Digit0")).toBe(false);
      const ctx = contextFor(symbol, key, { replayCode: replay });
      for (const code of ["Digit8", "Digit9", "Digit0"]) {
        const event = keyEvent({ code, key: code.slice(5) });
        handleShortcutKeydown(event, ctx);
        expect(event.preventDefault).not.toHaveBeenCalled();
      }
      expect(ctx.onPick).not.toHaveBeenCalled();
      expect(ctx.onReplay).not.toHaveBeenCalled();
    }
    const major = indexByCode(nodesOf("C", Cmaj));
    expect(major.get("Digit2")?.symbol).toBe("Dm");
    expect(major.get("Digit3")?.symbol).toBe("Em");
    expect(major.get("Digit4")?.symbol).toBe("F");
    expect(major.get("Digit5")?.symbol).toBe("G");
    expect(major.get("Digit6")?.symbol).toBe("Am");
    expect(major.get("Digit7")?.symbol).toBe("Bdim");
  });

  it("K3 anéis 2, 3 e 4 em Dó maior e empate por ângulo", () => {
    const byCode = indexByCode(nodesOf("C", Cmaj));
    expect(byCode.get("KeyQ")?.symbol).toBe("A7");
    expect(byCode.get("KeyW")?.symbol).toBe("B7");
    expect(byCode.get("KeyE")?.symbol).toBe("C7");
    expect(byCode.get("KeyR")?.symbol).toBe("D7");
    expect(byCode.get("KeyT")?.symbol).toBe("E7");
    expect(byCode.get("KeyA")?.symbol).toBe("Eb");
    expect(byCode.get("KeyS")?.symbol).toBe("Fm");
    expect(byCode.get("KeyD")?.symbol).toBe("Ab");
    expect(byCode.get("KeyF")?.symbol).toBe("Bb");
    expect(byCode.get("KeyZ")?.symbol).toBe("Cm");
    expect(byCode.get("KeyX")?.symbol).toBe("Dm");
    expect(byCode.get("KeyC")?.symbol).toBe("F");
    expect(byCode.get("KeyV")?.symbol).toBe("Am");

    const tied: ShortcutNode[] = [
      { id: "late", ring: 2, roman: "V7/ii", angle: 100, symbol: "late" },
      { id: "early", ring: 2, roman: "V7/ii", angle: 20, symbol: "early" },
      { id: "fifth", ring: 2, roman: "V7/V", angle: 350, symbol: "fifth" },
    ];
    const order = assignShortcuts(tied).map((item) => item.id);
    expect(order).toEqual(["early", "late", "fifth"]);
    expect(keycapBesideLabel(2, 40, 12).x).toBeGreaterThan(40);
  });

  it("K4 nó excedente fica sem atalho", () => {
    const nodes: ShortcutNode[] = Array.from({ length: 12 }, (_, index) => ({
      id: `n${index}`,
      ring: 2 as const,
      roman: "V7/ii",
      angle: index * 10,
      symbol: `S${index}`,
    }));
    const assigned = assignShortcuts(nodes);
    expect(assigned).toHaveLength(10);
    const ids = new Set(assigned.map((item) => item.id));
    expect(ids.has("n10")).toBe(false);
    expect(ids.has("n11")).toBe(false);
    expect(shortcutProps(assigned[0]?.code)).toEqual({ "data-shortcut": "KeyQ", "aria-keyshortcuts": "q" });
    expect(shortcutProps(null)).toEqual({});
    const overflow = nodes.filter((node) => !ids.has(node.id));
    expect(overflow.every((node) => shortcutProps(assignShortcuts([node])[0]?.code ?? null)["data-shortcut"] === undefined || !ids.has(node.id))).toBe(true);
    for (const node of overflow) {
      expect(shortcutProps(undefined)["aria-keyshortcuts"]).toBeUndefined();
      expect(node.id).toMatch(/^n1/);
    }
  });

  it("K5 KeyQ chama o mesmo caminho do clique", async () => {
    const nodes = nodesOf("C", Cmaj);
    const byCode = indexByCode(nodes);
    const target = byCode.get("KeyQ");
    if (!target) throw new Error("KeyQ ausente");
    const move = getContinuations("C", Cmaj).find((item) => item.id === target.id);
    if (!move) throw new Error("movimento ausente");

    const viaKey = createHarmonyStore();
    const viaClick = createHarmonyStore();
    const onPick = vi.fn((node: ShortcutNode) => {
      const chosen = getContinuations("C", Cmaj).find((item) => item.id === node.id);
      if (!chosen) throw new Error("nó sem movimento");
      viaKey.getState().chooseContinuation(chosen);
    });
    const event = keyEvent({ code: "KeyQ", key: "q" });
    handleShortcutKeydown(event, {
      byCode,
      replayCode: replayCodeForCenter("I", "tonic", byCode),
      playing: false,
      popoverOpen: false,
      onPick,
      onReplay: vi.fn(),
      onHint: vi.fn(),
      onEscape: vi.fn(),
    });
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0]?.[0].id).toBe(target.id);
    expect(event.preventDefault).toHaveBeenCalledTimes(1);

    viaClick.getState().chooseContinuation(move);
    expect(viaKey.getState().center).toEqual(viaClick.getState().center);
    expect(viaKey.getState().history).toEqual(viaClick.getState().history);
    expect(viaKey.getState().key).toEqual(viaClick.getState().key);
    await Promise.resolve();
    expect(playChord).toHaveBeenCalledTimes(2);
    expect(playChord).toHaveBeenCalledWith(viaClick.getState().center.notes, 3);
  });

  it("K6 o code vale, não o caractere impresso", () => {
    const onPick = vi.fn<(node: ShortcutNode) => void>();
    const onReplay = vi.fn();
    const ctx = contextFor("C", Cmaj, { onPick, onReplay });
    const digit = keyEvent({ code: "Digit1", key: "&" });
    handleShortcutKeydown(digit, ctx);
    expect(onReplay).toHaveBeenCalledTimes(1);
    expect(digit.preventDefault).toHaveBeenCalledTimes(1);

    const letter = keyEvent({ code: "KeyQ", key: "a" });
    handleShortcutKeydown(letter, ctx);
    expect(onPick).toHaveBeenCalledTimes(1);
    expect(onPick.mock.calls[0]?.[0].symbol).toBe("A7");
    expect(letter.preventDefault).toHaveBeenCalledTimes(1);
  });

  it("K7 ignora modificadores, repeat, composição, texto e popover", () => {
    const ctx = contextFor("C", Cmaj);
    const blocked: ShortcutKeyEvent[] = [
      keyEvent({ code: "KeyQ", key: "q", metaKey: true }),
      keyEvent({ code: "KeyQ", key: "q", ctrlKey: true }),
      keyEvent({ code: "KeyQ", key: "q", altKey: true }),
      keyEvent({ code: "KeyQ", key: "q", shiftKey: true }),
      keyEvent({ code: "KeyQ", key: "q", getModifierState: (name) => name === "AltGraph" }),
      keyEvent({ code: "KeyQ", key: "q", repeat: true }),
      keyEvent({ code: "KeyQ", key: "q", isComposing: true }),
    ];

    const name = document.createElement("input");
    name.type = "text";
    name.setAttribute("aria-label", "Nome da progressão");
    const area = document.createElement("textarea");
    const select = document.createElement("select");
    const editable = document.createElement("div");
    editable.setAttribute("contenteditable", "true");
    document.body.append(name, area, select, editable);
    for (const target of [name, area, select, editable]) {
      blocked.push(keyEvent({ code: "KeyQ", key: "q", target }));
    }

    for (const event of blocked) {
      handleShortcutKeydown(event, ctx);
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
    const popover = keyEvent({ code: "KeyQ", key: "q" });
    handleShortcutKeydown(popover, { ...ctx, popoverOpen: true });
    expect(popover.preventDefault).not.toHaveBeenCalled();
    expect(ctx.onPick).not.toHaveBeenCalled();

    const range = document.createElement("input");
    range.type = "range";
    range.setAttribute("aria-label", "Velocidade");
    const speed = keyEvent({ code: "KeyQ", key: "q", target: range });
    handleShortcutKeydown(speed, ctx);
    expect(speed.preventDefault).toHaveBeenCalledTimes(1);
    expect(ctx.onPick).toHaveBeenCalledTimes(1);
  });

  it("K8 durante a reprodução a tecla não faz nada", () => {
    const ctx = contextFor("C", Cmaj, { playing: true });
    const machine = createHintMachine({ set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id) });
    const event = keyEvent({ code: "KeyQ", key: "q" });
    handleShortcutKeydown(event, { ...ctx, onHint: () => machine.shortcut() });
    expect(event.preventDefault).not.toHaveBeenCalled();
    expect(ctx.onPick).not.toHaveBeenCalled();
    expect(ctx.onReplay).not.toHaveBeenCalled();
    expect(machine.getMode()).toBe("off");
  });

  it("K9 a tecla do grau central toca de novo sem histórico", async () => {
    const store = createHarmonyStore();
    const nodes = nodesOf("C", Cmaj);
    const byCode = indexByCode(nodes);
    const replayCode = replayCodeForCenter("I", "tonic", byCode);
    const onReplay = vi.fn(() => store.getState().replayCenter());
    const event = keyEvent({ code: "Digit1", key: "1" });
    handleShortcutKeydown(event, {
      byCode,
      replayCode,
      playing: false,
      popoverOpen: false,
      onPick: vi.fn(),
      onReplay,
      onHint: vi.fn(),
      onEscape: vi.fn(),
    });
    expect(onReplay).toHaveBeenCalledTimes(1);
    expect(store.getState().center.symbol).toBe("C");
    expect(store.getState().history).toEqual([]);
    expect(store.getState().key).toEqual(Cmaj);
    await Promise.resolve();
    expect(playChord).toHaveBeenCalledWith(store.getState().center.notes, 3);
  });

  it("K10 espaço, enter, tab, backspace e esc não são consumidos", () => {
    const ctx = contextFor("C", Cmaj);
    const keys = [
      { key: " ", code: "Space" },
      { key: "Enter", code: "Enter" },
      { key: "Tab", code: "Tab" },
      { key: "Backspace", code: "Backspace" },
      { key: "Escape", code: "Escape" },
    ];
    for (const item of keys) {
      const event = keyEvent(item);
      handleShortcutKeydown(event, ctx);
      expect(event.preventDefault).not.toHaveBeenCalled();
    }
    expect(ctx.onPick).not.toHaveBeenCalled();
    expect(ctx.onReplay).not.toHaveBeenCalled();
    expect(ctx.onEscape).toHaveBeenCalledTimes(1);
  });

  it("K11 dica temporária, prazo e foco", () => {
    vi.useFakeTimers();
    const machine = createHintMachine({ set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id) });
    expect(machine.getMode()).toBe("off");
    machine.shortcut();
    expect(machine.getMode()).toBe("temp");
    vi.advanceTimersByTime(1999);
    expect(machine.getMode()).toBe("temp");
    vi.advanceTimersByTime(1);
    expect(machine.getMode()).toBe("off");

    machine.shortcut();
    vi.advanceTimersByTime(1500);
    machine.shortcut();
    vi.advanceTimersByTime(1999);
    expect(machine.getMode()).toBe("temp");
    vi.advanceTimersByTime(1);
    expect(machine.getMode()).toBe("off");

    machine.setFocused(true);
    expect(machine.getMode()).toBe("temp");
    vi.advanceTimersByTime(5000);
    expect(machine.getMode()).toBe("temp");
    machine.setFocused(false);
    expect(machine.getMode()).toBe("off");

    machine.shortcut();
    expect(machine.getMode()).toBe("temp");
    machine.escape();
    expect(machine.getMode()).toBe("off");
    vi.advanceTimersByTime(2000);
    expect(machine.getMode()).toBe("off");
  });

  it("K12 o botão alterna, grava só ligado e sobrevive a falha", () => {
    expect(shortcutsLabel(false)).toBe("Mostrar atalhos");
    expect(shortcutsLabel(true)).toBe("Ocultar atalhos");
    const memory = new Map<string, string>();
    const storage: ShortcutStorage = {
      getItem: (key) => memory.get(key) ?? null,
      setItem: (key, value) => memory.set(key, value),
      removeItem: (key) => memory.delete(key),
    };
    const machine = createHintMachine({ set: (fn, ms) => setTimeout(fn, ms), clear: (id) => clearTimeout(id) });
    expect(machine.getMode()).toBe("off");
    expect(readShortcutsPinned(storage)).toBe(false);

    machine.setPinned(true);
    expect(writeShortcutsPinned(storage, true)).toBe(true);
    expect(machine.getMode()).toBe("pinned");
    expect(storage.getItem(SHORTCUTS_STORAGE_KEY)).toBe("on");
    expect(readShortcutsPinned(storage)).toBe(true);

    machine.setPinned(false);
    expect(writeShortcutsPinned(storage, false)).toBe(true);
    expect(machine.getMode()).toBe("off");
    expect(storage.getItem(SHORTCUTS_STORAGE_KEY)).toBeNull();

    const refusing: ShortcutStorage = {
      getItem: () => null,
      setItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
      removeItem: () => {
        throw new DOMException("quota", "QuotaExceededError");
      },
    };
    machine.setPinned(true);
    expect(writeShortcutsPinned(refusing, true)).toBe(false);
    expect(machine.getMode()).toBe("pinned");
    expect(readShortcutsPinned(refusing)).toBe(false);
  });

  it("K13 aria-keyshortcuts em minúscula e keycap aria-hidden", () => {
    const assigned = assignShortcuts(nodesOf("C", Cmaj));
    const sample = ["Digit1", "KeyQ", "KeyA", "KeyZ"];
    for (const code of sample) {
      if (code === "Digit1") {
        expect(shortcutAria(code)).toBe("1");
        continue;
      }
      const item = assigned.find((entry) => entry.code === code);
      expect(item?.aria).toBe(shortcutAria(code));
      expect(item?.aria).toBe(item?.label.toLowerCase());
      expect(shortcutProps(code)["aria-keyshortcuts"]).toBe(shortcutAria(code));
    }
    expect(shortcutAria("KeyQ")).toBe("q");
    expect(shortcutAria("KeyA")).toBe("a");
    expect(shortcutAria("KeyZ")).toBe("z");
    const source = readFileSync(join(process.cwd(), "src/components/Keycap.tsx"), "utf8");
    expect(source).toContain('aria-hidden="true"');
  });

  it("K14 a keycap só usa variáveis de token", () => {
    const component = readFileSync(join(process.cwd(), "src/components/Keycap.tsx"), "utf8");
    const css = readFileSync(join(process.cwd(), "src/index.css"), "utf8");
    const block = css.slice(css.indexOf(".keycap {"), css.indexOf(".shortcuts-toggle {"));
    expect(block.length).toBeGreaterThan(20);
    expect(component).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    expect(block).not.toMatch(/#[0-9A-Fa-f]{3,8}/);
    expect(block).toContain("var(--color-line-strong)");
    expect(block).toContain("var(--color-text-muted)");
    expect(block).toContain("var(--color-text-secondary)");
    expect(block).toContain("var(--color-group-pivot)");
  });
});
