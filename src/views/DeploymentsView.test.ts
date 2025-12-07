import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import DeploymentsView from "./DeploymentsView.vue";

vi.mock("@/services/api", () => ({
  deploymentsApi: {
    list: vi.fn().mockResolvedValue({
      data: {
        deployments: [
          {
            name: "my-laravel-app",
            path: "/deployments/my-laravel-app",
            status: "running",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-02T00:00:00Z",
            services: [
              {
                name: "app",
                container_id: "abc123",
                image: "laravel:latest",
                status: "running",
                ports: ["8080:80"],
                networks: ["proxy"],
                created_at: "2024-01-01T00:00:00Z",
              },
            ],
            metadata: {
              name: "my-laravel-app",
              type: "laravel",
              networking: {
                expose: true,
                domain: "app.example.com",
                container_port: 80,
                protocol: "http",
              },
              ssl: { enabled: true, auto_cert: true },
              healthcheck: { path: "/", interval: "30s" },
            },
          },
          {
            name: "wordpress-site",
            path: "/deployments/wordpress-site",
            status: "stopped",
            created_at: "2024-01-03T00:00:00Z",
            updated_at: "2024-01-04T00:00:00Z",
            services: [
              {
                name: "wordpress",
                container_id: "def456",
                image: "wordpress:latest",
                status: "exited",
                ports: [],
                networks: [],
                created_at: "2024-01-03T00:00:00Z",
              },
              {
                name: "mysql",
                container_id: "ghi789",
                image: "mysql:8.0",
                status: "exited",
                ports: [],
                networks: [],
                created_at: "2024-01-03T00:00:00Z",
              },
            ],
          },
        ],
      },
    }),
    start: vi.fn().mockResolvedValue({ data: { output: "Started" } }),
    stop: vi.fn().mockResolvedValue({ data: { output: "Stopped" } }),
    restart: vi.fn().mockResolvedValue({ data: { output: "Restarted" } }),
    logs: vi.fn().mockResolvedValue({ data: { logs: "Container logs..." } }),
  },
}));

const mockPush = vi.fn();
vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}));

describe("DeploymentsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountView = () => {
    return mount(DeploymentsView, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
          }),
        ],
        stubs: {
          DataTable: {
            template: `
              <div class="data-table">
                <slot name="actions" />
                <div class="items">
                  <slot name="grid" :items="items" />
                </div>
              </div>
            `,
            props: ["items", "columns", "loading"],
          },
          OperationModal: true,
          LogsModal: true,
          NewDeploymentModal: true,
        },
      },
    });
  };

  describe("View structure", () => {
    it("renders the deployments view container", () => {
      const wrapper = mountView();
      expect(wrapper.find(".deployments-view").exists()).toBe(true);
    });

    it("contains New Deployment button", () => {
      const wrapper = mountView();
      expect(wrapper.text()).toContain("New Deployment");
    });

    it("contains Refresh button", () => {
      const wrapper = mountView();
      expect(wrapper.text()).toContain("Refresh");
    });
  });

  describe("Action buttons", () => {
    it("has New Deployment button with primary style", () => {
      const wrapper = mountView();
      const newBtn = wrapper.find("button.btn-primary");
      expect(newBtn.exists()).toBe(true);
      expect(newBtn.text()).toContain("New Deployment");
    });

    it("has Refresh button with secondary style", () => {
      const wrapper = mountView();
      const refreshBtn = wrapper.find("button.btn-secondary");
      expect(refreshBtn.exists()).toBe(true);
      expect(refreshBtn.text()).toContain("Refresh");
    });
  });

  describe("Data loading", () => {
    it("fetches deployments on mount", async () => {
      const { deploymentsApi } = await import("@/services/api");
      mountView();
      await flushPromises();
      expect(deploymentsApi.list).toHaveBeenCalled();
    });
  });

  describe("Modal toggles", () => {
    it("opens new deployment modal when button clicked", async () => {
      const wrapper = mountView();
      const newBtn = wrapper.find("button.btn-primary");
      await newBtn.trigger("click");
      expect((wrapper.vm as any).showNewDeploymentModal).toBe(true);
    });
  });

  describe("Column definitions", () => {
    it("defines correct table columns", () => {
      const wrapper = mountView();
      const columns = (wrapper.vm as any).columns;
      expect(columns).toContainEqual(expect.objectContaining({ key: "status" }));
      expect(columns).toContainEqual(expect.objectContaining({ key: "name" }));
      expect(columns).toContainEqual(expect.objectContaining({ key: "services" }));
      expect(columns).toContainEqual(expect.objectContaining({ key: "ports" }));
      expect(columns).toContainEqual(expect.objectContaining({ key: "actions" }));
    });
  });

  describe("Helper functions", () => {
    it("getServiceClass returns correct class for database images", () => {
      const wrapper = mountView();
      expect((wrapper.vm as any).getServiceClass({ image: "mysql:8.0" })).toBe("database");
      expect((wrapper.vm as any).getServiceClass({ image: "postgres:14" })).toBe("database");
      expect((wrapper.vm as any).getServiceClass({ image: "mariadb:10" })).toBe("database");
    });

    it("getServiceClass returns correct class for cache images", () => {
      const wrapper = mountView();
      expect((wrapper.vm as any).getServiceClass({ image: "redis:alpine" })).toBe("cache");
    });

    it("getServiceClass returns correct class for proxy images", () => {
      const wrapper = mountView();
      expect((wrapper.vm as any).getServiceClass({ image: "nginx:alpine" })).toBe("proxy");
      expect((wrapper.vm as any).getServiceClass({ image: "traefik:v2" })).toBe("proxy");
    });

    it("getServiceClass returns app for other images", () => {
      const wrapper = mountView();
      expect((wrapper.vm as any).getServiceClass({ image: "node:18" })).toBe("app");
    });

    it("hasDatabase detects database services", async () => {
      const wrapper = mountView();
      await flushPromises();
      const deploymentWithDb = {
        services: [{ image: "mysql:8.0" }],
      };
      expect((wrapper.vm as any).hasDatabase(deploymentWithDb)).toBe(true);
    });

    it("getDatabaseType returns correct database type", () => {
      const wrapper = mountView();
      expect((wrapper.vm as any).getDatabaseType({ services: [{ image: "mysql:8" }] })).toBe("MySQL");
      expect((wrapper.vm as any).getDatabaseType({ services: [{ image: "postgres:14" }] })).toBe("PostgreSQL");
      expect((wrapper.vm as any).getDatabaseType({ services: [{ image: "mariadb:10" }] })).toBe("MariaDB");
    });

    it("getHealthyCount returns correct counts", () => {
      const wrapper = mountView();
      const deployment = {
        services: [
          { status: "running", health: "healthy" },
          { status: "exited", health: "unhealthy" },
          { status: "running" },
        ],
      };
      const result = (wrapper.vm as any).getHealthyCount(deployment);
      expect(result.total).toBe(3);
      expect(result.healthy).toBe(2);
    });

    it("getPortMappings extracts port mappings correctly", () => {
      const wrapper = mountView();
      const deployment = {
        services: [{ ports: ["8080:80", "0.0.0.0:3000->3000/tcp"] }],
      };
      const mappings = (wrapper.vm as any).getPortMappings(deployment);
      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings[0]).toHaveProperty("host");
      expect(mappings[0]).toHaveProperty("container");
    });
  });

  describe("Time formatting", () => {
    it("formatRelativeTime returns 'just now' for recent times", () => {
      const wrapper = mountView();
      const now = new Date().toISOString();
      expect((wrapper.vm as any).formatRelativeTime(now)).toBe("just now");
    });
  });
});
