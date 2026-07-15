import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import FileBrowser from "./FileBrowser.vue";
import { deploymentsApi } from "@/services/api";
import type { FileBrowserApi, FileInfo } from "@/services/api";
import type { ComposeMount } from "@/utils/compose";

vi.mock("@/services/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/services/api")>();
  return {
    ...actual,
    deploymentsApi: { removeComposeMount: vi.fn() },
    configApi: { get: vi.fn().mockResolvedValue({ data: {} }) },
  };
});

const files: FileInfo[] = [
  { name: "conf.d", path: "/conf.d", size: 4096, is_dir: true, mod_time: "2026-07-14T00:00:00Z", permissions: "755" },
  {
    name: "notes.txt",
    path: "/notes.txt",
    size: 12,
    is_dir: false,
    mod_time: "2026-07-14T00:00:00Z",
    permissions: "644",
  },
];

// Only conf.d is mounted, so the two rows should be treated differently.
const mounts: ComposeMount[] = [{ service: "app", source: "./conf.d", target: "/etc/nginx/conf.d", readOnly: false }];

const fakeApi = (): FileBrowserApi => ({
  list: vi.fn().mockResolvedValue({ data: { files } }),
  getInfo: vi.fn().mockResolvedValue({ data: { total_size: 0, file_count: 0 } }),
  upload: vi.fn(),
  download: vi.fn(),
  createDir: vi.fn(),
  createFile: vi.fn(),
  chmod: vi.fn(),
  delete: vi.fn().mockResolvedValue({}),
  getContent: vi.fn().mockResolvedValue({ data: "" }),
});

const mountBrowser = () =>
  mount(FileBrowser, {
    props: { deploymentName: "test-app", api: fakeApi(), mounts, serviceNames: ["app"], enableMount: true },
    global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
  });

describe("FileBrowser mounted paths", () => {
  beforeEach(() => vi.clearAllMocks());

  it("tags a path the container reads, and says where", async () => {
    const wrapper = mountBrowser();
    await flushPromises();

    const tags = wrapper.findAll(".mount-tag");
    expect(tags).toHaveLength(1);
    expect(tags[0].attributes("title")).toContain("app reads this at /etc/nginx/conf.d");
  });

  it("offers Unmount only for a path that is mounted", async () => {
    const wrapper = mountBrowser();
    await flushPromises();

    (wrapper.vm as any).toggleRowMenu("/conf.d");
    await flushPromises();
    expect(wrapper.text()).toContain("Unmount");

    (wrapper.vm as any).toggleRowMenu("/notes.txt");
    await flushPromises();
    expect(wrapper.text()).not.toContain("Unmount");
  });

  it("unmounts every service reading the path, then reports it", async () => {
    vi.mocked(deploymentsApi.removeComposeMount).mockResolvedValue({ data: {} } as any);

    const wrapper = mountBrowser();
    await flushPromises();

    (wrapper.vm as any).fileToUnmount = files[0];
    await (wrapper.vm as any).unmountFile();
    await flushPromises();

    expect(deploymentsApi.removeComposeMount).toHaveBeenCalledWith("test-app", {
      source_path: "./conf.d",
      target_path: "/etc/nginx/conf.d",
      service_name: "app",
    });
    expect(wrapper.emitted("unmounted")).toBeTruthy();
  });

  // The modals are teleported to the body, so they are read from there.
  it("warns that deleting a mounted path takes it from the container too", async () => {
    const wrapper = mountBrowser();
    await flushPromises();

    (wrapper.vm as any).confirmDelete(files[0]);
    await flushPromises();
    expect(document.body.textContent).toContain("takes it from the running container too");

    wrapper.unmount();
  });

  it("does not warn about the container when the path is not mounted", async () => {
    const wrapper = mountBrowser();
    await flushPromises();

    (wrapper.vm as any).confirmDelete(files[1]);
    await flushPromises();
    expect(document.body.textContent).not.toContain("takes it from the running container too");

    wrapper.unmount();
  });

  it("explains that an unmount leaves the host copy behind", async () => {
    const wrapper = mountBrowser();
    await flushPromises();

    (wrapper.vm as any).confirmUnmount(files[0]);
    await flushPromises();
    expect(document.body.textContent).toContain("stays on the host");
    expect(document.body.textContent).toContain("will not touch the container");

    wrapper.unmount();
  });
});
