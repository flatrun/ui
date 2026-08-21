import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import DeploymentDiagnosticsModal from "./DeploymentDiagnosticsModal.vue";
import { deploymentsApi, securityApi } from "@/services/api";

vi.mock("@/services/api", () => ({
  deploymentsApi: { diagnostics: vi.fn() },
  securityApi: { unblockIP: vi.fn() },
}));

const diagnostics = {
  deployment: "shop",
  healthy: false,
  checked_at: "2026-08-21T10:00:00Z",
  steps: [
    {
      id: "application",
      label: "Application endpoint",
      status: "passed",
      detail: "GET /health returned HTTP 200.",
      checked_at: "2026-08-21T10:00:00Z",
    },
    {
      id: "security",
      label: "Security decision",
      status: "failed",
      detail: "Request from 203.0.113.10 was denied by an active IP block.",
      action: "unblock_ip",
      value: "203.0.113.10",
      checked_at: "2026-08-21T10:00:00Z",
    },
  ],
};

let wrapper: VueWrapper;

beforeEach(() => {
  vi.clearAllMocks();
  vi.mocked(deploymentsApi.diagnostics).mockResolvedValue({ data: diagnostics } as any);
  vi.mocked(securityApi.unblockIP).mockResolvedValue({ data: {} } as any);
});

afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = "";
});

describe("DeploymentDiagnosticsModal", () => {
  it("shows the failed layer and its remediation", async () => {
    wrapper = mount(DeploymentDiagnosticsModal, {
      attachTo: document.body,
      props: { visible: false, deploymentName: "shop" },
    });
    await wrapper.setProps({ visible: true });
    await flushPromises();

    expect(document.body.textContent).toContain("Application endpoint");
    expect(document.body.textContent).toContain("Security decision");
    expect(document.body.textContent).toContain("Unblock IP");
  });

  it("unblocks the reported address and reruns the checks", async () => {
    wrapper = mount(DeploymentDiagnosticsModal, {
      attachTo: document.body,
      props: { visible: false, deploymentName: "shop" },
    });
    await wrapper.setProps({ visible: true });
    await flushPromises();

    const button = Array.from(document.querySelectorAll("button")).find((item) =>
      item.textContent?.includes("Unblock IP"),
    );
    button?.click();
    await flushPromises();

    expect(securityApi.unblockIP).toHaveBeenCalledWith("203.0.113.10");
    expect(deploymentsApi.diagnostics).toHaveBeenCalledTimes(2);
  });

  it("looks up the incident ID shown to a visitor", async () => {
    wrapper = mount(DeploymentDiagnosticsModal, {
      attachTo: document.body,
      props: { visible: false, deploymentName: "shop" },
    });
    await wrapper.setProps({ visible: true });
    await flushPromises();

    const input = document.querySelector<HTMLInputElement>("#diagnostic-incident-id");
    if (!input) throw new Error("incident input not found");
    input.value = "fr-1234abcdef56";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    document.querySelector("form")?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
    await flushPromises();

    expect(deploymentsApi.diagnostics).toHaveBeenLastCalledWith("shop", "FR-1234ABCDEF56");
  });
});
