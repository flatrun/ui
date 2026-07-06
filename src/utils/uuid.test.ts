import { describe, it, expect, afterEach } from "vitest";
import { randomUUID } from "./uuid";

const V4 = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const original = globalThis.crypto.randomUUID;

afterEach(() => {
  globalThis.crypto.randomUUID = original;
});

describe("randomUUID", () => {
  it("returns a v4 UUID via crypto.randomUUID when available", () => {
    expect(randomUUID()).toMatch(V4);
  });

  it("falls back to getRandomValues in a non-secure context", () => {
    // Simulate plain HTTP on a LAN address, where crypto.randomUUID is undefined.
    (globalThis.crypto as unknown as { randomUUID: undefined }).randomUUID = undefined;
    const id = randomUUID();
    expect(id).toMatch(V4);
  });

  it("produces distinct values", () => {
    expect(randomUUID()).not.toBe(randomUUID());
  });
});
