import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import PanelCard from "./PanelCard.vue";
import { servingApi } from "@/services/api";
import { observabilityApi } from "@/services/observability";

vi.mock("@/services/api", () => ({
  servingApi: { series: vi.fn() },
}));
vi.mock("@/services/observability", () => ({
  observabilityApi: { timeseries: vi.fn() },
}));

// Stub the canvas chart; the test only checks the data handed to it.
const TimeSeriesChartStub = {
  name: "TimeSeriesChart",
  props: ["containers", "timestamps", "values", "unit", "area"],
  template: "<div class='chart-stub' />",
};

const mountPanel = (panel: any) =>
  mount(PanelCard, {
    props: { panel, since: "1h" },
    global: { stubs: { TimeSeriesChart: TimeSeriesChartStub, Icon: true } },
  });

describe("PanelCard", () => {
  beforeEach(() => vi.clearAllMocks());

  it("adapts serving RED points into the chart's series shape", async () => {
    vi.mocked(servingApi.series).mockResolvedValue({
      data: {
        deployment: "shop",
        since: "1h",
        points: [
          { time: "2026-07-17T10:00:00Z", requests: 10, errors: 1, avg_time_ms: 40, p95_time_ms: 80 },
          { time: "2026-07-17T10:01:00Z", requests: 20, errors: 0, avg_time_ms: 55, p95_time_ms: 90 },
        ],
      },
    } as any);

    const wrapper = mountPanel({
      title: "Requests",
      source: "serving",
      series: "requests",
      deployment: "shop",
      type: "line",
      width: 6,
    });
    await flushPromises();

    expect(servingApi.series).toHaveBeenCalledWith("shop", "1h");
    const chart = wrapper.findComponent(TimeSeriesChartStub);
    expect(chart.exists()).toBe(true);
    expect(chart.props("containers")).toEqual(["shop"]);
    expect(chart.props("timestamps")).toEqual([
      Date.parse("2026-07-17T10:00:00Z") / 1000,
      Date.parse("2026-07-17T10:01:00Z") / 1000,
    ]);
    expect(chart.props("values")).toEqual([[10, 20]]);
    expect(chart.props("unit")).toBe("count");
  });

  it("selects the latency field and ms unit for a latency panel", async () => {
    vi.mocked(servingApi.series).mockResolvedValue({
      data: { points: [{ time: "2026-07-17T10:00:00Z", requests: 5, errors: 0, avg_time_ms: 42, p95_time_ms: 90 }] },
    } as any);

    const wrapper = mountPanel({
      title: "Latency",
      source: "serving",
      series: "latency",
      deployment: "shop",
      type: "line",
      width: 6,
    });
    await flushPromises();

    const chart = wrapper.findComponent(TimeSeriesChartStub);
    expect(chart.props("values")).toEqual([[42]]);
    expect(chart.props("unit")).toBe("ms");
  });

  it("pulls the named metric series out of a container timeseries response", async () => {
    vi.mocked(observabilityApi.timeseries).mockResolvedValue({
      data: {
        metrics: {
          "container.cpu.usage": { containers: ["shop-web"], timestamps: [1, 2], values: [[3.5, 4.0]] },
        },
      },
    } as any);

    const wrapper = mountPanel({
      title: "CPU",
      source: "container",
      series: "container.cpu.usage",
      deployment: "shop",
      type: "line",
      width: 6,
    });
    await flushPromises();

    expect(observabilityApi.timeseries).toHaveBeenCalledWith("shop", "1h");
    const chart = wrapper.findComponent(TimeSeriesChartStub);
    expect(chart.props("values")).toEqual([[3.5, 4.0]]);
    expect(chart.props("unit")).toBe("percent");
  });

  it("shows the latest value as a stat", async () => {
    vi.mocked(observabilityApi.timeseries).mockResolvedValue({
      data: {
        metrics: {
          "container.cpu.usage": { containers: ["shop-web"], timestamps: [1, 2], values: [[3.5, 7.25]] },
        },
      },
    } as any);

    const wrapper = mountPanel({
      title: "CPU now",
      source: "container",
      series: "container.cpu.usage",
      deployment: "shop",
      type: "stat",
      width: 3,
    });
    await flushPromises();

    expect(wrapper.find(".stat-value").text()).toBe("7.3%");
  });
});
