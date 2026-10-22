import { computed } from "vue";
import { EditorView } from "@codemirror/view";
import { oneDark } from "@codemirror/theme-one-dark";
import { useTheme } from "./useTheme";

const lightTheme = EditorView.theme(
  {
    "&": { backgroundColor: "var(--code-bg)", color: "var(--code-text)" },
    ".cm-gutters": {
      backgroundColor: "var(--code-bg)",
      color: "var(--text-subtle)",
      borderRight: "1px solid var(--border-subtle)",
    },
    ".cm-activeLine, .cm-activeLineGutter": { backgroundColor: "var(--accent-subtle)" },
    "&.cm-focused .cm-cursor": { borderLeftColor: "var(--text)" },
  },
  { dark: false },
);

// The code editor follows the light or dark scheme instead of staying dark.
export function useEditorTheme() {
  const { scheme } = useTheme();
  return computed(() => (scheme.value === "dark" ? oneDark : lightTheme));
}

export function cssVar(name: string, fallback: string): string {
  if (typeof window === "undefined") return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallback;
}
