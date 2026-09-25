import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { ArrowLeft, ChevronDown } from "lucide-react";
import { musicGlyphs } from "../theory/chords";
import { polar } from "../theory/layout";
import { keyPhrase } from "../theory/speech";
import { useHarmonyStore } from "../store/useHarmonyStore";
import { useEngine } from "./useEngine";
import { plainSymbol } from "../theory/symbol";
import { ChordPicker } from "./ChordPicker";
import { Button } from "./ui/button";

const MAJORS = ["C", "G", "D", "A", "E", "B", "F#", "Db", "Ab", "Eb", "Bb", "F"] as const;
const MINORS = ["A", "E", "B", "F#", "C#", "G#", "D#", "Bb", "F", "C", "G", "D"] as const;

export function TopBar() {
  const key = useHarmonyStore((state) => state.key);
  const history = useHarmonyStore((state) => state.history);
  const progression = useHarmonyStore((state) => state.progression);
  const isPlaying = useHarmonyStore((state) => state.isPlaying);
  const back = useHarmonyStore((state) => state.back);
  const applyStart = useHarmonyStore((state) => state.applyStart);
  const engine = useEngine();
  const reduced = useReducedMotion() ?? false;
  const [wheelOpen, setWheelOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const wheelRef = useRef<HTMLDivElement | null>(null);
  const pickerRef = useRef<HTMLDivElement | null>(null);
  const trail = progression.slice(-4);

  useEffect(() => {
    const onPointer = (event: MouseEvent) => {
      const target = event.target as Node;
      if (wheelRef.current && !wheelRef.current.contains(target)) setWheelOpen(false);
      if (pickerRef.current && !pickerRef.current.contains(target)) setPickerOpen(false);
    };
    window.addEventListener("mousedown", onPointer);
    return () => window.removeEventListener("mousedown", onPointer);
  }, []);

  return (
    <header className="topbar">
      <div className="top-left">
        <p className="wordmark">Harmonia</p>
        <Button
          type="button"
          variant="ghost"
          className="back"
          onClick={back}
          disabled={history.length === 0 || isPlaying}
          data-testid="back-button"
        >
          <ArrowLeft />
          Voltar
        </Button>
        <p className="trail" aria-label="Últimos acordes">
          {trail.map((step, index) => (
            <span key={`${step.symbol}-${index}`}>
              {index > 0 ? <span className="trail-sep"> › </span> : null}
              {plainSymbol(step.symbol)}
            </span>
          ))}
        </p>
      </div>
      <div className="top-right">
        {engine === "loading" ? (
          <span className="engine" data-testid="engine-status">
            Carregando piano…
          </span>
        ) : null}
        <div className="popover-anchor" ref={pickerRef}>
          <Button type="button" variant="ghost" onClick={() => setPickerOpen((open) => !open)} aria-expanded={pickerOpen}>
            Recomeçar
          </Button>
          {pickerOpen ? (
            <div className="popover popover-wide" role="dialog" aria-label="Recomeçar">
              <ChordPicker onApplied={() => setPickerOpen(false)} />
            </div>
          ) : null}
        </div>
        <div className="popover-anchor" ref={wheelRef}>
          <button type="button" className="key-button" onClick={() => setWheelOpen((open) => !open)} aria-expanded={wheelOpen}>
            <AnimatePresence mode="wait">
              <motion.span
                key={`${key.tonic}-${key.mode}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: reduced ? 0.12 : 0.2 }}
              >
                Tonalidade: {keyPhrase(key)}
              </motion.span>
            </AnimatePresence>
            <ChevronDown size={16} />
          </button>
          {wheelOpen ? (
            <div className="popover wheel-popover" role="dialog" aria-label="Círculo de quintas">
              <svg viewBox="0 0 280 280" width="280" height="280" className="wheel">
                <circle cx="140" cy="140" r="108" className="guide" />
                <circle cx="140" cy="140" r="62" className="guide" />
                {MAJORS.map((tonic, index) => {
                  const point = polar(140, 140, 108, index * 30);
                  const active = key.mode === "major" && key.tonic === tonic;
                  return (
                    <g key={tonic} transform={`translate(${point.x} ${point.y})`} className="wheel-hit">
                      <circle
                        r="16"
                        className={active ? "wheel-node is-active" : "wheel-node"}
                        onClick={() => {
                          applyStart(tonic, "maj", { tonic, mode: "major" });
                          setWheelOpen(false);
                        }}
                      />
                      <text textAnchor="middle" y="4" className="wheel-label">
                        {musicGlyphs(tonic)}
                      </text>
                    </g>
                  );
                })}
                {MINORS.map((tonic, index) => {
                  const point = polar(140, 140, 62, index * 30);
                  const active = key.mode === "minor" && key.tonic === tonic;
                  return (
                    <g key={`${tonic}-m`} transform={`translate(${point.x} ${point.y})`} className="wheel-hit">
                      <circle
                        r="13"
                        className={active ? "wheel-node is-active" : "wheel-node"}
                        onClick={() => {
                          applyStart(tonic, "min", { tonic, mode: "minor" });
                          setWheelOpen(false);
                        }}
                      />
                      <text textAnchor="middle" y="3" className="wheel-label wheel-label-minor">
                        {musicGlyphs(tonic)}m
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
