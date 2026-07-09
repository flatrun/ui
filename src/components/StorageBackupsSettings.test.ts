import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import StorageBackupsSettings from "./StorageBackupsSettings.vue";
import { storageCredentialsApi, backupDestinationsApi, configApi } from "@/services/api";
import { useAuthStore } from "@/stores/auth";

vi.mock("@/services/api", () => ({
  storageCredentialsApi: {
    list: vi.fn().mockResolvedValue({ data: { credentials: [] } }),
    create: vi.fn().mockResolvedValue({ data: { credential: { id: "c1" } } }),
    delete: vi.fn().mockResolvedValue({ data: {} }),
  },
  backupDestinationsApi: {
    test: vi.fn().mockResolvedValue({ data: { success: true, message: "ok" } }),
  },
  configApi: {
    get: vi.fn().mockResolvedValue({ data: { entry: { value: [] }, runtime: false } }),
    set: vi.fn().mockResolvedValue({ data: { applied: true } }),
  },
}));

const mockCredList = storageCredentialsApi.list as ReturnType<typeof vi.fn>;
const mockCredCreate = storageCredentialsApi.create as ReturnType<typeof vi.fn>;
const mockConfigGet = configApi.get as ReturnType<typeof vi.fn>;
const mockConfigSet = configApi.set as ReturnType<typeof vi.fn>;

function mountComp() {
  const pinia = createTestingPinia({ createSpy: vi.fn });
  const auth = useAuthStore(pinia);
  (auth.hasPermission as ReturnType<typeof vi.fn>).mockReturnValue(true);
  return mount(StorageBackupsSettings, { global: { plugins: [pinia] } });
}

describe("StorageBackupsSettings", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCredList.mockResolvedValue({
      data: { credentials: [{ id: "c1", name: "prod-r2", kind: "s3", data: { access_key_id: "AKIA" } }] },
    });
    mockConfigGet.mockResolvedValue({
      data: {
        entry: {
          value: [{ name: "s3-prod", type: "s3", bucket: "b", credential_id: "c1", use_path_style: false }],
        },
        runtime: false,
      },
    });
  });

  it("loads credentials and destinations on mount", async () => {
    const wrapper = mountComp();
    await flushPromises();
    expect(mockCredList).toHaveBeenCalledWith("s3");
    expect(mockConfigGet).toHaveBeenCalledWith("backup.destinations");
    expect((wrapper.vm as any).creds).toHaveLength(1);
    expect((wrapper.vm as any).dests).toHaveLength(1);
    // Destinations without an explicit enabled flag default to enabled.
    expect((wrapper.vm as any).dests[0].enabled).toBe(true);
  });

  it("creates a credential through the storage credentials API", async () => {
    const wrapper = mountComp();
    await flushPromises();
    const vm = wrapper.vm as any;
    vm.credForm.name = "backblaze";
    vm.credForm.access_key_id = "keyid";
    vm.credForm.secret_access_key = "secret";
    await vm.addCredential();
    expect(mockCredCreate).toHaveBeenCalledWith({
      name: "backblaze",
      kind: "s3",
      data: { access_key_id: "keyid", secret_access_key: "secret" },
    });
  });

  it("persists destinations through the config API", async () => {
    const wrapper = mountComp();
    await flushPromises();
    const vm = wrapper.vm as any;
    await vm.saveDestinations();
    expect(mockConfigSet).toHaveBeenCalledWith("backup.destinations", vm.dests);
  });

  it("tests a destination and reports reachability", async () => {
    const wrapper = mountComp();
    await flushPromises();
    const vm = wrapper.vm as any;
    await vm.testDestination(vm.dests[0], 0);
    expect(backupDestinationsApi.test).toHaveBeenCalledWith(vm.dests[0]);
  });
});
