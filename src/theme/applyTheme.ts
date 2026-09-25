import { color, opacity, radius, shadow, space } from "./tokens";

/** Mirrors tokens.ts onto the document so SVG can use fill="var(--color-…)". */
export function applyTheme(root: HTMLElement = document.documentElement): void {
  const vars: Record<string, string> = {
    "--color-bg": color.bg,
    "--color-surface": color.surface,
    "--color-surface-raised": color.surfaceRaised,
    "--color-line": color.line,
    "--color-line-strong": color.lineStrong,
    "--color-text": color.text,
    "--color-text-secondary": color.textSecondary,
    "--color-text-muted": color.textMuted,
    "--color-key-white": color.keyWhite,
    "--color-key-black": color.keyBlack,
    "--color-group-diatonic": color.group.diatonic,
    "--color-group-secondary": color.group.secondary,
    "--color-group-borrowed": color.group.borrowed,
    "--color-group-pivot": color.group.pivot,
    "--color-key-lit-rest-diatonic": color.keyLitRest.diatonic,
    "--color-key-lit-rest-secondary": color.keyLitRest.secondary,
    "--color-key-lit-rest-borrowed": color.keyLitRest.borrowed,
    "--color-key-lit-rest-pivot": color.keyLitRest.pivot,
    "--shadow-popover": shadow.popover,
    "--opacity-disabled": String(opacity.disabled),
    "--opacity-rest-stroke": String(opacity.restStroke),
  };

  for (const [step, value] of Object.entries(space)) vars[`--space-${step}`] = `${value}px`;
  for (const [name, value] of Object.entries(radius)) vars[`--radius-${name}`] = `${value}px`;

  for (const [name, value] of Object.entries(vars)) root.style.setProperty(name, value);
}
