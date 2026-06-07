import { defineStore } from "pinia";
import { ref } from "vue";
import {
  aiApi,
  containersApi,
  deploymentsApi,
  type AIAnalysis,
  type AISuggestedAction,
  type AssistIntent,
  type AssistSource,
} from "@/services/api";
import { useAIStore } from "@/stores/ai";
import { usePlanFlowStore } from "@/stores/planFlow";

export const AI_DISABLED_MESSAGE =
  "The AI assistant is not configured. An admin can connect any OpenAI-compatible provider under Settings, AI Assistant.";

// AssistContext describes what the assistant is looking at. Any
// surface in the app can open the assistant by supplying one; the
// modal lets the user switch intent or ask follow-up questions against
// the same context.
export interface AssistContext {
  scope: "deployment" | "system";
  deployment?: string;
  subject: string;
  sources: AssistSource[];
  intent?: AssistIntent;
  question?: string;
}

export const useAssistStore = defineStore("assist", () => {
  const visible = ref(false);
  const loading = ref(false);
  const error = ref("");
  const result = ref<AIAnalysis | null>(null);
  const context = ref<AssistContext | null>(null);
  const intent = ref<AssistIntent>("diagnose");
  const runningIndex = ref<number | null>(null);
  const suggestionOutputs = ref<Record<number, string>>({});

  function resetRun() {
    loading.value = false;
    error.value = "";
    result.value = null;
    runningIndex.value = null;
    suggestionOutputs.value = {};
  }

  async function ensureEnabled(): Promise<boolean> {
    const aiStore = useAIStore();
    await aiStore.fetchStatus();
    if (!aiStore.status?.enabled) {
      // The cached status may predate the assistant being configured.
      await aiStore.fetchStatus(true);
    }
    if (aiStore.status?.enabled) return true;
    error.value = AI_DISABLED_MESSAGE;
    return false;
  }

  async function execute() {
    const ctx = context.value;
    if (!ctx) return;
    resetRun();
    if (!(await ensureEnabled())) return;
    loading.value = true;
    try {
      const body = { intent: intent.value, sources: ctx.sources, question: ctx.question };
      const response =
        ctx.scope === "deployment" && ctx.deployment
          ? await aiApi.assistDeployment(ctx.deployment, body)
          : await aiApi.assistSystem(body);
      result.value = response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
    } finally {
      loading.value = false;
    }
  }

  async function open(ctx: AssistContext) {
    context.value = ctx;
    intent.value = ctx.intent || "diagnose";
    visible.value = true;
    await execute();
  }

  async function rerun(newIntent: AssistIntent, question?: string) {
    if (!context.value) return;
    intent.value = newIntent;
    context.value = { ...context.value, question };
    await execute();
  }

  async function runSuggestion(suggestion: AISuggestedAction, index: number) {
    const name = context.value?.deployment;
    if (!name) return;
    runningIndex.value = index;
    try {
      if (suggestion.kind === "service_action" && suggestion.service && suggestion.action) {
        const planFlow = usePlanFlowStore();
        const actionResult = await planFlow.runGuarded(
          () => deploymentsApi.serviceAction(name, suggestion.service!, suggestion.action!),
          () => deploymentsApi.serviceAction(name, suggestion.service!, suggestion.action!, { plan: true }),
          "Action Failed",
        );
        if (actionResult === false) return;
        suggestionOutputs.value = { ...suggestionOutputs.value, [index]: actionResult.data?.output || "Done" };
      } else if (suggestion.kind === "exec" && suggestion.command) {
        const services = await deploymentsApi.getServices(name);
        const container = services.data.services?.find((svc) => svc.name === suggestion.service);
        if (!container?.container_id) {
          suggestionOutputs.value = {
            ...suggestionOutputs.value,
            [index]: `No running container found for service "${suggestion.service}"`,
          };
          return;
        }
        const response = await containersApi.exec(container.container_id, "sh", ["-c", suggestion.command]);
        suggestionOutputs.value = { ...suggestionOutputs.value, [index]: response.data.output || "(no output)" };
      }
    } catch (err: any) {
      suggestionOutputs.value = {
        ...suggestionOutputs.value,
        [index]: err.response?.data?.output || err.response?.data?.error || err.message,
      };
    } finally {
      runningIndex.value = null;
    }
  }

  function close() {
    visible.value = false;
    context.value = null;
    resetRun();
  }

  return {
    visible,
    loading,
    error,
    result,
    context,
    intent,
    runningIndex,
    suggestionOutputs,
    open,
    rerun,
    runSuggestion,
    close,
  };
});
