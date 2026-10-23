import { flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { describe, expect, it, vi } from "vitest";
import deploymentsFixture from "@/components/birch/fixtures/deployments.json";
import { deploymentsApi, volumesApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth";
import { useSearchIndex } from "./search";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return { ...actual, deploymentsApi: { list: vi.fn() }, volumesApi: { list: vi.fn() } };
});

describe("useSearchIndex", () => {
  it("offers projects before a slower source has answered", async () => {
    vi.mocked(deploymentsApi.list).mockResolvedValue({ data: deploymentsFixture } as any);
    vi.mocked(volumesApi.list).mockReturnValue(new Promise(() => {}));
    const pinia = createTestingPinia({ createSpy: vi.fn });
    vi.mocked(useAuthStore(pinia).hasPermission).mockImplementation(
      (p) => p === "deployments:read" || p === "volumes:read",
    );

    const index = useSearchIndex();
    void index.load();
    await flushPromises();

    expect(index.search("hello-web").map((e) => e.label)).toContain("hello-web");
  });
});
