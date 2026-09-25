import { keyboardStart, voicedMidis } from "../theory/chords";
import { groupVar } from "./groupMeta";
import type { Group } from "../theory/types";

const WHITE = new Set([0, 2, 4, 5, 7, 9, 11]);

function keyPath(x: number, y: number, w: number, h: number, radius: number): string {
  return `M ${x} ${y} H ${x + w} V ${y + h - radius} Q ${x + w} ${y + h} ${x + w - radius} ${y + h} H ${x + radius} Q ${x} ${y + h} ${x} ${y + h - radius} Z`;
}

export function PianoKeyboard({
  notes,
  group,
  active,
}: {
  notes: string[];
  group: Group | "chromatic";
  active: boolean;
}) {
  const midis = voicedMidis(notes);
  const start = keyboardStart(midis);
  const root = midis[0];
  const lit = new Set(midis);
  const whites: number[] = [];
  for (let midi = start; midi < start + 24; midi += 1) {
    if (WHITE.has(midi % 12)) whites.push(midi);
  }
  const whiteW = (312 - 13) / 14;
  const whiteH = 88;
  const blackW = 13;
  const blackH = 54;
  const color = groupVar(group);
  const blacks = Array.from({ length: 24 }, (_, index) => start + index).filter((midi) => !WHITE.has(midi % 12));

  return (
    <svg className="keyboard" viewBox="0 0 312 88" width="312" height="88" role="img" aria-label="Tecladinho do voicing" data-testid="piano">
      <rect width="312" height="88" fill="var(--color-bg)" />
      {whites.map((midi, index) => {
        const x = index * (whiteW + 1);
        const on = lit.has(midi);
        return (
          <g key={midi} data-midi={midi} data-lit={on ? "true" : "false"} data-root={midi === root ? "true" : "false"}>
            <path d={keyPath(x, 0, whiteW, whiteH, 3)} fill={on ? color : "var(--color-key-white)"} fillOpacity={on && !active ? 0.7 : 1} />
            {on && midi === root ? <circle cx={x + whiteW / 2} cy={whiteH * (5 / 6)} r={2.5} fill="var(--color-bg)" /> : null}
          </g>
        );
      })}
      {blacks.map((midi) => {
        const whiteIndex = whites.findIndex((white) => white === midi - 1);
        if (whiteIndex < 0) return null;
        const right = (whiteIndex + 1) * (whiteW + 1) - 1;
        const x = right - blackW / 2;
        const on = lit.has(midi);
        return (
          <g key={midi} data-midi={midi} data-lit={on ? "true" : "false"} data-root={midi === root ? "true" : "false"}>
            <path d={keyPath(x, 0, blackW, blackH, 3)} fill={on ? color : "var(--color-key-black)"} fillOpacity={on && !active ? 0.7 : 1} />
            {on && midi === root ? <circle cx={x + blackW / 2} cy={blackH * (5 / 6)} r={2.5} fill="var(--color-bg)" /> : null}
          </g>
        );
      })}
    </svg>
  );
}
