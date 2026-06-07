import { defineStore } from "pinia";
import { ref } from "vue";
import {
  aiApi,
  containersApi,
  deploymentsApi,
  type AISession,
  type AISuggestedAction,
} from "@/services/api";
import { useAIStore } from "@/stores/ai";
import { usePlanFlowStore } from "@/stores/planFlow";

export const AI_DISABLED_MESSAGE =
  "The AI assistant is not configured. An admin can connect any OpenAI-compatible provider under Settings, AI Assistant.";

// AssistContext opens the assistant against something. scope "system"
// asks about the whole instance; "deployment" binds tools to one
// deployment and unlocks one-click suggested actions. seedMessage, when
// given, is sent as the first turn (used by log/operation entry points
// that already hold the content the user is looking at).
export interface AssistContext {
  scope: "system" | "deployment";
  deployment?: string;
  subject: string;
  // seedMessage is the short prompt shown in the transcript; seedContext
  // is bulky material (logs, output) sent to the model but not shown.
  seedMessage?: string;
  seedContext?: string;
  autoRun?: boolean;
}

export const useAssistStore = defineStore("assist", () => {
  const visible = ref(false);
  const subject = ref("");
  const scope = ref<"system" | "deployment">("system");
  const deployment = ref<string | undefined>(undefined);
  const autoRun = ref(true);
  const session = ref<AISession | null>(null);
  const loading = ref(false);
  const error = ref("");
  const runningIndex = ref<number | null>(null);
  const suggestionOutputs = ref<Record<number, string>>({});
  // Per-call decisions while an approval batch is open; once every
  // pending call is decided the batch is submitted.
  const decisions = ref<Record<string, boolean>>({});

  function reset() {
    session.value = null;
    loading.value = false;
    error.value = "";
    runningIndex.value = null;
    suggestionOutputs.value = {};
    decisions.value = {};
  }

  async function ensureEnabled(): Promise<boolean> {
    const aiStore = useAIStore();
    await aiStore.fetchStatus();
    if (!aiStore.status?.enabled) await aiStore.fetchStatus(true);
    if (aiStore.status?.enabled) return true;
    error.value = AI_DISABLED_MESSAGE;
    return false;
  }

  async function open(ctx: AssistContext) {
    reset();
    visible.value = true;
    subject.value = ctx.subject;
    scope.value = ctx.scope;
    deployment.value = ctx.deployment;
    autoRun.value = ctx.autoRun ?? true;
    if (!(await ensureEnabled())) return;
    if (ctx.seedMessage) {
      await send(ctx.seedMessage, ctx.seedContext);
    }
  }

  async function send(message: string, context?: string) {
    if (loading.value) return;
    error.value = "";
    suggestionOutputs.value = {};
    loading.value = true;
    try {
      const response = session.value
        ? await aiApi.sessionMessage(session.value.id, message, context)
        : await aiApi.createSession({
            scope: scope.value,
            deployment: deployment.value,
            auto_run: autoRun.value,
            message,
            context,
          });
      session.value = response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
    } finally {
      loading.value = false;
    }
  }

  async function resolveApprovals(approved: Record<string, boolean>) {
    if (!session.value || loading.value) return;
    loading.value = true;
    decisions.value = {};
    try {
      const response = await aiApi.approveSession(session.value.id, approved);
      session.value = response.data;
    } catch (err: any) {
      error.value = err.response?.data?.error || err.message;
    } finally {
      loading.value = false;
    }
  }

  // decide records one call's allow/deny; when every pending call has a
  // decision the whole batch is submitted, so a single pending call
  // resolves on one click.
  function decide(id: string, allow: boolean) {
    if (!session.value) return;
    decisions.value = { ...decisions.value, [id]: allow };
    if (session.value.pending.every((p) => p.id in decisions.value)) {
      resolveApprovals({ ...decisions.value });
    }
  }

  function approveAll() {
    if (!session.value) return;
    const map: Record<string, boolean> = {};
    session.value.pending.forEach((p) => (map[p.id] = true));
    resolveApprovals(map);
  }

  function declineAll() {
    if (!session.value) return;
    const map: Record<string, boolean> = {};
    session.value.pending.forEach((p) => (map[p.id] = false));
    resolveApprovals(map);
  }

  async function runSuggestion(suggestion: AISuggestedAction, index: number) {
    const name = deployment.value;
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
    reset();
  }

  return {
    visible,
    subject,
    scope,
    deployment,
    autoRun,
    session,
    loading,
    error,
    runningIndex,
    suggestionOutputs,
    decisions,
    open,
    send,
    decide,
    approveAll,
    declineAll,
    resolveApprovals,
    runSuggestion,
    close,
  };
});
