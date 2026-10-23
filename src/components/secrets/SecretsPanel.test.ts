import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import SecretsPanel from "./SecretsPanel.vue";
import SecretConnections from "./SecretConnections.vue";
import { secretsApi } from "@/services/api";
import listFixture from "./fixtures/list.json";
import setFixture from "./fixtures/set.json";
import rotationFixture from "./fixtures/rotation.json";
import rotateFixture from "./fixtures/rotate.json";
import providersFixture from "./fixtures/providers.json";
import connectionsFixture from "./fixtures/connections.json";
import connectionFixture from "./fixtures/connection.json";
import bindingsFixture from "./fixtures/bindings.json";
import bindingFixture from "./fixtures/binding.json";
import bindingErrorFixture from "./fixtures/binding-error.json";
import syncFixture from "./fixtures/sync.json";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  const fns = [
    "list",
    "set",
    "remove",
    "rotate",
    "setRotation",
    "clearRotation",
    "providers",
    "connections",
    "createConnection",
    "removeConnection",
    "bindings",
    "bind",
    "unbind",
    "sync",
  ];
  return { ...actual, secretsApi: Object.fromEntries(fns.map((f) => [f, vi.fn()])) };
});

const SCOPE = "deployment:phase-demo";
const global = { stubs: { RouterLink: { template: "<a><slot /></a>" } } };

function mountPanel() {
  return mount(SecretsPanel, { props: { scope: SCOPE, canWrite: true }, global });
}

async function fill(wrapper: ReturnType<typeof mount>, name: string, value: string) {
  await wrapper.get(`[name="${name}"]`).setValue(value);
}

describe("SecretsPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(secretsApi.list).mockResolvedValue({ data: listFixture } as any);
    vi.mocked(secretsApi.bindings).mockResolvedValue({ data: { items: [], total: 0 } } as any);
    vi.mocked(secretsApi.connections).mockResolvedValue({ data: connectionsFixture } as any);
    vi.mocked(secretsApi.providers).mockResolvedValue({ data: providersFixture } as any);
  });

  it("lists sealed secrets and offers rotation only where a generator is set", async () => {
    const wrapper = mountPanel();
    await flushPromises();

    const rows = wrapper.findAll(".list .item");
    expect(rows.map((r) => r.get(".name").text())).toEqual(["DB_PASSWORD", "STRIPE_KEY"]);
    expect(rows[0].text()).toContain("version 2");
    expect(rows[0].text()).toContain("rotates on 0 3 * * 0");
    expect(rows[0].text()).toContain("Rotate now");
    expect(rows[1].text()).not.toContain("Rotate now");
    expect(wrapper.text()).not.toContain("placeholder");
  });

  it("generates a secret and schedules its rotation", async () => {
    vi.mocked(secretsApi.set).mockResolvedValue({ data: setFixture } as any);
    vi.mocked(secretsApi.setRotation).mockResolvedValue({ data: rotationFixture } as any);
    const wrapper = mountPanel();
    await flushPromises();

    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Add secret")!
      .trigger("click");
    await fill(wrapper, "secret-name", "DB_PASSWORD");
    await wrapper.get('[name="secret-mode"]').setValue("generate");
    await fill(wrapper, "secret-length", "24");
    await wrapper.get('[name="secret-rotate"]').setValue(true);
    await wrapper.get("form.editor").trigger("submit");
    await flushPromises();

    expect(secretsApi.set).toHaveBeenCalledWith(SCOPE, "DB_PASSWORD", {
      generate: { length: 24, charset: "alphanumeric" },
    });
    expect(secretsApi.setRotation).toHaveBeenCalledWith(SCOPE, "DB_PASSWORD", {
      schedule: "0 3 * * 0",
      length: 24,
      charset: "alphanumeric",
    });
    expect(wrapper.find("form.editor").exists()).toBe(false);
  });

  it("rotates a secret and reports the new version", async () => {
    vi.mocked(secretsApi.rotate).mockResolvedValue({ data: rotateFixture } as any);
    const wrapper = mountPanel();
    await flushPromises();

    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Rotate now")!
      .trigger("click");
    await flushPromises();

    expect(secretsApi.rotate).toHaveBeenCalledWith(SCOPE, "DB_PASSWORD");
    expect(wrapper.get(".notice").text()).toBe("Rotated DB_PASSWORD to version 2.");
  });

  it("connects a secret manager and shows the key names it returned", async () => {
    vi.mocked(secretsApi.bind).mockResolvedValue({ data: bindingFixture } as any);
    const wrapper = mountPanel();
    await flushPromises();
    vi.mocked(secretsApi.bindings).mockResolvedValue({ data: bindingsFixture } as any);

    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Connect a source")!
      .trigger("click");
    expect(wrapper.findAll(".editor label").map((l) => l.text())).toEqual(["Project", "Config"]);
    await fill(wrapper, "bind-project", "shop");
    await fill(wrapper, "bind-config", "prd");
    await wrapper.get("form.editor").trigger("submit");
    await flushPromises();

    expect(secretsApi.bind).toHaveBeenCalledWith(SCOPE, "eade4a2a93416484", { project: "shop", config: "prd" });
    const source = wrapper.get(".item.source");
    expect(source.text()).toContain("doppler-prod");
    expect(source.findAll(".keys code").map((k) => k.text())).toEqual(["SENTRY_DSN", "SMTP_HOST", "SMTP_PASSWORD"]);
  });

  it("syncs a source again", async () => {
    vi.mocked(secretsApi.bindings).mockResolvedValue({ data: bindingsFixture } as any);
    vi.mocked(secretsApi.sync).mockResolvedValue({ data: syncFixture } as any);
    const wrapper = mountPanel();
    await flushPromises();

    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Sync now")!
      .trigger("click");
    await flushPromises();

    expect(secretsApi.sync).toHaveBeenCalledWith("d3b070bab337e246");
    expect(wrapper.get(".notice").text()).toBe("Read 3 keys from doppler-prod.");
  });

  it("shows why a source could not be read", async () => {
    vi.mocked(secretsApi.bind).mockRejectedValue({ response: { status: 502, data: bindingErrorFixture } });
    const wrapper = mountPanel();
    await flushPromises();

    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Connect a source")!
      .trigger("click");
    await wrapper.get("form.editor").trigger("submit");
    await flushPromises();

    expect(wrapper.get(".error").text()).toContain("could not read from Doppler");
    expect(wrapper.find("form.editor").exists()).toBe(true);
  });

  it("hides every write control from a reader", async () => {
    vi.mocked(secretsApi.bindings).mockResolvedValue({ data: bindingsFixture } as any);
    const wrapper = mount(SecretsPanel, { props: { scope: SCOPE }, global });
    await flushPromises();

    const labels = wrapper.findAll("button").map((b) => b.text());
    expect(labels).not.toContain("Add secret");
    expect(labels).not.toContain("Rotate now");
    expect(labels).not.toContain("Sync now");
  });
});

describe("SecretConnections", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(secretsApi.connections).mockResolvedValue({ data: { items: [], total: 0 } } as any);
    vi.mocked(secretsApi.providers).mockResolvedValue({ data: providersFixture } as any);
    vi.mocked(secretsApi.createConnection).mockResolvedValue({ data: connectionFixture } as any);
  });

  it("asks for the fields the chosen provider needs", async () => {
    const wrapper = mount(SecretConnections, { props: { canWrite: true } });
    await flushPromises();

    await wrapper
      .findAll("button")
      .find((b) => b.text() === "Connect a secret manager")!
      .trigger("click");
    await wrapper.get('[name="connection-provider"]').setValue("infisical");
    expect(wrapper.findAll(".editor label").map((l) => l.text())).toEqual([
      "Site URL (optional)",
      "Client ID",
      "Client secret",
    ]);
    expect(wrapper.get('[name="connection-client_secret"]').attributes("type")).toBe("password");

    await wrapper.get('[name="connection-provider"]').setValue("doppler");
    await fill(wrapper, "connection-name", "doppler-prod");
    await fill(wrapper, "connection-token", "dp.st.example");
    vi.mocked(secretsApi.connections).mockResolvedValue({ data: connectionsFixture } as any);
    await wrapper.get("form.editor").trigger("submit");
    await flushPromises();

    expect(secretsApi.createConnection).toHaveBeenCalledWith({
      name: "doppler-prod",
      provider: "doppler",
      settings: { token: "dp.st.example" },
    });
    expect(wrapper.get(".item").text()).toContain("Doppler");
  });
});
