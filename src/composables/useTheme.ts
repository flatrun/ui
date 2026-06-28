import { ref } from "vue";

export type Theme = "light" | "dark";

const STORAGE_KEY = "flatrun-theme";

// Module-level singleton so every caller shares one reactive theme.
const theme = ref<Theme>("light");

function apply(value: Theme) {
  document.documentElement.setAttribute("data-theme", value);
}

function resolveInitial(): Theme {
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored === "light" || stored === "dark") {
    return stored;
  }
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

// Call once before mount so the first paint already has the right theme.
export function initTheme() {
  theme.value = resolveInitial();
  apply(theme.value);
}

export function useTheme() {
  function setTheme(value: Theme) {
    theme.value = value;
    localStorage.setItem(STORAGE_KEY, value);
    apply(value);
  }

  function toggleTheme() {
    setTheme(theme.value === "dark" ? "light" : "dark");
  }

  return { theme, setTheme, toggleTheme };
}
