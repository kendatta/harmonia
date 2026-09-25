import { useState } from "react";
import { displayRoman, displaySymbol, keyLabel } from "../theory/chords";
import { useHarmonyStore } from "../store/useHarmonyStore";
import { GROUP_COLOR } from "./groupMeta";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

export function ProgressionBar() {
  const progression = useHarmonyStore((state) => state.progression);
  const playIndex = useHarmonyStore((state) => state.playIndex);
  const isPlaying = useHarmonyStore((state) => state.isPlaying);
  const playingPresetId = useHarmonyStore((state) => state.playingPresetId);
  const savePreset = useHarmonyStore((state) => state.savePreset);
  const [name, setName] = useState("");
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const highlight = isPlaying && !playingPresetId;

  return (
    <section className="panel" data-testid="progression">
      <div className="panel-head">
        <h2>Caminho</h2>
        <p>Cada acorde escolhido entra na progressão, com a função que tinha no momento do passo.</p>
      </div>
      <ol className="chips">
        {progression.map((step, index) => {
          const previous = progression[index - 1];
          const changedKey = !previous || previous.key.tonic !== step.key.tonic || previous.key.mode !== step.key.mode;
          const on = highlight && playIndex === index;
          return (
            <li key={`${step.symbol}-${index}`} className={on ? "chip is-on" : "chip"} style={{ borderColor: GROUP_COLOR[step.group] }} data-testid={`step-${index}`}>
              <span className="chip-roman" style={{ color: GROUP_COLOR[step.group] }}>
                {displayRoman(step.roman)}
              </span>
              <span className="chip-symbol">{displaySymbol(step.symbol)}</span>
              {changedKey || step.group === "pivot" ? <span className="chip-key">{keyLabel(step.key)}</span> : null}
            </li>
          );
        })}
      </ol>
      <form
        className="save-row"
        onSubmit={(event) => {
          event.preventDefault();
          if (!name.trim()) {
            setSaved(false);
            setError("Dê um nome à predefinição.");
            return;
          }
          const ok = savePreset(name);
          if (!ok) return;
          setName("");
          setError("");
          setSaved(true);
          window.setTimeout(() => setSaved(false), 2200);
        }}
      >
        <Input
          value={name}
          onChange={(event) => {
            setName(event.target.value);
            if (error) setError("");
          }}
          placeholder="Nome da predefinição"
          aria-label="Nome da predefinição"
          aria-invalid={error ? true : undefined}
          data-testid="preset-name"
        />
        <Button type="submit" data-testid="save-preset">
          Salvar
        </Button>
      </form>
      {error ? <p className="form-error">{error}</p> : null}
      {saved ? <p className="form-ok">Predefinição salva neste navegador.</p> : null}
    </section>
  );
}
