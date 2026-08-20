import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createPinia } from "pinia";
import { createTestingPinia } from "@pinia/testing";
import FileBrowser from "./FileBrowser.vue";
import { deploymentsApi } from "@/services/api";
import type { FileBrowserApi, FileInfo } from "@/services/api";
import type { ComposeMount } from "@/utils/compose";
import { useNotificationsStore } from "@/stores/notifications";

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
  copy: vi.fn().mockResolvedValue({}),
  move: vi.fn().mockResolvedValue({}),
  listArchive: vi.fn().mockResolvedValue({ data: { entries: [] } }),
  extractArchive: vi.fn().mockResolvedValue({}),
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

describe("FileBrowser uploads", () => {
  beforeEach(() => vi.clearAllMocks());

  it("keeps a selected folder's relative paths", async () => {
    const api = fakeApi();
    const wrapper = mount(FileBrowser, {
      props: { api },
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
    });
    await flushPromises();

    const file = new File(["server config"], "site.conf", { type: "text/plain" });
    Object.defineProperty(file, "webkitRelativePath", { value: "nginx/conf.d/site.conf" });

    await (wrapper.vm as any).handleFolderSelect({
      target: { files: [file], value: "selected" },
    });
    await flushPromises();

    expect(api.upload).toHaveBeenCalledWith("/nginx/conf.d/site.conf", file);
  });

  it("updates one notification for a folder upload", async () => {
    const api = fakeApi();
    const pinia = createPinia();
    const wrapper = mount(FileBrowser, {
      props: { api },
      global: { plugins: [pinia] },
    });
    await flushPromises();

    const filesToUpload = ["one.txt", "two.txt", "three.txt"].map((name) => {
      const file = new File([name], name, { type: "text/plain" });
      Object.defineProperty(file, "webkitRelativePath", { value: `folder/${name}` });
      return file;
    });

    await (wrapper.vm as any).handleFolderSelect({
      target: { files: filesToUpload, value: "selected" },
    });
    await flushPromises();

    const notifications = useNotificationsStore(pinia).notifications;
    expect(notifications).toHaveLength(1);
    expect(notifications[0]).toMatchObject({
      type: "success",
      title: "Folder uploaded",
      message: "3 files uploaded",
      progress: 100,
    });
  });

  it("shows upload failures in one modal and removes the progress notification", async () => {
    const api = fakeApi();
    vi.mocked(api.upload)
      .mockResolvedValueOnce({} as any)
      .mockRejectedValueOnce(new Error("Storage is full"));
    const pinia = createPinia();
    const wrapper = mount(FileBrowser, {
      props: { api },
      global: { plugins: [pinia] },
    });
    await flushPromises();

    const filesToUpload = ["one.txt", "two.txt"].map((name) => {
      const file = new File([name], name, { type: "text/plain" });
      Object.defineProperty(file, "webkitRelativePath", { value: `folder/${name}` });
      return file;
    });

    await (wrapper.vm as any).handleFolderSelect({
      target: { files: filesToUpload, value: "selected" },
    });
    await flushPromises();

    expect(useNotificationsStore(pinia).notifications).toHaveLength(0);
    expect(document.body.textContent).toContain("Upload completed with errors");
    expect(document.body.textContent).toContain("1 of 2 files uploaded");
    expect(document.body.textContent).toContain("folder/two.txt");
    expect(document.body.textContent).toContain("Storage is full");

    wrapper.unmount();
  });
});

describe("FileBrowser operations", () => {
  beforeEach(() => vi.clearAllMocks());

  it("copies a path into the open folder", async () => {
    const api = fakeApi();
    const wrapper = mount(FileBrowser, {
      props: { api },
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
    });
    await flushPromises();

    (wrapper.vm as any).setClipboard(files[1], "copy");
    (wrapper.vm as any).navigateTo("/conf.d");
    await (wrapper.vm as any).pasteClipboard();

    expect(api.copy).toHaveBeenCalledWith("/notes.txt", "/conf.d/notes.txt");
  });

  it("renames through the move boundary", async () => {
    const api = fakeApi();
    const wrapper = mount(FileBrowser, {
      props: { api },
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
    });
    await flushPromises();

    (wrapper.vm as any).openRenameModal(files[1]);
    (wrapper.vm as any).renameName = "readme.txt";
    await (wrapper.vm as any).renamePath();

    expect(api.move).toHaveBeenCalledWith("/notes.txt", "/readme.txt");
  });

  it("loads and extracts an archive into its suggested folder", async () => {
    const api = fakeApi();
    const archive = { ...files[1], name: "release.tar.gz", path: "/release.tar.gz" };
    vi.mocked(api.listArchive).mockResolvedValue({
      data: { entries: [{ name: "app/config.yml", size: 12, is_dir: false, mod_time: "2026-07-14T00:00:00Z" }] },
    });
    const wrapper = mount(FileBrowser, {
      props: { api },
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
    });
    await flushPromises();

    await (wrapper.vm as any).viewArchive(archive);
    await (wrapper.vm as any).extractOpenArchive();

    expect(api.listArchive).toHaveBeenCalledWith("/release.tar.gz");
    expect(api.extractArchive).toHaveBeenCalledWith("/release.tar.gz", "/release");
  });
});
