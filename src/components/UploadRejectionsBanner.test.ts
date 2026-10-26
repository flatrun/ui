import { flushPromises, mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import { beforeEach, describe, expect, it, vi } from "vitest";
import UploadRejectionsBanner from "./UploadRejectionsBanner.vue";
import rejectionsFixture from "./fixtures/upload-rejections.json";
import domainsFixture from "./fixtures/domains.json";
import { deploymentsApi, notificationsApi } from "@/services/api";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    deploymentsApi: { getUploadRejections: vi.fn(), listDomains: vi.fn(), updateDomain: vi.fn() },
    notificationsApi: { getAccessEmailTargets: vi.fn() },
  };
});

const api = vi.mocked(deploymentsApi);

function mountBanner(canWrite = true) {
  return mount(UploadRejectionsBanner, {
    props: { deploymentName: "shop", services: [], canWrite },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn, stubActions: false })],
      stubs: { Teleport: true, Transition: false },
    },
  });
}

describe("UploadRejectionsBanner", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.getUploadRejections.mockResolvedValue({ data: rejectionsFixture } as any);
    api.listDomains.mockResolvedValue({ data: domainsFixture } as any);
    api.updateDomain.mockResolvedValue({ data: { message: "Domain updated successfully" } } as any);
    vi.mocked(notificationsApi.getAccessEmailTargets).mockResolvedValue({ data: { targets: [] } } as any);
  });

  it("states the refused count, the limit in force and where it happened", async () => {
    const wrapper = mountBanner();
    await flushPromises();

    expect(wrapper.text()).toContain("4 requests were refused as too large on shop.example.com");
    expect(wrapper.text()).toContain("The limit is 1 MB.");
    expect(wrapper.text()).toContain("/wp-admin/async-upload.php");
  });

  it("renders nothing when no request was refused", async () => {
    api.getUploadRejections.mockResolvedValue({ data: { rejections: [] } } as any);
    const wrapper = mountBanner();
    await flushPromises();

    expect(wrapper.find(".upload-rejections").exists()).toBe(false);
  });

  it("opens the refusing domain and saves the new limit to it", async () => {
    const wrapper = mountBanner();
    await flushPromises();

    await wrapper.find("button").trigger("click");
    await flushPromises();
    await wrapper.find("#upload-limit-amount").setValue("128");
    await wrapper.find("form").trigger("submit");
    await flushPromises();

    expect(api.updateDomain).toHaveBeenCalledWith(
      "shop",
      "site",
      expect.objectContaining({ client_max_body_size: "128m", domain: "shop.example.com" }),
    );
    expect(api.getUploadRejections).toHaveBeenCalledTimes(2);
  });

  it("hides the change button from read-only users", async () => {
    const wrapper = mountBanner(false);
    await flushPromises();

    expect(wrapper.find("button").exists()).toBe(false);
  });
});
