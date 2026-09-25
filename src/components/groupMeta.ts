import type { Group } from "../theory/types";

export const GROUP_COLOR: Record<Group | "chromatic", string> = {
  tonic: "#e3c17a",
  subdominant: "#7fbfb4",
  dominant: "#e39476",
  secondary: "#b4a6e2",
  borrowed: "#8aafdc",
  pivot: "#e3a8b8",
  chromatic: "#b7b1a6",
};

export const GROUP_LABEL: Record<Group | "chromatic", string> = {
  tonic: "Tônica",
  subdominant: "Subdominante",
  dominant: "Dominante",
  secondary: "Dominante secundária",
  borrowed: "Empréstimo modal",
  pivot: "Modulação",
  chromatic: "Cromático",
};

export function pivotCaption(kind: "relative" | "parallel" | "fifth-up" | "fifth-down"): string {
  switch (kind) {
    case "relative":
      return "relativo";
    case "parallel":
      return "paralelo";
    case "fifth-up":
      return "quinta ↑";
    case "fifth-down":
      return "quinta ↓";
  }
}
