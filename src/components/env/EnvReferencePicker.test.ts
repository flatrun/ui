import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import EnvReferencePicker from "./EnvReferencePicker.vue";
import listFixture from "./fixtures/list.json";
import dbEnvFixture from "./fixtures/env-db.json";
import { deploymentsApi } from "@/services/api";

vi.mock("@/services/api", () => ({
  deploymentsApi: { list: vi.fn(), getEnvVars: vi.fn() },
}));

describe("EnvReferencePicker", () => {
  it("builds a reference from another deployment's variable", async () => {
    vi.mocked(deploymentsApi.list).mockResolvedValue({ data: listFixture } as any);
    vi.mocked(deploymentsApi.getEnvVars).mockResolvedValue({ data: dbEnvFixture } as any);

    const wrapper = mount(EnvReferencePicker, { props: { self: "hello-web" } });
    await flushPromises();

    const [deploymentSelect, keySelect] = wrapper.findAll("select");
    expect(deploymentSelect.findAll("option").map((o) => o.text())).toEqual(["Deployment", "orders-db"]);

    await deploymentSelect.setValue("orders-db");
    await flushPromises();
    expect(deploymentsApi.getEnvVars).toHaveBeenCalledWith("orders-db");
    expect(keySelect.findAll("option").map((o) => o.attributes("value"))).toEqual([
      "",
      "FLATRUN_HOST",
      "DB_PASSWORD",
      "DB_USER",
    ]);

    await keySelect.setValue("DB_PASSWORD");
    await wrapper.get("button").trigger("click");
    expect(wrapper.emitted("insert")).toEqual([["${{ orders-db.DB_PASSWORD }}"]]);
  });
});
