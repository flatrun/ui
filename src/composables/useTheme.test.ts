import { beforeEach, describe, expect, it, vi } from "vitest";
import { initTheme, useTheme } from "./useTheme";

const root = () => document.documentElement;

function systemPrefersDark(dark: boolean) {
  vi.stubGlobal(
    "matchMedia",
    vi.fn(() => ({ matches: dark, addEventListener: vi.fn() })),
  );
}

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
    vi.unstubAllGlobals();
    systemPrefersDark(false);
  });

  it("starts new users on Birch following the system scheme", () => {
    systemPrefersDark(true);
    initTheme();
    expect(root().getAttribute("data-style")).toBe("modern");
    expect(root().getAttribute("data-scheme")).toBe("dark");
    expect(useTheme().schemePreference.value).toBe("system");
  });

  it.each([
    ["light", "classic", "light"],
    ["dark", "classic", "dark"],
    ["flatrun", "modern", "dark"],
  ])("carries an earlier %s theme over as %s %s", (legacy, style, scheme) => {
    localStorage.setItem("flatrun-theme", legacy);
    initTheme();
    expect(root().getAttribute("data-style")).toBe(style);
    expect(root().getAttribute("data-scheme")).toBe(scheme);
  });

  it("falls back to the default for an unknown stored style", () => {
    localStorage.setItem("flatrun-style", "removed-style");
    initTheme();
    expect(root().getAttribute("data-style")).toBe("modern");
  });

  it("applies and remembers a style and a scheme, ignoring unknown values", () => {
    initTheme();
    const { setStyle, setScheme, current, scheme } = useTheme();

    setStyle("classic");
    setScheme("dark");
    expect(root().getAttribute("data-style")).toBe("classic");
    expect(root().getAttribute("data-scheme")).toBe("dark");
    expect(current.value.layout).toBe("oak");
    expect(root().getAttribute("data-layout")).toBe("oak");
    expect(localStorage.getItem("flatrun-style")).toBe("classic");
    expect(localStorage.getItem("flatrun-scheme")).toBe("dark");

    setStyle("nope");
    setScheme("sepia" as never);
    expect(root().getAttribute("data-style")).toBe("classic");
    expect(scheme.value).toBe("dark");
  });

  it("prefers a stored style over an earlier theme", () => {
    localStorage.setItem("flatrun-theme", "light");
    localStorage.setItem("flatrun-style", "modern");
    localStorage.setItem("flatrun-scheme", "dark");
    initTheme();
    expect(root().getAttribute("data-style")).toBe("modern");
    expect(root().getAttribute("data-scheme")).toBe("dark");
  });
});
