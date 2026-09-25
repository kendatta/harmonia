import { useState } from "react";
import { FLAT_ROOTS, QUALITY_OPTIONS, SHARP_ROOTS, inferKey, musicGlyphs } from "../theory/chords";
import { keyPhrase } from "../theory/speech";
import type { KeyContext, Quality } from "../theory/types";
import { useHarmonyStore } from "../store/useHarmonyStore";
import { Button } from "./ui/button";

const MAJORS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"] as const;
const EXTRA_MAJORS = ["Gb", "Cb"] as const;
const MINORS = ["A", "E", "B", "F#", "C#", "G#", "D#", "Bb", "F", "C", "G", "D"] as const;

const KEY_OPTIONS: KeyContext[] = [
  ...MAJORS.map((tonic) => ({ tonic, mode: "major" as const })),
  ...EXTRA_MAJORS.map((tonic) => ({ tonic, mode: "major" as const })),
  ...MINORS.map((tonic) => ({ tonic, mode: "minor" as const })),
];

function sameKey(a: KeyContext, b: KeyContext): boolean {
  return a.tonic === b.tonic && a.mode === b.mode;
}

export function ChordPicker({ onApplied }: { onApplied?: () => void }) {
  const applyStart = useHarmonyStore((state) => state.applyStart);
  const [spelling, setSpelling] = useState<"sharp" | "flat">("sharp");
  const [root, setRoot] = useState("C");
  const [quality, setQuality] = useState<Quality>("maj");
  const [keyTouched, setKeyTouched] = useState(false);
  const [customKey, setCustomKey] = useState<KeyContext>({ tonic: "C", mode: "major" });

  const roots = spelling === "sharp" ? SHARP_ROOTS : FLAT_ROOTS;
  const suggestion = inferKey(root, quality);
  const activeKey = keyTouched ? customKey : suggestion;

  return (
    <form
      className="panel"
      data-testid="chord-picker"
      onSubmit={(event) => {
        event.preventDefault();
        applyStart(root, quality, activeKey);
        onApplied?.();
      }}
    >
      <div className="panel-head">
        <h2>Recomeçar</h2>
        <p>Escolha o acorde central e a tonalidade. O caminho atual será apagado.</p>
      </div>

      <fieldset>
        <legend>Fundamental</legend>
        <div className="spelling-toggle">
          <Button type="button" size="sm" variant={spelling === "sharp" ? "subtle" : "ghost"} aria-pressed={spelling === "sharp"} onClick={() => setSpelling("sharp")}>
            Sustenidos
          </Button>
          <Button type="button" size="sm" variant={spelling === "flat" ? "subtle" : "ghost"} aria-pressed={spelling === "flat"} onClick={() => setSpelling("flat")}>
            Bemóis
          </Button>
        </div>
        <div className="root-grid">
          {roots.map((note) => (
            <Button
              key={note}
              type="button"
              size="chip"
              variant={root === note ? "default" : "outline"}
              aria-pressed={root === note}
              onClick={() => setRoot(note)}
            >
              {musicGlyphs(note)}
            </Button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Qualidade</legend>
        <div className="quality-grid">
          {QUALITY_OPTIONS.map((option) => (
            <Button
              key={option.id}
              type="button"
              size="sm"
              variant={quality === option.id ? "default" : "outline"}
              aria-pressed={quality === option.id}
              title={option.hint}
              onClick={() => setQuality(option.id)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      </fieldset>

      <fieldset>
        <legend>Tonalidade</legend>
        <div className="quality-grid">
          {KEY_OPTIONS.map((option) => {
            const active = sameKey(activeKey, option);
            return (
              <Button
                key={`${option.tonic}-${option.mode}`}
                type="button"
                size="sm"
                variant={active ? "default" : "outline"}
                aria-pressed={active}
                data-testid="key-chip"
                onClick={() => {
                  setKeyTouched(true);
                  setCustomKey(option);
                }}
              >
                {keyPhrase(option)}
              </Button>
            );
          })}
        </div>
        <p className="hint">
          Sugestão: {keyPhrase(suggestion)}.
          {keyTouched ? (
            <Button type="button" size="sm" variant="ghost" onClick={() => setKeyTouched(false)}>
              Usar sugestão
            </Button>
          ) : null}
        </p>
      </fieldset>

      <Button type="submit" data-testid="apply-start">
        Definir centro
      </Button>
    </form>
  );
}
