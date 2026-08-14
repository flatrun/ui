import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { AxiosAdapter } from "axios";
import { apiClient, resetSessionGate } from "./api";

const ok = (config: Parameters<AxiosAdapter>[0]) =>
  Promise.resolve({ data: {}, status: 200, statusText: "OK", headers: {}, config });

const unauthorized = (config: Parameters<AxiosAdapter>[0]) =>
  Promise.reject(
    Object.assign(new Error("Request failed with status code 401"), {
      config,
      isAxiosError: true,
      response: { data: {}, status: 401, statusText: "Unauthorized", headers: {}, config },
    }),
  );

describe("api client session gate", () => {
  const originalAdapter = apiClient.defaults.adapter;
  let location: { pathname: string; href: string };

  beforeEach(() => {
    resetSessionGate();
    localStorage.clear();
    location = { pathname: "/", href: "/" };
    Object.defineProperty(window, "location", { value: location, writable: true });
  });

  afterEach(() => {
    apiClient.defaults.adapter = originalAdapter;
  });

  const burst = () =>
    Promise.allSettled([
      apiClient.get("/containers"),
      apiClient.get("/deployments"),
      apiClient.get("/stats"),
      apiClient.get("/ai/status"),
      apiClient.get("/cluster/status"),
    ]);

  // The agent counts a run of rejections as an attack and blocks the address, so a stale token
  // must cost one rejection rather than one per call the page makes.
  it("stops the page's other calls once one has been rejected", async () => {
    localStorage.setItem("auth_token", "stale");
    const adapter = vi.fn(unauthorized);
    apiClient.defaults.adapter = adapter as AxiosAdapter;

    const results = await burst();

    expect(adapter).toHaveBeenCalledTimes(1);
    expect(results.every((r) => r.status === "rejected")).toBe(true);
  });

  it("sends the whole page once the session is known good", async () => {
    localStorage.setItem("auth_token", "good");
    const adapter = vi.fn(ok);
    apiClient.defaults.adapter = adapter as AxiosAdapter;

    const results = await burst();

    expect(adapter).toHaveBeenCalledTimes(5);
    expect(results.every((r) => r.status === "fulfilled")).toBe(true);
  });

  it("sends nothing at all when there is no token", async () => {
    const adapter = vi.fn(ok);
    apiClient.defaults.adapter = adapter as AxiosAdapter;

    const results = await burst();

    expect(adapter).not.toHaveBeenCalled();
    expect(results.every((r) => r.status === "rejected")).toBe(true);
  });

  it("takes a rejected session to the login page and drops the token", async () => {
    localStorage.setItem("auth_token", "stale");
    apiClient.defaults.adapter = vi.fn(unauthorized) as AxiosAdapter;

    await burst();

    expect(localStorage.getItem("auth_token")).toBeNull();
    expect(location.href).toBe("/login");
  });

  it("keeps the session when reading the current user is refused", async () => {
    localStorage.setItem("auth_token", "good");
    apiClient.defaults.adapter = ((config: Parameters<AxiosAdapter>[0]) =>
      (config.url || "").startsWith("/users/me") ? unauthorized(config) : ok(config)) as AxiosAdapter;

    const [me, ...rest] = await Promise.allSettled([
      apiClient.get("/users/me"),
      apiClient.get("/deployments"),
      apiClient.get("/stats"),
    ]);

    expect(me.status).toBe("rejected");
    expect(rest.every((r) => r.status === "fulfilled")).toBe(true);
    expect(localStorage.getItem("auth_token")).toBe("good");
    expect(location.href).toBe("/");
  });

  // A page that loaded fine can still be holding a token that lapses while it is open.
  it("gates the next burst again after the first one has drained", async () => {
    localStorage.setItem("auth_token", "good-then-stale");
    const adapter = vi.fn(ok);
    apiClient.defaults.adapter = adapter as AxiosAdapter;
    await burst();

    adapter.mockImplementation(unauthorized);
    const results = await burst();

    expect(adapter).toHaveBeenCalledTimes(6);
    expect(results.every((r) => r.status === "rejected")).toBe(true);
  });
});
