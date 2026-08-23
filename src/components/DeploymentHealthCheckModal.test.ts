import { describe, expect, it, vi } from "vitest";
import { flushPromises, mount } from "@vue/test-utils";
import DeploymentHealthCheckModal from "./DeploymentHealthCheckModal.vue";
import { deploymentsApi } from "@/services/api";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    deploymentsApi: { ...actual.deploymentsApi, updateMetadata: vi.fn().mockResolvedValue({ data: {} }) },
  };
});

const metadata = {
  name: "postgres",
  type: "infrastructure",
  primary_service: "postgres",
  networking: { expose: false, domain: "", service: "postgres", container_port: 5432, protocol: "tcp" },
  ssl: { enabled: false, auto_cert: false },
  healthcheck: { path: "", interval: "30s" },
};

const mountModal = async (theme: "light" | "dark" = "light") => {
  document.documentElement.dataset.theme = theme;
  const wrapper = mount(DeploymentHealthCheckModal, {
    props: { visible: false, deploymentName: "postgres", services: ["postgres"], metadata },
    global: {
      stubs: {
        BaseModal: {
          props: ["visible"],
          template: "<div v-if='visible'><slot /><slot name='footer' /></div>",
        },
      },
    },
  });
  await wrapper.setProps({ visible: true });
  await flushPromises();
  return wrapper;
};

describe("DeploymentHealthCheckModal", () => {
  it.each(["light", "dark"] as const)("offers protocol-aware checks in %s mode", async (theme) => {
    const wrapper = await mountModal(theme);
    const typeSelect = wrapper.findAll("select")[0];

    expect(typeSelect.findAll("option").map((option) => option.text())).toEqual([
      "HTTP request",
      "TCP connection",
      "Container command",
    ]);
  });

  it("saves a TCP check without HTTP fields or routing changes", async () => {
    const wrapper = await mountModal();
    await wrapper.findAll("select")[0].setValue("tcp");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Save and check"))!
      .trigger("click");
    await flushPromises();

    expect(deploymentsApi.updateMetadata).toHaveBeenCalledWith("postgres", {
      healthcheck: { path: "", interval: "" },
      healthchecks: [
        {
          type: "tcp",
          service: "postgres",
          port: 5432,
          path: "",
          interval: "30s",
          success_statuses: [],
          response_contains: "",
          command: "",
        },
      ],
    });
  });

  it("requires an exec command and saves it without a port", async () => {
    const wrapper = await mountModal();
    await wrapper.findAll("select")[0].setValue("exec");
    await wrapper.find("textarea").setValue("pg_isready -U postgres");
    await wrapper
      .findAll("button")
      .find((button) => button.text().includes("Save and check"))!
      .trigger("click");
    await flushPromises();

    expect(deploymentsApi.updateMetadata).toHaveBeenLastCalledWith(
      "postgres",
      expect.objectContaining({
        healthchecks: [
          expect.objectContaining({
            type: "exec",
            service: "postgres",
            port: 0,
            command: "pg_isready -U postgres",
          }),
        ],
      }),
    );
  });
});
