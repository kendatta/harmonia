import { useEffect, useState } from "react";
import type { Sounding } from "../store/useHarmonyStore";

/** 0 at the attack, 1 when the audio duration has elapsed. Frozen pauses the value. */
export function useSoundingProgress(sounding: Sounding | null): number {
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!sounding) {
      const id = window.setTimeout(() => setProgress(0), 0);
      return () => window.clearTimeout(id);
    }
    if (sounding.frozen !== undefined) {
      const frozen = sounding.frozen;
      const id = window.setTimeout(() => setProgress(frozen), 0);
      return () => window.clearTimeout(id);
    }
    let frame = 0;
    const tick = () => {
      const next = (performance.now() - sounding.startedAt) / sounding.durationMs;
      const clamped = Math.min(1, Math.max(0, next));
      setProgress(clamped);
      if (clamped < 1) frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [sounding]);

  return progress;
}
