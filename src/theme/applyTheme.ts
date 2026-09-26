import { radius, space } from "./tokens";

/**
 * Colors live in index.css under `[data-theme]`, so the inline script in
 * index.html can choose the theme before the first paint. Setting them here
 * would pin the dark palette as inline styles and ignore the attribute.
 */
export function applyTheme(root: HTMLElement = document.documentElement): void {
  const vars: Record<string, string> = {};
  for (const [step, value] of Object.entries(space)) vars[`--space-${step}`] = `${value}px`;
  for (const [name, value] of Object.entries(radius)) vars[`--radius-${name}`] = `${value}px`;
  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
}
