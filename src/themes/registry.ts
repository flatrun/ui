export type ColorScheme = "light" | "dark";
export type SchemePreference = ColorScheme | "system";
export type ShellLayout = "classic" | "modern";

export interface StyleDefinition {
  id: string;
  label: string;
  description: string;
  layout: ShellLayout;
}

const styles = new Map<string, StyleDefinition>();

// A style is a registry entry plus a stylesheet scoped to [data-style="<id>"],
// with [data-scheme] selecting its light or dark tokens. Tokens a style leaves
// alone fall back to the defaults in design-system.css.
export function registerStyle(style: StyleDefinition) {
  styles.set(style.id, style);
}

export function listStyles(): StyleDefinition[] {
  return [...styles.values()];
}

export function getStyle(id: string | null | undefined): StyleDefinition | undefined {
  return id ? styles.get(id) : undefined;
}

export const DEFAULT_STYLE_ID = "modern";
export const SCHEME_PREFERENCES: SchemePreference[] = ["light", "dark", "system"];

registerStyle({ id: "modern", label: "Modern", description: "Compact, top navigation", layout: "modern" });
registerStyle({ id: "classic", label: "Classic", description: "Sidebar navigation", layout: "classic" });
