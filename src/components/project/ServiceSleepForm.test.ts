import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ServiceSleepForm from "./ServiceSleepForm.vue";
import sleepFixture from "./fixtures/service-sleep.json";
import deploymentFixture from "./fixtures/deployment-service-sleep.json";
import { deploymentsApi } from "@/services/api";
import type { SleepConfig } from "@/types";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return { ...actual, deploymentsApi: { updateServiceSleep: vi.fn() } };
});

const api = vi.mocked(deploymentsApi);
const saved = deploymentFixture.deployment.metadata.service_sleep.worker as SleepConfig;
let wrapper: VueWrapper;

function mountForm(props: Partial<{ config: SleepConfig; deploymentSleeps: boolean; canWrite: boolean }> = {}) {
  wrapper = mount(ServiceSleepForm, {
    props: { deploymentName: "shop", service: "worker", canWrite: true, ...props },
    global: { plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })] },
  });
  return wrapper;
}

const saveButton = () => wrapper.findAll("button").find((b) => b.text() === "Save")!;

describe("ServiceSleepForm", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.updateServiceSleep.mockResolvedValue({ data: sleepFixture } as any);
  });

  afterEach(() => wrapper?.unmount());

  it("shows the saved setting and that the service is asleep", () => {
    mountForm({ config: saved });
    expect((wrapper.find("#svc-sleep").element as HTMLInputElement).checked).toBe(true);
    expect((wrapper.find("#svc-sleep-minutes").element as HTMLInputElement).value).toBe("20");
    expect(wrapper.text()).toContain("Asleep now");
    expect(saveButton().attributes("disabled")).toBeDefined();
  });

  it("turns sleep on for the service and reports the change", async () => {
    mountForm();
    await wrapper.find("#svc-sleep").setValue(true);
    await wrapper.find("#svc-sleep-minutes").setValue(20);
    await saveButton().trigger("click");
    await flushPromises();

    expect(api.updateServiceSleep).toHaveBeenCalledWith("shop", "worker", { enabled: true, idle_minutes: 20 });
    expect(wrapper.emitted("changed")).toHaveLength(1);
  });

  it("refuses an idle time under five minutes", async () => {
    mountForm();
    await wrapper.find("#svc-sleep").setValue(true);
    await wrapper.find("#svc-sleep-minutes").setValue(2);
    expect(wrapper.text()).toContain("Idle time must be at least 5 minutes.");
    expect(saveButton().attributes("disabled")).toBeDefined();
  });

  it("explains that deployment-wide sleep takes precedence", () => {
    mountForm({ config: saved, deploymentSleeps: true });
    expect(wrapper.text()).toContain("The whole deployment sleeps when idle");
    expect(wrapper.find("#svc-sleep").exists()).toBe(false);
  });

  it("is read-only without write access", () => {
    mountForm({ config: saved, canWrite: false });
    expect((wrapper.find("#svc-sleep").element as HTMLInputElement).disabled).toBe(true);
    expect(wrapper.findAll("button").some((b) => b.text() === "Save")).toBe(false);
  });
});
