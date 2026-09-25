import { AudioParam, OfflineAudioContext } from "node-web-audio-api";

/**
 * Tone only renders offline here. A live AudioContext asks the machine for a
 * speaker and fails in this environment, so the online constructor stays absent.
 * AudioParam must be the same class the offline context produces, or Tone
 * rejects the listener parameters.
 */
const target: Record<string, unknown> =
  typeof window === "undefined" ? (globalThis as unknown as Record<string, unknown>) : (window as unknown as Record<string, unknown>);

target.OfflineAudioContext = OfflineAudioContext;
target.AudioParam = AudioParam;
