import { useEffect, useState } from "react";
import { Navigator } from "./components/Navigator";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { useHarmonyStore } from "./store/useHarmonyStore";

function AuditClock() {
  const enabled = new URLSearchParams(window.location.search).get("audit") === "1";
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    if (!enabled) return;
    const origin = performance.now();
    let frame = 0;
    const tick = () => {
      setSeconds((performance.now() - origin) / 1000);
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, [enabled]);

  if (!enabled) return null;
  return (
    <div className="audit-clock" data-testid="audit-clock">
      {seconds.toFixed(2)}s
    </div>
  );
}

export default function App() {
  const back = useHarmonyStore((state) => state.back);
  const playToggle = useHarmonyStore((state) => state.playToggle);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = target && (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.tagName === "SELECT" || target.isContentEditable);
      if (typing) return;
      if (event.key === "Backspace") {
        event.preventDefault();
        back();
      }
      if (event.key === " " && !target?.closest("button, [role='button']")) {
        event.preventDefault();
        playToggle();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [back, playToggle]);

  return (
    <div className="app-shell">
      <AuditClock />
      <TopBar />
      <main className="workspace">
        <Navigator />
        <Sidebar />
      </main>
    </div>
  );
}
