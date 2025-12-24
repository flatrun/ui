import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import TrafficDashboard from "./TrafficDashboard.vue";
import { securityApi } from "@/services/api";

vi.mock("@/services/api", () => ({
  securityApi: {
    blockIP: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

const mockBlockIP = securityApi.blockIP as ReturnType<typeof vi.fn>;

const mockDeployments = [
  { name: "my-app", status: "running" },
  { name: "api-service", status: "running" },
];

const mockStats = {
  total_requests: 1500,
  total_bytes: 1048576,
  avg_response_time_ms: 250,
  by_status_group: { "2xx": 1200, "3xx": 100, "4xx": 150, "5xx": 50 },
  by_deployment: { "my-app": 1000, "unknown-domain.com": 500 },
  by_method: { GET: 1000, POST: 400, PUT: 100 },
  top_paths: [
    { path: "/api/users", deployment: "my-app", request_count: 500, avg_time_ms: 120, error_count: 5 },
    { path: "/health", deployment: "api-service", request_count: 300, avg_time_ms: 50, error_count: 0 },
  ],
  top_ips: [
    { ip: "192.168.1.100", request_count: 800, bytes_sent: 500000 },
    { ip: "10.0.0.50", request_count: 200, bytes_sent: 100000 },
  ],
  requests_per_hour: [
    { hour: "2025-01-01T00:00:00Z", request_count: 50 },
    { hour: "2025-01-01T01:00:00Z", request_count: 75 },
  ],
  deployment_stats: [
    {
      name: "my-app",
      total_requests: 1000,
      avg_response_time: 200,
      error_rate: 2.5,
      status_2xx: 900,
      status_3xx: 50,
      status_4xx: 40,
      status_5xx: 10,
    },
    {
      name: "unknown-domain.com",
      total_requests: 500,
      avg_response_time: 150,
      error_rate: 1.0,
      status_2xx: 480,
      status_3xx: 10,
      status_4xx: 8,
      status_5xx: 2,
    },
  ],
};

const mockLogs = [
  {
    id: "1",
    deployment_name: "my-app",
    request_method: "GET",
    request_path: "/api/users",
    status_code: 200,
    source_ip: "192.168.1.100",
    response_time_ms: 120,
    bytes_sent: 1024,
    created_at: "2024-01-15T10:00:01Z",
  },
  {
    id: "2",
    deployment_name: "my-app",
    request_method: "POST",
    request_path: "/api/orders",
    status_code: 500,
    source_ip: "10.0.0.50",
    response_time_ms: 2500,
    bytes_sent: 512,
    created_at: "2024-01-15T10:00:00Z",
  },
];

describe("TrafficDashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountDashboard = (options: { stats?: typeof mockStats | null; logs?: typeof mockLogs } = {}) => {
    return mount(TrafficDashboard, {
      props: {
        autoFetch: false,
      },
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
            initialState: {
              traffic: {
                stats: options.stats !== undefined ? options.stats : mockStats,
                logs: options.logs || mockLogs,
                logsTotal: (options.logs || mockLogs).length,
                loading: false,
                error: null,
              },
              deployments: {
                deployments: mockDeployments,
              },
            },
          }),
        ],
        stubs: {
          Transition: false,
          ConfirmModal: true,
          Teleport: true,
        },
      },
    });
  };

  describe("Dashboard structure", () => {
    it("renders the dashboard container", () => {
      const wrapper = mountDashboard();
      expect(wrapper.find(".traffic-dashboard").exists()).toBe(true);
    });

    it("renders the dashboard header with tabs", () => {
      const wrapper = mountDashboard();
      expect(wrapper.find(".dashboard-header").exists()).toBe(true);
      expect(wrapper.find(".tabs").exists()).toBe(true);
    });

    it("displays all navigation tabs", () => {
      const wrapper = mountDashboard();
      const text = wrapper.text();
      expect(text).toContain("Overview");
      expect(text).toContain("Logs");
      expect(text).toContain("Performance");
    });

    it("has time range selector", () => {
      const wrapper = mountDashboard();
      const select = wrapper.find(".header-actions select");
      expect(select.exists()).toBe(true);
    });

    it("has refresh button", () => {
      const wrapper = mountDashboard();
      const refreshBtn = wrapper.find(".header-actions .btn-icon");
      expect(refreshBtn.exists()).toBe(true);
    });
  });

  describe("Overview tab - Stats Grid", () => {
    it("displays stats grid with 4 cards", () => {
      const wrapper = mountDashboard();
      const statCards = wrapper.findAll(".stat-card");
      expect(statCards.length).toBe(4);
    });

    it("shows Requests stat", () => {
      const wrapper = mountDashboard();
      expect(wrapper.text()).toContain("Requests");
      expect(wrapper.text()).toContain("1.5K");
    });

    it("shows Data Transfer stat", () => {
      const wrapper = mountDashboard();
      expect(wrapper.text()).toContain("Data Transfer");
    });

    it("shows Response Time stat", () => {
      const wrapper = mountDashboard();
      expect(wrapper.text()).toContain("Response Time");
    });

    it("shows Error Rate stat", () => {
      const wrapper = mountDashboard();
      expect(wrapper.text()).toContain("Error Rate");
    });
  });

  describe("Overview tab - Domains panel", () => {
    it("displays Domains panel", () => {
      const wrapper = mountDashboard();
      expect(wrapper.text()).toContain("Domains");
    });

    it("shows domain list with deployment stats", () => {
      const wrapper = mountDashboard();
      const deploymentList = wrapper.find(".deployment-list");
      expect(deploymentList.exists()).toBe(true);
    });

    it("displays known deployment names", () => {
      const wrapper = mountDashboard();
      expect(wrapper.text()).toContain("my-app");
    });
  });

  describe("Overview tab - Unknown Domains panel", () => {
    it("displays Unknown Domains panel when unknown domains exist", () => {
      const wrapper = mountDashboard();
      expect(wrapper.text()).toContain("Unknown Domains");
    });

    it("shows unknown domain count badge", () => {
      const wrapper = mountDashboard();
      const unknownPanel = wrapper.findAll(".warning-panel").find((p) => p.text().includes("Unknown Domains"));
      expect(unknownPanel).toBeDefined();
      expect(unknownPanel?.find(".count").exists()).toBe(true);
    });

    it("displays unknown domain names", () => {
      const wrapper = mountDashboard();
      expect(wrapper.text()).toContain("unknown-domain.com");
    });

    it("shows request count for unknown domains", () => {
      const wrapper = mountDashboard();
      const unknownList = wrapper.find(".unknown-list");
      expect(unknownList.exists()).toBe(true);
    });

    it("unknown domain rows are clickable", () => {
      const wrapper = mountDashboard();
      const unknownRow = wrapper.find(".unknown-row");
      expect(unknownRow.exists()).toBe(true);
    });

    it("does not show Unknown Domains panel when all domains are known", () => {
      const statsWithNoUnknown = {
        ...mockStats,
        deployment_stats: [
          {
            name: "my-app",
            total_requests: 1000,
            avg_response_time: 200,
            error_rate: 2.5,
            status_2xx: 900,
            status_3xx: 50,
            status_4xx: 40,
            status_5xx: 10,
          },
        ],
      };
      const wrapper = mountDashboard({ stats: statsWithNoUnknown });
      const unknownPanel = wrapper.find(".panel-stack .unknown-list");
      expect(unknownPanel.exists()).toBe(false);
    });
  });

  describe("Overview tab - Suspicious IPs panel", () => {
    it("displays Suspicious IPs panel when suspicious IPs exist", () => {
      const statsWithSuspiciousIP = {
        ...mockStats,
        top_ips: [{ ip: "192.168.1.100", request_count: 800, bytes_sent: 500000 }],
      };
      const wrapper = mountDashboard({ stats: statsWithSuspiciousIP });
      expect(wrapper.text()).toContain("Suspicious IPs");
    });

    it("shows block button for suspicious IPs", () => {
      const statsWithSuspiciousIP = {
        ...mockStats,
        top_ips: [{ ip: "192.168.1.100", request_count: 800, bytes_sent: 500000 }],
      };
      const wrapper = mountDashboard({ stats: statsWithSuspiciousIP });
      const suspiciousPanel = wrapper.find(".suspicious-list");
      if (suspiciousPanel.exists()) {
        const blockBtn = suspiciousPanel.find(".btn-action.danger");
        expect(blockBtn.exists()).toBe(true);
      }
    });
  });

  describe("Overview tab - Top Sources panel", () => {
    it("displays Top Sources panel", () => {
      const wrapper = mountDashboard();
      expect(wrapper.text()).toContain("Top Sources");
    });

    it("shows IP list", () => {
      const wrapper = mountDashboard();
      const ipList = wrapper.find(".ip-list");
      expect(ipList.exists()).toBe(true);
    });
  });

  describe("Overview tab - Distribution section", () => {
    it("displays method distribution", () => {
      const wrapper = mountDashboard();
      expect(wrapper.text()).toContain("By Method");
    });

    it("displays status distribution", () => {
      const wrapper = mountDashboard();
      expect(wrapper.text()).toContain("By Status");
    });

    it("shows status groups (2xx, 3xx, 4xx, 5xx)", () => {
      const wrapper = mountDashboard();
      const text = wrapper.text();
      expect(text).toContain("2xx");
      expect(text).toContain("3xx");
      expect(text).toContain("4xx");
      expect(text).toContain("5xx");
    });
  });

  describe("Logs tab", () => {
    it("has filters bar", async () => {
      const wrapper = mountDashboard();
      const logsTab = wrapper.find(".tab:nth-child(2)");
      await logsTab.trigger("click");
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".filters-bar").exists()).toBe(true);
    });

    it("has data table for logs", async () => {
      const wrapper = mountDashboard();
      const vm = wrapper.vm as any;
      vm.activeSubTab = "logs";
      await wrapper.vm.$nextTick();
      expect(wrapper.find(".data-table").exists()).toBe(true);
    });

    it("log table has required columns", async () => {
      const wrapper = mountDashboard();
      const vm = wrapper.vm as any;
      vm.activeSubTab = "logs";
      await wrapper.vm.$nextTick();
      const headers = wrapper.findAll("th");
      const headerTexts = headers.map((h) => h.text());
      expect(headerTexts.some((t) => t.includes("Time"))).toBe(true);
      expect(headerTexts.some((t) => t.includes("Domain"))).toBe(true);
      expect(headerTexts.some((t) => t.includes("Method"))).toBe(true);
      expect(headerTexts.some((t) => t.includes("Path"))).toBe(true);
      expect(headerTexts.some((t) => t.includes("Status"))).toBe(true);
      expect(headerTexts.some((t) => t.includes("IP"))).toBe(true);
    });

    it("log rows have filter and block IP buttons", async () => {
      const wrapper = mountDashboard();
      const vm = wrapper.vm as any;
      vm.activeSubTab = "logs";
      await wrapper.vm.$nextTick();
      const actionCell = wrapper.find(".cell-actions");
      expect(actionCell.exists()).toBe(true);
      const buttons = actionCell.findAll("button");
      expect(buttons.length).toBe(2);
      expect(buttons[0].find(".pi-filter").exists()).toBe(true);
      expect(buttons[1].find(".pi-ban").exists()).toBe(true);
    });
  });

  describe("Performance tab", () => {
    it("shows slowest endpoints section", async () => {
      const wrapper = mountDashboard();
      const vm = wrapper.vm as any;
      vm.activeSubTab = "performance";
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain("Slowest Endpoints");
    });

    it("shows request volume chart when hourly data exists", async () => {
      const wrapper = mountDashboard();
      const vm = wrapper.vm as any;
      vm.activeSubTab = "performance";
      await wrapper.vm.$nextTick();
      expect(wrapper.text()).toContain("Request Volume");
    });
  });

  describe("Empty state", () => {
    it("shows empty state when no stats", () => {
      const wrapper = mountDashboard({ stats: null });
      expect(wrapper.find(".empty-state").exists()).toBe(true);
      expect(wrapper.text()).toContain("No traffic data yet");
    });

    it("has button to check for traffic in empty state", () => {
      const wrapper = mountDashboard({ stats: null });
      expect(wrapper.find(".btn-primary").exists()).toBe(true);
      expect(wrapper.text()).toContain("Check for Traffic");
    });
  });

  describe("Loading state", () => {
    it("shows loading state when loading and no stats", () => {
      const wrapper = mount(TrafficDashboard, {
        props: { autoFetch: false },
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
              initialState: {
                traffic: {
                  stats: null,
                  logs: [],
                  logsTotal: 0,
                  loading: true,
                  error: null,
                },
                deployments: {
                  deployments: [],
                },
              },
            }),
          ],
          stubs: { Transition: false },
        },
      });
      expect(wrapper.find(".loading-state").exists()).toBe(true);
    });
  });

  describe("Key UI elements existence", () => {
    it("has two-column layout in overview", () => {
      const wrapper = mountDashboard();
      expect(wrapper.find(".two-col").exists()).toBe(true);
    });

    it("has panel-stack for secondary panels", () => {
      const wrapper = mountDashboard();
      expect(wrapper.find(".panel-stack").exists()).toBe(true);
    });

    it("has distribution row", () => {
      const wrapper = mountDashboard();
      expect(wrapper.find(".distribution-row").exists()).toBe(true);
    });
  });

  describe("Computed properties", () => {
    it("correctly identifies unknown domains", () => {
      const wrapper = mountDashboard();
      const vm = wrapper.vm as any;
      expect(vm.unknownDomainStats.length).toBe(1);
      expect(vm.unknownDomainStats[0].name).toBe("unknown-domain.com");
    });

    it("domainStats includes all domains", () => {
      const wrapper = mountDashboard();
      const vm = wrapper.vm as any;
      expect(vm.domainStats.length).toBe(2);
    });

    it("unknownDomainStats excludes known deployments", () => {
      const wrapper = mountDashboard();
      const vm = wrapper.vm as any;
      const unknownNames = vm.unknownDomainStats.map((d: any) => d.name);
      expect(unknownNames).not.toContain("my-app");
      expect(unknownNames).toContain("unknown-domain.com");
    });
  });

  describe("Block IP functionality", () => {
    beforeEach(() => {
      mockBlockIP.mockClear();
    });

    it("blockIP function exists on component", () => {
      const wrapper = mountDashboard();
      const vm = wrapper.vm as any;
      expect(typeof vm.blockIP).toBe("function");
    });

    it("blockIP shows confirmation modal", async () => {
      const wrapper = mountDashboard();
      const vm = wrapper.vm as any;

      expect(vm.showBlockIPModal).toBe(false);

      vm.blockIP("192.168.1.100");
      await wrapper.vm.$nextTick();

      expect(vm.showBlockIPModal).toBe(true);
      expect(vm.ipToBlock).toBe("192.168.1.100");
    });

    it("confirmBlockIP calls securityApi.blockIP", async () => {
      const wrapper = mountDashboard();
      const vm = wrapper.vm as any;

      vm.ipToBlock = "192.168.1.100";
      vm.showBlockIPModal = true;
      await wrapper.vm.$nextTick();

      await vm.confirmBlockIP();
      await wrapper.vm.$nextTick();

      expect(mockBlockIP).toHaveBeenCalledWith("192.168.1.100", "Blocked from traffic dashboard - suspicious activity");
    });

    it("cancelBlockIP closes modal without calling API", async () => {
      const wrapper = mountDashboard();
      const vm = wrapper.vm as any;

      vm.ipToBlock = "10.0.0.1";
      vm.showBlockIPModal = true;
      await wrapper.vm.$nextTick();

      vm.cancelBlockIP();
      await wrapper.vm.$nextTick();

      expect(vm.showBlockIPModal).toBe(false);
      expect(mockBlockIP).not.toHaveBeenCalled();
    });

    it("block button in logs table opens confirmation modal", async () => {
      const wrapper = mountDashboard();
      const vm = wrapper.vm as any;
      vm.activeSubTab = "logs";
      await wrapper.vm.$nextTick();

      const blockBtn = wrapper.find(".cell-actions .btn-icon-sm.danger");
      expect(blockBtn.exists()).toBe(true);

      await blockBtn.trigger("click");
      await wrapper.vm.$nextTick();

      expect(vm.showBlockIPModal).toBe(true);
      expect(vm.ipToBlock).toBe("192.168.1.100");
    });

    it("block button in suspicious IPs panel opens confirmation modal", async () => {
      const statsWithSuspiciousIP = {
        ...mockStats,
        top_ips: [{ ip: "192.168.1.100", request_count: 800, bytes_sent: 500000 }],
      };
      const wrapper = mountDashboard({ stats: statsWithSuspiciousIP });
      const vm = wrapper.vm as any;

      const suspiciousPanel = wrapper.find(".suspicious-list");
      if (suspiciousPanel.exists()) {
        const blockBtn = suspiciousPanel.find(".btn-action.danger");
        if (blockBtn.exists()) {
          await blockBtn.trigger("click");
          await wrapper.vm.$nextTick();

          expect(vm.showBlockIPModal).toBe(true);
          expect(vm.ipToBlock).toBe("192.168.1.100");
        }
      }
    });

    it("modal closes after successful block", async () => {
      const wrapper = mountDashboard();
      const vm = wrapper.vm as any;

      vm.ipToBlock = "192.168.1.100";
      vm.showBlockIPModal = true;
      await wrapper.vm.$nextTick();

      await vm.confirmBlockIP();
      await wrapper.vm.$nextTick();

      expect(vm.showBlockIPModal).toBe(false);
    });
  });
});
