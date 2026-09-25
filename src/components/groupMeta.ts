import type { Group } from "../theory/types";

/** Solid fill for a key that has sounded and gone quiet. */
export function keyLitRestVar(group: Group | "chromatic"): string {
  switch (group) {
    case "secondary":
      return "var(--color-key-lit-rest-secondary)";
    case "borrowed":
      return "var(--color-key-lit-rest-borrowed)";
    case "pivot":
      return "var(--color-key-lit-rest-pivot)";
    default:
      return "var(--color-key-lit-rest-diatonic)";
  }
}

export function groupVar(group: Group | "chromatic"): string {
  switch (group) {
    case "secondary":
      return "var(--color-group-secondary)";
    case "borrowed":
      return "var(--color-group-borrowed)";
    case "pivot":
      return "var(--color-group-pivot)";
    case "chromatic":
      return "var(--color-text-muted)";
    default:
      return "var(--color-group-diatonic)";
  }
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
