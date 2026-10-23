import { flushPromises, mount, RouterLinkStub } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeploysTab from "./DeploysTab.vue";
import deploysFixture from "./fixtures/deploys.json";
import webhookFixture from "./fixtures/webhook.json";
import rotateFixture from "./fixtures/rotate.json";
import sourceFixture from "./fixtures/source.json";
import historyFixture from "./fixtures/history.json";
import logsFixture from "./fixtures/logs.json";
import { deploymentsApi, publicAgentUrl } from "@/services/api";
import { useTheme } from "@/composables/useTheme";
import { useAuthStore } from "@/stores/auth";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    deploymentsApi: {
      deploys: vi.fn(),
      environments: vi.fn(),
      webhook: vi.fn(),
      rotateWebhook: vi.fn(),
      updateSource: vi.fn(),
      updateSleep: vi.fn(),
      createEnvironment: vi.fn(),
      deployLogs: vi.fn(),
    },
  };
});

const api = vi.mocked(deploymentsApi);

function mountTab(props: Record<string, unknown> = {}) {
  return mount(DeploysTab, {
    props: { deploymentName: "hello-web", source: sourceFixture, jobRunning: false, ...props },
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })], stubs: { RouterLink: RouterLinkStub } },
  });
}

describe("DeploysTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useTheme().setStyle("oak");
    api.deploys.mockResolvedValue({ data: deploysFixture } as any);
    api.environments.mockResolvedValue({ data: { environments: [] } } as any);
    api.webhook.mockResolvedValue({ data: webhookFixture } as any);
    api.rotateWebhook.mockResolvedValue({ data: rotateFixture } as any);
    api.updateSource.mockResolvedValue({ data: { source: sourceFixture } } as any);
    api.updateSleep.mockResolvedValue({ data: { sleep: { enabled: true, idle_minutes: 20, sleeping: false } } } as any);
  });

  it("offers a rollback only to revisions other than the running one", async () => {
    const wrapper = mountTab();
    await flushPromises();

    const rows = wrapper.findAll("tbody tr");
    expect(rows).toHaveLength(2);
    expect(rows[0].text()).toContain("26fd8038ac73");
    expect(rows[0].text()).toContain("Running");
    expect(rows[0].text()).not.toContain("Roll back");

    const rollback = rows[1].findAll("button").find((b) => b.text().includes("Roll back"));
    await rollback!.trigger("click");
    expect(wrapper.emitted("rollback")).toEqual([["9d8fcbeeeaf9dc1f"]]);
  });

  it("shows the webhook addresses and reveals a new secret once", async () => {
    const wrapper = mountTab();
    await flushPromises();

    expect(wrapper.text()).toContain(publicAgentUrl("/api/hooks/github/hello-web"));
    expect(wrapper.text()).toContain("No secret yet.");

    const create = wrapper.findAll("button").find((b) => b.text() === "Create secret");
    await create!.trigger("click");
    await flushPromises();

    expect(api.rotateWebhook).toHaveBeenCalledWith("hello-web");
    expect(wrapper.text()).toContain("your-webhook-secret-here");
    expect(wrapper.text()).toContain("Replace secret");
  });

  it("turns deploy on push off through the source endpoint", async () => {
    const wrapper = mountTab();
    await flushPromises();

    const toggle = wrapper.findAll(".toggles input[type=checkbox]")[0];
    await toggle.setValue(false);
    await flushPromises();

    expect(api.updateSource).toHaveBeenCalledWith("hello-web", { auto_deploy: false });
    expect(wrapper.emitted("changed")).toHaveLength(1);
  });

  it("saves sleep settings for a deployment without a git source", async () => {
    const wrapper = mountTab({ source: undefined });
    await flushPromises();

    expect(api.deploys).not.toHaveBeenCalled();
    expect(wrapper.text()).toContain("not created from a repository");

    await wrapper.find(".deploys-tab > .base-card:last-child input[type=checkbox]").setValue(true);
    await wrapper.find("input[type=number]").setValue(20);
    const save = wrapper.findAll("button").find((b) => b.text() === "Save");
    await save!.trigger("click");
    await flushPromises();

    expect(api.updateSleep).toHaveBeenCalledWith("hello-web", { enabled: true, idle_minutes: 20 });
  });

  describe("under Birch", () => {
    function mountBirch() {
      useTheme().setStyle("birch");
      api.deploys.mockResolvedValue({ data: historyFixture } as any);
      const pinia = createTestingPinia({ createSpy: vi.fn });
      vi.mocked(useAuthStore(pinia).hasPermission).mockReturnValue(true);
      return mount(DeploysTab, {
        props: { deploymentName: "phase-demo", source: sourceFixture, jobRunning: false },
        global: { plugins: [pinia], stubs: { RouterLink: RouterLinkStub, teleport: true } },
      });
    }

    it("leads with the active deploy and lists the rest as history", async () => {
      const wrapper = mountBirch();
      await flushPromises();

      const cards = wrapper.findAll(".deploy-cards .card");
      expect(cards).toHaveLength(2);
      expect(cards[0].classes()).toContain("lead");
      expect(cards[0].get(".badge").text()).toBe("Active");
      expect(cards[0].get(".message").text()).toBe("Add web and worker");
      expect(cards[0].get(".meta").text()).toContain("main@59c64a8");
      expect(cards[0].get(".card-foot").text()).toBe("Deploy successful");
      expect(cards[1].get(".badge").text()).toBe("Failed");
      expect(wrapper.find("table.history").exists()).toBe(false);
    });

    it("restarts or redeploys from the active deploy's menu", async () => {
      const wrapper = mountBirch();
      await flushPromises();

      const lead = wrapper.get(".card.lead");
      await lead.get(".more").trigger("click");
      const items = lead.findAll(".menu button");
      expect(items.map((b) => b.text())).toEqual(["Redeploy", "Restart"]);
      await items[1].trigger("click");
      expect(wrapper.emitted("restart")).toHaveLength(1);
    });

    it("opens a deploy's stored logs split into build and deploy", async () => {
      api.deployLogs.mockResolvedValue({ data: logsFixture } as any);
      const wrapper = mountBirch();
      await flushPromises();

      await wrapper
        .get(".card.lead")
        .findAll("button")
        .find((b) => b.text() === "View logs")!
        .trigger("click");
      await flushPromises();

      expect(api.deployLogs).toHaveBeenCalledWith("phase-demo", "d27c0fa31dcaa44b");
      const panel = wrapper.get(".deploy-logs");
      expect(panel.findAll(".step").map((s) => s.classes().includes("done"))).toEqual([true, true, true, true]);
      expect(panel.get(".log-tab.active").text()).toBe("Deploy logs");
      expect(panel.text()).toContain("Container phase-demo-worker-2 Started");
      await panel.findAll(".log-tab")[0].trigger("click");
      expect(panel.text()).toContain("Source 59c64a8 synced, rebuilding");
    });
  });
});
