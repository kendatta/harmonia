import * as Tone from "tone";
import { voiceChord } from "../theory/chords";

export type Engine = "idle" | "loading" | "sampler" | "synth";

const SALAMANDER: Record<string, string> = {
  A0: "A0.mp3",
  C1: "C1.mp3",
  "D#1": "Ds1.mp3",
  "F#1": "Fs1.mp3",
  A1: "A1.mp3",
  C2: "C2.mp3",
  "D#2": "Ds2.mp3",
  "F#2": "Fs2.mp3",
  A2: "A2.mp3",
  C3: "C3.mp3",
  "D#3": "Ds3.mp3",
  "F#3": "Fs3.mp3",
  A3: "A3.mp3",
  C4: "C4.mp3",
  "D#4": "Ds4.mp3",
  "F#4": "Fs4.mp3",
  A4: "A4.mp3",
  C5: "C5.mp3",
  "D#5": "Ds5.mp3",
  "F#5": "Fs5.mp3",
  A5: "A5.mp3",
  C6: "C6.mp3",
  "D#6": "Ds6.mp3",
  "F#6": "Fs6.mp3",
  A6: "A6.mp3",
  C7: "C7.mp3",
  "D#7": "Ds7.mp3",
  "F#7": "Fs7.mp3",
  A7: "A7.mp3",
};

/** Release tail on both the sampler and the synth. The hold is shortened by this much. */
export const RELEASE_SECONDS = 0.08;

export const SYNTH_OPTIONS = {
  oscillator: { type: "triangle" as const },
  envelope: { attack: 0.015, decay: 0.28, sustain: 0.22, release: RELEASE_SECONDS },
};

/** `triggerAttackRelease` holds, then releases. The sum is the audible window. */
export function holdSeconds(audibleSeconds: number): number {
  return Math.max(0.05, audibleSeconds - RELEASE_SECONDS);
}

export type SoundChoice = "piano" | "synth";

export const SOUND_STORAGE_KEY = "navegador-harmonico.sound.v1";

/** URL `?synth=1` wins over storage. Anything else stored falls back to piano. */
export function soundChoiceFrom(search: string, stored: string | null): SoundChoice {
  if (new URLSearchParams(search).get("synth") === "1") return "synth";
  if (stored === "synth" || stored === "piano") return stored;
  return "piano";
}

/** Piano uses the sampler only after it has loaded. Otherwise the synth plays. */
export function playerFor(choice: SoundChoice, samplerLoaded: boolean): "sampler" | "synth" {
  if (choice === "piano" && samplerLoaded) return "sampler";
  return "synth";
}

/** Status while Piano is selected and the samples are not ready. Synth selection stays quiet. */
export function soundStatus(choice: SoundChoice, current: Engine): string | null {
  if (choice !== "piano") return null;
  if (current === "loading") return "Carregando piano…";
  if (current === "synth") return "Amostras indisponíveis · sintetizador";
  return null;
}

type Player = {
  triggerAttackRelease: (notes: string[], duration: number, time?: number) => void;
  triggerRelease?: (notes: string[], time?: number) => void;
  releaseAll?: (time?: number) => void;
};

let output: Tone.Volume | null = null;
let sampler: Tone.Sampler | null = null;
let synth: Tone.PolySynth | null = null;
let engine: Engine = "idle";
let samplerReady: Promise<boolean> | null = null;
let held: string[] = [];
let request = 0;
let choice: SoundChoice | null = null;
const listeners = new Set<(next: Engine) => void>();
const choiceListeners = new Set<(next: SoundChoice) => void>();

function readStored(): string | null {
  if (typeof localStorage === "undefined") return null;
  try {
    return localStorage.getItem(SOUND_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function loadSoundChoice(search?: string): SoundChoice {
  const query = search ?? (typeof window === "undefined" ? "" : window.location.search);
  choice = soundChoiceFrom(query, readStored());
  for (const listener of choiceListeners) listener(choice);
  return choice;
}

export function getSoundChoice(): SoundChoice {
  if (choice === null) return loadSoundChoice();
  return choice;
}

export function setSoundChoice(next: SoundChoice): void {
  choice = next;
  if (typeof localStorage !== "undefined") {
    try {
      localStorage.setItem(SOUND_STORAGE_KEY, next);
    } catch {
      // The choice still applies for this session.
    }
  }
  for (const listener of choiceListeners) listener(next);
}

export function subscribeSoundChoice(listener: (next: SoundChoice) => void): () => void {
  choiceListeners.add(listener);
  listener(getSoundChoice());
  return () => choiceListeners.delete(listener);
}

function emit(next: Engine) {
  engine = next;
  for (const listener of listeners) listener(next);
}

export function getEngine(): Engine {
  return engine;
}

export function subscribeEngine(listener: (next: Engine) => void): () => void {
  listeners.add(listener);
  listener(engine);
  return () => listeners.delete(listener);
}

function releaseHeld(time: number) {
  if (held.length === 0) return;
  sampler?.triggerRelease(held, time);
  synth?.releaseAll(time);
  held = [];
}

async function ensure(): Promise<void> {
  await Tone.start();
  if (!output) output = new Tone.Volume(-6).toDestination();
  if (!synth) {
    synth = new Tone.PolySynth(Tone.Synth, SYNTH_OPTIONS);
    synth.connect(output);
  }
  if (sampler || samplerReady) return;

  emit("loading");
  samplerReady = new Promise<boolean>((resolve) => {
    let resolved = false;
    const finish = (ok: boolean) => {
      if (ok) emit("sampler");
      else if (engine !== "sampler") emit("synth");
      if (!resolved) {
        resolved = true;
        resolve(ok);
      }
    };

    const instance = new Tone.Sampler({
      urls: SALAMANDER,
      baseUrl: "https://tonejs.github.io/audio/salamander/",
      release: RELEASE_SECONDS,
      onload: () => finish(true),
      onerror: () => finish(false),
    });
    instance.connect(output!);
    sampler = instance;
    window.setTimeout(() => finish(false), 8000);
  });
}

export async function playChord(pitchClasses: string[], seconds: number): Promise<boolean> {
  const mine = ++request;
  await ensure();
  if (mine !== request) return false;

  const notes = voiceChord(pitchClasses);
  const player: Player | null = playerFor(getSoundChoice(), Boolean(sampler?.loaded)) === "sampler" ? sampler : synth;
  if (!player) return false;
  const now = Tone.now();
  releaseHeld(now);
  player.triggerAttackRelease(notes, holdSeconds(seconds), now);
  held = notes;
  return true;
}

export function silence(): void {
  request += 1;
  if (!output) return;
  releaseHeld(Tone.now());
}
