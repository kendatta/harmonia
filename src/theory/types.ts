export type Mode = "major" | "minor";

export interface KeyContext {
  tonic: string;
  mode: Mode;
}

export type Quality = "maj" | "min" | "7" | "maj7" | "m7" | "dim";

export type Group =
  | "tonic"
  | "subdominant"
  | "dominant"
  | "secondary"
  | "borrowed"
  | "pivot";

export type PivotKind = "relative" | "parallel" | "fifth-up" | "fifth-down";

export interface Continuation {
  id: string;
  symbol: string;
  notes: string[];
  group: Group;
  roman: string;
  detail: string;
  nextKey: KeyContext;
  pivotKind?: PivotKind;
  /** A likely next step from the current chord, drawn a little stronger. */
  strong: boolean;
}

export interface ChordAnalysis {
  roman: string;
  group: Group | "chromatic";
  detail: string;
}
