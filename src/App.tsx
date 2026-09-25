import { ChordPicker } from "./components/ChordPicker";
import { Legend } from "./components/Legend";
import { Navigator } from "./components/Navigator";
import { NotesPanel } from "./components/NotesPanel";
import { PresetsPanel } from "./components/PresetsPanel";
import { ProgressionBar } from "./components/ProgressionBar";
import { engineLabel, useEngine } from "./components/useEngine";
import { keyLabel } from "./theory/chords";
import { useHarmonyStore } from "./store/useHarmonyStore";
import { Button } from "./components/ui/button";

export default function App() {
  const key = useHarmonyStore((state) => state.key);
  const playbackKey = useHarmonyStore((state) => state.playbackStep?.key);
  const history = useHarmonyStore((state) => state.history);
  const back = useHarmonyStore((state) => state.back);
  const engine = useEngine();
  const shownKey = playbackKey ?? key;

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="brand">
          <p className="kicker">Harmonia</p>
          <h1>Navegador Harmônico</h1>
        </div>
        <p className="lede">O acorde do centro é onde você está. Cada forma ao redor é um caminho para continuar.</p>
        <div className="top-meta">
          <span className="key-pill">Tom · {keyLabel(shownKey)}</span>
          <span className="engine-pill" data-testid="engine-status">
            {engineLabel(engine)}
          </span>
          <Button type="button" variant="outline" onClick={back} disabled={history.length === 0} data-testid="back-button">
            Voltar
          </Button>
        </div>
      </header>
      <main className="workspace">
        <div className="column">
          <ChordPicker />
          <ProgressionBar />
        </div>
        <section className="stage">
          <Navigator />
          <Legend />
        </section>
        <div className="column">
          <NotesPanel />
          <PresetsPanel />
        </div>
      </main>
    </div>
  );
}
