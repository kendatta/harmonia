import { create } from "zustand";
import { playChord, silence } from "../audio/piano";
import { describeChordInKey, symbolInKey } from "../theory/continuations";
import { notesOfSymbol, sameKey, symbolFrom } from "../theory/chords";
import type { Continuation, Group, KeyContext, Quality } from "../theory/types";

export interface HarmonyChord {
  symbol: string;
  notes: string[];
}

export interface ProgressionStep {
  symbol: string;
  notes: string[];
  roman: string;
  group: Group | "chromatic";
  detail: string;
  key: KeyContext;
}

export interface Preset {
  id: string;
  name: string;
  steps: ProgressionStep[];
  createdAt: number;
}

export interface Sounding {
  startedAt: number;
  durationMs: number;
  /** Set when playback is paused so the arc and the segment freeze together. */
  frozen?: number;
}

export interface TransitionFrom {
  x: number;
  y: number;
  r: number;
  symbol: string;
}

interface HistoryEntry {
  center: HarmonyChord;
  key: KeyContext;
}

interface HarmonyState {
  center: HarmonyChord;
  key: KeyContext;
  history: HistoryEntry[];
  progression: ProgressionStep[];
  presets: Preset[];
  playbackRate: number;
  isPlaying: boolean;
  paused: boolean;
  playIndex: number;
  playGen: number;
  playingPresetId: string | null;
  selectedPresetId: string | null;
  playbackStep: ProgressionStep | null;
  inspected: ProgressionStep;
  sounding: Sounding | null;
  transitionFrom: TransitionFrom | null;
  applyStart: (root: string, quality: Quality, key: KeyContext) => void;
  chooseContinuation: (move: Continuation) => void;
  replayCenter: () => void;
  back: () => void;
  savePreset: (name: string) => boolean;
  deletePreset: (id: string) => void;
  loadPreset: (id: string) => void;
  selectPreset: (id: string | null) => void;
  playToggle: () => void;
  stopPlayback: () => void;
  setPlaybackRate: (rate: number) => void;
  setTransitionFrom: (from: TransitionFrom | null) => void;
}

export const STORAGE_KEY = "navegador-harmonico.presets.v1";
const CLICK_MS = 3000;

const initialKey: KeyContext = { tonic: "C", mode: "major" };
const initialChord = chordOf("C");

function chordOf(symbol: string): HarmonyChord {
  return { symbol, notes: notesOfSymbol(symbol) };
}

function stepFrom(symbol: string, key: KeyContext, override?: Partial<ProgressionStep>): ProgressionStep {
  const analysis = describeChordInKey(symbol, key);
  const chord = chordOf(symbol);
  return {
    symbol: chord.symbol,
    notes: chord.notes,
    roman: analysis.roman,
    group: analysis.group,
    detail: analysis.detail,
    key,
    ...override,
  };
}

function isKey(value: unknown): value is KeyContext {
  if (!value || typeof value !== "object") return false;
  const key = value as KeyContext;
  return typeof key.tonic === "string" && (key.mode === "major" || key.mode === "minor");
}

function isStep(value: unknown): value is ProgressionStep {
  if (!value || typeof value !== "object") return false;
  const step = value as ProgressionStep;
  return typeof step.symbol === "string" && Array.isArray(step.notes) && typeof step.roman === "string" && isKey(step.key);
}

function isPreset(value: unknown): value is Preset {
  if (!value || typeof value !== "object") return false;
  const preset = value as Preset;
  return typeof preset.id === "string" && typeof preset.name === "string" && Array.isArray(preset.steps) && preset.steps.length > 0 && preset.steps.every(isStep);
}

function readPresets(): Preset[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(isPreset);
  } catch {
    return [];
  }
}

function writePresets(presets: Preset[]) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(presets));
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

function clampRate(rate: number): number {
  const stepped = Math.round(rate * 4) / 4;
  return Math.min(2, Math.max(0.5, stepped));
}

export function createHarmonyStore() {
  return create<HarmonyState>((set, get) => {
  const initialStep = stepFrom(initialChord.symbol, initialKey);

  const attack = (notes: string[], durationMs = CLICK_MS) => {
    void playChord(notes, durationMs / 1000)
      .then((played) => {
        if (!played) return;
        set({ sounding: { startedAt: performance.now(), durationMs } });
      })
      .catch(() => undefined);
  };

  const selectedSteps = (): ProgressionStep[] => {
    const id = get().selectedPresetId;
    if (id) {
      const preset = get().presets.find((item) => item.id === id);
      if (preset) return preset.steps;
    }
    return get().progression;
  };

  const killTransport = () => {
    silence();
    set((state) => ({
      playGen: state.playGen + 1,
      isPlaying: false,
      paused: false,
      playIndex: -1,
      playingPresetId: null,
      playbackStep: null,
      sounding: null,
    }));
  };

  const runPlayback = async (steps: ProgressionStep[], presetId: string | null) => {
    if (steps.length === 0) return;
    silence();
    const gen = get().playGen + 1;
    set({
      playGen: gen,
      isPlaying: true,
      paused: false,
      playIndex: 0,
      playingPresetId: presetId,
      playbackStep: steps[0] ?? null,
      sounding: null,
    });

    let carryRatio = 0;
    let chordSeconds = 3;
    for (let index = 0; index < steps.length; ) {
      if (get().playGen !== gen) return;
      while (get().paused && get().playGen === gen) await sleep(40);
      if (get().playGen !== gen) return;
      const step = steps[index];
      if (!step) return;
      if (carryRatio === 0) chordSeconds = 3 / get().playbackRate;
      const seconds = Math.max(0.05, chordSeconds * (1 - carryRatio));
      const durationMs = chordSeconds * 1000;
      const offsetMs = carryRatio * durationMs;
      set({ playIndex: index, playbackStep: step, playingPresetId: presetId });
      try {
        await playChord(step.notes, seconds);
      } catch {
        // Audio may be blocked; the score still advances.
      }
      if (get().playGen !== gen) return;
      const startedAt = performance.now() - offsetMs;
      set({ sounding: { startedAt, durationMs } });
      let pausedMidway = false;
      while (performance.now() - startedAt < durationMs) {
        if (get().playGen !== gen) return;
        const marked = get().sounding?.frozen;
        if (get().paused || marked !== undefined) {
          const frozen = marked ?? Math.min(1, Math.max(carryRatio, (performance.now() - startedAt) / durationMs));
          silence();
          set({ sounding: { startedAt, durationMs, frozen } });
          carryRatio = frozen;
          while (get().paused && get().playGen === gen) await sleep(40);
          pausedMidway = true;
          break;
        }
        await sleep(40);
      }
      if (get().playGen !== gen) return;
      if (pausedMidway) continue;
      carryRatio = 0;
      index += 1;
    }

    if (get().playGen !== gen) return;
    const last = steps[steps.length - 1];
    set({
      isPlaying: false,
      paused: false,
      playIndex: -1,
      playingPresetId: null,
      playbackStep: null,
      sounding: null,
      inspected: last ?? get().inspected,
      center: last ? { symbol: last.symbol, notes: last.notes } : get().center,
      key: last?.key ?? get().key,
    });
  };

  return {
    center: initialChord,
    key: initialKey,
    history: [],
    progression: [initialStep],
    presets: readPresets(),
    playbackRate: 1,
    isPlaying: false,
    paused: false,
    playIndex: -1,
    playGen: 0,
    playingPresetId: null,
    selectedPresetId: null,
    playbackStep: null,
    inspected: initialStep,
    sounding: null,
    transitionFrom: null,

    applyStart: (root, quality, key) => {
      killTransport();
      const symbol = symbolFrom(root, quality);
      const center = chordOf(symbol);
      const step = stepFrom(symbol, key);
      set({
        center,
        key,
        history: [],
        progression: [step],
        inspected: step,
        transitionFrom: null,
      });
      attack(center.notes);
    },

    chooseContinuation: (move) => {
      killTransport();
      const keyChanged = !sameKey(move.nextKey, get().key);
      const symbol = keyChanged ? symbolInKey(move.symbol, move.nextKey) : move.symbol;
      const center = chordOf(symbol);
      const arrival = keyChanged ? describeChordInKey(symbol, move.nextKey) : null;
      const step: ProgressionStep = {
        symbol: center.symbol,
        notes: center.notes,
        roman: arrival?.roman ?? move.roman,
        group: arrival?.group ?? move.group,
        detail: arrival?.detail ?? move.detail,
        key: move.nextKey,
      };
      set((state) => ({
        history: [...state.history, { center: state.center, key: state.key }],
        center,
        key: move.nextKey,
        progression: [...state.progression, step],
        inspected: step,
      }));
      attack(center.notes);
    },

    replayCenter: () => {
      if (get().isPlaying) {
        get().stopPlayback();
        return;
      }
      const overlay = get().paused ? get().playbackStep : null;
      const notes = overlay?.notes ?? get().center.notes;
      const inspected = overlay ?? stepFrom(get().center.symbol, get().key);
      set({ inspected });
      attack(notes);
    },

    back: () => {
      const { history, progression, isPlaying } = get();
      if (history.length === 0 || isPlaying) return;
      killTransport();
      const previous = history[history.length - 1];
      if (!previous) return;
      const step = stepFrom(previous.center.symbol, previous.key);
      set({
        history: history.slice(0, -1),
        progression: progression.slice(0, -1),
        center: previous.center,
        key: previous.key,
        inspected: step,
      });
      attack(previous.center.notes);
    },

    savePreset: (name) => {
      const trimmed = name.trim();
      if (!trimmed) return false;
      const preset: Preset = {
        id: crypto.randomUUID(),
        name: trimmed,
        steps: get().progression,
        createdAt: Date.now(),
      };
      const presets = [preset, ...get().presets];
      set({ presets });
      writePresets(presets);
      return true;
    },

    deletePreset: (id) => {
      const presets = get().presets.filter((preset) => preset.id !== id);
      if (get().playingPresetId === id) killTransport();
      set({
        presets,
        selectedPresetId: get().selectedPresetId === id ? null : get().selectedPresetId,
      });
      writePresets(presets);
    },

    loadPreset: (id) => {
      const preset = get().presets.find((item) => item.id === id);
      const first = preset?.steps[0];
      if (!preset || !first) return;
      killTransport();
      set({
        center: { symbol: first.symbol, notes: first.notes },
        key: first.key,
        history: [],
        progression: preset.steps,
        inspected: first,
        selectedPresetId: null,
        transitionFrom: null,
      });
    },

    selectPreset: (id) => {
      if (get().isPlaying) return;
      if (get().paused) {
        silence();
        set((state) => ({ playGen: state.playGen + 1 }));
      }
      set({ selectedPresetId: id, paused: false, playIndex: -1, playbackStep: null, sounding: null });
    },

    playToggle: () => {
      if (get().isPlaying) {
        silence();
        const sounding = get().sounding;
        const frozen = sounding ? Math.min(1, (performance.now() - sounding.startedAt) / sounding.durationMs) : 0;
        set({
          isPlaying: false,
          paused: true,
          sounding: sounding ? { ...sounding, frozen } : null,
        });
        return;
      }
      if (get().paused) {
        set({ paused: false, isPlaying: true });
        return;
      }
      const steps = selectedSteps();
      void runPlayback(steps, get().selectedPresetId);
    },

    stopPlayback: () => {
      silence();
      set((state) => ({
        playGen: state.playGen + 1,
        isPlaying: false,
        paused: false,
        playIndex: 0,
        playingPresetId: null,
        playbackStep: null,
        sounding: null,
      }));
    },

    setPlaybackRate: (rate) => set({ playbackRate: clampRate(rate) }),

    setTransitionFrom: (from) => set({ transitionFrom: from }),
  };
  });
}

export const useHarmonyStore = createHarmonyStore();
