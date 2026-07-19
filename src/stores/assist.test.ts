import { describe, it, expect, vi, beforeEach } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useAssistStore, AI_DISABLED_MESSAGE } from "./assist";
import { useAIStore } from "./ai";
import type { AISession } from "@/services/api";

vi.mock("@/services/api", () => ({
  aiApi: {
    status: vi.fn(),
    createSession: vi.fn(),
    sessionMessage: vi.fn(),
    approveSession: vi.fn(),
    listSessions: vi.fn(),
    getSession: vi.fn(),
  },
  containersApi: { exec: vi.fn() },
  deploymentsApi: { serviceAction: vi.fn(), getServices: vi.fn() },
}));

const session = (over: Partial<AISession> = {}): AISession => ({
  id: "ais_1",
  scope: "system",
  auto_run: true,
  status: "ready",
  messages: [
    { role: "user", content: "what deployments do I have?" },
    {
      role: "assistant",
      content: "You have one: myapp.",
      tool_steps: [{ name: "list_deployments", arguments: "{}", result: "- myapp" }],
    },
  ],
  pending: [],
  suggested_actions: [],
  ...over,
});

describe("assist store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.clearAllMocks();
  });

  async function enable() {
    const { aiApi } = await import("@/services/api");
    vi.mocked(aiApi.status).mockResolvedValue({ data: { enabled: true } } as any);
  }

  it("shows the disabled hint when AI is off", async () => {
    const { aiApi } = await import("@/services/api");
    vi.mocked(aiApi.status).mockResolvedValue({ data: { enabled: false } } as any);

    const store = useAssistStore();
    await store.open({ scope: "system", subject: "this instance" });

    expect(store.error).toBe(AI_DISABLED_MESSAGE);
    expect(store.session).toBeNull();
  });

  it("lists saved sessions for the history view", async () => {
    const { aiApi } = await import("@/services/api");
    vi.mocked(aiApi.listSessions).mockResolvedValue({
      data: {
        sessions: [
          { id: "ais_2", scope: "system", status: "ready", title: "recent one", updated_at: "2026-07-18T10:00:00Z" },
        ],
      },
    } as any);

    const store = useAssistStore();
    await store.listSessions();

    expect(store.sessions).toHaveLength(1);
    expect(store.sessions[0].title).toBe("recent one");
  });

  it("resumes a saved session and binds later turns to its scope", async () => {
    const { aiApi } = await import("@/services/api");
    vi.mocked(aiApi.getSession).mockResolvedValue({
      data: session({ id: "ais_9", scope: "deployment", deployment: "shop" }),
    } as any);

    const store = useAssistStore();
    await store.loadSession("ais_9");

    expect(aiApi.getSession).toHaveBeenCalledWith("ais_9");
    expect(store.session?.id).toBe("ais_9");
    expect(store.scope).toBe("deployment");
    expect(store.deployment).toBe("shop");
  });

  it("creates a session from a seed message", async () => {
    await enable();
    const { aiApi } = await import("@/services/api");
    vi.mocked(aiApi.createSession).mockResolvedValue({ data: session() } as any);

    const store = useAssistStore();
    await store.open({ scope: "deployment", deployment: "myapp", subject: "myapp", seedMessage: "diagnose" });

    // Seeded prompts are flagged so the agent keeps them out of the
    // visible transcript; the model still receives them.
    expect(aiApi.createSession).toHaveBeenCalledWith({
      scope: "deployment",
      deployment: "myapp",
      auto_run: true,
      message: "diagnose",
      context: undefined,
      seed: true,
    });
    expect(store.session?.id).toBe("ais_1");
  });

  it("sends follow-up messages on the existing session", async () => {
    await enable();
    const { aiApi } = await import("@/services/api");
    vi.mocked(aiApi.createSession).mockResolvedValue({ data: session() } as any);
    vi.mocked(aiApi.sessionMessage).mockResolvedValue({ data: session({ id: "ais_1" }) } as any);

    const store = useAssistStore();
    await store.open({ scope: "system", subject: "x", seedMessage: "first" });
    await store.send("second");

    expect(aiApi.sessionMessage).toHaveBeenCalledWith("ais_1", "second", undefined);
  });

  it("approves all pending tools", async () => {
    await enable();
    const { aiApi } = await import("@/services/api");
    const pending = session({
      status: "awaiting_approval",
      pending: [
        { id: "c1", name: "list_networks", arguments: "{}" },
        { id: "c2", name: "read_deployment_file", arguments: '{"path":"x"}' },
      ],
    });
    vi.mocked(aiApi.createSession).mockResolvedValue({ data: pending } as any);
    vi.mocked(aiApi.approveSession).mockResolvedValue({ data: session() } as any);

    const store = useAssistStore();
    await store.open({ scope: "system", subject: "x", seedMessage: "check", autoRun: false });
    store.approveAll();
    await Promise.resolve();

    expect(aiApi.approveSession).toHaveBeenCalledWith("ais_1", { c1: true, c2: true });
  });

  it("declines all pending tools", async () => {
    await enable();
    const { aiApi } = await import("@/services/api");
    const pending = session({
      status: "awaiting_approval",
      pending: [{ id: "c1", name: "list_networks", arguments: "{}" }],
    });
    vi.mocked(aiApi.createSession).mockResolvedValue({ data: pending } as any);
    vi.mocked(aiApi.approveSession).mockResolvedValue({ data: session() } as any);

    const store = useAssistStore();
    await store.open({ scope: "system", subject: "x", seedMessage: "check", autoRun: false });
    store.declineAll();
    await Promise.resolve();

    expect(aiApi.approveSession).toHaveBeenCalledWith("ais_1", { c1: false });
  });

  it("refreshes a stale disabled status before giving up", async () => {
    const { aiApi } = await import("@/services/api");
    vi.mocked(aiApi.status)
      .mockResolvedValueOnce({ data: { enabled: false } } as any)
      .mockResolvedValueOnce({ data: { enabled: true } } as any);
    vi.mocked(aiApi.createSession).mockResolvedValue({ data: session() } as any);

    // Prime the ai store cache as disabled.
    const aiStore = useAIStore();
    await aiStore.fetchStatus();

    const store = useAssistStore();
    await store.open({ scope: "system", subject: "x", seedMessage: "hi" });

    expect(store.error).toBe("");
    expect(store.session?.id).toBe("ais_1");
  });
});
