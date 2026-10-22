import { computed, ref } from "vue";
import {
  DEFAULT_STYLE_ID,
  SCHEME_PREFERENCES,
  getStyle,
  listStyles,
  type ColorScheme,
  type SchemePreference,
  type StyleDefinition,
} from "@/themes/registry";

const STYLE_KEY = "flatrun-style";
const SCHEME_KEY = "flatrun-scheme";
const LEGACY_KEY = "flatrun-theme";

// Module-level singletons so every caller shares one reactive choice.
const style = ref<string>(DEFAULT_STYLE_ID);
const schemePreference = ref<SchemePreference>("system");
const systemScheme = ref<ColorScheme>("light");

const scheme = computed<ColorScheme>(() =>
  schemePreference.value === "system" ? systemScheme.value : schemePreference.value,
);

function apply() {
  const root = document.documentElement;
  root.setAttribute("data-style", style.value);
  root.setAttribute("data-scheme", scheme.value);
  root.style.colorScheme = scheme.value;
}

function read(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function write(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable (private mode); the choice still applies.
  }
}

// Before styles existed a single theme id held both look and scheme.
const LEGACY_THEMES: Record<string, { style: string; scheme: SchemePreference }> = {
  light: { style: "classic", scheme: "light" },
  dark: { style: "classic", scheme: "dark" },
  flatrun: { style: "modern", scheme: "dark" },
};

function resolveInitial(): { style: string; scheme: SchemePreference } {
  const legacy = LEGACY_THEMES[read(LEGACY_KEY) ?? ""];
  const storedStyle = read(STYLE_KEY);
  const storedScheme = read(SCHEME_KEY) as SchemePreference | null;
  return {
    style: getStyle(storedStyle) ? storedStyle! : (legacy?.style ?? DEFAULT_STYLE_ID),
    scheme: storedScheme && SCHEME_PREFERENCES.includes(storedScheme) ? storedScheme : (legacy?.scheme ?? "system"),
  };
}

function watchSystemScheme() {
  if (typeof window === "undefined" || !window.matchMedia) return;
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  systemScheme.value = query.matches ? "dark" : "light";
  query.addEventListener?.("change", (e) => {
    systemScheme.value = e.matches ? "dark" : "light";
    apply();
  });
}

// Call once before mount so the first paint already has the right look.
export function initTheme() {
  watchSystemScheme();
  const initial = resolveInitial();
  style.value = initial.style;
  schemePreference.value = initial.scheme;
  apply();
}

export function useTheme() {
  const current = computed<StyleDefinition>(() => getStyle(style.value) ?? getStyle(DEFAULT_STYLE_ID)!);

  function setStyle(id: string) {
    if (!getStyle(id)) return;
    style.value = id;
    write(STYLE_KEY, id);
    apply();
  }

  function setScheme(preference: SchemePreference) {
    if (!SCHEME_PREFERENCES.includes(preference)) return;
    schemePreference.value = preference;
    write(SCHEME_KEY, preference);
    apply();
  }

  return { style, schemePreference, scheme, current, styles: listStyles(), setStyle, setScheme };
}
