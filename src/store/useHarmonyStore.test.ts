// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../audio/piano", () => ({
  playChord: vi.fn(async () => true),
  silence: vi.fn(),
}));

import { playChord } from "../audio/piano";
import { inferKey, toPickerKey } from "../theory/chords";
import { getContinuations } from "../theory/continuations";
import type { KeyContext } from "../theory/types";
import { STORAGE_KEY, createHarmonyStore } from "./useHarmonyStore";

const Cmaj: KeyContext = { tonic: "C", mode: "major" };

describe("presets no localStorage", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
    vi.useRealTimers();
  });

  it("grava, recria a store e encontra o preset", () => {
    const first = createHarmonyStore();
    expect(first.getState().savePreset("Cadência")).toBe(true);
    const saved = first.getState().presets[0];
    expect(saved?.name).toBe("Cadência");

    const second = createHarmonyStore();
    expect(second.getState().presets.map((preset) => preset.id)).toContain(saved?.id);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]")).toEqual(
      expect.arrayContaining([expect.objectContaining({ name: "Cadência" })]),
    );
  });

  it("carregar define centro, tom e progressão", () => {
    const store = createHarmonyStore();
    const dominant = getContinuations("C", Cmaj).find((move) => move.id === "diatonic-V");
    if (!dominant) throw new Error("V ausente");
    store.getState().chooseContinuation(dominant);
    store.getState().savePreset("Para a dominante");
    const id = store.getState().presets[0]?.id;
    if (!id) throw new Error("preset ausente");

    store.getState().applyStart("A", "min", { tonic: "A", mode: "minor" });
    expect(store.getState().center.symbol).toBe("Am");

    store.getState().loadPreset(id);
    expect(store.getState().center.symbol).toBe("C");
    expect(store.getState().key).toEqual(Cmaj);
    expect(store.getState().progression.map((step) => step.symbol)).toEqual(["C", "G"]);
    expect(store.getState().progression[1]?.key).toEqual(Cmaj);
  });

  it("excluir remove o preset do armazenamento", () => {
    const store = createHarmonyStore();
    store.getState().savePreset("Temporário");
    const id = store.getState().presets[0]?.id;
    if (!id) throw new Error("preset ausente");
    store.getState().deletePreset(id);
    expect(store.getState().presets).toEqual([]);
    expect(createHarmonyStore().getState().presets).toEqual([]);
  });

  it("mantém a lista na memória se o navegador recusar a gravação", () => {
    const store = createHarmonyStore();
    const spy = vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new DOMException("quota", "QuotaExceededError");
    });
    try {
      expect(store.getState().savePreset("Só na sessão")).toBe(true);
      expect(store.getState().presets.map((preset) => preset.name)).toContain("Só na sessão");
      expect(store.getState().storageNotice).toMatch(/navegador/);
    } finally {
      spy.mockRestore();
    }
  });

  it("abre F° no chip de Fá sustenido como E♯°", () => {
    const store = createHarmonyStore();
    const key = toPickerKey(inferKey("F", "dim"));
    store.getState().applyStart("F", "dim", key);
    expect(store.getState().key).toEqual({ tonic: "F#", mode: "major" });
    expect(store.getState().center.symbol).toBe("E#dim");
    expect(store.getState().center.notes).toEqual(["E#", "G#", "B"]);
    expect(store.getState().inspected.roman).toBe("vii°");
    expect(store.getState().inspected.group).not.toBe("chromatic");
  });

  it("abre D♯7 já reescrito como E♭7", () => {
    const store = createHarmonyStore();
    const key = toPickerKey(inferKey("D#", "7"));
    store.getState().applyStart("D#", "7", key);
    expect(store.getState().center.symbol).toBe("Eb7");
    expect(store.getState().key).toEqual({ tonic: "Ab", mode: "major" });
    expect(store.getState().inspected.group).not.toBe("chromatic");
    expect(getContinuations("Eb7", key).some((move) => move.strong)).toBe(true);
  });

  it("JSON corrompido vira uma lista vazia", () => {
    localStorage.setItem(STORAGE_KEY, "{isto não é uma lista");
    expect(createHarmonyStore().getState().presets).toEqual([]);
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ name: "sem passos" }]));
    expect(createHarmonyStore().getState().presets).toEqual([]);
  });

  it("um pivô mostra o grau no tom de chegada", () => {
    const store = createHarmonyStore();
    const pivot = getContinuations("C", Cmaj).find((move) => move.id === "pivot-fifth-up");
    if (!pivot) throw new Error("pivô ausente");
    store.getState().chooseContinuation(pivot);
    expect(store.getState().key).toEqual({ tonic: "G", mode: "major" });
    expect(store.getState().center.symbol).toBe("Am");
    expect(store.getState().inspected.roman).toBe("ii");
    expect(store.getState().inspected.group).toBe("subdominant");
  });

  it("muda a velocidade no acorde seguinte e retoma o que faltava", async () => {
    vi.useFakeTimers();
    const store = createHarmonyStore();
    const dominant = getContinuations("C", Cmaj).find((move) => move.id === "diatonic-V");
    if (!dominant) throw new Error("V ausente");
    store.getState().chooseContinuation(dominant);
    vi.mocked(playChord).mockClear();

    store.getState().playToggle();
    await vi.advanceTimersByTimeAsync(40);
    expect(vi.mocked(playChord).mock.calls[0]?.[1]).toBeCloseTo(3, 5);

    store.getState().setPlaybackRate(2);
    await vi.advanceTimersByTimeAsync(1200);
    store.getState().playToggle();
    const frozen = store.getState().sounding?.frozen ?? 0;
    expect(frozen).toBeGreaterThan(0.2);
    expect(frozen).toBeLessThan(0.6);
    expect(vi.mocked(playChord).mock.calls).toHaveLength(1);

    store.getState().playToggle();
    await vi.advanceTimersByTimeAsync(40);
    const resumed = vi.mocked(playChord).mock.calls.at(-1)?.[1] ?? 0;
    expect(resumed).toBeGreaterThan(1);
    expect(resumed).toBeLessThan(2.5);
    expect(resumed).not.toBeCloseTo(3, 1);

    await vi.advanceTimersByTimeAsync(2000);
    expect(vi.mocked(playChord).mock.calls.at(-1)?.[1]).toBeCloseTo(1.5, 5);
    vi.useRealTimers();
  });

  it("deixa o último acorde no centro quando a reprodução acaba", async () => {
    vi.useFakeTimers();
    const store = createHarmonyStore();
    const dominant = getContinuations("C", Cmaj).find((move) => move.id === "diatonic-V");
    if (!dominant) throw new Error("V ausente");
    store.getState().chooseContinuation(dominant);
    store.getState().playToggle();
    await vi.advanceTimersByTimeAsync(7000);
    expect(store.getState().isPlaying).toBe(false);
    expect(store.getState().center.symbol).toBe("G");
    expect(store.getState().key).toEqual(Cmaj);
    vi.useRealTimers();
  });
});
