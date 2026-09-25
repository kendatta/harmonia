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
const listeners = new Set<(next: Engine) => void>();

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
    synth = new Tone.PolySynth(Tone.Synth, {
      oscillator: { type: "triangle" },
      envelope: { attack: 0.015, decay: 0.28, sustain: 0.22, release: 1.15 },
    });
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
      release: 0.08,
      onload: () => finish(true),
      onerror: () => finish(false),
    });
    instance.connect(output!);
    sampler = instance;
    window.setTimeout(() => finish(false), 8000);
  });
}

export async function playChord(pitchClasses: string[], seconds: number): Promise<void> {
  await ensure();
  if (engine !== "sampler") {
    await Promise.race([
      samplerReady ?? Promise.resolve(false),
      new Promise((resolve) => window.setTimeout(resolve, 900)),
    ]);
  }

  const notes = voiceChord(pitchClasses);
  const player: Player | null = sampler?.loaded ? sampler : synth;
  if (!player) return;
  const now = Tone.now();
  releaseHeld(now);
  player.triggerAttackRelease(notes, Math.max(0.2, seconds), now);
  held = notes;
}

export function silence(): void {
  if (!output) return;
  releaseHeld(Tone.now());
}
