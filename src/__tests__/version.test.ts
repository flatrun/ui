import { describe, it, expect } from "vitest";
import { compareVersions, isAgentCompatible } from "@/utils/version";

describe("compareVersions", () => {
  it("returns 0 for equal versions", () => {
    expect(compareVersions("1.2.3", "1.2.3")).toBe(0);
  });

  it("returns -1 when a < b", () => {
    expect(compareVersions("0.1.4", "0.1.5")).toBe(-1);
    expect(compareVersions("0.1.9", "0.2.0")).toBe(-1);
    expect(compareVersions("0.9.9", "1.0.0")).toBe(-1);
  });

  it("returns 1 when a > b", () => {
    expect(compareVersions("0.1.5", "0.1.4")).toBe(1);
    expect(compareVersions("1.0.0", "0.9.9")).toBe(1);
  });

  it("handles v prefix", () => {
    expect(compareVersions("v1.0.0", "1.0.0")).toBe(0);
  });

  it("handles wildcard x as infinity", () => {
    expect(compareVersions("0.5.0", "0.x.x")).toBe(-1);
    expect(compareVersions("1.0.0", "0.x.x")).toBe(1);
  });
});

describe("isAgentCompatible", () => {
  it("returns compatible for unknown version", () => {
    const result = isAgentCompatible("unknown");
    expect(result.compatible).toBe(true);
  });

  it("returns compatible for empty version", () => {
    const result = isAgentCompatible("");
    expect(result.compatible).toBe(true);
  });

  it("returns compatible for valid version", () => {
    const result = isAgentCompatible("0.1.5");
    expect(result.compatible).toBe(true);
  });

  it("returns incompatible for old version", () => {
    const result = isAgentCompatible("0.1.3");
    expect(result.compatible).toBe(false);
    expect(result.message).toContain("too old");
  });

  it("returns compatible for minimum version", () => {
    const result = isAgentCompatible("0.1.4");
    expect(result.compatible).toBe(true);
  });

  it("returns incompatible for version beyond max", () => {
    const result = isAgentCompatible("1.0.0");
    expect(result.compatible).toBe(false);
    expect(result.message).toContain("newer than supported");
  });

  it("flags dev versions as incompatible but dismissable", () => {
    const versions = ["dev", "0.1.5-dev", "0.0.1-alpha", "1.0.0-rc.1", "0.2.0-beta", "0.0.0-snapshot"];
    for (const v of versions) {
      const result = isAgentCompatible(v);
      expect(result.compatible).toBe(false);
      expect(result.dev).toBe(true);
      expect(result.message).toContain("development build");
    }
  });
});
