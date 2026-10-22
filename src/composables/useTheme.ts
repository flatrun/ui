import { computed, ref } from "vue";
import { DEFAULT_THEME_ID, getTheme, listThemes, type ThemeDefinition } from "@/themes/registry";

const STORAGE_KEY = "flatrun-theme";

// Module-level singleton so every caller shares one reactive theme.
const theme = ref<string>(DEFAULT_THEME_ID);

function apply(id: string) {
  const definition = getTheme(id) ?? getTheme(DEFAULT_THEME_ID)!;
  const root = document.documentElement;
  root.setAttribute("data-theme", definition.id);
  root.setAttribute("data-scheme", definition.scheme);
  root.style.colorScheme = definition.scheme;
}

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null;
  }
}

function resolveInitial(): string {
  const stored = readStored();
  return getTheme(stored) ? stored! : DEFAULT_THEME_ID;
}

// Call once before mount so the first paint already has the right theme.
export function initTheme() {
  theme.value = resolveInitial();
  apply(theme.value);
}

export function useTheme() {
  const current = computed<ThemeDefinition>(() => getTheme(theme.value) ?? getTheme(DEFAULT_THEME_ID)!);

  function setTheme(id: string) {
    if (!getTheme(id)) return;
    theme.value = id;
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {
      // Storage can be unavailable (private mode); the choice still applies.
    }
    apply(id);
  }

  return { theme, current, themes: listThemes(), setTheme };
}
