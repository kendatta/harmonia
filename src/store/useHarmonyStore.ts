import { create } from "zustand";
import { playChord, silence } from "../audio/piano";
import { describeChordInKey } from "../theory/continuations";
import { notesOfSymbol, symbolFrom } from "../theory/chords";
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
  secondsPerChord: number;
  isPlaying: boolean;
  playIndex: number;
  playGen: number;
  playingPresetId: string | null;
  playbackStep: ProgressionStep | null;
  inspected: ProgressionStep;
  applyStart: (root: string, quality: Quality, key: KeyContext) => void;
  chooseContinuation: (move: Continuation) => void;
  replayCenter: () => void;
  back: () => void;
  savePreset: (name: string) => boolean;
  deletePreset: (id: string) => void;
  loadPreset: (id: string) => void;
  playProgression: () => void;
  playPreset: (id: string) => void;
  stopPlayback: () => void;
  faster: () => void;
  slower: () => void;
}

const STORAGE_KEY = "navegador-harmonico.presets.v1";
export const SPEEDS = [0.75, 1, 1.25, 1.5, 2, 2.5, 3, 4] as const;

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

function adjacentSpeed(current: number, direction: -1 | 1): number {
  let index = 0;
  let best = Number.POSITIVE_INFINITY;
  SPEEDS.forEach((speed, candidate) => {
    const distance = Math.abs(speed - current);
    if (distance < best) {
      best = distance;
      index = candidate;
    }
  });
  const next = Math.min(SPEEDS.length - 1, Math.max(0, index + direction));
  return SPEEDS[next];
}

function sleep(ms: number) {
  return new Promise((resolve) => window.setTimeout(resolve, ms));
}

export const useHarmonyStore = create<HarmonyState>((set, get) => {
  const initialStep = stepFrom(initialChord.symbol, initialKey);

  const interrupt = () => {
    if (!get().isPlaying && !get().playbackStep) return;
    silence();
    set((state) => ({
      playGen: state.playGen + 1,
      isPlaying: false,
      playIndex: -1,
      playingPresetId: null,
      playbackStep: null,
    }));
  };

  const runPlayback = async (steps: ProgressionStep[], presetId: string | null) => {
    if (steps.length === 0) return;
    interrupt();
    const gen = get().playGen + 1;
    set({
      playGen: gen,
      isPlaying: true,
      playIndex: 0,
      playingPresetId: presetId,
      playbackStep: steps[0] ?? null,
    });

    for (let index = 0; index < steps.length; index += 1) {
      if (get().playGen !== gen) return;
      const step = steps[index];
      if (!step) return;
      set({ playIndex: index, playbackStep: step });
      const seconds = get().secondsPerChord;
      try {
        await playChord(step.notes, Math.min(seconds * 0.92, seconds));
      } catch {
        // Audio may be blocked; the score still advances.
      }
      const started = performance.now();
      while (performance.now() - started < seconds * 1000) {
        if (get().playGen !== gen) return;
        await sleep(40);
      }
    }

    if (get().playGen !== gen) return;
    const last = steps[steps.length - 1];
    set({
      isPlaying: false,
      playIndex: -1,
      playingPresetId: null,
      playbackStep: null,
      inspected: last ?? get().inspected,
    });
  };

  return {
    center: initialChord,
    key: initialKey,
    history: [],
    progression: [initialStep],
    presets: readPresets(),
    secondsPerChord: 2,
    isPlaying: false,
    playIndex: -1,
    playGen: 0,
    playingPresetId: null,
    playbackStep: null,
    inspected: initialStep,

    applyStart: (root, quality, key) => {
      interrupt();
      const symbol = symbolFrom(root, quality);
      const center = chordOf(symbol);
      const step = stepFrom(symbol, key);
      set({
        center,
        key,
        history: [],
        progression: [step],
        inspected: step,
      });
      void playChord(center.notes, 3).catch(() => undefined);
    },

    chooseContinuation: (move) => {
      interrupt();
      const center = chordOf(move.symbol);
      const step: ProgressionStep = {
        symbol: center.symbol,
        notes: center.notes,
        roman: move.roman,
        group: move.group,
        detail: move.detail,
        key: move.nextKey,
      };
      set((state) => ({
        history: [...state.history, { center: state.center, key: state.key }],
        center,
        key: move.nextKey,
        progression: [...state.progression, step],
        inspected: step,
      }));
      void playChord(center.notes, 3).catch(() => undefined);
    },

    replayCenter: () => {
      const { center, key, isPlaying } = get();
      if (isPlaying) {
        interrupt();
        return;
      }
      const step = stepFrom(center.symbol, key);
      set({ inspected: step });
      void playChord(center.notes, 3).catch(() => undefined);
    },

    back: () => {
      const { history, progression } = get();
      if (history.length === 0) return;
      interrupt();
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
      void playChord(previous.center.notes, 3).catch(() => undefined);
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
      if (get().playingPresetId === id) interrupt();
      set({ presets });
      writePresets(presets);
    },

    loadPreset: (id) => {
      const preset = get().presets.find((item) => item.id === id);
      const first = preset?.steps[0];
      if (!preset || !first) return;
      interrupt();
      set({
        center: { symbol: first.symbol, notes: first.notes },
        key: first.key,
        history: [],
        progression: preset.steps,
        inspected: first,
      });
    },

    playProgression: () => {
      void runPlayback(get().progression, null);
    },

    playPreset: (id) => {
      const preset = get().presets.find((item) => item.id === id);
      if (!preset) return;
      void runPlayback(preset.steps, id);
    },

    stopPlayback: () => {
      interrupt();
    },

    faster: () => set((state) => ({ secondsPerChord: adjacentSpeed(state.secondsPerChord, -1) })),
    slower: () => set((state) => ({ secondsPerChord: adjacentSpeed(state.secondsPerChord, 1) })),
  };
});
