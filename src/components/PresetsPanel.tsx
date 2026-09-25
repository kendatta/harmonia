import { displayRoman, displaySymbol } from "../theory/chords";
import { SPEEDS, useHarmonyStore } from "../store/useHarmonyStore";
import { GROUP_COLOR } from "./groupMeta";
import { Button } from "./ui/button";

function tempoCopy(seconds: number): string {
  const bpm = Math.round(240 / seconds);
  const label = seconds.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  return `${label} s por acorde · ${bpm} BPM`;
}

export function PresetsPanel() {
  const presets = useHarmonyStore((state) => state.presets);
  const seconds = useHarmonyStore((state) => state.secondsPerChord);
  const isPlaying = useHarmonyStore((state) => state.isPlaying);
  const playIndex = useHarmonyStore((state) => state.playIndex);
  const playingPresetId = useHarmonyStore((state) => state.playingPresetId);
  const playbackStep = useHarmonyStore((state) => state.playbackStep);
  const faster = useHarmonyStore((state) => state.faster);
  const slower = useHarmonyStore((state) => state.slower);
  const playProgression = useHarmonyStore((state) => state.playProgression);
  const playPreset = useHarmonyStore((state) => state.playPreset);
  const stop = useHarmonyStore((state) => state.stopPlayback);
  const loadPreset = useHarmonyStore((state) => state.loadPreset);
  const deletePreset = useHarmonyStore((state) => state.deletePreset);
  const atSlowest = seconds >= SPEEDS[SPEEDS.length - 1];
  const atFastest = seconds <= SPEEDS[0];

  return (
    <section className="panel presets-panel" data-testid="presets-panel">
      <div className="panel-head">
        <h2>Predefinições</h2>
        <p>O caminho fica salvo neste navegador. Tocar uma predefinição não apaga o percurso atual.</p>
      </div>

      <div className="transport" data-testid="transport">
        <div className={isPlaying ? "now-playing is-on" : "now-playing"} data-testid="now-playing" aria-live="polite">
          <span className="pulse-dot" />
          {isPlaying && playbackStep ? (
            <span>
              Tocando agora: <strong>{displaySymbol(playbackStep.symbol)}</strong>
              <em> {displayRoman(playbackStep.roman)}</em>
            </span>
          ) : (
            <span>Reprodução parada</span>
          )}
        </div>
        <div className="speed-row">
          <Button type="button" size="sm" variant="outline" onClick={slower} disabled={atSlowest} data-testid="slower">
            Mais lento
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={faster} disabled={atFastest} data-testid="faster">
            Mais rápido
          </Button>
        </div>
        <p className="hint">{tempoCopy(seconds)}. Cada acorde dura um compasso de 4/4.</p>
        {isPlaying ? (
          <Button type="button" variant="subtle" onClick={stop} data-testid="stop-playback">
            Parar
          </Button>
        ) : (
          <Button type="button" onClick={playProgression} data-testid="play-progression">
            Tocar caminho
          </Button>
        )}
      </div>

      {presets.length === 0 ? (
        <p className="empty-presets">Nenhuma predefinição salva. Monte um caminho e dê um nome a ele.</p>
      ) : (
        <ul className="preset-list">
          {presets.map((preset) => {
            const playing = playingPresetId === preset.id;
            return (
              <li key={preset.id} className={playing ? "preset is-playing" : "preset"} data-testid={`preset-${preset.id}`}>
                <div className="preset-copy">
                  <strong>{preset.name}</strong>
                  <span>
                    {preset.steps.length} {preset.steps.length === 1 ? "acorde" : "acordes"}
                  </span>
                </div>
                <div className="preset-score" aria-hidden="true">
                  {preset.steps.map((step, index) => (
                    <span key={`${preset.id}-${index}`} className={playing && playIndex === index ? "score-note is-on" : "score-note"} style={{ color: GROUP_COLOR[step.group] }}>
                      {displaySymbol(step.symbol)}
                    </span>
                  ))}
                </div>
                <div className="preset-actions">
                  <Button type="button" size="sm" variant={playing ? "subtle" : "default"} onClick={() => (playing ? stop() : playPreset(preset.id))}>
                    {playing ? "Parar" : "Tocar"}
                  </Button>
                  <Button type="button" size="sm" variant="outline" onClick={() => loadPreset(preset.id)}>
                    Carregar
                  </Button>
                  <Button type="button" size="sm" variant="ghost" onClick={() => deletePreset(preset.id)}>
                    Excluir
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
