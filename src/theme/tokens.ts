// src/theme/tokens.ts — única fonte de cor/tipo/espaço
import type { ThemeName } from "./theme";

type GroupScale = {
  diatonic: string;
  secondary: string;
  borrowed: string;
  pivot: string;
};

export interface ThemeTokens {
  bg: string;
  surface: string;
  surfaceRaised: string;
  overlay: string;
  line: string;
  lineStrong: string;
  text: string;
  textSecondary: string;
  textMuted: string;
  keyWhite: string;
  keyBlack: string;
  onGroup: string;
  onCenterMuted: string;
  group: GroupScale;
  groupLine: GroupScale;
  groupLineReceded: GroupScale;
  groupTint: GroupScale;
  keyLit: GroupScale;
  keyLitRest: GroupScale;
  track: string;
  keyFrame: string;
  keyRoot: string;
  ghost: string;
  segmentTrack: string;
  segmentActive: string;
  shadowPopover: string;
  shadowSegment: string;
  haloOpacity: number;
  centerMetaOpacity: number;
  centerPlayingMetaOpacity: number;
  nodeStrokeOpacity: number;
  nodeStrokeOpacityHover: number;
  nodeStrokeOpacityReceded: number;
  hoverFillOpacity: number;
}

const darkGroup: GroupScale = {
  diatonic: "#E8E1D0",
  secondary: "#E3A857",
  borrowed: "#7FA9E3",
  pivot: "#62C2A8",
};

const darkKeyLitRest: GroupScale = {
  diatonic: "#B2AEA4",
  secondary: "#AE864F",
  borrowed: "#6887B1",
  pivot: "#549988",
};

/** Dark values match the v7 paint: group strokes stay the group color plus the existing opacities. */
const dark: ThemeTokens = {
  bg: "#0E0F11",
  surface: "#16181B",
  surfaceRaised: "#1D2024",
  overlay: "#1D2024",
  line: "#2A2E33",
  lineStrong: "#3A3F46",
  text: "#ECEDEE",
  textSecondary: "#A1A6AD",
  textMuted: "#8A9098",
  keyWhite: "#34383E",
  keyBlack: "#0E0F11",
  onGroup: "#0E0F11",
  onCenterMuted: "#0E0F11",
  group: darkGroup,
  groupLine: darkGroup,
  groupLineReceded: darkGroup,
  groupTint: darkGroup,
  keyLit: darkGroup,
  keyLitRest: darkKeyLitRest,
  track: "#2A2E33",
  keyFrame: "#0E0F11",
  keyRoot: "#0E0F11",
  ghost: "#2A2E33",
  segmentTrack: "#0E0F11",
  segmentActive: "#1D2024",
  shadowPopover: "0 8px 24px rgba(0,0,0,.45)",
  shadowSegment: "none",
  haloOpacity: 0.35,
  centerMetaOpacity: 0.7,
  centerPlayingMetaOpacity: 0.7,
  nodeStrokeOpacity: 1,
  nodeStrokeOpacityHover: 1,
  nodeStrokeOpacityReceded: 0.6,
  hoverFillOpacity: 0.12,
};

const light: ThemeTokens = {
  bg: "#F7F6F3",
  surface: "#FFFFFF",
  surfaceRaised: "#F0EFEB",
  overlay: "#FFFFFF",
  line: "#E4E2DD",
  lineStrong: "#CDCAC3",
  text: "#17191C",
  textSecondary: "#4F545B",
  textMuted: "#686D75",
  keyWhite: "#FFFFFF",
  keyBlack: "#2B2E33",
  onGroup: "#FFFFFF",
  onCenterMuted: "#B4B4B2",
  group: { diatonic: "#4B4439", secondary: "#8C5A12", borrowed: "#2D62A8", pivot: "#1F6E5B" },
  groupLine: { diatonic: "#6D685E", secondary: "#A1793F", borrowed: "#5580B7", pivot: "#4A8979" },
  groupLineReceded: { diatonic: "#767068", secondary: "#A7814A", borrowed: "#6087BB", pivot: "#559081" },
  groupTint: { diatonic: "#E6E4E0", secondary: "#ECE6DD", borrowed: "#E3E7EC", pivot: "#E1E8E4" },
  keyLit: { diatonic: "#817C74", secondary: "#9E7438", borrowed: "#517DB7", pivot: "#458777" },
  keyLitRest: { diatonic: "#95918A", secondary: "#AE8C59", borrowed: "#7094C4", pivot: "#679C8F" },
  track: "#CDCAC3",
  keyFrame: "#CDCAC3",
  keyRoot: "#17191C",
  ghost: "#CDCAC3",
  segmentTrack: "#F0EFEB",
  segmentActive: "#FFFFFF",
  shadowPopover: "0 1px 2px rgba(23,25,28,.06), 0 12px 32px rgba(23,25,28,.12)",
  shadowSegment: "0 1px 2px rgba(23,25,28,.08), inset 0 0 0 1px #E4E2DD",
  haloOpacity: 0.25,
  centerMetaOpacity: 1,
  centerPlayingMetaOpacity: 1,
  nodeStrokeOpacity: 1,
  nodeStrokeOpacityHover: 1,
  nodeStrokeOpacityReceded: 1,
  hoverFillOpacity: 1,
};

export const themes: Record<ThemeName, ThemeTokens> = { dark, light };

/** Dark palette, kept for callers that read a single color table. */
export const color = {
  bg: dark.bg,
  surface: dark.surface,
  surfaceRaised: dark.surfaceRaised,
  line: dark.line,
  lineStrong: dark.lineStrong,
  text: dark.text,
  textSecondary: dark.textSecondary,
  textMuted: dark.textMuted,
  keyWhite: dark.keyWhite,
  keyBlack: dark.keyBlack,
  group: dark.group,
  keyLitRest: dark.keyLitRest,
} as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 } as const;

export const radius = { sm: 4, md: 6, lg: 10, pill: 999 } as const;

export const motion = { fast: 0.12, base: 0.2, move: 0.42, ease: [0.22, 1, 0.36, 1] as const } as const;

export const opacity = { disabled: 0.4, restStroke: 0.55 } as const;

/** Node outline geometry. Both themes use it; only the stroke color changes. */
export const nodeStroke = { normal: 3.5, receded: 2.5 } as const;

/** Popovers are the only elevation allowed to use a shadow. */
export const shadow = { popover: dark.shadowPopover } as const;

/** Custom properties for one theme. index.css must mirror this map. */
export function themeDeclarations(theme: ThemeName): Record<string, string> {
  const t = themes[theme];
  const scale = (prefix: string, colors: GroupScale) => ({
    [`${prefix}-diatonic`]: colors.diatonic,
    [`${prefix}-secondary`]: colors.secondary,
    [`${prefix}-borrowed`]: colors.borrowed,
    [`${prefix}-pivot`]: colors.pivot,
  });
  return {
    "--color-bg": t.bg,
    "--color-surface": t.surface,
    "--color-surface-raised": t.surfaceRaised,
    "--color-overlay": t.overlay,
    "--color-line": t.line,
    "--color-line-strong": t.lineStrong,
    "--color-text": t.text,
    "--color-text-secondary": t.textSecondary,
    "--color-text-muted": t.textMuted,
    "--color-key-white": t.keyWhite,
    "--color-key-black": t.keyBlack,
    "--color-on-group": t.onGroup,
    "--color-on-center-muted": t.onCenterMuted,
    ...scale("--color-group", t.group),
    ...scale("--color-group-line", t.groupLine),
    ...scale("--color-group-line-receded", t.groupLineReceded),
    ...scale("--color-group-tint", t.groupTint),
    ...scale("--color-key-lit", t.keyLit),
    ...scale("--color-key-lit-rest", t.keyLitRest),
    "--color-track": t.track,
    "--color-key-frame": t.keyFrame,
    "--color-key-root": t.keyRoot,
    "--color-ghost": t.ghost,
    "--color-segment-track": t.segmentTrack,
    "--color-segment-active": t.segmentActive,
    "--shadow-popover": t.shadowPopover,
    "--shadow-segment": t.shadowSegment,
    "--halo-opacity": String(t.haloOpacity),
    "--opacity-center-meta": String(t.centerMetaOpacity),
    "--opacity-center-playing-meta": String(t.centerPlayingMetaOpacity),
    "--node-stroke-opacity": String(t.nodeStrokeOpacity),
    "--node-stroke-opacity-hover": String(t.nodeStrokeOpacityHover),
    "--node-stroke-opacity-receded": String(t.nodeStrokeOpacityReceded),
    "--node-hover-fill-opacity": String(t.hoverFillOpacity),
  };
}
