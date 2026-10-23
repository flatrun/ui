import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import WorkspaceLogo from "./WorkspaceLogo.vue";
import workspacesLogoFixture from "@/model/fixtures/workspaces-logo.json";
import { workspacesApi } from "@/services/api";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return { ...actual, workspacesApi: { logo: vi.fn() } };
});

describe("WorkspaceLogo", () => {
  it("shows the uploaded logo, and the initial when there is none", async () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:logo") });
    vi.mocked(workspacesApi.logo).mockResolvedValue({ data: new Blob(["png"], { type: "image/png" }) } as any);
    const workspace = workspacesLogoFixture.items[0];

    const withLogo = mount(WorkspaceLogo, { props: { workspace } });
    await flushPromises();
    expect(workspacesApi.logo).toHaveBeenCalledWith("default");
    expect(withLogo.get("img").attributes("src")).toBe("blob:logo");

    const plain = mount(WorkspaceLogo, { props: { workspace: { ...workspace, logo: undefined } } });
    await flushPromises();
    expect(plain.find("img").exists()).toBe(false);
    expect(plain.text()).toBe("L");
    vi.unstubAllGlobals();
  });
});
