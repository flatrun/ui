import { describe, it, expect, afterEach, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import DomainFormModal from "./DomainFormModal.vue";
import type { DomainConfig } from "@/types";
import { notificationsApi } from "@/services/api";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    notificationsApi: { ...actual.notificationsApi, getAccessEmailTargets: vi.fn() },
  };
});

let wrapper: VueWrapper;

const mountModal = (domain?: DomainConfig) => {
  wrapper = mount(DomainFormModal, {
    attachTo: document.body,
    props: {
      visible: true,
      domain: domain ?? null,
      services: [],
      deploymentName: "shop",
    },
  });
  return wrapper;
};

afterEach(() => {
  wrapper?.unmount();
  document.body.innerHTML = "";
  vi.mocked(notificationsApi.getAccessEmailTargets).mockReset();
});

describe("DomainFormModal routing-only hostnames", () => {
  it("hydrates existing routing-only hostnames into their own inputs", () => {
    mountModal({
      id: "d1",
      service: "web",
      container_port: 80,
      domain: "api.example.com",
      ssl: { enabled: true, auto_cert: true },
      route_only_aliases: ["dashboard.example.com"],
    });

    const inputs = Array.from(document.querySelectorAll<HTMLInputElement>("input")).map((i) => i.value);
    expect(inputs).toContain("dashboard.example.com");
  });

  it("emits routing-only hostnames separately from certificate-bearing aliases", async () => {
    const wrapper = mountModal({
      id: "d1",
      service: "web",
      container_port: 80,
      domain: "api.example.com",
      ssl: { enabled: true, auto_cert: true },
      aliases: ["www.example.com"],
      route_only_aliases: ["dashboard.example.com"],
    });

    document.querySelector<HTMLButtonElement>(".btn-primary")?.click();
    await wrapper.vm.$nextTick();

    const saved = wrapper.emitted("save")?.[0]?.[0] as DomainConfig;
    expect(saved.aliases).toEqual(["www.example.com"]);
    expect(saved.route_only_aliases).toEqual(["dashboard.example.com"]);
  });
});

describe("DomainFormModal static caching", () => {
  it("emits the static-cache toggle when enabled on the domain", async () => {
    const wrapper = mountModal({
      id: "d1",
      service: "web",
      container_port: 80,
      domain: "api.example.com",
      ssl: { enabled: false, auto_cert: false },
      static_cache: true,
    });

    document.querySelector<HTMLButtonElement>(".btn-primary")?.click();
    await wrapper.vm.$nextTick();

    const saved = wrapper.emitted("save")?.[0]?.[0] as DomainConfig;
    expect(saved.static_cache).toBe(true);
  });
});

describe("DomainFormModal visitor access", () => {
  it("loads the deployment's permitted email targets", async () => {
    vi.mocked(notificationsApi.getAccessEmailTargets).mockResolvedValue({
      data: { targets: [{ id: "smtp-primary", name: "Primary mail" }] },
    } as Awaited<ReturnType<typeof notificationsApi.getAccessEmailTargets>>);
    const wrapper = mountModal();
    await flushPromises();
    expect(notificationsApi.getAccessEmailTargets).toHaveBeenCalledWith("shop");
    const accessToggle = Array.from(document.querySelectorAll("label")).find((label) =>
      label.textContent?.includes("Require email verification"),
    );
    if (!accessToggle) throw new Error("Access toggle missing");
    const input = accessToggle.querySelector<HTMLInputElement>("input");
    if (!input) throw new Error("Access input missing");
    input.checked = true;
    input.dispatchEvent(new Event("change", { bubbles: true }));
    await wrapper.vm.$nextTick();
    expect(document.body.textContent).toContain("Primary mail");
  });

  it("preserves an email allowlist and session settings", async () => {
    const wrapper = mountModal({
      id: "d1",
      service: "web",
      container_port: 80,
      domain: "private.example.com",
      ssl: { enabled: true, auto_cert: true },
      access: {
        enabled: true,
        mode: "allowlist",
        allowed_emails: ["person@example.com"],
        email_target_id: "smtp-primary",
        session_hours: 48,
      },
    });

    document.querySelector<HTMLButtonElement>(".btn-primary")?.click();
    await wrapper.vm.$nextTick();

    const saved = wrapper.emitted("save")?.[0]?.[0] as DomainConfig;
    expect(saved.access).toEqual({
      enabled: true,
      mode: "allowlist",
      allowed_emails: ["person@example.com"],
      email_target_id: "smtp-primary",
      session_hours: 48,
    });
  });
});
