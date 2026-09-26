import { useEffect, useState } from "react";
import { getEngine, getSoundChoice, subscribeEngine, subscribeSoundChoice, type Engine, type SoundChoice } from "../audio/piano";

export function useEngine(): Engine {
  const [engine, setEngine] = useState<Engine>(getEngine());
  useEffect(() => subscribeEngine(setEngine), []);
  return engine;
}

export function useSoundChoice(): SoundChoice {
  const [choice, setChoice] = useState<SoundChoice>(getSoundChoice());
  useEffect(() => subscribeSoundChoice(setChoice), []);
  return choice;
}
