import { describe, expect, it } from "vitest";
import css from "./modern.css?raw";

function tokens(selector: string): Record<string, string> {
  const start = css.indexOf(`${selector} {`);
  const block = css.slice(start, css.indexOf("}", start));
  return Object.fromEntries([...block.matchAll(/(--[\w-]+):\s*(#[0-9a-f]{6});/gi)].map((m) => [m[1], m[2]]));
}

function luminance(hex: string): number {
  const [r, g, b] = [1, 3, 5].map((i) => {
    const c = parseInt(hex.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrast(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

const light = tokens('[data-style="modern"]');
const dark = { ...light, ...tokens('[data-style="modern"][data-scheme="dark"]') };

describe.each([
  ["light", light],
  ["dark", dark],
])("Modern %s scheme", (_, t) => {
  const backgrounds = ["--app-bg", "--surface", "--surface-raised", "--surface-sunken", "--surface-inset"];

  it.each(["--text", "--text-muted", "--text-subtle", "--sidebar-text"])(
    "%s reads at 4.5:1 on every surface",
    (text) => {
      for (const bg of backgrounds) expect(contrast(t[text], t[bg]), `${text} on ${bg}`).toBeGreaterThanOrEqual(4.5);
    },
  );

  it("control outlines reach 3:1 against the page and surfaces", () => {
    for (const bg of ["--app-bg", "--surface", "--surface-raised"]) {
      expect(contrast(t["--border-strong"], t[bg]), bg).toBeGreaterThanOrEqual(3);
    }
  });

  it("dividers stay visible", () => {
    expect(contrast(t["--border"], t["--surface"])).toBeGreaterThanOrEqual(1.5);
  });
});
