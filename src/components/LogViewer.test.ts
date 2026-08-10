import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import LogViewer from "./LogViewer.vue";
import { useAssistStore } from "@/stores/assist";

// xterm needs a real canvas; the raw view is not what these tests are about.
vi.mock("@xterm/xterm", () => ({
  Terminal: class {
    open() {}
    write() {}
    clear() {}
    dispose() {}
    loadAddon() {}
    scrollToBottom() {}
    onResize() {}
  },
}));
vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class {
    fit() {}
  },
}));
vi.mock("@xterm/addon-search", () => ({
  SearchAddon: class {
    findNext() {}
    findPrevious() {}
  },
}));
vi.mock("@xterm/addon-web-links", () => ({ WebLinksAddon: class {} }));

const logs = ["web | ERROR first failure", "web | ERROR second failure"].join("\n");

describe("LogViewer", () => {
  beforeEach(() => vi.clearAllMocks());

  const mountViewer = (props = {}) =>
    mount(LogViewer, {
      props: { logs, ...props },
      global: { plugins: [createTestingPinia({ createSpy: vi.fn })] },
      attachTo: document.body,
    });

  const clickTitle = async (wrapper: ReturnType<typeof mountViewer>, title: string) => {
    await wrapper
      .findAll("button")
      .find((b) => b.attributes("title") === title)!
      .trigger("click");
    await flushPromises();
  };

  // Deleting empties the log on the server, so the button asks rather than acts.
  it("asks the parent to delete rather than clearing the view itself", async () => {
    const wrapper = mountViewer({ deletable: true });
    await flushPromises();

    await clickTitle(wrapper, "Delete these logs");

    expect(wrapper.emitted("delete")).toBeTruthy();
    // Nothing is hidden locally: what is on screen still reflects the server.
    expect(wrapper.text()).toContain("first failure");
  });

  // A viewer whose source cannot be emptied should not offer the button at all.
  it("hides the delete button unless deleting is possible", async () => {
    const wrapper = mountViewer();
    await flushPromises();

    expect(wrapper.findAll("button").some((b) => b.attributes("title") === "Delete these logs")).toBe(false);
  });

  it("hands one entry to the assistant when asked to debug it", async () => {
    const wrapper = mountViewer();
    await flushPromises();
    const store = useAssistStore();

    await wrapper.find(".row-head").trigger("click");
    await wrapper
      .findAll("button")
      .find((b) => b.text().includes("Debug with AI"))!
      .trigger("click");
    await flushPromises();

    expect(store.open).toHaveBeenCalledWith(
      expect.objectContaining({ seedContext: expect.stringContaining("first failure") }),
    );
    // The whole log would bury the line the reader pointed at.
    const call = vi.mocked(store.open).mock.calls[0][0] as { seedContext: string };
    expect(call.seedContext).not.toContain("second failure");
  });
});
