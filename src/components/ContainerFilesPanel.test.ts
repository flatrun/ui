import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import ContainerFilesPanel from "./ContainerFilesPanel.vue";
import { containerFilesApi } from "@/services/api";

vi.mock("@/services/api", () => ({
  containerFilesApi: {
    list: vi.fn(),
    materialize: vi.fn(),
  },
}));

// Shaped like what the agent returns, which mirrors a real `ls -lA` line from
// nginx:alpine.
const listing = {
  data: {
    path: "/etc/nginx",
    service: "app",
    files: [
      { name: "conf.d", path: "/etc/nginx/conf.d", size: 4096, mode: "drwxr-xr-x", is_dir: true, is_symlink: false },
      {
        name: "nginx.conf",
        path: "/etc/nginx/nginx.conf",
        size: 648,
        mode: "-rw-r--r--",
        is_dir: false,
        is_symlink: false,
        modified_raw: "Jun 17 15:58",
      },
    ],
  },
};

const mountTab = () =>
  mount(ContainerFilesPanel, {
    props: { deploymentName: "test-app", serviceNames: ["app", "db"] },
    global: {
      plugins: [createTestingPinia({ createSpy: vi.fn })],
      stubs: { ConfirmModal: { template: "<div />", props: ["visible"] } },
    },
  });

describe("ContainerFilesPanel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(containerFilesApi.list).mockResolvedValue(listing as any);
  });

  it("lists what the running service holds", async () => {
    const wrapper = mountTab();
    await flushPromises();

    expect(containerFilesApi.list).toHaveBeenCalledWith("test-app", "app", "/");
    expect(wrapper.text()).toContain("conf.d");
    expect(wrapper.text()).toContain("nginx.conf");
  });

  it("navigates into a directory", async () => {
    const wrapper = mountTab();
    await flushPromises();

    const confd = wrapper.findAll(".cf-name").find((b) => b.text().includes("conf.d"));
    await confd!.trigger("click");
    await flushPromises();

    expect(containerFilesApi.list).toHaveBeenLastCalledWith("test-app", "app", "/etc/nginx/conf.d");
  });

  it("brings a path onto the host and reports where it landed", async () => {
    vi.mocked(containerFilesApi.materialize).mockResolvedValue({
      data: {
        deployment: "test-app",
        service: "app",
        container_path: "/etc/nginx/nginx.conf",
        host_path: "./nginx.conf",
      },
    } as any);

    const wrapper = mountTab();
    await flushPromises();

    // The row action confirms first, so drive the confirmed path directly.
    (wrapper.vm as any).pending = "/etc/nginx/nginx.conf";
    await (wrapper.vm as any).materialize();
    await flushPromises();

    expect(containerFilesApi.materialize).toHaveBeenCalledWith("test-app", "app", {
      container_path: "/etc/nginx/nginx.conf",
    });
    expect(wrapper.emitted("materialized")?.[0]).toEqual([
      { hostPath: "./nginx.conf", containerPath: "/etc/nginx/nginx.conf" },
    ]);
  });

  it("explains why an image without a shell cannot be browsed", async () => {
    vi.mocked(containerFilesApi.list).mockRejectedValue({
      response: {
        data: {
          error: "failed to list /: no shell",
          hint: "the service must be running and its image must provide a shell to be browsed",
        },
      },
    });

    const wrapper = mountTab();
    await flushPromises();

    expect(wrapper.text()).toContain("no shell");
    expect(wrapper.text()).toContain("must provide a shell");
  });
});
