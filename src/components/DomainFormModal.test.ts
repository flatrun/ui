import { describe, it, expect, afterEach, vi } from "vitest";
import { flushPromises, mount, type VueWrapper } from "@vue/test-utils";
import DomainFormModal from "./DomainFormModal.vue";
import type { DomainConfig } from "@/types";
import { notificationsApi } from "@/services/api";
import domainsFixture from "./fixtures/domains.json";

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
    mountModal({
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
    mountModal({
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
    mountModal();
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
    mountModal({
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

  it("normalizes allowlist emails and rejects invalid session lengths", async () => {
    mountModal({
      id: "d1",
      service: "web",
      container_port: 80,
      domain: "private.example.com",
      ssl: { enabled: true, auto_cert: true },
      access: {
        enabled: true,
        mode: "allowlist",
        allowed_emails: ["Person@Example.com"],
        email_target_id: "smtp-primary",
        session_hours: 721,
      },
    });

    document.querySelector<HTMLButtonElement>(".btn-primary")?.click();
    await wrapper.vm.$nextTick();
    expect(wrapper.emitted("save")).toBeUndefined();

    const sessionInput = Array.from(document.querySelectorAll<HTMLInputElement>('input[type="number"]')).find(
      (input) => input.max === "720",
    );
    if (!sessionInput) throw new Error("Session input missing");
    sessionInput.value = "24";
    sessionInput.dispatchEvent(new Event("input", { bubbles: true }));
    await wrapper.vm.$nextTick();
    document.querySelector<HTMLButtonElement>(".btn-primary")?.click();
    await wrapper.vm.$nextTick();

    const saved = wrapper.emitted("save")?.[0]?.[0] as DomainConfig;
    expect(saved.access?.allowed_emails).toEqual(["person@example.com"]);
  });

  it("saves the chosen sign-in method and leaves it out for code and link", async () => {
    mountModal({
      id: "d1",
      service: "web",
      container_port: 80,
      domain: "private.example.com",
      ssl: { enabled: true, auto_cert: true },
      access: {
        enabled: true,
        mode: "any_verified",
        email_target_id: "smtp-primary",
        session_hours: 24,
        method: "code",
      },
    });
    const methodSelect = Array.from(document.querySelectorAll<HTMLSelectElement>("select")).find((select) =>
      Array.from(select.options).some((option) => option.value === "code"),
    );
    if (!methodSelect) throw new Error("Sign-in method select missing");
    expect(methodSelect.value).toBe("code");

    document.querySelector<HTMLButtonElement>(".btn-primary")?.click();
    await wrapper.vm.$nextTick();
    expect((wrapper.emitted("save")?.[0]?.[0] as DomainConfig).access?.method).toBe("code");

    methodSelect.value = "";
    methodSelect.dispatchEvent(new Event("change", { bubbles: true }));
    await wrapper.vm.$nextTick();
    document.querySelector<HTMLButtonElement>(".btn-primary")?.click();
    await wrapper.vm.$nextTick();
    expect(JSON.parse(JSON.stringify(wrapper.emitted("save")?.[1]?.[0])).access).not.toHaveProperty("method");
  });
});

describe("DomainFormModal request settings", () => {
  const [media, site] = domainsFixture.domains as DomainConfig[];

  const uploadAmount = () => document.querySelector<HTMLInputElement>("#upload-limit-amount")!;
  const uploadUnit = () => document.querySelector<HTMLSelectElement>('select[aria-label="Upload size unit"]')!;
  const setField = async (el: HTMLInputElement | HTMLSelectElement, value: string) => {
    el.value = value;
    el.dispatchEvent(new Event(el instanceof HTMLSelectElement ? "change" : "input", { bubbles: true }));
    await wrapper.vm.$nextTick();
  };
  const submit = async () => {
    document.querySelector<HTMLButtonElement>(".btn-primary")?.click();
    await wrapper.vm.$nextTick();
  };
  const lastSaved = () => {
    const events = wrapper.emitted("save") ?? [];
    return events[events.length - 1]?.[0] as DomainConfig | undefined;
  };

  it("keeps the upload limit, limit page and proxy timeout when a domain is saved unchanged", async () => {
    mountModal(media);
    expect(uploadAmount().value).toBe("64");
    await submit();

    expect(lastSaved()?.client_max_body_size).toBe("64m");
    expect(lastSaved()?.upload_limit_page).toBe(true);
    expect(lastSaved()?.proxy_timeout).toBe(120);
  });

  it("resends a limit stored in bytes exactly when it is not edited", async () => {
    mountModal({ ...site, client_max_body_size: "1500" });
    await submit();

    expect(lastSaved()?.client_max_body_size).toBe("1500");
  });

  it("sends a new limit in nginx size syntax", async () => {
    mountModal(site);
    await setField(uploadAmount(), "2");
    await setField(uploadUnit(), "g");
    await submit();

    expect(lastSaved()?.client_max_body_size).toBe("2g");
  });

  it("leaves the limit unset when the field is empty, so the server default applies", async () => {
    mountModal(site);
    await submit();

    expect(lastSaved()?.client_max_body_size).toBeUndefined();
  });

  it("refuses a limit the agent would reject", async () => {
    mountModal(site);
    await setField(uploadAmount(), "1.5");
    expect(document.body.textContent).toContain("Enter a whole number");
    await setField(uploadAmount(), "11");
    await setField(uploadUnit(), "g");
    expect(document.body.textContent).toContain("The largest limit is 10 GB.");
    await submit();

    expect(wrapper.emitted("save")).toBeUndefined();
  });

  it("explains why the request limit needs room above the per-file limit", () => {
    mountModal(site);

    expect(document.body.textContent).toContain("allow about 10% extra");
    expect(document.body.textContent).toContain("post_max_size");
  });
});

describe("DomainFormModal proxy settings", () => {
  const admin = (domainsFixture.domains as DomainConfig[]).find((d) => d.id === "admin")!;
  const site = (domainsFixture.domains as DomainConfig[]).find((d) => d.id === "site")!;

  const input = (label: string) => document.querySelector<HTMLInputElement>(`[aria-label="${label}"]`)!;
  const type = async (el: HTMLInputElement | HTMLTextAreaElement, value: string) => {
    el.value = value;
    el.dispatchEvent(new Event("input", { bubbles: true }));
    await wrapper.vm.$nextTick();
  };
  const toggle = async (text: string) => {
    const label = Array.from(document.querySelectorAll("label")).find((l) => l.textContent?.includes(text));
    const box = label?.querySelector<HTMLInputElement>("input");
    if (!box) throw new Error(`${text} toggle missing`);
    box.checked = !box.checked;
    box.dispatchEvent(new Event("change", { bubbles: true }));
    await wrapper.vm.$nextTick();
  };
  const clickButton = async (text: string) => {
    Array.from(document.querySelectorAll("button"))
      .find((b) => b.textContent?.trim() === text)
      ?.click();
    await wrapper.vm.$nextTick();
  };
  const submit = async () => {
    document.querySelector<HTMLButtonElement>(".btn-primary")?.click();
    await wrapper.vm.$nextTick();
  };
  const saved = () => {
    const events = wrapper.emitted("save") ?? [];
    return events[events.length - 1]?.[0] as DomainConfig | undefined;
  };

  it("keeps every stored setting and never sends the password hash back", async () => {
    mountModal(admin);
    await submit();

    const domain = saved()!;
    expect(domain.proxy_buffering).toBe(false);
    expect(domain.response_headers).toEqual({ "Cache-Control": "no-store" });
    expect(domain.canonical_redirect).toBe("primary");
    expect(domain.allow_ips).toEqual(["203.0.113.4", "10.0.0.0/8"]);
    expect(domain.basic_auth).toEqual({ enabled: true, users: [{ username: "alice" }] });
  });

  it("sends a new user's password and a changed one for a saved user", async () => {
    mountModal(admin);
    await type(input("User 1 password"), "rotated-pass");
    await clickButton("Add user");
    await type(input("User 2 name"), "bob");
    await type(input("User 2 password"), "bob-pass");
    await submit();

    expect(saved()?.basic_auth?.users).toEqual([
      { username: "alice", password: "rotated-pass" },
      { username: "bob", password: "bob-pass" },
    ]);
  });

  it("refuses a new user without a password", async () => {
    mountModal(site);
    await toggle("Require a username and password");
    await clickButton("Add user");
    await type(input("User 1 name"), "carol");

    expect(document.body.textContent).toContain("Set a password for carol.");
    await submit();
    expect(wrapper.emitted("save")).toBeUndefined();
  });

  it("refuses headers and addresses the proxy would reject", async () => {
    mountModal(site);
    await clickButton("Add header");
    await type(input("Header 1 name"), "X Bad");
    expect(document.body.textContent).toContain("Header names may contain only letters, digits and dashes.");
    await type(input("Header 1 name"), "X-Client");
    await type(input("Header 1 value"), "$remote_addr");
    expect(document.body.textContent).toContain("X-Client cannot contain $.");
    await type(input("Header 1 value"), "web");

    const allow = Array.from(document.querySelectorAll("textarea")).find((t) =>
      t.placeholder.startsWith("203.0.113.4"),
    )!;
    await type(allow, "example.com");
    expect(document.body.textContent).toContain("example.com is not an IP address or CIDR range.");
    await submit();
    expect(wrapper.emitted("save")).toBeUndefined();

    await type(allow, "203.0.113.0/24\n2001:db8::1");
    await submit();
    expect(saved()?.response_headers).toEqual({ "X-Client": "web" });
    expect(saved()?.allow_ips).toEqual(["203.0.113.0/24", "2001:db8::1"]);
  });

  it("offers the alias redirect only when the domain has aliases", async () => {
    mountModal(site);
    expect(document.body.textContent).not.toContain("Redirect aliases");
    await clickButton("Add Alias");
    await type(
      document.querySelector<HTMLInputElement>('input[placeholder="www.example.com"]')!,
      "www.shop.example.com",
    );
    await toggle("Redirect aliases to shop.example.com");
    await submit();

    expect(saved()?.canonical_redirect).toBe("primary");
  });
});
