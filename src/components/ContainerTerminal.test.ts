import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import ContainerTerminal from "./ContainerTerminal.vue";

// Mock xterm
const mockTerminalInstance = {
  loadAddon: vi.fn(),
  open: vi.fn(),
  write: vi.fn(),
  onData: vi.fn(),
  focus: vi.fn(),
  clear: vi.fn(),
  dispose: vi.fn(),
  rows: 24,
  cols: 80,
};

vi.mock("@xterm/xterm", () => ({
  Terminal: class MockTerminal {
    loadAddon = mockTerminalInstance.loadAddon;
    open = mockTerminalInstance.open;
    write = mockTerminalInstance.write;
    onData = mockTerminalInstance.onData;
    focus = mockTerminalInstance.focus;
    clear = mockTerminalInstance.clear;
    dispose = mockTerminalInstance.dispose;
    rows = 24;
    cols = 80;
  },
}));

vi.mock("@xterm/addon-fit", () => ({
  FitAddon: class MockFitAddon {
    fit = vi.fn();
  },
}));

vi.mock("@xterm/addon-web-links", () => ({
  WebLinksAddon: class MockWebLinksAddon {},
}));

// WebSocket ready state constants
const WS_OPEN = 1;

describe("ContainerTerminal", () => {
  let mockWebSocket: any;
  let originalWebSocket: typeof WebSocket;
  let createdWebSocketUrl: string;

  beforeEach(() => {
    originalWebSocket = globalThis.WebSocket;
    createdWebSocketUrl = "";

    mockWebSocket = {
      send: vi.fn(),
      close: vi.fn(),
      readyState: WS_OPEN,
      binaryType: "blob",
      onopen: null as any,
      onmessage: null as any,
      onclose: null as any,
      onerror: null as any,
      url: "",
    };

    globalThis.WebSocket = class MockWebSocket {
      static OPEN = WS_OPEN;
      send = mockWebSocket.send;
      close = mockWebSocket.close;
      readyState = mockWebSocket.readyState;
      private _binaryType = "blob";
      private _onopen: ((ev: Event) => void) | null = null;
      private _onmessage: ((ev: MessageEvent) => void) | null = null;
      private _onclose: ((ev: CloseEvent) => void) | null = null;
      private _onerror: ((ev: Event) => void) | null = null;

      get binaryType() {
        return this._binaryType;
      }
      set binaryType(value: string) {
        this._binaryType = value;
        mockWebSocket.binaryType = value;
      }

      get onopen() {
        return this._onopen;
      }
      set onopen(fn: ((ev: Event) => void) | null) {
        this._onopen = fn;
        mockWebSocket.onopen = fn;
      }

      get onmessage() {
        return this._onmessage;
      }
      set onmessage(fn: ((ev: MessageEvent) => void) | null) {
        this._onmessage = fn;
        mockWebSocket.onmessage = fn;
      }

      get onclose() {
        return this._onclose;
      }
      set onclose(fn: ((ev: CloseEvent) => void) | null) {
        this._onclose = fn;
        mockWebSocket.onclose = fn;
      }

      get onerror() {
        return this._onerror;
      }
      set onerror(fn: ((ev: Event) => void) | null) {
        this._onerror = fn;
        mockWebSocket.onerror = fn;
      }

      constructor(public url: string) {
        createdWebSocketUrl = url;
        mockWebSocket.url = url;
        mockWebSocket.instance = this;
      }
    } as any;

    // Mock localStorage
    vi.spyOn(Storage.prototype, "getItem").mockReturnValue("test-token");
  });

  afterEach(() => {
    globalThis.WebSocket = originalWebSocket;
    vi.restoreAllMocks();
  });

  const mountTerminal = (props = {}) => {
    return mount(ContainerTerminal, {
      props: {
        containerId: "test-container-123",
        ...props,
      },
      global: {
        stubs: {
          teleport: true,
        },
      },
    });
  };

  describe("Component rendering", () => {
    it("renders terminal container", () => {
      const wrapper = mountTerminal();
      expect(wrapper.find(".container-terminal").exists()).toBe(true);
    });

    it("renders terminal element", () => {
      const wrapper = mountTerminal();
      expect(wrapper.find(".terminal-element").exists()).toBe(true);
    });

    it("shows overlay when disconnected", () => {
      const wrapper = mountTerminal();
      expect(wrapper.find(".terminal-overlay").exists()).toBe(true);
    });

    it("shows connect button when disconnected", () => {
      const wrapper = mountTerminal();
      const button = wrapper.find(".terminal-overlay button");
      expect(button.exists()).toBe(true);
      expect(button.text()).toContain("Connect");
    });
  });

  describe("Connection handling", () => {
    it("creates WebSocket with correct URL", async () => {
      const wrapper = mountTerminal();
      const button = wrapper.find(".terminal-overlay button");
      await button.trigger("click");

      expect(createdWebSocketUrl).toContain("/api/containers/test-container-123/exec");
    });

    it("sets binaryType to arraybuffer", async () => {
      const wrapper = mountTerminal();
      const button = wrapper.find(".terminal-overlay button");
      await button.trigger("click");

      expect(mockWebSocket.binaryType).toBe("arraybuffer");
    });

    it("sends auth message on connection", async () => {
      const wrapper = mountTerminal();
      const button = wrapper.find(".terminal-overlay button");
      await button.trigger("click");

      // Simulate WebSocket open
      mockWebSocket.onopen();

      expect(mockWebSocket.send).toHaveBeenCalledWith(expect.stringContaining('"type":"auth"'));
      expect(mockWebSocket.send).toHaveBeenCalledWith(expect.stringContaining('"token":"test-token"'));
    });

    it("updates status to connecting when connect clicked", async () => {
      const wrapper = mountTerminal();
      const button = wrapper.find(".terminal-overlay button");
      await button.trigger("click");

      expect(wrapper.text()).toContain("Connecting");
    });
  });

  describe("Authentication flow", () => {
    it("handles auth_success response", async () => {
      const wrapper = mountTerminal();
      const button = wrapper.find(".terminal-overlay button");
      await button.trigger("click");

      mockWebSocket.onopen();

      // Simulate auth success response
      const authResponse = new TextEncoder().encode('{"type":"auth_success"}');
      mockWebSocket.onmessage({ data: authResponse.buffer });

      await wrapper.vm.$nextTick();

      expect(wrapper.emitted("connected")).toBeTruthy();
    });

    it("sends resize message after auth success", async () => {
      const wrapper = mountTerminal();
      const button = wrapper.find(".terminal-overlay button");
      await button.trigger("click");

      mockWebSocket.onopen();

      const authResponse = new TextEncoder().encode('{"type":"auth_success"}');
      mockWebSocket.onmessage({ data: authResponse.buffer });

      await wrapper.vm.$nextTick();

      // Check that resize message was sent
      const resizeCalls = mockWebSocket.send.mock.calls.filter((call: any) => call[0].includes('"type":"resize"'));
      expect(resizeCalls.length).toBeGreaterThan(0);
    });
  });

  describe("Disconnect handling", () => {
    it("emits disconnected event on close", async () => {
      const wrapper = mountTerminal();
      const button = wrapper.find(".terminal-overlay button");
      await button.trigger("click");

      mockWebSocket.onopen();
      mockWebSocket.onclose();

      await wrapper.vm.$nextTick();

      expect(wrapper.emitted("disconnected")).toBeTruthy();
    });

    it("emits error event on WebSocket error", async () => {
      const wrapper = mountTerminal();
      const button = wrapper.find(".terminal-overlay button");
      await button.trigger("click");

      mockWebSocket.onerror();

      await wrapper.vm.$nextTick();

      expect(wrapper.emitted("error")).toBeTruthy();
    });
  });

  describe("Container ID changes", () => {
    it("clears terminal when containerId changes", async () => {
      const wrapper = mountTerminal();

      await wrapper.setProps({ containerId: "new-container-456" });

      // Status should reset to disconnected
      expect(wrapper.text()).toContain("Connect");
    });
  });

  describe("Exposed methods", () => {
    it("exposes connect method", () => {
      const wrapper = mountTerminal();
      expect(typeof (wrapper.vm as any).connect).toBe("function");
    });

    it("exposes disconnect method", () => {
      const wrapper = mountTerminal();
      expect(typeof (wrapper.vm as any).disconnect).toBe("function");
    });
  });
});
