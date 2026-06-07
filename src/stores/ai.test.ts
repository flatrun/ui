import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAIStore } from "./ai";

vi.mock("@/services/api", () => ({
  aiApi: {
    status: vi.fn(),
  },
}));

describe("ai store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  it("caches the status after the first fetch", async () => {
    const { aiApi } = await import("@/services/api");
    vi.mocked(aiApi.status).mockResolvedValue({ data: { enabled: true, model: "llama3" } } as any);

    const store = useAIStore();
    await store.fetchStatus();
    await store.fetchStatus();

    expect(aiApi.status).toHaveBeenCalledTimes(1);
    expect(store.status?.enabled).toBe(true);
    expect(store.status?.model).toBe("llama3");
  });

  it("treats a failed status fetch as disabled", async () => {
    const { aiApi } = await import("@/services/api");
    vi.mocked(aiApi.status).mockRejectedValue(new Error("network"));

    const store = useAIStore();
    await store.fetchStatus();

    expect(store.status?.enabled).toBe(false);
  });

  it("refetches when forced", async () => {
    const { aiApi } = await import("@/services/api");
    vi.mocked(aiApi.status).mockResolvedValue({ data: { enabled: false } } as any);

    const store = useAIStore();
    await store.fetchStatus();
    await store.fetchStatus(true);

    expect(aiApi.status).toHaveBeenCalledTimes(2);
  });
});
