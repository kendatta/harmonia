import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { THEME_STORAGE_KEY, commitToggle, resolveTheme, syncTheme, toggleTheme, type ThemeName, type ThemeStorage } from "./theme";
import { themeDeclarations, themes } from "./tokens";

function memoryStorage(initial?: string): ThemeStorage & { dump: () => string | null } {
  let value = initial ?? null;
  return {
    getItem: (key) => (key === THEME_STORAGE_KEY ? value : null),
    setItem: (key, next) => {
      if (key === THEME_STORAGE_KEY) value = next;
    },
    removeItem: (key) => {
      if (key === THEME_STORAGE_KEY) value = null;
    },
    dump: () => value,
  };
}

function cssBlock(source: string, theme: ThemeName): Record<string, string> {
  const pattern =
    theme === "light"
      ? /:root\[data-theme="light"\]\s*\{([^}]+)\}/
      : /:root,\s*:root\[data-theme="dark"\]\s*\{([^}]+)\}/;
  const body = source.match(pattern)?.[1] ?? "";
  const out: Record<string, string> = {};
  for (const line of body.split(";")) {
    const index = line.indexOf(":");
    if (index < 0) continue;
    const name = line.slice(0, index).trim();
    const value = line.slice(index + 1).trim();
    if (name.startsWith("--")) out[name] = value;
  }
  return out;
}

describe("tema", () => {
  it("segue o sistema quando não há escolha salva", () => {
    expect(resolveTheme(null, "light")).toEqual({ theme: "light", persist: null });
    expect(resolveTheme(null, "dark")).toEqual({ theme: "dark", persist: null });
    expect(resolveTheme("sepia", "dark")).toEqual({ theme: "dark", persist: null });
    const storage = memoryStorage();
    expect(syncTheme(storage, "light")).toBe("light");
    expect(storage.dump()).toBeNull();
  });

  it("grava a escolha só quando ela difere do sistema", () => {
    const storage = memoryStorage();
    expect(commitToggle(storage, "dark", "dark")).toBe("light");
    expect(storage.dump()).toBe("light");
    expect(commitToggle(storage, "light", "light")).toBe("dark");
    expect(storage.dump()).toBe("dark");
  });

  it("apaga a chave quando o clique volta a coincidir com o sistema", () => {
    const storage = memoryStorage("light");
    expect(commitToggle(storage, "light", "dark")).toBe("dark");
    expect(storage.dump()).toBeNull();
    expect(toggleTheme("dark", "light")).toEqual({ theme: "light", persist: null });
  });

  it("apaga a chave quando o sistema passa a coincidir com a escolha", () => {
    const storage = memoryStorage("light");
    expect(syncTheme(storage, "dark")).toBe("light");
    expect(storage.dump()).toBe("light");
    expect(syncTheme(storage, "light")).toBe("light");
    expect(storage.dump()).toBeNull();
    expect(syncTheme(storage, "dark")).toBe("dark");
    expect(storage.dump()).toBeNull();
  });

  it("mantém o tema na memória se o navegador recusar a gravação", () => {
    const storage: ThemeStorage = {
      getItem: () => "light",
      setItem: () => {
        throw new Error("quota");
      },
      removeItem: () => {
        throw new Error("quota");
      },
    };
    expect(commitToggle(storage, "dark", "dark")).toBe("light");
    expect(syncTheme(storage, "light")).toBe("light");
  });

  it("espelha os tokens escuros do v7 e a tabela clara", () => {
    expect(themes.dark.groupLine).toEqual(themes.dark.group);
    expect(themes.dark.groupLineReceded).toEqual(themes.dark.group);
    expect(themes.dark.groupTint).toEqual(themes.dark.group);
    expect(themes.dark.keyLit).toEqual(themes.dark.group);
    expect(themes.dark.onGroup).toBe("#0E0F11");
    expect(themes.dark.overlay).toBe(themes.dark.surfaceRaised);
    expect(themes.dark.nodeStrokeWidth).toBe(3.5);
    expect(themes.dark.nodeStrokeWidthReceded).toBe(2.5);
    expect(themes.dark.nodeStrokeOpacity).toBe(1);
    expect(themes.dark.nodeStrokeOpacityReceded).toBe(0.6);
    expect(themes.dark.hoverFillOpacity).toBe(0.12);
    expect(themes.dark.centerMetaOpacity).toBe(0.7);
    expect(themes.dark.haloOpacity).toBe(0.35);
    expect(themes.dark.shadowPopover).toBe("0 8px 24px rgba(0,0,0,.45)");

    expect(themes.light.bg).toBe("#F7F6F3");
    expect(themes.light.surface).toBe("#FFFFFF");
    expect(themes.light.surfaceRaised).toBe("#F0EFEB");
    expect(themes.light.text).toBe("#17191C");
    expect(themes.light.textSecondary).toBe("#4F545B");
    expect(themes.light.textMuted).toBe("#686D75");
    expect(themes.light.onGroup).toBe("#FFFFFF");
    expect(themes.light.onCenterMuted).toBe("#B4B4B2");
    expect(themes.light.group).toEqual({ diatonic: "#4B4439", secondary: "#8C5A12", borrowed: "#2D62A8", pivot: "#1F6E5B" });
    expect(themes.light.groupLine.secondary).toBe("#A1793F");
    expect(themes.light.groupLineReceded.pivot).toBe("#B6CDC5");
    expect(themes.light.keyLit.borrowed).toBe("#517DB7");
    expect(themes.light.keyLitRest.secondary).toBe("#AE8C59");
    expect(themes.light.keyBlack).toBe("#2B2E33");
    expect(themes.light.track).toBe(themes.light.lineStrong);
    expect(themes.light.keyFrame).toBe(themes.light.lineStrong);
    expect(themes.light.keyRoot).toBe(themes.light.text);
    expect(themes.light.ghost).toBe(themes.light.lineStrong);
    expect(themes.light.nodeStrokeWidth).toBe(1.5);
    expect(themes.light.nodeStrokeWidthHover).toBe(2);
    expect(themes.light.nodeStrokeWidthReceded).toBe(1);
    expect(themes.light.haloOpacity).toBe(0.25);
  });

  it("mantém o CSS e o script inicial iguais aos tokens", () => {
    const css = readFileSync(new URL("../index.css", import.meta.url), "utf8");
    const html = readFileSync(new URL("../../index.html", import.meta.url), "utf8");
    expect(cssBlock(css, "dark")).toEqual(themeDeclarations("dark"));
    expect(cssBlock(css, "light")).toEqual(themeDeclarations("light"));

    expect(html).toContain('var key = "harmonia.theme"');
    expect(html).toContain('localStorage.removeItem(key)');
    expect(html).toContain('setAttribute("data-theme", theme)');
    expect(html).toContain('media="(prefers-color-scheme: light)" content="#F7F6F3"');
    expect(html).toContain('media="(prefers-color-scheme: dark)" content="#0E0F11"');
    expect(html).toContain("html[data-theme=\"light\"] { background: #F7F6F3;");
    expect(html).toContain("html[data-theme=\"dark\"] { background: #0E0F11;");
  });
});
