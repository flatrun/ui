import { beforeEach, describe, expect, it } from "vitest";
import { initTheme, useTheme } from "./useTheme";
import { registerTheme } from "@/themes/registry";

const root = () => document.documentElement;

describe("useTheme", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it("starts new users on the FlatRun theme", () => {
    initTheme();
    expect(root().getAttribute("data-theme")).toBe("flatrun");
    expect(root().getAttribute("data-scheme")).toBe("dark");
  });

  it("keeps a previously stored light or dark choice", () => {
    localStorage.setItem("flatrun-theme", "light");
    initTheme();
    expect(root().getAttribute("data-theme")).toBe("light");
    expect(root().getAttribute("data-scheme")).toBe("light");
  });

  it("falls back to the default for an unknown stored theme", () => {
    localStorage.setItem("flatrun-theme", "removed-theme");
    initTheme();
    expect(root().getAttribute("data-theme")).toBe("flatrun");
  });

  it("applies and remembers a registered theme, ignoring unknown ids", () => {
    registerTheme({ id: "test-ocean", label: "Ocean", scheme: "light" });
    const { setTheme, current } = useTheme();

    setTheme("test-ocean");
    expect(root().getAttribute("data-theme")).toBe("test-ocean");
    expect(root().getAttribute("data-scheme")).toBe("light");
    expect(localStorage.getItem("flatrun-theme")).toBe("test-ocean");
    expect(current.value.label).toBe("Ocean");

    setTheme("nope");
    expect(root().getAttribute("data-theme")).toBe("test-ocean");
  });
});
