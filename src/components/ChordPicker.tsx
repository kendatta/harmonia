import { useState } from "react";
import { FLAT_ROOTS, PICKER_MAJORS, PICKER_MINORS, QUALITY_OPTIONS, SHARP_ROOTS, musicGlyphs, pickerKeyForQuality, pickerSuggestion, toPickerKey } from "../theory/chords";
import { keyPhrase, solfegePitch } from "../theory/speech";
import type { KeyContext, Mode, Quality } from "../theory/types";
import { useHarmonyStore } from "../store/useHarmonyStore";
import { Button } from "./ui/button";

export function ChordPicker({ onApplied }: { onApplied?: () => void }) {
  const applyStart = useHarmonyStore((state) => state.applyStart);
  const [spelling, setSpelling] = useState<"sharp" | "flat">("sharp");
  const [root, setRoot] = useState("C");
  const [quality, setQuality] = useState<Quality>("maj");
  const [selected, setSelected] = useState<KeyContext>({ tonic: "C", mode: "major" });
  const [manualKey, setManualKey] = useState(false);

  const roots = spelling === "sharp" ? SHARP_ROOTS : FLAT_ROOTS;
  const suggestion = pickerSuggestion(root, quality);
  const tonics = selected.mode === "major" ? PICKER_MAJORS : PICKER_MINORS;

  const chooseRoot = (note: string) => {
    setRoot(note);
    setManualKey(false);
    setSelected(pickerSuggestion(note, quality));
  };

  const chooseQuality = (next: Quality) => {
    setQuality(next);
    setSelected((current) => pickerKeyForQuality(manualKey, current, root, next));
  };

  const chooseMode = (mode: Mode) => {
    setSelected(toPickerKey({ tonic: selected.tonic, mode }));
  };

  return (
    <form
      className="picker-form"
      data-testid="chord-picker"
      onSubmit={(event) => {
        event.preventDefault();
        applyStart(root, quality, selected);
        onApplied?.();
      }}
    >
      <div className="picker-body">
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
                onClick={() => chooseRoot(note)}
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
                onClick={() => chooseQuality(option.id)}
              >
                {option.label}
              </Button>
            ))}
          </div>
        </fieldset>

        <fieldset>
          <legend>Tonalidade</legend>
          <div className="mode-toggle" role="group" aria-label="Modo">
            <button type="button" className="mode-option" aria-pressed={selected.mode === "major"} data-testid="mode-major" onClick={() => chooseMode("major")}>
              Maior
            </button>
            <button type="button" className="mode-option" aria-pressed={selected.mode === "minor"} data-testid="mode-minor" onClick={() => chooseMode("minor")}>
              Menor
            </button>
          </div>
          <p className="suggestion" data-testid="key-suggestion">
            Sugestão para {musicGlyphs(root)}: {keyPhrase(suggestion)}.
          </p>
          <div className="root-grid">
            {tonics.map((tonic) => {
              const active = selected.tonic === tonic;
              return (
                <Button
                  key={tonic}
                  type="button"
                  size="chip"
                  variant={active ? "default" : "outline"}
                  aria-pressed={active}
                  data-testid="key-chip"
                  data-tonic={tonic}
                  onClick={() => {
                    setManualKey(true);
                    setSelected({ tonic, mode: selected.mode });
                  }}
                >
                  {solfegePitch(tonic)}
                </Button>
              );
            })}
          </div>
        </fieldset>
      </div>

      <div className="picker-footer">
        <Button type="submit" className="picker-apply" data-testid="apply-start">
          Definir centro
        </Button>
      </div>
    </form>
  );
}
