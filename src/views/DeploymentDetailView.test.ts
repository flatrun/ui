import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import DeploymentDetailView from "./DeploymentDetailView.vue";
import { useAuthStore } from "@/stores/auth";

const mockRoute = {
  params: { name: "test-app" },
  query: {},
};

vi.mock("vue-router", () => ({
  useRoute: vi.fn(() => mockRoute),
  useRouter: vi.fn(() => ({
    push: vi.fn(),
    back: vi.fn(),
  })),
}));

vi.mock("@/services/api", () => ({
  deploymentsApi: {
    get: vi.fn().mockResolvedValue({
      data: {
        deployment: {
          name: "test-app",
          status: "running",
          type: "docker-compose",
          path: "/deployments/test-app",
          services: [{ name: "web", status: "running", container_id: "abc123" }],
          created_at: "2024-01-01T00:00:00Z",
          updated_at: "2024-01-01T00:00:00Z",
        },
        proxy_status: { enabled: true, domain: "test-app.example.com" },
      },
    }),
    getEnvVars: vi.fn().mockResolvedValue({
      data: { env_vars: [] },
    }),
    getLogs: vi.fn().mockResolvedValue({
      data: { logs: "Test logs" },
    }),
    logs: vi.fn().mockResolvedValue({
      data: { logs: "Test logs" },
    }),
    getStats: vi.fn().mockResolvedValue({
      data: {
        stats: {
          cpu_percent: 10,
          memory_usage: 100000000,
          memory_limit: 1000000000,
        },
      },
    }),
    listFiles: vi.fn().mockResolvedValue({
      data: { files: [] },
    }),
    getComposeFile: vi.fn().mockResolvedValue({
      data: { content: "version: '3'\nservices:\n  web:\n    image: nginx" },
    }),
    start: vi.fn().mockResolvedValue({ data: { message: "Started" } }),
    stop: vi.fn().mockResolvedValue({ data: { message: "Stopped" } }),
    restart: vi.fn().mockResolvedValue({ data: { message: "Restarted" } }),
    delete: vi.fn().mockResolvedValue({ data: { message: "Deleted" } }),
  },
  proxyApi: {
    getStatus: vi.fn().mockResolvedValue({
      data: { status: { enabled: true } },
    }),
  },
  securityApi: {
    getDeploymentSecurity: vi.fn().mockResolvedValue({
      data: {
        enabled: false,
        blocked_ips: [],
        protected_paths: [],
        rate_limits: [],
      },
    }),
    getDeploymentEvents: vi.fn().mockResolvedValue({
      data: { events: [] },
    }),
    updateDeploymentSecurity: vi.fn().mockResolvedValue({
      data: { message: "Updated" },
    }),
  },
  containersApi: {
    exec: vi.fn().mockResolvedValue({ data: {} }),
  },
  filesApi: {
    read: vi.fn().mockResolvedValue({ data: { content: "" } }),
    write: vi.fn().mockResolvedValue({ data: { message: "Written" } }),
    getContent: vi.fn().mockResolvedValue({ data: { content: "" } }),
  },
}));

vi.mock("@/composables/useNotifications", () => ({
  useNotifications: () => ({
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  }),
}));

describe("DeploymentDetailView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mountView = () => {
    const pinia = createTestingPinia({ createSpy: vi.fn });
    const authStore = useAuthStore(pinia);
    (authStore.hasPermission as ReturnType<typeof vi.fn>).mockReturnValue(true);
    return mount(DeploymentDetailView, {
      global: {
        plugins: [pinia],
        mocks: {
          $route: mockRoute,
        },
        stubs: {
          RouterLink: {
            template: "<a><slot /></a>",
            props: ["to"],
          },
          teleport: true,
          ContainerTerminal: true,
          LogViewer: true,
        },
      },
    });
  };

  describe("View structure", () => {
    it("renders the deployment detail view container", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find(".deployment-detail").exists()).toBe(true);
    });

    it("contains detail header", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find(".detail-header").exists()).toBe(true);
    });

    it("contains detail tabs section", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find(".detail-tabs").exists()).toBe(true);
    });
  });

  describe("Tab navigation", () => {
    it("displays all nine tabs", async () => {
      const wrapper = mountView();
      await flushPromises();
      const tabs = wrapper.findAll(".tab-btn");
      expect(tabs.length).toBe(9);
    });

    it("has Overview tab", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.text()).toContain("Overview");
    });

    it("has Files tab", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.text()).toContain("Files");
    });

    it("has Logs tab", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.text()).toContain("Logs");
    });

    it("has Terminal tab", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.text()).toContain("Terminal");
    });

    it("has Environment tab", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.text()).toContain("Environment");
    });

    it("has Quick Actions tab", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.text()).toContain("Quick Actions");
    });

    it("has Backups tab", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.text()).toContain("Backups");
    });

    it("has Security tab", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.text()).toContain("Security");
    });

    it("has Configuration tab", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.text()).toContain("Configuration");
    });

    it("Overview tab is active by default", async () => {
      const wrapper = mountView();
      await flushPromises();
      const activeTab = wrapper.find(".tab-btn.active");
      expect(activeTab.text()).toContain("Overview");
    });

    it("can switch tabs by clicking", async () => {
      const wrapper = mountView();
      await flushPromises();

      const logsTab = wrapper.findAll(".tab-btn").find((t) => t.text().includes("Logs"));
      await logsTab?.trigger("click");

      expect(wrapper.find(".tab-btn.active").text()).toContain("Logs");
    });
  });

  describe("Tab definitions", () => {
    it("has correct tab structure", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect((wrapper.vm as any).tabs).toEqual([
        { id: "overview", label: "Overview", icon: "pi pi-info-circle" },
        { id: "files", label: "Files", icon: "pi pi-folder" },
        { id: "logs", label: "Logs", icon: "pi pi-file-edit" },
        { id: "terminal", label: "Terminal", icon: "pi pi-desktop" },
        { id: "environment", label: "Environment", icon: "pi pi-list" },
        { id: "actions", label: "Quick Actions", icon: "pi pi-bolt" },
        { id: "backups", label: "Backups", icon: "pi pi-history" },
        { id: "security", label: "Security", icon: "pi pi-shield" },
        { id: "config", label: "Configuration", icon: "pi pi-cog" },
      ]);
    });
  });

  describe("Security tab with incomplete data", () => {
    it("renders security tab without errors when protected_paths is undefined", async () => {
      const { securityApi } = await import("@/services/api");
      vi.mocked(securityApi.getDeploymentSecurity).mockResolvedValueOnce({
        data: {
          enabled: false,
          blocked_ips: [],
        },
      } as any);

      const wrapper = mountView();
      await flushPromises();

      const securityTab = wrapper.findAll(".tab-btn").find((t) => t.text().includes("Security"));
      await securityTab?.trigger("click");
      await flushPromises();

      expect(wrapper.find(".tab-btn.active").text()).toContain("Security");
    });

    it("renders security tab without errors when rate_limits is undefined", async () => {
      const { securityApi } = await import("@/services/api");
      vi.mocked(securityApi.getDeploymentSecurity).mockResolvedValueOnce({
        data: {
          enabled: false,
          blocked_ips: [],
          protected_paths: [],
        },
      } as any);

      const wrapper = mountView();
      await flushPromises();

      const securityTab = wrapper.findAll(".tab-btn").find((t) => t.text().includes("Security"));
      await securityTab?.trigger("click");
      await flushPromises();

      expect(wrapper.find(".tab-btn.active").text()).toContain("Security");
    });

    it("renders security tab without errors when security config is empty object", async () => {
      const { securityApi } = await import("@/services/api");
      vi.mocked(securityApi.getDeploymentSecurity).mockResolvedValueOnce({
        data: {},
      } as any);

      const wrapper = mountView();
      await flushPromises();

      const securityTab = wrapper.findAll(".tab-btn").find((t) => t.text().includes("Security"));
      await securityTab?.trigger("click");
      await flushPromises();

      expect(wrapper.find(".tab-btn.active").text()).toContain("Security");
    });

    it("displays zero counts when security arrays are empty", async () => {
      const wrapper = mountView();
      await flushPromises();

      const securityTab = wrapper.findAll(".tab-btn").find((t) => t.text().includes("Security"));
      await securityTab?.trigger("click");
      await flushPromises();

      const summaryValues = wrapper.findAll(".summary-value");
      const protectedPathsCount = summaryValues.find((v) =>
        v.element.parentElement?.textContent?.includes("Protected Paths"),
      );
      expect(protectedPathsCount?.text()).toBe("0");
    });
  });

  describe("Header actions", () => {
    it("displays start button", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find(".btn-success").text()).toContain("Start");
    });

    it("displays stop button", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find(".btn-warning").text()).toContain("Stop");
    });

    it("displays restart button", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find(".btn-info").text()).toContain("Restart");
    });

    it("displays delete button", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find(".btn-danger").text()).toContain("Delete");
    });
  });

  describe("Data fetching", () => {
    it("fetches deployment on mount", async () => {
      const { deploymentsApi } = await import("@/services/api");
      mountView();
      await flushPromises();
      expect(deploymentsApi.get).toHaveBeenCalledWith("test-app");
    });

    it("fetches environment variables on mount", async () => {
      const { deploymentsApi } = await import("@/services/api");
      mountView();
      await flushPromises();
      expect(deploymentsApi.getEnvVars).toHaveBeenCalledWith("test-app");
    });
  });

  describe("Permission gates", () => {
    const mountViewDenied = () => {
      const pinia = createTestingPinia({ createSpy: vi.fn });
      return mount(DeploymentDetailView, {
        global: {
          plugins: [pinia],
          mocks: {
            $route: mockRoute,
          },
          stubs: {
            RouterLink: {
              template: "<a><slot /></a>",
              props: ["to"],
            },
            teleport: true,
            ContainerTerminal: true,
            LogViewer: true,
          },
        },
      });
    };

    it("hides start button without deployments:write", async () => {
      const wrapper = mountViewDenied();
      await flushPromises();
      expect(wrapper.find(".btn-success").exists()).toBe(false);
    });

    it("hides stop button without deployments:write", async () => {
      const wrapper = mountViewDenied();
      await flushPromises();
      expect(wrapper.find(".btn-warning").exists()).toBe(false);
    });

    it("hides restart button without deployments:write", async () => {
      const wrapper = mountViewDenied();
      await flushPromises();
      expect(wrapper.find(".btn-info").exists()).toBe(false);
    });

    it("hides delete button without deployments:delete", async () => {
      const wrapper = mountViewDenied();
      await flushPromises();
      expect(wrapper.find(".btn-danger").exists()).toBe(false);
    });

    it("still renders deployment detail view", async () => {
      const wrapper = mountViewDenied();
      await flushPromises();
      expect(wrapper.find(".deployment-detail").exists()).toBe(true);
    });
  });

  describe("Domain management", () => {
    it("computes hasMultipleDomains as false when no domains", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect((wrapper.vm as any).hasMultipleDomains).toBeFalsy();
    });

    it("computes hasMultipleDomains as false when one domain", async () => {
      const { deploymentsApi } = await import("@/services/api");
      vi.mocked(deploymentsApi.get).mockResolvedValueOnce({
        data: {
          deployment: {
            name: "test-app",
            status: "running",
            path: "/deployments/test-app",
            services: [],
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            metadata: {
              domains: [{ id: "domain-1", domain: "app.example.com" }],
            },
          },
          proxy_status: { exposed: true, domain: "app.example.com" },
        },
      } as any);

      const wrapper = mountView();
      await flushPromises();
      expect((wrapper.vm as any).hasMultipleDomains).toBe(false);
    });

    it("computes hasMultipleDomains as true when multiple domains", async () => {
      const { deploymentsApi } = await import("@/services/api");
      vi.mocked(deploymentsApi.get).mockResolvedValueOnce({
        data: {
          deployment: {
            name: "test-app",
            status: "running",
            path: "/deployments/test-app",
            services: [],
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            metadata: {
              domains: [
                { id: "domain-1", domain: "app.example.com" },
                { id: "domain-2", domain: "api.example.com" },
              ],
            },
          },
          proxy_status: { exposed: true },
        },
      } as any);

      const wrapper = mountView();
      await flushPromises();
      expect((wrapper.vm as any).hasMultipleDomains).toBe(true);
    });

    it("computes singleDomainId from explicit domain", async () => {
      const { deploymentsApi } = await import("@/services/api");
      vi.mocked(deploymentsApi.get).mockResolvedValueOnce({
        data: {
          deployment: {
            name: "test-app",
            status: "running",
            path: "/deployments/test-app",
            services: [],
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            metadata: {
              domains: [{ id: "my-domain-id", domain: "app.example.com" }],
            },
          },
          proxy_status: { exposed: true },
        },
      } as any);

      const wrapper = mountView();
      await flushPromises();
      expect((wrapper.vm as any).singleDomainId).toBe("my-domain-id");
    });

    it("computes singleDomainId as 'default' for legacy domain", async () => {
      const { deploymentsApi, proxyApi } = await import("@/services/api");
      vi.mocked(deploymentsApi.get).mockResolvedValueOnce({
        data: {
          deployment: {
            name: "test-app",
            status: "running",
            path: "/deployments/test-app",
            services: [],
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            metadata: {
              networking: { expose: true, domain: "legacy.example.com" },
            },
          },
          proxy_status: { exposed: true, domain: "legacy.example.com" },
        },
      } as any);
      vi.mocked(proxyApi.getStatus).mockResolvedValueOnce({
        data: { status: { exposed: true, domain: "legacy.example.com" } },
      } as any);

      const wrapper = mountView();
      await flushPromises();
      expect((wrapper.vm as any).singleDomainId).toBe("default");
    });

    it("computes singleDomainId as null when no domains", async () => {
      const { deploymentsApi, proxyApi } = await import("@/services/api");
      vi.mocked(deploymentsApi.get).mockResolvedValueOnce({
        data: {
          deployment: {
            name: "test-app",
            status: "running",
            path: "/deployments/test-app",
            services: [],
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
            metadata: {},
          },
          proxy_status: { exposed: false },
        },
      } as any);
      vi.mocked(proxyApi.getStatus).mockResolvedValueOnce({
        data: { status: { exposed: false } },
      } as any);

      const wrapper = mountView();
      await flushPromises();
      expect((wrapper.vm as any).singleDomainId).toBeNull();
    });
  });
});
