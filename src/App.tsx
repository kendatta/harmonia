import { useEffect } from "react";
import { Navigator } from "./components/Navigator";
import { Sidebar } from "./components/Sidebar";
import { TopBar } from "./components/TopBar";
import { useHarmonyStore } from "./store/useHarmonyStore";

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
      <TopBar />
      <main className="workspace">
        <Navigator />
        <Sidebar />
      </main>
    </div>
  );
}
