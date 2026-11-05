import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import NewRunModal from "./NewRunModal.vue";
import { runsApi } from "@/services/api";
import running from "@/views/fixtures/runs/run-running.json";

vi.mock("@/services/api", () => ({
  runsApi: { create: vi.fn() },
}));

const create = runsApi.create as unknown as ReturnType<typeof vi.fn>;

function mountModal() {
  return mount(NewRunModal, {
    props: { visible: true },
    global: { stubs: { Teleport: true, Transition: false } },
  });
}

async function fill(wrapper: ReturnType<typeof mountModal>, label: string, value: string) {
  const field = wrapper.findAll("label.base-field").find((f) => f.text().startsWith(label));
  if (!field) throw new Error(`no field ${label}`);
  const control = field.find("input, textarea");
  await control.setValue(value);
}

async function submit(wrapper: ReturnType<typeof mountModal>) {
  await wrapper.find("form").trigger("submit");
  await flushPromises();
}

describe("NewRunModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    create.mockResolvedValue({ data: running });
  });

  it("sends the run in the shape the agent accepts", async () => {
    const wrapper = mountModal();
    await fill(wrapper, "Image", "busybox:latest");
    await fill(wrapper, "Command", "echo waiting; sleep 30");
    await fill(wrapper, "Timeout", "2");
    await fill(wrapper, "Memory", "256");
    await fill(wrapper, "Files to keep", "/out/report.txt\n\n/out/coverage.json");

    const addButtons = wrapper.findAll("button").filter((b) => b.text().startsWith("Add"));
    await addButtons[1].trigger("click");
    const secretInputs = wrapper.findAll(".kv-row input");
    await secretInputs[0].setValue("API_TOKEN");
    await secretInputs[1].setValue("s3cr3t-value");
    expect(secretInputs[1].attributes("type")).toBe("password");

    await submit(wrapper);

    expect(create).toHaveBeenCalledWith({
      image: "busybox:latest",
      command: ["sh", "-c", "echo waiting; sleep 30"],
      env: undefined,
      secret_env: { API_TOKEN: "s3cr3t-value" },
      workdir: undefined,
      cpus: undefined,
      memory_bytes: 268435456,
      egress: false,
      timeout_seconds: 120,
      artifact_paths: ["/out/report.txt", "/out/coverage.json"],
    });
    expect(wrapper.emitted("created")?.[0]).toEqual([running]);
  });

  it("leaves the command out to use the image default", async () => {
    const wrapper = mountModal();
    await fill(wrapper, "Image", "busybox:latest");
    await submit(wrapper);

    expect(create.mock.calls[0][0].command).toBeUndefined();
  });

  it("rejects input the agent would refuse before sending it", async () => {
    const wrapper = mountModal();
    await submit(wrapper);
    expect(wrapper.find(".run-form-error").text()).toBe("Image is required.");

    await fill(wrapper, "Image", "busybox:latest");
    await fill(wrapper, "Timeout", "90");
    await submit(wrapper);
    expect(wrapper.find(".run-form-error").text()).toContain("1 to 60");

    await fill(wrapper, "Timeout", "5");
    await fill(wrapper, "Files to keep", "out/report.txt");
    await submit(wrapper);
    expect(wrapper.find(".run-form-error").text()).toContain("absolute");

    await fill(wrapper, "Files to keep", "");
    await fill(wrapper, "CPUs", "-1");
    await submit(wrapper);
    expect(wrapper.find(".run-form-error").text()).toContain("CPUs must be a positive number");

    await fill(wrapper, "CPUs", "");
    await fill(wrapper, "Memory", "0");
    await submit(wrapper);
    expect(wrapper.find(".run-form-error").text()).toContain("Memory must be a positive number");

    expect(create).not.toHaveBeenCalled();
  });

  it("shows the agent's error when the run is refused", async () => {
    create.mockRejectedValue({ response: { data: { error: "timeout must be positive and at most one hour" } } });
    const wrapper = mountModal();
    await fill(wrapper, "Image", "busybox:latest");
    await submit(wrapper);

    expect(wrapper.find(".run-form-error").text()).toBe("timeout must be positive and at most one hour");
  });
});
