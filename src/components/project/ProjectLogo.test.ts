import { flushPromises, mount } from "@vue/test-utils";
import { describe, expect, it, vi } from "vitest";
import ProjectLogo from "./ProjectLogo.vue";
import projectsFixture from "@/lib/fixtures/projects-with-logos.json";
import { deploymentsApi } from "@/services/api";
import type { Deployment } from "@/types";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return { ...actual, deploymentsApi: { logo: vi.fn() } };
});

const project = (name: string) => projectsFixture.items.find((p) => p.name === name) as unknown as Deployment;

describe("ProjectLogo", () => {
  it("shows an uploaded logo, a linked one, and an icon", async () => {
    vi.stubGlobal("URL", { ...URL, createObjectURL: vi.fn(() => "blob:logo") });
    vi.mocked(deploymentsApi.logo).mockResolvedValue({ data: new Blob(["svg"], { type: "image/svg+xml" }) } as any);

    const uploaded = mount(ProjectLogo, { props: { deployment: project("shop") } });
    await flushPromises();
    expect(deploymentsApi.logo).toHaveBeenCalledWith("shop");
    expect(uploaded.get("img").attributes("src")).toBe("blob:logo");

    const linked = mount(ProjectLogo, { props: { deployment: project("postiz") } });
    expect(linked.get("img").attributes("src")).toBe("https://cdn.simpleicons.org/postiz");

    const icon = mount(ProjectLogo, { props: { deployment: project("blog") } });
    expect(icon.find("img").exists()).toBe(false);
    vi.unstubAllGlobals();
  });

  it("falls back to the image icon when a linked logo fails to load", async () => {
    const linked = mount(ProjectLogo, { props: { deployment: project("postiz") } });
    await linked.get("img").trigger("error");
    expect(linked.find("img").exists()).toBe(false);
  });
});
