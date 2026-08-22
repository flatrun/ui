import { flushPromises, mount } from "@vue/test-utils";
import { beforeEach, describe, expect, it, vi } from "vitest";
import DeploymentServicesTab from "./DeploymentServicesTab.vue";

const { success, update } = vi.hoisted(() => ({ success: vi.fn(), update: vi.fn() }));

vi.mock("@/stores/notifications", () => ({
  useNotificationsStore: () => ({ success }),
}));

vi.mock("@/services/api", () => ({
  deploymentsApi: { update },
}));

vi.mock("@/composables/usePlanFlow", () => ({
  usePlanFlow: () => ({
    runGuarded: (execute: () => Promise<unknown>) => execute(),
  }),
}));

describe("DeploymentServicesTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    update.mockResolvedValue({ data: { message: "Deployment updated" } });
  });

  const modalStub = {
    props: ["visible"],
    template: '<div v-if="visible"><slot /><slot name="footer" /></div>',
  };

  it("updates a service image through the deployment API", async () => {
    const wrapper = mount(DeploymentServicesTab, {
      props: {
        deployment: "shop",
        composeContent: "services:\n  web:\n    image: nginx:1.25\n",
        services: [{ name: "web", image: "nginx:1.25", status: "running", ports: ["80/tcp"] }],
        canWrite: true,
      },
      global: { stubs: { BaseModal: modalStub } },
    });

    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Edit image"))!
      .trigger("click");
    await wrapper.find("#service-image").setValue("nginx:1.27");
    await wrapper.find("#service-image-form").trigger("submit");
    await flushPromises();

    expect(update).toHaveBeenCalledWith("shop", {
      compose_content: "services:\n  web:\n    image: nginx:1.27\n",
    });
    expect(wrapper.emitted("saved")?.[0]).toEqual(["services:\n  web:\n    image: nginx:1.27\n"]);
  });

  it("does not expose edit controls without write access", () => {
    const wrapper = mount(DeploymentServicesTab, {
      props: {
        deployment: "shop",
        composeContent: "services:\n  web:\n    image: nginx:1.25\n",
        services: [{ name: "web", image: "nginx:1.25", status: "running" }],
        canWrite: false,
      },
      global: { stubs: { BaseModal: modalStub } },
    });

    expect(wrapper.text()).not.toContain("Edit image");
    expect(wrapper.text()).not.toContain("Compose editor");
  });
});
