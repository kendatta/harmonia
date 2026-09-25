// @vitest-environment jsdom
import "./webAudioPolyfill";
import * as Tone from "tone";
import { describe, expect, it } from "vitest";
import { RELEASE_SECONDS, SYNTH_OPTIONS, holdSeconds } from "./piano";

function envelopeEnd(channel: Float32Array, sampleRate: number): number {
  const windowSize = Math.max(1, Math.floor(sampleRate * 0.02));
  let peak = 0;
  const windows: number[] = [];
  for (let index = 0; index + windowSize <= channel.length; index += windowSize) {
    let sum = 0;
    for (let offset = 0; offset < windowSize; offset += 1) {
      const sample = channel[index + offset] ?? 0;
      sum += sample * sample;
    }
    const rms = Math.sqrt(sum / windowSize);
    windows.push(rms);
    if (rms > peak) peak = rms;
  }
  const threshold = Math.max(0.001, peak * 0.08);
  let last = 0;
  windows.forEach((rms, index) => {
    if (rms >= threshold) last = ((index + 1) * windowSize) / sampleRate;
  });
  return last;
}

async function renderEnd(audibleSeconds: number, path: "synth" | "sampler"): Promise<number> {
  const sampleRate = 22050;
  const rendered = await Tone.Offline(
    async () => {
      if (path === "synth") {
        const synth = new Tone.PolySynth(Tone.Synth, SYNTH_OPTIONS).toDestination();
        synth.triggerAttackRelease(["C4", "E4", "G4"], holdSeconds(audibleSeconds), 0);
        return;
      }
      const raw = Tone.getContext().rawContext;
      const length = Math.ceil(sampleRate * (audibleSeconds + 1));
      const buffer = raw.createBuffer(1, length, sampleRate);
      const data = buffer.getChannelData(0);
      for (let index = 0; index < data.length; index += 1) {
        data[index] = Math.sin((2 * Math.PI * 261.63 * index) / sampleRate) * 0.8;
      }
      const sampler = new Tone.Sampler({ urls: { C4: buffer }, release: RELEASE_SECONDS }).toDestination();
      await Tone.loaded();
      sampler.triggerAttackRelease(["C4", "E4", "G4"], holdSeconds(audibleSeconds), 0);
    },
    audibleSeconds + 0.6,
    1,
    sampleRate,
  );
  return envelopeEnd(rendered.getChannelData(0), sampleRate);
}

describe("duração audível", () => {
  it.each([
    ["synth", 3],
    ["synth", 6],
    ["synth", 1.5],
    ["sampler", 3],
    ["sampler", 6],
    ["sampler", 1.5],
  ] as const)("%s termina em %ss ± 0.1", async (path, seconds) => {
    const end = await renderEnd(seconds, path);
    expect(end).toBeGreaterThanOrEqual(seconds - 0.1);
    expect(end).toBeLessThanOrEqual(seconds + 0.1);
  }, 20000);
});
