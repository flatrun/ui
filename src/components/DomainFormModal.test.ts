import { describe, it, expect, afterEach } from "vitest";
import { mount, type VueWrapper } from "@vue/test-utils";
import DomainFormModal from "./DomainFormModal.vue";
import type { DomainConfig } from "@/types";

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
