import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import DeploymentHealthSummary from "./DeploymentHealthSummary.vue";
import { observabilityApi } from "@/services/observability";
import { servingApi } from "@/services/api";

vi.mock("@/services/observability", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/observability")>();
  return {
    ...actual,
    observabilityApi: { health: vi.fn(), latest: vi.fn() },
  };
});

vi.mock("@/services/api", () => ({
  servingApi: { series: vi.fn() },
}));

const healthy = [{ container: "shop-web", deployment: "shop", status: "healthy" }];

const metrics = [
  {
    deployment: "shop",
    containers: [
      {
        container: "shop-web",
        metrics: {
          "container.cpu.usage": 12.5,
          "container.memory.usage": 500,
          "container.memory.limit": 1000,
        },
        updated: "2026-07-15T10:00:00Z",
      },
    ],
  },
];

const quiet = [{ time: "2026-07-15T10:00:00Z", requests: 100, errors: 0, avg_time_ms: 20, p95_time_ms: 80 }];

const mountSummary = (props: Record<string, unknown> = {}) =>
  mount(DeploymentHealthSummary, {
    props: { deploymentName: "shop", status: "running", ...props },
  });

describe("DeploymentHealthSummary", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(observabilityApi.health).mockResolvedValue({ data: healthy } as any);
    vi.mocked(observabilityApi.latest).mockResolvedValue({ data: metrics } as any);
    vi.mocked(servingApi.series).mockResolvedValue({ data: { deployment: "shop", since: "1h", points: quiet } } as any);
  });

  it("leads with a verdict, not a grid of numbers", async () => {
    const wrapper = mountSummary();
    await flushPromises();

    expect(wrapper.text()).toContain("Healthy");
    expect(wrapper.text()).toContain("100 requests in the last hour");
    // The numbers are still there, under the verdict.
    expect(wrapper.text()).toContain("12.5%");
    expect(wrapper.text()).toContain("50%");
  });

  it("names the container failing its health check", async () => {
    vi.mocked(observabilityApi.health).mockResolvedValue({
      data: [{ container: "shop-db", deployment: "shop", status: "unhealthy" }],
    } as any);

    const wrapper = mountSummary();
    await flushPromises();

    expect(wrapper.text()).toContain("Needs attention");
    expect(wrapper.text()).toContain("shop-db is failing its health check");
  });

  // A container can pass its health check while every request it answers fails.
  it("reports errors even when the containers are healthy", async () => {
    vi.mocked(servingApi.series).mockResolvedValue({
      data: {
        deployment: "shop",
        since: "1h",
        points: [{ time: "2026-07-15T10:00:00Z", requests: 100, errors: 40, avg_time_ms: 20, p95_time_ms: 80 }],
      },
    } as any);

    const wrapper = mountSummary();
    await flushPromises();

    expect(wrapper.text()).toContain("Serving errors");
    expect(wrapper.text()).toContain("40.0% of requests failed");
  });

  it("says a stopped deployment is stopped rather than healthy", async () => {
    const wrapper = mountSummary({ status: "stopped" });
    await flushPromises();

    expect(wrapper.text()).toContain("Not running");
  });

  it("still summarises when a source is unavailable", async () => {
    // Traffic logging is optional; the rest of the summary should survive it being off.
    vi.mocked(servingApi.series).mockRejectedValue({ response: { status: 503 } });

    const wrapper = mountSummary();
    await flushPromises();

    expect(wrapper.text()).toContain("Healthy");
    expect(wrapper.text()).toContain("12.5%");
  });
});
