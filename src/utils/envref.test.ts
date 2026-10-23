import { describe, expect, it } from "vitest";
import { formatReference, hasReference, parseReferences } from "./envref";

describe("envref", () => {
  it("finds every reference in a value", () => {
    const value = "postgres://app:${{ db.PASSWORD }}@${{db.FLATRUN_HOST}}/app";
    expect(hasReference(value)).toBe(true);
    expect(parseReferences(value)).toEqual([
      { deployment: "db", key: "PASSWORD" },
      { deployment: "db", key: "FLATRUN_HOST" },
    ]);
  });

  it("ignores ordinary shell-style variables", () => {
    expect(hasReference("${HOME}/data and $PATH")).toBe(false);
    expect(parseReferences("${{ not valid }}")).toEqual([]);
  });

  it("is stable across repeated checks", () => {
    expect(hasReference("${{ a.B }}")).toBe(true);
    expect(hasReference("${{ a.B }}")).toBe(true);
  });

  it("formats a reference the agent accepts", () => {
    expect(formatReference("my-db", "PASSWORD")).toBe("${{ my-db.PASSWORD }}");
    expect(parseReferences(formatReference("my-db", "PASSWORD"))).toEqual([{ deployment: "my-db", key: "PASSWORD" }]);
  });
});
