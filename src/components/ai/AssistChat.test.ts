import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createPinia, setActivePinia } from "pinia";
import AssistChat from "./AssistChat.vue";
import { useAssistStore } from "@/stores/assist";
import type { AISession } from "@/services/api";

vi.mock("dompurify", () => ({
  default: { sanitize: (html: string) => html.replace(/<script[\s\S]*?<\/script>/g, "") },
}));

vi.mock("@/services/api", () => ({
  aiApi: { approveSession: vi.fn().mockResolvedValue({ data: { messages: [], pending: [], suggested_actions: [] } }) },
  containersApi: { exec: vi.fn() },
  deploymentsApi: { serviceAction: vi.fn(), getServices: vi.fn() },
}));

const mountChat = () =>
  mount(AssistChat, {
    global: { stubs: { Teleport: true, Transition: false, RouterLink: { template: "<a><slot /></a>" } } },
  });

describe("AssistChat", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
  });

  it("renders user and assistant turns with tool steps", async () => {
    const store = useAssistStore();
    store.visible = true;
    store.subject = "myapp";
    store.scope = "deployment";
    store.session = {
      id: "ais_1",
      scope: "deployment",
      deployment: "myapp",
      auto_run: true,
      status: "ready",
      messages: [
        { role: "user", content: "is it healthy?" },
        {
          role: "assistant",
          content: "## Summary\nIt is healthy.",
          tool_steps: [{ name: "list_deployments", arguments: "{}", result: "- myapp (running)" }],
        },
      ],
      pending: [],
      suggested_actions: [],
    } as AISession;

    const wrapper = mountChat();
    expect(wrapper.find(".bubble.user").text()).toContain("is it healthy?");
    expect(wrapper.find(".markdown").html()).toContain("<h2>");
    expect(wrapper.find(".tool-step-head").text()).toContain("list deployments");
  });

  it("shows the approval card when tools are pending", () => {
    const store = useAssistStore();
    store.visible = true;
    store.session = {
      id: "ais_1",
      scope: "system",
      auto_run: false,
      status: "awaiting_approval",
      messages: [{ role: "user", content: "check networks" }],
      pending: [{ id: "c1", name: "exec_in_service", arguments: '{"service":"web","command":"env"}' }],
      suggested_actions: [],
    } as AISession;

    const wrapper = mountChat();
    const card = wrapper.find(".approval-card");
    expect(card.exists()).toBe(true);
    expect(card.text()).toContain("exec in service: env");
    expect(card.find(".approval-buttons").exists()).toBe(true);
    expect(card.text()).toContain("Allow");
    expect(card.text()).toContain("Decline");
  });

  it("submits a single decision on one click", async () => {
    const { aiApi } = await import("@/services/api");
    const store = useAssistStore();
    store.visible = true;
    store.session = {
      id: "ais_1",
      scope: "system",
      auto_run: false,
      status: "awaiting_approval",
      messages: [{ role: "user", content: "check" }],
      pending: [{ id: "c1", name: "list_networks", arguments: "{}" }],
      suggested_actions: [],
    } as AISession;

    const wrapper = mountChat();
    const allow = wrapper.findAll(".approval-buttons button").find((b) => b.text() === "Allow");
    await allow!.trigger("click");
    expect(vi.mocked(aiApi.approveSession)).toHaveBeenCalledWith("ais_1", { c1: true });
  });

  it("disables input while awaiting approval", () => {
    const store = useAssistStore();
    store.visible = true;
    store.session = {
      id: "ais_1",
      scope: "system",
      auto_run: false,
      status: "awaiting_approval",
      messages: [],
      pending: [{ id: "c1", name: "list_networks", arguments: "{}" }],
      suggested_actions: [],
    } as AISession;

    const wrapper = mountChat();
    expect(wrapper.find(".composer-input").attributes("disabled")).toBeDefined();
  });

  it("offers a settings link when AI is disabled", () => {
    const store = useAssistStore();
    store.visible = true;
    store.error =
      "The AI assistant is not configured. An admin can connect any OpenAI-compatible provider under Settings, AI Assistant.";

    const wrapper = mountChat();
    expect(wrapper.find(".chat-settings-hint").exists()).toBe(true);
    expect(wrapper.text()).toContain("Open AI Settings");
  });
});
