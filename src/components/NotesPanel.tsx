import { useMemo } from "react";
import { displayRoman, displaySymbol, formatNotes, qualityLabel } from "../theory/chords";
import { describeChordInKey } from "../theory/continuations";
import { useHarmonyStore } from "../store/useHarmonyStore";
import { GROUP_COLOR, GROUP_LABEL } from "./groupMeta";
import { PianoKeyboard } from "./PianoKeyboard";

export function NotesPanel() {
  const inspected = useHarmonyStore((state) => state.inspected);
  const playbackStep = useHarmonyStore((state) => state.playbackStep);
  const shown = playbackStep ?? inspected;
  const analysis = useMemo(() => describeChordInKey(shown.symbol, shown.key), [shown.symbol, shown.key]);
  const accent = GROUP_COLOR[analysis.group];

  return (
    <section className="panel notes-panel" data-testid="notes-panel">
      <div className="panel-head">
        <h2>Notas</h2>
        <p>{playbackStep ? "Acorde que está soando agora." : "Último acorde tocado."}</p>
      </div>
      <div className="note-hero">
        <span className="note-roman" style={{ color: accent }}>
          {displayRoman(analysis.roman)}
        </span>
        <strong className="note-symbol">{displaySymbol(shown.symbol)}</strong>
        <span className="note-quality">{qualityLabel(shown.symbol)}</span>
      </div>
      <p className="note-names" data-testid="note-names">
        {formatNotes(shown.notes)}
      </p>
      <p className="note-meta">
        <span className="swatch" style={{ background: accent }} />
        {GROUP_LABEL[analysis.group]}
      </p>
      <p className="note-detail">{shown.detail}</p>
      <PianoKeyboard notes={shown.notes} accent={accent} />
    </section>
  );
}
