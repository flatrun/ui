export type ColorScheme = "light" | "dark";

export interface ThemeDefinition {
  id: string;
  label: string;
  scheme: ColorScheme;
}

const themes = new Map<string, ThemeDefinition>();

// A theme is a registry entry plus a stylesheet scoped to [data-theme="<id>"].
// Tokens it leaves alone fall back to its scheme's defaults.
export function registerTheme(theme: ThemeDefinition) {
  themes.set(theme.id, theme);
}

export function listThemes(): ThemeDefinition[] {
  return [...themes.values()];
}

export function getTheme(id: string | null | undefined): ThemeDefinition | undefined {
  return id ? themes.get(id) : undefined;
}

export const DEFAULT_THEME_ID = "flatrun";

registerTheme({ id: "flatrun", label: "FlatRun", scheme: "dark" });
registerTheme({ id: "light", label: "Light", scheme: "light" });
registerTheme({ id: "dark", label: "Dark", scheme: "dark" });
