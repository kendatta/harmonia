// src/theme/tokens.ts — única fonte de cor/tipo/espaço
export const color = {
  bg: "#0E0F11",
  surface: "#16181B",
  surfaceRaised: "#1D2024",
  line: "#2A2E33",
  lineStrong: "#3A3F46",
  text: "#ECEDEE",
  textSecondary: "#A1A6AD",
  textMuted: "#8A9098",
  keyWhite: "#E6E3DC",
  keyBlack: "#1A1C1F",
  group: { diatonic: "#E8E1D0", secondary: "#E3A857", borrowed: "#7FA9E3", pivot: "#62C2A8" },
} as const;

export const space = { 1: 4, 2: 8, 3: 12, 4: 16, 5: 24, 6: 32, 7: 48, 8: 64 } as const;

export const radius = { sm: 4, md: 6, lg: 10, pill: 999 } as const;

export const motion = { fast: 0.12, base: 0.2, move: 0.42, ease: [0.22, 1, 0.36, 1] as const } as const;

export const opacity = { disabled: 0.4, restStroke: 0.55 } as const;

/** Popovers are the only elevation allowed to use a shadow. */
export const shadow = { popover: "0 8px 24px rgba(0,0,0,.45)" } as const;
