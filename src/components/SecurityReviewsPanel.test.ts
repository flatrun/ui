import { beforeEach, describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import SecurityReviewsPanel from "./SecurityReviewsPanel.vue";
import profileFixture from "./fixtures/security-profile.json";

const controls = vi.hoisted(() => ({ write: false, approveOnly: false }));
const api = vi.hoisted(() => ({
  profile: vi.fn(),
  reports: vi.fn(),
  findings: vi.fn(),
  closeFinding: vi.fn(),
  proposal: vi.fn(),
  save: vi.fn(),
  generate: vi.fn(),
  import: vi.fn(),
  propose: vi.fn(),
  approve: vi.fn(),
  run: vi.fn(),
  evidence: vi.fn(),
  hold: vi.fn(),
}));
vi.mock("@/services/securityReviews", () => ({ securityReviewsApi: api }));
vi.mock("@/stores/auth", () => ({
  useAuthStore: () => ({
    hasPermission: (permission: string) =>
      permission.endsWith(":read") ||
      controls.write ||
      (controls.approveOnly && permission === "security_profiles:approve"),
    canAccessDeployment: (_name: string, level: string) => level === "read" || controls.write || controls.approveOnly,
  }),
}));

describe("Security reviews", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    controls.write = false;
    controls.approveOnly = false;
    api.profile.mockResolvedValue({ data: profileFixture });
    api.reports.mockResolvedValue({ data: { reports: [] } });
    api.findings.mockResolvedValue({ data: { findings: [] } });
  });
  it("shows unknown coverage and hides mutation controls for a reader", async () => {
    const wrapper = mount(SecurityReviewsPanel, { props: { name: "shop" } });
    await flushPromises();
    expect(wrapper.text()).toContain("Application authorization coverage is unknown");
    expect(wrapper.text()).toContain("object_authorization");
    expect(wrapper.text()).not.toContain("Approve exact revision");
    expect(wrapper.findAll("button").some((button) => button.text() === "Create profile")).toBe(false);
    wrapper.unmount();
  });
  it("lets an owner review an existing proposal without edit permission", async () => {
    controls.approveOnly = true;
    const ready = {
      id: "ready",
      source: "template",
      status: "ready",
      base_revision: "",
      deployment_revision: profileFixture.discovery.revision,
      profile_revision: "proposed",
      profile: profileFixture.suggested_profile,
    };
    api.profile.mockResolvedValue({
      data: { ...profileFixture, ready_proposals: [ready], assistant_available: false },
    });
    api.approve.mockResolvedValue({ data: {} });
    const wrapper = mount(SecurityReviewsPanel, { props: { name: "shop" }, attachTo: document.body });
    await flushPromises();
    expect(wrapper.text()).not.toContain("Create with agent");
    const review = wrapper.findAll("button").find((button) => button.text() === "Review template proposal ready");
    expect(review).toBeDefined();
    await review!.trigger("click");
    await flushPromises();
    const approve = Array.from(document.body.querySelectorAll("button")).find(
      (button) => button.textContent?.trim() === "Approve exact revision",
    );
    expect(approve).toBeDefined();
    approve!.click();
    await flushPromises();
    expect(api.approve).toHaveBeenCalledWith("shop", ready);
    expect(api.propose).not.toHaveBeenCalled();
    wrapper.unmount();
  });
  it("clears old evidence when another evidence request fails", async () => {
    api.reports.mockResolvedValue({
      data: {
        reports: [
          {
            id: "run",
            status: "partial",
            mode: "full",
            requested_at: "2026-10-31T12:00:00Z",
            completed_at: null,
            model_status: "unavailable",
            delivery_status: "not_configured",
            hold: false,
            coverage: [],
            limitations: [],
            findings: [
              {
                id: "one",
                classification: "suspicious_condition",
                concern: "integrity",
                signal: "first",
                evidence_id: "first",
              },
              {
                id: "two",
                classification: "suspicious_condition",
                concern: "integrity",
                signal: "second",
                evidence_id: "second",
              },
            ],
          },
        ],
      },
    });
    api.evidence
      .mockResolvedValueOnce({ data: { evidence: { marker: "first-evidence-marker" } } })
      .mockRejectedValueOnce(new Error("Evidence unavailable"));
    const wrapper = mount(SecurityReviewsPanel, { props: { name: "shop" }, attachTo: document.body });
    await flushPromises();
    await wrapper
      .findAll("button")
      .find((button) => button.text() === "View report")!
      .trigger("click");
    await flushPromises();
    const buttons = Array.from(document.body.querySelectorAll("button")).filter(
      (button) => button.textContent?.trim() === "Read restricted evidence",
    );
    buttons[0].click();
    await flushPromises();
    expect(document.body.textContent).toContain("first-evidence-marker");
    buttons[1].click();
    await flushPromises();
    expect(document.body.textContent).not.toContain("first-evidence-marker");
    expect(document.body.textContent).toContain("Evidence unavailable");
    wrapper.unmount();
  });
  it("opens a draft editor only after explicit intent", async () => {
    controls.write = true;
    const wrapper = mount(SecurityReviewsPanel, { props: { name: "shop" }, attachTo: document.body });
    await flushPromises();
    expect(document.body.querySelector("textarea")).toBeNull();
    const create = wrapper.findAll("button").find((button) => button.text() === "Create profile");
    expect(create).toBeDefined();
    await create!.trigger("click");
    const editor = document.body.querySelector("textarea")!;
    expect(JSON.parse(editor.value)).toEqual(profileFixture.suggested_profile);
    wrapper.unmount();
  });
});
