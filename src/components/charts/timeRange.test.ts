import { describe, expect, it } from "vitest";
import { timeRange } from "./timeRange";

describe("timeRange", () => {
  it("shows one sample on a five-minute window", () => {
    expect(timeRange(1_792_000_000, 1_792_000_000)).toEqual([1_791_999_700, 1_792_000_000]);
  });

  it("keeps the span of several samples", () => {
    expect(timeRange(1_792_000_000, 1_792_000_060)).toEqual([1_792_000_000, 1_792_000_060]);
  });
});
