import { describe, it, expect, vi, beforeEach } from "vitest";
import { useLogStream } from "./useLogStream";

class FakeSocket {
  static last: FakeSocket | null = null;
  onopen: (() => void) | null = null;
  onmessage: ((e: { data: string }) => void) | null = null;
  onerror: (() => void) | null = null;
  onclose: (() => void) | null = null;
  sent: string[] = [];
  closed = false;

  constructor(public url: string) {
    FakeSocket.last = this;
  }
  send(data: string) {
    this.sent.push(data);
  }
  close() {
    this.closed = true;
  }
}

describe("useLogStream", () => {
  beforeEach(() => {
    vi.stubGlobal("WebSocket", FakeSocket as unknown as typeof WebSocket);
    localStorage.setItem("auth_token", "token-123");
    FakeSocket.last = null;
  });

  it("authenticates as its first message, since a websocket carries no headers", () => {
    const stream = useLogStream();
    stream.start("shop", { tail: 50 });

    FakeSocket.last!.onopen!();

    expect(JSON.parse(FakeSocket.last!.sent[0])).toEqual({ type: "auth", token: "token-123" });
    expect(FakeSocket.last!.url).toContain("/api/deployments/shop/logs/stream");
    expect(FakeSocket.last!.url).toContain("tail=50");
  });

  it("asks the agent to filter rather than filtering in the browser", () => {
    const stream = useLogStream();
    stream.start("shop", { filter: "error" });

    expect(FakeSocket.last!.url).toContain("filter=error");
  });

  it("collects lines as they arrive", () => {
    const stream = useLogStream();
    stream.start("shop");
    FakeSocket.last!.onopen!();

    FakeSocket.last!.onmessage!({ data: JSON.stringify({ type: "log", line: "starting" }) });
    FakeSocket.last!.onmessage!({ data: JSON.stringify({ type: "log", line: "ready" }) });

    expect(stream.lines.value).toEqual(["starting", "ready"]);
    expect(stream.following.value).toBe(true);
  });

  it("reports an error the agent sends and stops following", () => {
    const stream = useLogStream();
    stream.start("shop");
    FakeSocket.last!.onopen!();

    FakeSocket.last!.onmessage!({ data: JSON.stringify({ type: "error", error: "No access to this deployment" }) });

    expect(stream.error.value).toBe("No access to this deployment");
    expect(stream.following.value).toBe(false);
  });

  it("survives a frame it cannot read", () => {
    const stream = useLogStream();
    stream.start("shop");
    FakeSocket.last!.onopen!();

    FakeSocket.last!.onmessage!({ data: "not json" });

    expect(stream.lines.value).toEqual([]);
    expect(stream.following.value).toBe(true);
  });

  it("stops following when told to", () => {
    const stream = useLogStream();
    stream.start("shop");
    FakeSocket.last!.onopen!();
    const socket = FakeSocket.last!;

    stream.stop();

    expect(socket.closed).toBe(true);
    expect(stream.following.value).toBe(false);
  });

  it("bounds what it keeps, so a chatty container cannot grow it forever", () => {
    const stream = useLogStream();
    stream.start("shop");
    FakeSocket.last!.onopen!();

    for (let i = 0; i < 5200; i++) {
      FakeSocket.last!.onmessage!({ data: JSON.stringify({ type: "log", line: `line ${i}` }) });
    }

    expect(stream.lines.value.length).toBe(5000);
    // The oldest go first: someone watching a live log is at the bottom of it.
    expect(stream.lines.value[stream.lines.value.length - 1]).toBe("line 5199");
  });
});
