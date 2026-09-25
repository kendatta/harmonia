import { useState, type ReactNode } from "react";
import { Pause, Play } from "lucide-react";
import { displayRoman } from "../theory/chords";
import { useHarmonyStore } from "../store/useHarmonyStore";
import type { Preset, ProgressionStep } from "../store/useHarmonyStore";
import { plainSymbol } from "../theory/symbol";
import { functionName, groupVar } from "./groupMeta";
import { NotesPanel } from "./NotesPanel";
import { useSoundingProgress } from "./useSounding";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

function preview(steps: ProgressionStep[]): string {
  return steps
    .slice(0, 4)
    .map((step) => plainSymbol(step.symbol))
    .join(" · ");
}

function formatRate(rate: number): string {
  return `${rate.toFixed(1).replace(".", ",")}×`;
}

export function Sidebar() {
  const progression = useHarmonyStore((state) => state.progression);
  const presets = useHarmonyStore((state) => state.presets);
  const selectedPresetId = useHarmonyStore((state) => state.selectedPresetId);
  const isPlaying = useHarmonyStore((state) => state.isPlaying);
  const paused = useHarmonyStore((state) => state.paused);
  const playIndex = useHarmonyStore((state) => state.playIndex);
  const playbackRate = useHarmonyStore((state) => state.playbackRate);
  const sounding = useHarmonyStore((state) => state.sounding);
  const selectPreset = useHarmonyStore((state) => state.selectPreset);
  const playToggle = useHarmonyStore((state) => state.playToggle);
  const stopPlayback = useHarmonyStore((state) => state.stopPlayback);
  const setPlaybackRate = useHarmonyStore((state) => state.setPlaybackRate);
  const savePreset = useHarmonyStore((state) => state.savePreset);
  const deletePreset = useHarmonyStore((state) => state.deletePreset);
  const loadPreset = useHarmonyStore((state) => state.loadPreset);
  const storageNotice = useHarmonyStore((state) => state.storageNotice);
  const center = useHarmonyStore((state) => state.center);
  const inspected = useHarmonyStore((state) => state.inspected);
  const progress = useSoundingProgress(sounding);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [flash, setFlash] = useState("");

  const selected: Preset | undefined = presets.find((preset) => preset.id === selectedPresetId);
  const steps = selected?.steps ?? progression;
  const index = playIndex >= 0 ? playIndex : 0;
  const playingNow = (isPlaying || paused) && playIndex >= 0 ? steps[Math.min(playIndex, steps.length - 1)] : null;
  const current = playingNow ?? { symbol: center.symbol, roman: inspected.roman, group: inspected.group };
  const hasSteps = steps.length > 0;

  return (
    <aside className="sidebar" data-testid="presets-panel">
      <NotesPanel />
      <div className="prog-block">
        <p className="section-label">Progressões</p>
        <div className="prog-scroll" data-testid="progression">
          <ProgressionRow
            name="Caminho atual"
            steps={progression}
            count={progression.length}
            selected={selectedPresetId === null}
            onSelect={() => selectPreset(null)}
          />
          {presets.map((preset) => (
            <ProgressionRow
              key={preset.id}
              name={preset.name}
              steps={preset.steps}
              count={preset.steps.length}
              selected={selectedPresetId === preset.id}
              onSelect={() => selectPreset(preset.id)}
              actions={
                selectedPresetId === preset.id ? (
                  <span className="row-actions">
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="row-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        loadPreset(preset.id);
                      }}
                    >
                      Carregar
                    </Button>
                    <Button
                      type="button"
                      size="sm"
                      variant="ghost"
                      className="row-action"
                      onClick={(event) => {
                        event.stopPropagation();
                        deletePreset(preset.id);
                      }}
                    >
                      Excluir
                    </Button>
                  </span>
                ) : null
              }
            />
          ))}
          {presets.length === 0 ? <p className="empty-copy">Nenhuma progressão salva ainda.</p> : null}
        </div>
        <form
          className="save-row"
          onSubmit={(event) => {
            event.preventDefault();
            const ok = savePreset(name);
            if (!ok) {
              setError("Dê um nome à progressão.");
              setFlash("");
              return;
            }
            setName("");
            setError("");
            setFlash(useHarmonyStore.getState().storageNotice ? "" : "Progressão salva neste navegador.");
          }}
        >
          <Input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="Nome da progressão"
            aria-label="Nome da progressão"
            data-testid="preset-name"
          />
          <Button type="submit" variant="outline" data-testid="save-preset">
            Salvar
          </Button>
        </form>
        {error ? <p className="form-error">{error}</p> : null}
        {storageNotice ? (
          <p className="form-flash" data-testid="storage-notice">
            {storageNotice}
          </p>
        ) : flash ? (
          <p className="form-flash">{flash}</p>
        ) : null}
      </div>
      <footer className="transport" data-testid="transport">
        {hasSteps && current ? (
          <>
            <div className="transport-line">
              <span className="section-label">Tocando agora</span>
              <span className="counter">
                {playIndex >= 0 ? playIndex + 1 : 1}/{steps.length}
              </span>
            </div>
            <div className="transport-now" data-testid="now-playing">
              <span className="now-symbol">{plainSymbol(current.symbol)}</span>
              <span className="dot" style={{ background: groupVar(current.group) }} />
              <span className="now-degree">
                {displayRoman(current.roman)} · {functionName(current.group, current.roman)}
              </span>
            </div>
            <div className="segments" aria-hidden="true">
              {steps.map((step, stepIndex) => {
                const fill = stepIndex < index ? 1 : stepIndex === index && (isPlaying || paused) ? progress : 0;
                const past = stepIndex < index;
                return (
                  <div key={`${step.symbol}-${stepIndex}`} className="segment" data-past={past ? "true" : "false"}>
                    <div
                      className="segment-fill"
                      style={{
                        width: `${(past ? 1 : fill) * 100}%`,
                        background: past ? "var(--color-text-muted)" : groupVar(step.group),
                      }}
                    />
                  </div>
                );
              })}
            </div>
          </>
        ) : (
          <p className="empty-copy">Escolha uma progressão</p>
        )}
        <div className="transport-controls">
          <button
            type="button"
            className="play-button"
            onClick={playToggle}
            disabled={!hasSteps}
            data-testid="play-progression"
            aria-label={isPlaying ? "Pausar" : "Tocar"}
          >
            {isPlaying ? <Pause /> : <Play />}
          </button>
          <button
            type="button"
            className="stop-button"
            onClick={stopPlayback}
            disabled={!hasSteps || (!isPlaying && !paused && playIndex < 0)}
            data-testid="stop-playback"
            aria-label="Parar"
          >
            <span className="stop-mark" />
          </button>
          <label className="speed">
            <span className="speed-caption">Velocidade</span>
            <span className="speed-track">
              {[0.5, 1, 1.5, 2].map((mark) => (
                <span
                  key={mark}
                  className="speed-tick"
                  style={{ left: `calc(7px + (100% - 14px) * ${(mark - 0.5) / 1.5})` }}
                />
              ))}
              <span className="speed-active" style={{ width: `${((playbackRate - 0.5) / 1.5) * 100}%` }} />
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.25}
                value={playbackRate}
                disabled={!hasSteps}
                aria-label="Velocidade"
                data-testid="speed"
                onChange={(event) => setPlaybackRate(Number(event.target.value))}
              />
            </span>
            <span className="speed-value">{formatRate(playbackRate)}</span>
          </label>
        </div>
      </footer>
    </aside>
  );
}

function ProgressionRow({
  name,
  steps,
  count,
  selected,
  onSelect,
  actions,
}: {
  name: string;
  steps: ProgressionStep[];
  count: number;
  selected: boolean;
  onSelect: () => void;
  actions?: ReactNode;
}) {
  return (
    <div
      role="button"
      tabIndex={0}
      className={selected ? "prog-row is-selected" : "prog-row"}
      aria-pressed={selected}
      onClick={onSelect}
      onKeyDown={(event) => {
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onSelect();
        }
      }}
    >
      <span className="prog-copy">
        <span className="prog-name">{name}</span>
        <span className="prog-preview">{preview(steps)}</span>
      </span>
      {actions ?? <span className="prog-count">{count}</span>}
    </div>
  );
}
