import { useEffect, useState } from "react";
import { getEngine, subscribeEngine, type Engine } from "../audio/piano";

export function useEngine(): Engine {
  const [engine, setEngine] = useState<Engine>(getEngine());
  useEffect(() => subscribeEngine(setEngine), []);
  return engine;
}
