import { useEffect, useState } from "react";
import { commitToggle, syncTheme, systemTheme, themeLabel, type ThemeName } from "./theme";

function readDomTheme(): ThemeName {
  if (typeof document === "undefined") return "dark";
  const attr = document.documentElement.getAttribute("data-theme");
  return attr === "light" || attr === "dark" ? attr : "dark";
}

function publish(next: ThemeName): void {
  const root = document.documentElement;
  root.classList.add("theme-switching");
  root.setAttribute("data-theme", next);
  window.requestAnimationFrame(() => {
    window.requestAnimationFrame(() => root.classList.remove("theme-switching"));
  });
}

export function useTheme(): { theme: ThemeName; toggle: () => void; label: string } {
  const [theme, setTheme] = useState<ThemeName>(readDomTheme);

  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const next = syncTheme(localStorage, systemTheme(media.matches));
      publish(next);
      setTheme(next);
    };
    apply();
    media.addEventListener("change", apply);
    return () => media.removeEventListener("change", apply);
  }, []);

  const toggle = () => {
    const system = systemTheme(window.matchMedia("(prefers-color-scheme: dark)").matches);
    const next = commitToggle(localStorage, theme, system);
    publish(next);
    setTheme(next);
  };

  return { theme, toggle, label: themeLabel(theme) };
}
