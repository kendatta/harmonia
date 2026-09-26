export type ThemeName = "dark" | "light";

export const THEME_STORAGE_KEY = "harmonia.theme";

export interface ThemeStorage {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function systemTheme(prefersDark: boolean): ThemeName {
  return prefersDark ? "dark" : "light";
}

/**
 * Saved choice wins only while it differs from the system.
 * A match clears the key so the next system change is followed again.
 */
export function resolveTheme(stored: string | null, system: ThemeName): { theme: ThemeName; persist: ThemeName | null } {
  if ((stored === "light" || stored === "dark") && stored !== system) {
    return { theme: stored, persist: stored };
  }
  return { theme: system, persist: null };
}

export function toggleTheme(current: ThemeName, system: ThemeName): { theme: ThemeName; persist: ThemeName | null } {
  const next: ThemeName = current === "dark" ? "light" : "dark";
  return next === system ? { theme: next, persist: null } : { theme: next, persist: next };
}

export function writeTheme(storage: ThemeStorage, persist: ThemeName | null): void {
  if (persist === null) storage.removeItem(THEME_STORAGE_KEY);
  else storage.setItem(THEME_STORAGE_KEY, persist);
}

export function readStoredTheme(storage: ThemeStorage): string | null {
  try {
    return storage.getItem(THEME_STORAGE_KEY);
  } catch {
    return null;
  }
}

/** Apply the system (and clear a stored choice that now matches it). */
export function syncTheme(storage: ThemeStorage, system: ThemeName): ThemeName {
  const next = resolveTheme(readStoredTheme(storage), system);
  try {
    writeTheme(storage, next.persist);
  } catch {
    // The resolved theme still applies for this page.
  }
  return next.theme;
}

/** Toggle and persist with the L4.1 match rule. */
export function commitToggle(storage: ThemeStorage, current: ThemeName, system: ThemeName): ThemeName {
  const next = toggleTheme(current, system);
  try {
    writeTheme(storage, next.persist);
  } catch {
    // The click still changes the theme in memory.
  }
  return next.theme;
}

export function themeLabel(theme: ThemeName): string {
  return theme === "dark" ? "Usar tema claro" : "Usar tema escuro";
}
