import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
import AssistModal from "./AssistModal.vue";
import type { AIAnalysis } from "@/services/api";

// DOMPurify misbehaves under happy-dom (drops safe tags, keeps event
// handlers), so the mock verifies the component routes its output
// through sanitize rather than re-testing the library.
vi.mock("dompurify", () => ({
  default: {
    sanitize: (html: string) =>
      html.replace(/\son\w+="[^"]*"/g, "").replace(/<script[\s\S]*?<\/script>/g, ""),
  },
}));

const result: AIAnalysis = {
  analysis: "## Diagnosis\nThe **database** is unreachable.",
  suggested_actions: [
    {
      kind: "service_action",
      service: "db",
      action: "restart",
      title: "Restart the database",
      reason: "connection refused",
    },
    { kind: "exec", service: "web", command: "php artisan config:clear", title: "Clear config cache" },
  ],
  intent: "diagnose",
  model: "test-model",
  redactions: 3,
};

const mountModal = (props = {}) =>
  mount(AssistModal, {
    props: {
      visible: true,
      subject: "myapp",
      ...props,
    },
    global: {
      stubs: { Teleport: true, Transition: false, RouterLink: { template: "<a><slot /></a>" } },
    },
  });

describe("AssistModal", () => {
  it("shows a loading state", () => {
    const wrapper = mountModal({ loading: true });
    expect(wrapper.find(".assist-loading").exists()).toBe(true);
    expect(wrapper.text()).toContain("Analyzing myapp");
  });

  it("shows the error state", () => {
    const wrapper = mountModal({ error: "provider returned 401" });
    expect(wrapper.find(".assist-error").text()).toContain("provider returned 401");
  });

  it("offers a settings link when AI is not configured", () => {
    const wrapper = mountModal({ error: "not configured", settingsHint: true });
    expect(wrapper.find(".assist-error.informational").exists()).toBe(true);
    expect(wrapper.text()).toContain("Open AI Settings");
    expect(wrapper.find(".intent-bar").exists()).toBe(false);
  });

  it("renders intent chips and emits rerun on click", async () => {
    const wrapper = mountModal({ result });
    const chips = wrapper.findAll(".intent-chip");
    expect(chips.map((c) => c.text())).toEqual(["Diagnose", "Improve", "Secure", "Explain"]);

    await chips[2].trigger("click");
    const emitted = wrapper.emitted("rerun");
    expect(emitted).toHaveLength(1);
    expect(emitted![0][0]).toBe("secure");
  });

  it("emits rerun with the question on Ask", async () => {
    const wrapper = mountModal({ result, intent: "explain" });
    await wrapper.find(".question-input").setValue("what does this service do?");
    await wrapper.find(".question-bar button").trigger("click");
    const emitted = wrapper.emitted("rerun");
    expect(emitted![0]).toEqual(["explain", "what does this service do?"]);
  });

  it("renders the analysis as sanitized markdown", () => {
    const wrapper = mountModal({ result });
    const html = wrapper.find(".analysis-markdown").html();
    expect(html).toContain("<h2>");
    expect(html).toContain("<strong>database</strong>");
  });

  it("strips scriptable content from the analysis", () => {
    const wrapper = mountModal({
      result: { ...result, analysis: 'hello <img src=x onerror="alert(1)"> <script>alert(2)</script>' },
    });
    const html = wrapper.find(".analysis-markdown").html();
    expect(html).not.toContain("onerror");
    expect(html).not.toContain("<script>");
  });

  it("renders suggestion cards and emits run with the suggestion", async () => {
    const wrapper = mountModal({ result });
    const cards = wrapper.findAll(".suggestion-card");
    expect(cards.length).toBe(2);
    expect(cards[0].text()).toContain("Restart the database");
    expect(cards[1].text()).toContain("php artisan config:clear");

    await cards[0].find("button").trigger("click");
    const emitted = wrapper.emitted("run");
    expect(emitted).toHaveLength(1);
    expect(emitted![0][0]).toMatchObject({ kind: "service_action", service: "db", action: "restart" });
  });

  it("shows the model and redaction count", () => {
    const wrapper = mountModal({ result });
    expect(wrapper.find(".assist-meta").text()).toContain("test-model");
    expect(wrapper.find(".assist-meta").text()).toContain("3 secret value(s) redacted");
  });

  it("shows per-suggestion output when provided", () => {
    const wrapper = mountModal({ result, suggestionOutputs: { 1: "config cache cleared" } });
    expect(wrapper.find(".suggestion-output pre").text()).toContain("config cache cleared");
  });
});
