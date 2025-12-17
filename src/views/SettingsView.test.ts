import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import SettingsView from "./SettingsView.vue";

vi.mock("@/services/api", () => ({
  settingsApi: {
    get: vi.fn().mockResolvedValue({
      data: {
        settings: {
          deployments_path: "/var/lib/flatrun/deployments",
          api_port: 8080,
          enable_cors: true,
          allowed_origins: ["http://localhost:3000", "http://localhost:5173"],
          domain: {
            default_domain: "example.com",
            auto_subdomain: true,
            auto_ssl: true,
            subdomain_style: "words",
          },
          nginx: {
            enabled: true,
            image: "nginx:alpine",
            container_name: "nginx",
            config_path: "/etc/nginx/conf.d",
            reload_command: "nginx -s reload",
            external: false,
          },
          certbot: {
            enabled: true,
            image: "certbot/certbot",
            email: "admin@example.com",
            staging: false,
          },
          infrastructure: {
            default_proxy_network: "proxy",
            default_database_network: "database",
            database: {
              enabled: true,
              type: "mysql",
              container: "mysql",
              host: "mysql",
              port: 3306,
            },
            redis: {
              enabled: false,
              container: "redis",
              host: "redis",
              port: 6379,
            },
          },
        },
      },
    }),
    update: vi.fn().mockResolvedValue({ data: { message: "Updated" } }),
  },
  healthApi: {
    check: vi.fn().mockResolvedValue({
      data: { version: { version: "1.0.0" } },
    }),
  },
  templatesApi: {
    refresh: vi.fn().mockResolvedValue({
      data: { message: "Refreshed", count: 5 },
    }),
  },
}));

describe("SettingsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountView = () => {
    return mount(SettingsView, {
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
          }),
        ],
      },
    });
  };

  describe("View structure", () => {
    it("renders the settings view container", () => {
      const wrapper = mountView();
      expect(wrapper.find(".settings-view").exists()).toBe(true);
    });

    it("contains view header with tabs", () => {
      const wrapper = mountView();
      expect(wrapper.find(".view-header").exists()).toBe(true);
      expect(wrapper.find(".tabs").exists()).toBe(true);
    });
  });

  describe("Tab navigation", () => {
    it("displays all six tabs", () => {
      const wrapper = mountView();
      const tabs = wrapper.findAll(".tab");
      expect(tabs.length).toBe(6);
    });

    it("has General tab", () => {
      const wrapper = mountView();
      expect(wrapper.text()).toContain("General");
    });

    it("has Domain tab", () => {
      const wrapper = mountView();
      expect(wrapper.text()).toContain("Domain");
    });

    it("has Infrastructure tab", () => {
      const wrapper = mountView();
      expect(wrapper.text()).toContain("Infrastructure");
    });

    it("has Security tab", () => {
      const wrapper = mountView();
      expect(wrapper.text()).toContain("Security");
    });

    it("has Credentials tab", () => {
      const wrapper = mountView();
      expect(wrapper.text()).toContain("Credentials");
    });

    it("General tab is active by default", () => {
      const wrapper = mountView();
      const activeTab = wrapper.find(".tab.active");
      expect(activeTab.text()).toContain("General");
    });

    it("can switch to Domain tab", async () => {
      const wrapper = mountView();
      const tabs = wrapper.findAll(".tab");
      const domainTab = tabs.find((t) => t.text().includes("Domain"));
      await domainTab?.trigger("click");
      expect((wrapper.vm as any).activeTab).toBe("domain");
    });

    it("can switch to Infrastructure tab", async () => {
      const wrapper = mountView();
      const tabs = wrapper.findAll(".tab");
      const infraTab = tabs.find((t) => t.text().includes("Infrastructure"));
      await infraTab?.trigger("click");
      expect((wrapper.vm as any).activeTab).toBe("infrastructure");
    });
  });

  describe("General tab content", () => {
    it("displays System Information card", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.text()).toContain("System Information");
    });

    it("displays Agent Status", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.text()).toContain("Agent Status");
      expect(wrapper.text()).toContain("Online");
    });

    it("displays Quick Actions card", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.text()).toContain("Quick Actions");
    });

    it("has Test Connection action", () => {
      const wrapper = mountView();
      expect(wrapper.text()).toContain("Test Connection");
    });

    it("has Refresh Templates action", () => {
      const wrapper = mountView();
      expect(wrapper.text()).toContain("Refresh Templates");
    });

    it("has Refresh All action", () => {
      const wrapper = mountView();
      expect(wrapper.text()).toContain("Refresh All");
    });

    it("has Clear Cache action", () => {
      const wrapper = mountView();
      expect(wrapper.text()).toContain("Clear Cache");
    });

    it("displays Agent Configuration card", () => {
      const wrapper = mountView();
      expect(wrapper.text()).toContain("Agent Configuration");
    });

    it("shows Read-only badge on configuration", () => {
      const wrapper = mountView();
      expect(wrapper.text()).toContain("Read-only");
    });
  });

  describe("Data loading", () => {
    it("fetches settings on mount", async () => {
      const { settingsApi } = await import("@/services/api");
      mountView();
      await flushPromises();
      expect(settingsApi.get).toHaveBeenCalled();
    });

    it("fetches agent version on mount", async () => {
      const { healthApi } = await import("@/services/api");
      mountView();
      await flushPromises();
      expect(healthApi.check).toHaveBeenCalled();
    });

    it("displays loading state initially", () => {
      const wrapper = mountView();
      expect((wrapper.vm as any).loading).toBe(true);
    });

    it("hides loading state after fetch", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect((wrapper.vm as any).loading).toBe(false);
    });
  });

  describe("Settings state", () => {
    it("populates settings after fetch", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect((wrapper.vm as any).settings.deployments_path).toBe("/var/lib/flatrun/deployments");
      expect((wrapper.vm as any).settings.api_port).toBe(8080);
    });

    it("populates domain settings", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect((wrapper.vm as any).domainSettings.default_domain).toBe("example.com");
      expect((wrapper.vm as any).domainSettings.auto_subdomain).toBe(true);
    });

    it("populates nginx settings", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect((wrapper.vm as any).nginxSettings.enabled).toBe(true);
      expect((wrapper.vm as any).nginxSettings.image).toBe("nginx:alpine");
    });

    it("populates infrastructure settings", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect((wrapper.vm as any).infrastructureSettings.database.enabled).toBe(true);
      expect((wrapper.vm as any).infrastructureSettings.database.type).toBe("mysql");
    });
  });

  describe("Domain tab", () => {
    it("displays domain configuration form", async () => {
      const wrapper = mountView();
      await flushPromises();
      await wrapper.find(".tab:nth-child(2)").trigger("click");
      expect(wrapper.text()).toContain("Domain Configuration");
    });

    it("has Default Domain input", async () => {
      const wrapper = mountView();
      await flushPromises();
      await wrapper.find(".tab:nth-child(2)").trigger("click");
      expect(wrapper.text()).toContain("Default Domain");
    });

    it("has Subdomain Style selector", async () => {
      const wrapper = mountView();
      await flushPromises();
      await wrapper.find(".tab:nth-child(2)").trigger("click");
      expect(wrapper.text()).toContain("Subdomain Style");
    });

    it("has Auto Subdomain toggle", async () => {
      const wrapper = mountView();
      await flushPromises();
      await wrapper.find(".tab:nth-child(2)").trigger("click");
      expect(wrapper.text()).toContain("Auto Subdomain");
    });

    it("has Auto SSL toggle", async () => {
      const wrapper = mountView();
      await flushPromises();
      await wrapper.find(".tab:nth-child(2)").trigger("click");
      expect(wrapper.text()).toContain("Auto SSL");
    });

    it("has Save Changes button", async () => {
      const wrapper = mountView();
      await flushPromises();
      await wrapper.find(".tab:nth-child(2)").trigger("click");
      expect(wrapper.text()).toContain("Save Changes");
    });
  });

  describe("Infrastructure tab", () => {
    it("displays Networks section", async () => {
      const wrapper = mountView();
      await flushPromises();
      await wrapper.find(".tab:nth-child(3)").trigger("click");
      expect(wrapper.text()).toContain("Networks");
    });

    it("displays Nginx section", async () => {
      const wrapper = mountView();
      await flushPromises();
      await wrapper.find(".tab:nth-child(3)").trigger("click");
      expect(wrapper.text()).toContain("Nginx");
    });

    it("displays SSL / Certbot section", async () => {
      const wrapper = mountView();
      await flushPromises();
      await wrapper.find(".tab:nth-child(3)").trigger("click");
      expect(wrapper.text()).toContain("SSL / Certbot");
    });

    it("displays Shared Database section", async () => {
      const wrapper = mountView();
      await flushPromises();
      await wrapper.find(".tab:nth-child(3)").trigger("click");
      expect(wrapper.text()).toContain("Shared Database");
    });

    it("displays Shared Redis section", async () => {
      const wrapper = mountView();
      await flushPromises();
      await wrapper.find(".tab:nth-child(3)").trigger("click");
      expect(wrapper.text()).toContain("Shared Redis");
    });

    it("has Save Infrastructure Settings button", async () => {
      const wrapper = mountView();
      await flushPromises();
      await wrapper.find(".tab:nth-child(3)").trigger("click");
      expect(wrapper.text()).toContain("Save Infrastructure Settings");
    });
  });

  describe("Quick actions", () => {
    it("testConnection calls health API", async () => {
      const { healthApi } = await import("@/services/api");
      const wrapper = mountView();
      await flushPromises();
      await (wrapper.vm as any).testConnection();
      expect(healthApi.check).toHaveBeenCalled();
    });

    it("refreshTemplates calls templates API", async () => {
      const { templatesApi } = await import("@/services/api");
      const wrapper = mountView();
      await flushPromises();
      await (wrapper.vm as any).refreshTemplates();
      expect(templatesApi.refresh).toHaveBeenCalled();
    });
  });

  describe("Tab definitions", () => {
    it("has correct tab structure", () => {
      const wrapper = mountView();
      expect((wrapper.vm as any).tabs).toEqual([
        { id: "general", label: "General", icon: "pi pi-home" },
        { id: "domain", label: "Domain", icon: "pi pi-globe" },
        { id: "infrastructure", label: "Infrastructure", icon: "pi pi-server" },
        { id: "security", label: "Security & Monitoring", icon: "pi pi-shield" },
        { id: "healthchecks", label: "Health Checks", icon: "pi pi-heart" },
        { id: "credentials", label: "Credentials", icon: "pi pi-key" },
      ]);
    });
  });
});
