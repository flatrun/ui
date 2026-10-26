import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ServiceSettingsForm from "./ServiceSettingsForm.vue";
import settingsFixture from "./fixtures/service-settings.json";
import jobFixture from "./fixtures/service-job.json";
import { deploymentsApi } from "@/services/api";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    deploymentsApi: { getServiceSettings: vi.fn(), updateServiceSettings: vi.fn(), serviceActionJob: vi.fn() },
  };
});

const api = vi.mocked(deploymentsApi);
let wrapper: VueWrapper;

async function mountForm(canWrite = true) {
  wrapper = mount(ServiceSettingsForm, {
    props: { deploymentName: "shop", service: "web", canWrite },
    global: { plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })] },
  });
  await flushPromises();
  return wrapper;
}

const field = (selector: string) => wrapper.find(selector).element as HTMLInputElement;

describe("ServiceSettingsForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getServiceSettings.mockResolvedValue({ data: settingsFixture } as any);
    api.updateServiceSettings.mockResolvedValue({ data: { ...settingsFixture, applied: false } } as any);
    api.serviceActionJob.mockResolvedValue({ data: jobFixture } as any);
    vi.stubGlobal(
      "WebSocket",
      class {
        close() {}
      },
    );
  });

  afterEach(() => {
    wrapper?.unmount();
    vi.unstubAllGlobals();
  });

  it("shows the saved settings and sends them back unchanged", async () => {
    await mountForm();
    expect(field("#svc-cpus").value).toBe("0.5");
    expect(field("#svc-memory").value).toBe("512");
    expect(field("#svc-restart").value).toBe("unless-stopped");
    expect(field("#svc-log-size").value).toBe("10");
    expect(field("#svc-command").value).toBe("php-fpm\n-F");

    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(api.updateServiceSettings).toHaveBeenCalledWith("shop", "web", settingsFixture.settings);
  });

  it("offers to recreate the service after saving and recreates it on request", async () => {
    await mountForm();
    await wrapper.find("#svc-memory").setValue("1");
    await wrapper.find('select[aria-label="Memory unit"]').setValue("g");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(api.updateServiceSettings.mock.calls[0][2].resources).toEqual({ cpus: "0.5", memory: "1g" });
    expect(wrapper.text()).toContain("keeps its old settings until it is recreated");

    const recreate = wrapper.findAll("button").find((b) => b.text() === "Recreate now");
    await recreate!.trigger("click");
    await flushPromises();

    expect(api.serviceActionJob).toHaveBeenCalledWith("shop", "web", "start", { force_recreate: true });
    expect(wrapper.text()).toContain("Recreating web");
  });

  it("clears a setting by sending the service without it", async () => {
    await mountForm();
    await wrapper.find("#svc-command").setValue("");
    await wrapper.find("#svc-restart").setValue("");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    const sent = api.updateServiceSettings.mock.calls[0][2];
    expect(sent.command).toBeUndefined();
    expect(sent.restart).toBeUndefined();
    expect(sent.environment).toEqual({ APP_ENV: "production", WORKERS: "4" });
  });

  it("refuses values the agent would reject", async () => {
    await mountForm();
    await wrapper.find("#svc-memory").setValue("4");
    expect(wrapper.text()).toContain("Memory limit must be at least 6 MB.");
    await wrapper.find("#svc-memory").setValue("512");
    await wrapper.find('[aria-label="Variable 1 name"]').setValue("1BAD");
    expect(wrapper.text()).toContain("Variable names may contain only letters");

    await wrapper.find("form").trigger("submit");
    await flushPromises();
    expect(api.updateServiceSettings).not.toHaveBeenCalled();
  });

  it("is read-only without write access", async () => {
    await mountForm(false);
    expect(field("#svc-cpus").disabled).toBe(true);
    expect(wrapper.findAll("button").some((b) => b.text() === "Save settings")).toBe(false);
  });
});
