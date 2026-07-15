import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ServingPanel from "./ServingPanel.vue";
import { servingApi } from "@/services/api";

vi.mock("@/services/api", () => ({
  servingApi: { series: vi.fn() },
}));

// Shaped like what the agent returns from the proxy's own record of each request.
const points = [
  { time: "2026-07-15T10:00:00Z", requests: 100, errors: 0, avg_time_ms: 20, p95_time_ms: 50 },
  { time: "2026-07-15T10:01:00Z", requests: 100, errors: 4, avg_time_ms: 30, p95_time_ms: 1200 },
];

const mountPanel = () =>
  mount(ServingPanel, {
    props: { deploymentName: "shop" },
    global: { stubs: { TimeSeriesChart: { template: "<div class='chart-stub' />" } } },
  });

describe("ServingPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(servingApi.series).mockResolvedValue({ data: { deployment: "shop", since: "1h", points } } as any);
  });

  it("summarises requests, error rate and the worst p95", async () => {
    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.text()).toContain("200");
    // 4 errors in 200 requests.
    expect(wrapper.text()).toContain("2.0%");
    // The worst p95 in the window, rendered in seconds once it passes a second.
    expect(wrapper.text()).toContain("1.20s");
  });

  it("asks for the range the user picks", async () => {
    const wrapper = mountPanel();
    await flushPromises();
    expect(servingApi.series).toHaveBeenCalledWith("shop", "1h");

    // Driven through the shared range picker, the same control the container metrics use.
    const day = wrapper.findAll(".range-seg").find((b) => b.text() === "24h");
    await day!.trigger("click");
    await flushPromises();

    expect(servingApi.series).toHaveBeenLastCalledWith("shop", "24h");
  });

  it("says traffic logging is off rather than drawing an empty chart", async () => {
    vi.mocked(servingApi.series).mockRejectedValue({ response: { status: 503 } });

    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.text()).toContain("Traffic logging is not enabled");
  });

  it("explains an empty window", async () => {
    vi.mocked(servingApi.series).mockResolvedValue({ data: { deployment: "shop", since: "1h", points: [] } } as any);

    const wrapper = mountPanel();
    await flushPromises();

    expect(wrapper.text()).toContain("No requests in this window");
  });
});
