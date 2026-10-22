import { flushPromises, mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewDeploymentPanel from "./NewDeploymentPanel.vue";
import deploymentsFixture from "./fixtures/deployments.json";
import templatesFixture from "./fixtures/templates.json";
import settingsFixture from "./fixtures/settings.json";
import generateGhostFixture from "./fixtures/generate-ghost.json";
import { deploymentsApi, settingsApi, templatesApi } from "@/services/api";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    deploymentsApi: { list: vi.fn(), create: vi.fn() },
    settingsApi: { get: vi.fn(), generateSubdomain: vi.fn() },
    templatesApi: { list: vi.fn(), generateCompose: vi.fn() },
  };
});

vi.mock("@/composables/useDeploymentJob", () => ({ rememberDeploymentJob: vi.fn() }));

function mountPanel(initialMode: "git" | "image" | "easy" | "compose") {
  return mount(NewDeploymentPanel, {
    props: { visible: true, initialMode },
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })], stubs: { teleport: true } },
  });
}

async function fill(wrapper: ReturnType<typeof mountPanel>, field: string, value: string) {
  await wrapper.get(`[name="${field}"]`).setValue(value);
}

async function deploy(wrapper: ReturnType<typeof mountPanel>) {
  await wrapper.get("form").trigger("submit");
  await flushPromises();
}

describe("NewDeploymentPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deploymentsApi.list).mockResolvedValue({ data: deploymentsFixture } as any);
    vi.mocked(deploymentsApi.create).mockResolvedValue({ data: {} } as any);
    vi.mocked(settingsApi.get).mockResolvedValue({ data: settingsFixture } as any);
    vi.mocked(templatesApi.list).mockResolvedValue({ data: templatesFixture } as any);
    vi.mocked(templatesApi.generateCompose).mockResolvedValue({ data: generateGhostFixture } as any);
  });

  it("names a git deployment after its repository and starts it from the source", async () => {
    const wrapper = mountPanel("git");
    await flushPromises();

    await fill(wrapper, "repo", "https://github.com/acme/Shop-API.git");
    await fill(wrapper, "branch", "release");
    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe("shop-api");

    await deploy(wrapper);

    expect(deploymentsApi.create).toHaveBeenCalledWith({
      name: "shop-api",
      compose_content: "",
      template_id: undefined,
      env_vars: [],
      auto_start: true,
      use_shared_database: false,
      existing_database_container: undefined,
      source: {
        type: "git",
        ref: "https://github.com/acme/Shop-API.git",
        branch: "release",
        subpath: undefined,
        auto_deploy: true,
      },
      metadata: {
        name: "shop-api",
        type: "web",
        networking: { expose: false, domain: "", container_port: 80, protocol: "http" },
        ssl: { enabled: false, auto_cert: false },
        healthcheck: { path: "/health", interval: "30s" },
        domains: undefined,
      },
    });
    expect(wrapper.emitted("created")).toEqual([["shop-api"]]);
  });

  it("writes a compose file for an image on the proxy network", async () => {
    const wrapper = mountPanel("image");
    await flushPromises();

    await fill(wrapper, "image", "ghcr.io/acme/web:1.4");
    await fill(wrapper, "port", "3000");
    await fill(wrapper, "env", "NODE_ENV=production\n# comment\nURL=https://a.example?x=1");
    await deploy(wrapper);

    const payload = vi.mocked(deploymentsApi.create).mock.calls[0][0];
    expect(payload.name).toBe("web");
    expect(payload.compose_content).toContain("image: ghcr.io/acme/web:1.4");
    expect(payload.compose_content).toContain('- "3000"');
    expect(payload.compose_content).toContain("proxy:\n    external: true");
    expect(payload.env_vars).toEqual([
      { key: "NODE_ENV", value: "production" },
      { key: "URL", value: "https://a.example?x=1" },
    ]);
    expect(payload.metadata.networking.container_port).toBe(3000);
  });

  it("generates the compose file for a picked template with its required mounts", async () => {
    const wrapper = mountPanel("easy");
    await flushPromises();

    await fill(wrapper, "template-search", "ghost");
    const options = wrapper.findAll('[role="option"]');
    expect(options.map((o) => o.find(".template-name").text())).toEqual(["Ghost"]);
    await options[0].trigger("click");
    await deploy(wrapper);

    expect(templatesApi.generateCompose).toHaveBeenCalledWith("ghost", {
      name: "ghost",
      container_port: 2368,
      map_ports: false,
      mounts: [{ id: "content", enabled: true, type: "file" }],
    });
    const payload = vi.mocked(deploymentsApi.create).mock.calls[0][0];
    expect(payload.template_id).toBe("ghost");
    expect(payload.compose_content).toBe(generateGhostFixture.content);
  });

  it("refuses a name that is already taken", async () => {
    const wrapper = mountPanel("image");
    await flushPromises();

    await fill(wrapper, "image", "nginx:alpine");
    await fill(wrapper, "name", deploymentsFixture.deployments[0].name);

    expect(wrapper.text()).toContain("A deployment with this name already exists.");
    expect(wrapper.get('button[type="submit"]').attributes("disabled")).toBeDefined();
    await deploy(wrapper);
    expect(deploymentsApi.create).not.toHaveBeenCalled();
  });

  it("keeps a name the user typed when the source changes", async () => {
    const wrapper = mountPanel("image");
    await flushPromises();

    await fill(wrapper, "name", "front");
    await fill(wrapper, "image", "nginx:alpine");

    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe("front");
  });
});
