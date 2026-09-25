import { AnimatePresence, motion } from "motion/react";
import { displayRoman, musicGlyphs } from "../theory/chords";
import { describeChordInKey } from "../theory/continuations";
import { intervalLabel, solfegePitch, spokenChord } from "../theory/speech";
import { useHarmonyStore } from "../store/useHarmonyStore";
import { ChordSymbol } from "./ChordSymbol";
import { familyName, groupVar } from "./groupMeta";
import { PianoKeyboard } from "./PianoKeyboard";
import { useSoundingProgress } from "./useSounding";

export function NotesPanel() {
  const center = useHarmonyStore((state) => state.center);
  const key = useHarmonyStore((state) => state.key);
  const inspected = useHarmonyStore((state) => state.inspected);
  const playbackStep = useHarmonyStore((state) => state.playbackStep);
  const isPlaying = useHarmonyStore((state) => state.isPlaying);
  const paused = useHarmonyStore((state) => state.paused);
  const sounding = useHarmonyStore((state) => state.sounding);
  const progress = useSoundingProgress(sounding);
  const overlay = (isPlaying || paused) && playbackStep ? playbackStep : null;
  const shown = overlay ?? inspected ?? { ...describeChordInKey(center.symbol, key), symbol: center.symbol, notes: center.notes, detail: "", key };
  const color = groupVar(shown.group);
  const active = Boolean(sounding && sounding.frozen === undefined && progress < 1);
  const notes = shown.notes.slice(0, 5);
  const root = notes[0] ?? "";

  return (
    <section className="notes" data-testid="notes-panel" aria-label="Acorde">
      <p className="section-label">Acorde</p>
      <AnimatePresence mode="popLayout">
        <motion.div
          key={`${shown.symbol}|${shown.group}|${shown.key.tonic}|${shown.key.mode}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
        >
          <div className="notes-symbol">
            <ChordSymbol symbol={shown.symbol} size={40} />
          </div>
          <p className="notes-context">
            <span className="dot" style={{ background: color }} />
            <span>
              {familyName(shown.group)} · {displayRoman(shown.roman)}
            </span>
          </p>
          <p className="notes-spoken">{spokenChord(shown.symbol)}</p>
          <PianoKeyboard notes={shown.notes} group={shown.group} active={active} />
          <div className="chips" data-testid="note-names">
            {notes.map((note) => (
              <div key={note} className="chip" style={{ borderColor: note === root ? color : "var(--color-line)" }}>
                <span className="chip-letter">{musicGlyphs(note)}</span>
                <span className="chip-solfege">{solfegePitch(note)}</span>
                <span className="chip-interval">{intervalLabel(root, note)}</span>
              </div>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </section>
  );
}
