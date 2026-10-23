import { flushPromises, mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import NewProjectModal from "./NewProjectModal.vue";
import deploymentsFixture from "./fixtures/deployments.json";
import templatesFixture from "./fixtures/templates.json";
import settingsFixture from "./fixtures/settings.json";
import generateGhostFixture from "./fixtures/generate-ghost.json";
import credentialsFixture from "./fixtures/credentials.json";
import sourceCredentialsFixture from "./fixtures/source-credentials.json";
import containersFixture from "./fixtures/containers.json";
import {
  containersApi,
  credentialsApi,
  sourceCredentialsApi,
  deploymentsApi,
  settingsApi,
  templatesApi,
} from "@/services/api";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    deploymentsApi: { list: vi.fn(), create: vi.fn() },
    settingsApi: { get: vi.fn(), generateSubdomain: vi.fn() },
    templatesApi: { list: vi.fn(), generateCompose: vi.fn() },
    sourceCredentialsApi: { list: vi.fn() },
    credentialsApi: { list: vi.fn() },
    containersApi: { list: vi.fn() },
  };
});

vi.mock("@/composables/useDeploymentJob", () => ({ rememberDeploymentJob: vi.fn() }));

function mountModal(initialMode: "git" | "image" | "easy" | "compose") {
  return mount(NewProjectModal, {
    props: { visible: true, initialMode },
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })], stubs: { teleport: true } },
  });
}

async function fill(wrapper: ReturnType<typeof mountModal>, field: string, value: string) {
  await wrapper.get(`[name="${field}"]`).setValue(value);
}

async function deploy(wrapper: ReturnType<typeof mountModal>) {
  await wrapper.get("form").trigger("submit");
  await flushPromises();
}

describe("NewProjectModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(deploymentsApi.list).mockResolvedValue({ data: deploymentsFixture } as any);
    vi.mocked(deploymentsApi.create).mockResolvedValue({ data: {} } as any);
    vi.mocked(settingsApi.get).mockResolvedValue({ data: settingsFixture } as any);
    vi.mocked(templatesApi.list).mockResolvedValue({ data: templatesFixture } as any);
    vi.mocked(templatesApi.generateCompose).mockResolvedValue({ data: generateGhostFixture } as any);
    vi.mocked(sourceCredentialsApi.list).mockResolvedValue({ data: { credentials: [] } } as any);
    vi.mocked(credentialsApi.list).mockResolvedValue({ data: credentialsFixture } as any);
    vi.mocked(containersApi.list).mockResolvedValue({ data: containersFixture } as any);
  });

  it("names a git deployment after its repository and starts it from the source", async () => {
    const wrapper = mountModal("git");
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
    const wrapper = mountModal("image");
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
    const wrapper = mountModal("easy");
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
    const wrapper = mountModal("image");
    await flushPromises();

    await fill(wrapper, "image", "nginx:alpine");
    await fill(wrapper, "name", deploymentsFixture.deployments[0].name);

    expect(wrapper.text()).toContain("A deployment with this name already exists.");
    expect(wrapper.get('button[type="submit"]').attributes("disabled")).toBeDefined();
    await deploy(wrapper);
    expect(deploymentsApi.create).not.toHaveBeenCalled();
  });

  it("keeps a name the user typed when the source changes", async () => {
    const wrapper = mountModal("image");
    await flushPromises();

    await fill(wrapper, "name", "front");
    await fill(wrapper, "image", "nginx:alpine");

    expect((wrapper.get('[name="name"]').element as HTMLInputElement).value).toBe("front");
  });

  it("sets up a database, more domains and a registry login without the full wizard", async () => {
    const wrapper = mountModal("image");
    await flushPromises();
    expect(wrapper.text()).not.toContain("Open the full setup");

    await fill(wrapper, "image", "ghcr.io/acme/shop:1.4");
    await fill(wrapper, "domain", "shop.example.com");
    await wrapper
      .findAll(".link-button")
      .find((b) => b.text().includes("Add a domain"))!
      .trigger("click");
    await fill(wrapper, "extra-domain-0", "admin.example.com");
    await fill(wrapper, "extra-service-0", "admin");
    await fill(wrapper, "extra-port-0", "8080");

    await wrapper.get('[name="db-mode"]').setValue("existing");
    expect(wrapper.findAll('[name="db-container"] option').map((o) => o.text())).toEqual([
      "infra-postgres-1 (postgres:16-alpine)",
      "api-db-1 (mysql:8)",
    ]);
    await wrapper.get('[name="db-container"]').setValue("api-db-1");
    await fill(wrapper, "db-name", "shop");

    await wrapper.get('[name="registry-mode"]').setValue("4ab0d1c38614d900");
    await deploy(wrapper);

    const payload = vi.mocked(deploymentsApi.create).mock.calls[0][0] as Record<string, any>;
    expect(payload.existing_database_container).toBe("api-db-1");
    expect(payload.databases).toEqual([
      expect.objectContaining({
        type: "mysql",
        mode: "existing",
        existing_container: "api-db-1",
        database_name: "shop",
      }),
    ]);
    expect(payload.registry_credential).toEqual({ credential_id: "4ab0d1c38614d900" });
    expect(payload.metadata.domains.map((d: any) => [d.domain, d.service, d.container_port])).toEqual([
      ["shop.example.com", "shop", 80],
      ["admin.example.com", "admin", 8080],
    ]);
  });

  it("clones with a saved repository credential instead of a token", async () => {
    vi.mocked(sourceCredentialsApi.list).mockResolvedValue({ data: sourceCredentialsFixture } as any);
    const wrapper = mountModal("git");
    await flushPromises();

    await fill(wrapper, "repo", "https://github.com/acme/shop.git");
    await wrapper.get('[name="git-credential"]').setValue("2ab200de5551fc4b");
    expect(wrapper.find('[name="token"]').exists()).toBe(false);
    await deploy(wrapper);

    const payload = vi.mocked(deploymentsApi.create).mock.calls[0][0] as Record<string, any>;
    expect(payload.source.credential_id).toBe("2ab200de5551fc4b");
  });

  it("opens as a dialog with every source listed", async () => {
    const wrapper = mountModal("image");
    await flushPromises();

    expect(wrapper.find(".modal-container").exists()).toBe(true);
    const sources = wrapper.findAll(".source-list button");
    expect(sources.map((b) => b.get(".source-label").text())).toEqual([
      "GitHub",
      "Git repository",
      "Docker image",
      "Template",
      "Compose file",
    ]);
    expect(wrapper.get('.source-list [aria-current="true"]').text()).toContain("Docker image");
  });

  it("says no GitHub App is set up when Connect GitHub is clicked, and offers a repository URL", async () => {
    const wrapper = mountModal("git");
    await flushPromises();
    await wrapper.findAll(".source-list button")[0].trigger("click");

    expect(wrapper.find(".gh-missing").exists()).toBe(false);
    expect(wrapper.get('button[type="submit"]').attributes("disabled")).toBeDefined();
    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Connect GitHub")!
      .trigger("click");
    expect(wrapper.get(".gh-missing").text()).toContain("No GitHub App is connected");

    await wrapper.get(".gh-missing .link-button").trigger("click");
    expect(wrapper.find('[name="repo"]').exists()).toBe(true);
  });

  it("sums up what will be deployed next to the button", async () => {
    const wrapper = mountModal("image");
    await flushPromises();
    await fill(wrapper, "image", "ghcr.io/acme/web:1.2");
    expect(wrapper.get(".deploy-summary").text()).toContain("web");
    expect(wrapper.get(".deploy-summary").text()).toContain("ghcr.io/acme/web:1.2");
  });
});
