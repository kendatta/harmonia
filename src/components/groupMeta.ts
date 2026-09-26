import type { Group } from "../theory/types";

type ScaleName = "diatonic" | "secondary" | "borrowed" | "pivot";

function scaleName(group: Group | "chromatic"): ScaleName {
  if (group === "secondary" || group === "borrowed" || group === "pivot") return group;
  return "diatonic";
}

export function groupVar(group: Group | "chromatic"): string {
  if (group === "chromatic") return "var(--color-text-muted)";
  return `var(--color-group-${scaleName(group)})`;
}

export function groupLineVar(group: Group | "chromatic"): string {
  if (group === "chromatic") return "var(--color-text-muted)";
  return `var(--color-group-line-${scaleName(group)})`;
}

export function groupLineRecededVar(group: Group | "chromatic"): string {
  return `var(--color-group-line-receded-${scaleName(group)})`;
}

export function groupTintVar(group: Group | "chromatic"): string {
  return `var(--color-group-tint-${scaleName(group)})`;
}

/** Key fill while the chord is sounding. Dark matches the group color. */
export function keyLitVar(group: Group | "chromatic"): string {
  return `var(--color-key-lit-${scaleName(group)})`;
}

/** Solid fill for a key that has sounded and gone quiet. */
export function keyLitRestVar(group: Group | "chromatic"): string {
  return `var(--color-key-lit-rest-${scaleName(group)})`;
}

export function familyName(group: Group | "chromatic", roman?: string): string {
  if (roman === "VII") return "Diatônico";
  if (group === "secondary") return "Dom. secundária";
  if (group === "borrowed") return "Emprestado";
  if (group === "pivot") return "Pivô";
  if (group === "chromatic") return "Cromático";
  return "Diatônico";
}

export function functionName(group: Group | "chromatic", roman?: string): string {
  if (roman === "VII") return "Diatônico";
  switch (group) {
    case "tonic":
      return "Tônica";
    case "subdominant":
      return "Subdominante";
    case "dominant":
      return "Dominante";
    case "secondary":
      return "Dom. secundária";
    case "borrowed":
      return "Emprestado";
    case "pivot":
      return "Pivô";
    default:
      return "Cromático";
  }
}

export const LEGEND = [
  { id: "diatonic", label: "Diatônicos", color: "var(--color-group-diatonic)" },
  { id: "secondary", label: "Dom. secundárias", color: "var(--color-group-secondary)" },
  { id: "borrowed", label: "Emprestados", color: "var(--color-group-borrowed)" },
  { id: "pivot", label: "Pivôs", color: "var(--color-group-pivot)" },
] as const;
