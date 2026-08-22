import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import ClusterView from "./ClusterView.vue";

vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({ hasPermission: () => true }),
}));

vi.mock("@/stores/notifications", () => ({
  useNotificationsStore: () => ({ success: vi.fn(), error: vi.fn() }),
}));

vi.mock("@/services/api", () => ({
  clusterApi: {
    getStatus: vi.fn(),
    getProviders: vi.fn(),
    updateProviders: vi.fn(),
    setup: vi.fn(),
    listPeers: vi.fn(),
    getPeerPolicy: vi.fn(),
    updatePeerPolicy: vi.fn(),
    createInvite: vi.fn(),
    acceptInvite: vi.fn(),
    removePeer: vi.fn(),
  },
}));

describe("ClusterView", () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    const { clusterApi } = await import("@/services/api");
    vi.mocked(clusterApi.getStatus)
      .mockResolvedValueOnce({ data: { enabled: false } } as any)
      .mockResolvedValue({ data: { enabled: true, server_name: "prod-1", peer_count: 0 } } as any);
    vi.mocked(clusterApi.setup).mockResolvedValue({
      data: { enabled: true, server_name: "prod-1", advertise_url: "https://prod-1.example.com:8090" },
    } as any);
    vi.mocked(clusterApi.listPeers).mockResolvedValue({ data: { peers: [] } } as any);
    vi.mocked(clusterApi.getProviders).mockResolvedValue({
      data: {
        orchestrators: [
          { id: "standalone", active: true, available: true },
          { id: "swarm", active: false, available: true },
          { id: "k3s", active: false, available: false, reason: "k3s adapter is not configured" },
        ],
        routing: [
          { id: "nginx", active: true, available: true },
          { id: "traefik", active: false, available: false, reason: "Traefik adapter is not configured" },
        ],
      },
    } as any);
    vi.mocked(clusterApi.updateProviders).mockResolvedValue({
      data: { orchestrator: "swarm", routing: "nginx" },
    } as any);
    vi.mocked(clusterApi.updatePeerPolicy).mockResolvedValue({ data: { peer: "prod-2", grants: [] } } as any);
  });

  const mountView = () =>
    mount(ClusterView, {
      global: {
        stubs: {
          BaseModal: {
            props: ["visible", "title"],
            template: '<div v-if="visible" class="test-modal"><slot /><slot name="footer" /></div>',
          },
        },
      },
    });

  it("offers guided setup when Fleet is disabled", async () => {
    const wrapper = mountView();
    await flushPromises();

    expect(wrapper.text()).toContain("Manage every server from one place");
    expect(wrapper.text()).toContain("Set up Fleet");
    expect(wrapper.text()).not.toContain("cluster: enabled");
  });

  it("enables Fleet through the setup API", async () => {
    const { clusterApi } = await import("@/services/api");
    const wrapper = mountView();
    await flushPromises();

    await wrapper.find(".disabled-state .btn-primary").trigger("click");
    await wrapper.find("#fleet-server-name").setValue("prod-1");
    await wrapper.find("#fleet-advertise-url").setValue("https://prod-1.example.com:8090");
    await wrapper.find("#fleet-setup-form").trigger("submit");
    await flushPromises();

    expect(clusterApi.setup).toHaveBeenCalledWith("prod-1", "https://prod-1.example.com:8090");
    expect(clusterApi.listPeers).toHaveBeenCalledOnce();
    expect(wrapper.text()).toContain("prod-1");
  });

  it("updates a peer resource lending policy through the modal", async () => {
    const { clusterApi } = await import("@/services/api");
    vi.mocked(clusterApi.getStatus).mockReset();
    vi.mocked(clusterApi.getStatus).mockResolvedValue({
      data: { enabled: true, server_name: "prod-1", peer_count: 1 },
    } as any);
    vi.mocked(clusterApi.listPeers).mockResolvedValue({
      data: {
        peers: [
          { name: "prod-2", url: "https://prod-2.example.com", online: true, last_seen: new Date().toISOString() },
        ],
      },
    } as any);
    vi.mocked(clusterApi.getPeerPolicy).mockResolvedValue({
      data: { peer: "prod-2", grants: [{ capability: "fleet.read" }] },
    } as any);
    const wrapper = mountView();
    await flushPromises();

    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Access"))!
      .trigger("click");
    await flushPromises();
    await wrapper.find('input[value="capacity.offer"]').setValue(true);
    await wrapper.find("#policy-cpu").setValue(2);
    await wrapper.find("#policy-memory").setValue(4);
    await wrapper.find("#policy-replicas").setValue(3);
    await wrapper.find("#peer-policy-form").trigger("submit");
    await flushPromises();

    expect(clusterApi.updatePeerPolicy).toHaveBeenCalledWith("prod-2", [
      { capability: "fleet.read" },
      { capability: "capacity.offer", max_cpu: 2, max_memory: 4 * 1024 ** 3, max_replicas: 3 },
    ]);
  });

  it("selects an available runtime provider through the modal", async () => {
    const { clusterApi } = await import("@/services/api");
    vi.mocked(clusterApi.getStatus).mockReset();
    vi.mocked(clusterApi.getStatus).mockResolvedValue({
      data: { enabled: true, server_name: "prod-1", peer_count: 0 },
    } as any);
    const wrapper = mountView();
    await flushPromises();

    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Configure"))!
      .trigger("click");
    expect(wrapper.text()).toContain("k3s adapter is not configured");
    expect(wrapper.find('input[value="k3s"]').attributes("disabled")).toBeDefined();
    await wrapper.find('input[value="swarm"]').setValue(true);
    await wrapper.find("#provider-form").trigger("submit");
    await flushPromises();

    expect(clusterApi.updateProviders).toHaveBeenCalledWith("swarm", "nginx");
  });
});
