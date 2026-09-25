import { useEffect, useState } from "react";
import { getEngine, subscribeEngine, type Engine } from "../audio/piano";

export function useEngine(): Engine {
  const [engine, setEngine] = useState<Engine>(getEngine());
  useEffect(() => subscribeEngine(setEngine), []);
  return engine;
}

export function engineLabel(engine: Engine): string {
  switch (engine) {
    case "sampler":
      return "Piano acústico";
    case "synth":
      return "Sintetizador";
    case "loading":
      return "Carregando piano…";
    case "idle":
      return "Clique para ouvir";
  }
}
