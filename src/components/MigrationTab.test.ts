import { describe, expect, it, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import MigrationTab from "./MigrationTab.vue";
import { migrationsApi } from "@/services/api";

vi.mock("@/services/api", () => ({
  migrationsApi: {
    get: vi.fn().mockResolvedValue({ data: { migration: { plan: null, retirement_ready: false, blockers: [] } } }),
    update: vi.fn().mockResolvedValue({ data: { migration: { plan: null, retirement_ready: false, blockers: [] } } }),
    checkDns: vi.fn(),
  },
}));

describe("MigrationTab", () => {
  it("saves the source inventory and transfer state", async () => {
    const wrapper = mount(MigrationTab, {
      props: { deploymentName: "shop" },
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
    });
    await new Promise((resolve) => setTimeout(resolve, 0));
    const vm = wrapper.vm as any;
    vm.plan.source = "legacy";
    vm.plan.inventory_complete = true;
    vm.addSite();
    vm.plan.sites[0].hostname = "shop.example.com";
    vm.markTransfer();
    await vm.save();
    expect(migrationsApi.update).toHaveBeenCalledWith(
      "shop",
      expect.objectContaining({
        source: "legacy",
        inventory_complete: true,
        sites: [expect.objectContaining({ hostname: "shop.example.com", transferred: true })],
      }),
    );
  });
});
