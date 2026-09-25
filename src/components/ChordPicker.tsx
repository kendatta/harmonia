import { useState } from "react";
import { FLAT_ROOTS, QUALITY_OPTIONS, SHARP_ROOTS, displaySymbol, inferKey, keyLabel, musicGlyphs, symbolFrom } from "../theory/chords";
import type { KeyContext, Quality } from "../theory/types";
import { useHarmonyStore } from "../store/useHarmonyStore";
import { Button } from "./ui/button";

export function ChordPicker() {
  const applyStart = useHarmonyStore((state) => state.applyStart);
  const [spelling, setSpelling] = useState<"sharp" | "flat">("sharp");
  const [root, setRoot] = useState("C");
  const [quality, setQuality] = useState<Quality>("maj");
  const [keyTouched, setKeyTouched] = useState(false);
  const [customKey, setCustomKey] = useState<KeyContext>({ tonic: "C", mode: "major" });

  const roots = spelling === "sharp" ? SHARP_ROOTS : FLAT_ROOTS;
  const suggestion = inferKey(root, quality);
  const activeKey = keyTouched ? customKey : suggestion;
  const keyRoots = activeKey.tonic.includes("b") ? FLAT_ROOTS : SHARP_ROOTS;

  return (
    <form
      className="panel"
      data-testid="chord-picker"
      onSubmit={(event) => {
        event.preventDefault();
        applyStart(root, quality, activeKey);
      }}
    >
      <div className="panel-head">
        <h2>Nova partida</h2>
        <p>Escolhe o acorde do centro e o tom em que ele será lido. Isso recomeça o caminho.</p>
      </div>

      <fieldset>
        <legend>Fundamental</legend>
        <div className="segment">
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
        <legend>Tom de referência</legend>
        <div className="key-row">
          <label className="select-wrap">
            <span className="sr-only">Tônica do tom</span>
            <select
              value={activeKey.tonic}
              onChange={(event) => {
                setKeyTouched(true);
                setCustomKey({ tonic: event.target.value, mode: activeKey.mode });
              }}
            >
              {(keyRoots as readonly string[]).map((note) => (
                <option key={note} value={note}>
                  {musicGlyphs(note)}
                </option>
              ))}
            </select>
          </label>
          <div className="segment">
            <Button
              type="button"
              size="sm"
              variant={activeKey.mode === "major" ? "default" : "outline"}
              aria-pressed={activeKey.mode === "major"}
              onClick={() => {
                setKeyTouched(true);
                setCustomKey({ tonic: activeKey.tonic, mode: "major" });
              }}
            >
              Maior
            </Button>
            <Button
              type="button"
              size="sm"
              variant={activeKey.mode === "minor" ? "default" : "outline"}
              aria-pressed={activeKey.mode === "minor"}
              onClick={() => {
                setKeyTouched(true);
                setCustomKey({ tonic: activeKey.tonic, mode: "minor" });
              }}
            >
              Menor
            </Button>
          </div>
        </div>
        <p className="hint">
          Sugestão para {displaySymbol(symbolFrom(root, quality) || root)}: {keyLabel(suggestion)}.
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
