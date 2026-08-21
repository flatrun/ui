<template>
  <BaseModal
    :visible="visible"
    title="Deployment diagnostics"
    subtitle="Checks each layer from the container to the public request."
    icon="pi pi-search"
    :icon-color="summaryTone"
    size="lg"
    :close-disabled="loading"
    @close="emit('close')"
  >
    <form class="incident-search" @submit.prevent="runDiagnostics">
      <div>
        <label for="diagnostic-incident-id">Visitor incident ID</label>
        <span>Enter the ID shown on the visitor's error page to inspect that exact request.</span>
      </div>
      <div class="incident-controls">
        <BaseInput id="diagnostic-incident-id" v-model="incidentID" placeholder="FR-1234ABCDEF56" :disabled="loading" />
        <BaseButton type="submit" variant="secondary" :loading="loading">Find incident</BaseButton>
      </div>
    </form>

    <div v-if="loading && !diagnostics" class="diagnostic-loading">
      <Icon name="loader-circle" spin :size="26" />
      <div>
        <strong>Checking {{ deploymentName }}</strong>
        <span>Testing the container, application endpoint, proxy, TLS, public response, and security rules.</span>
      </div>
    </div>

    <div v-else-if="error" class="diagnostic-error">
      <Icon name="triangle-alert" :size="20" />
      <div>
        <strong>Diagnostics could not finish</strong>
        <span>{{ error }}</span>
      </div>
    </div>

    <template v-else-if="diagnostics">
      <div class="diagnostic-summary" :class="`diagnostic-summary--${summaryTone}`">
        <Icon :name="diagnostics.healthy ? 'circle-check' : 'triangle-alert'" :size="20" />
        <div>
          <strong>{{ diagnostics.healthy ? "All checks passed" : "Action needed" }}</strong>
          <span>{{ summaryText }}</span>
        </div>
      </div>

      <ol class="diagnostic-steps">
        <li v-for="step in diagnostics.steps" :key="step.id" class="diagnostic-step">
          <div class="step-status" :class="`step-status--${step.status}`">
            <Icon :name="statusIcon(step.status)" :size="17" />
          </div>
          <div class="step-copy">
            <div class="step-title">
              <strong>{{ step.label }}</strong>
              <span class="status-pill" :class="`status-pill--${step.status}`">{{ step.status }}</span>
            </div>
            <p>{{ step.detail }}</p>
            <details v-if="step.output" class="step-output">
              <summary>Response details</summary>
              <pre>{{ step.output }}</pre>
            </details>
          </div>
          <BaseButton
            v-if="actionLabel(step.action)"
            size="sm"
            :variant="step.action === 'unblock_ip' ? 'danger' : 'secondary'"
            :loading="actingOn === step.id"
            @click="handleAction(step)"
          >
            {{ actionLabel(step.action) }}
          </BaseButton>
        </li>
      </ol>

      <p class="health-note">
        The health path in <code>service.yml</code> is tested as application health. Docker health remains defined by
        Compose and is shown separately.
      </p>
    </template>

    <template #footer>
      <BaseButton variant="secondary" :disabled="loading" @click="emit('close')">Close</BaseButton>
      <BaseButton icon="refresh-cw" :loading="loading" @click="runDiagnostics">Run again</BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import Icon from "@/components/base/Icon.vue";
import {
  deploymentsApi,
  securityApi,
  type DeploymentDiagnostics,
  type DeploymentDiagnosticStatus,
  type DeploymentDiagnosticStep,
} from "@/services/api";

const props = defineProps<{
  visible: boolean;
  deploymentName: string;
}>();

const emit = defineEmits<{
  close: [];
  action: [action: string, value?: string];
}>();

const diagnostics = ref<DeploymentDiagnostics | null>(null);
const loading = ref(false);
const error = ref("");
const actingOn = ref("");
const incidentID = ref("");

const failedCount = computed(() => diagnostics.value?.steps.filter((step) => step.status === "failed").length ?? 0);
const warningCount = computed(() => diagnostics.value?.steps.filter((step) => step.status === "warning").length ?? 0);
const summaryTone = computed<"success" | "warning" | "danger">(() => {
  if (failedCount.value) return "danger";
  if (warningCount.value) return "warning";
  return "success";
});
const summaryText = computed(() => {
  if (failedCount.value)
    return `${failedCount.value} ${failedCount.value === 1 ? "check needs" : "checks need"} attention.`;
  if (warningCount.value)
    return `${warningCount.value} ${warningCount.value === 1 ? "check has" : "checks have"} a warning.`;
  return "The deployment is reachable through every configured layer.";
});

watch(
  () => props.visible,
  (visible) => {
    if (visible) runDiagnostics();
  },
);

async function runDiagnostics() {
  loading.value = true;
  error.value = "";
  try {
    const response = await deploymentsApi.diagnostics(props.deploymentName, incidentID.value.trim().toUpperCase());
    diagnostics.value = response.data;
  } catch (cause: any) {
    error.value = cause?.response?.data?.error || cause?.message || "The checks could not be completed.";
  } finally {
    loading.value = false;
  }
}

async function handleAction(step: DeploymentDiagnosticStep) {
  if (!step.action) return;
  if (step.action !== "unblock_ip") {
    emit("action", step.action, step.value);
    return;
  }

  if (!step.value) return;
  actingOn.value = step.id;
  error.value = "";
  try {
    await securityApi.unblockIP(step.value);
    await runDiagnostics();
  } catch (cause: any) {
    error.value = cause?.response?.data?.error || cause?.message || "The IP could not be unblocked.";
  } finally {
    actingOn.value = "";
  }
}

function statusIcon(status: DeploymentDiagnosticStatus): string {
  if (status === "passed") return "circle-check";
  if (status === "failed") return "circle-x";
  if (status === "warning") return "triangle-alert";
  return "minus";
}

function actionLabel(action?: string): string {
  const labels: Record<string, string> = {
    start_deployment: "Start",
    edit_compose: "Edit Compose",
    edit_healthcheck: "Configure health check",
    configure_domain: "Domain settings",
    renew_certificate: "Renew",
    view_logs: "View logs",
    unblock_ip: "Unblock IP",
  };
  return action ? labels[action] || "" : "";
}
</script>

<style scoped>
.diagnostic-loading,
.diagnostic-error,
.diagnostic-summary {
  display: flex;
  align-items: flex-start;
  gap: var(--space-3);
  padding: var(--space-4);
  border-radius: var(--radius-lg);
}

.incident-search {
  display: grid;
  gap: var(--space-3);
  margin-bottom: var(--space-4);
  padding: var(--space-4);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  background: var(--surface-sunken);
}

.incident-search > div:first-child {
  display: grid;
  gap: var(--space-1);
}

.incident-search label {
  color: var(--text);
  font-weight: var(--font-semibold);
}

.incident-search span {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.incident-controls {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--space-2);
}

.diagnostic-loading {
  color: var(--text-muted);
  background: var(--surface-sunken);
}

.diagnostic-error,
.diagnostic-summary--danger {
  color: var(--color-danger-700);
  background: var(--color-danger-50);
}

.diagnostic-summary--warning {
  color: var(--color-warning-700);
  background: var(--color-warning-50);
}

.diagnostic-summary--success {
  color: var(--color-success-700);
  background: var(--color-success-50);
}

.diagnostic-loading div,
.diagnostic-error div,
.diagnostic-summary div {
  display: grid;
  gap: var(--space-1);
}

.diagnostic-loading span,
.diagnostic-error span,
.diagnostic-summary span {
  font-size: var(--text-sm);
}

.diagnostic-steps {
  display: grid;
  gap: 0;
  margin: var(--space-4) 0 0;
  padding: 0;
  list-style: none;
}

.diagnostic-step {
  display: grid;
  grid-template-columns: 32px minmax(0, 1fr) auto;
  align-items: start;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-subtle);
}

.diagnostic-step:last-child {
  border-bottom: 0;
}

.step-status {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: var(--radius-full);
  color: var(--text-muted);
  background: var(--surface-inset);
}

.step-status--passed {
  color: var(--color-success-700);
  background: var(--color-success-50);
}

.step-status--failed {
  color: var(--color-danger-700);
  background: var(--color-danger-50);
}

.step-status--warning {
  color: var(--color-warning-700);
  background: var(--color-warning-50);
}

.step-copy {
  min-width: 0;
}

.step-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.step-copy p {
  margin: var(--space-1) 0 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
  line-height: 1.45;
}

.step-output {
  margin-top: var(--space-2);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-sunken);
}

.step-output summary {
  padding: var(--space-2) var(--space-3);
  color: var(--text);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
}

.step-output pre {
  max-height: 14rem;
  margin: 0;
  padding: var(--space-3);
  overflow: auto;
  border-top: 1px solid var(--border);
  color: var(--text-muted);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
}

.status-pill {
  padding: 2px var(--space-2);
  border-radius: var(--radius-full);
  color: var(--text-muted);
  background: var(--surface-inset);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: capitalize;
}

.status-pill--passed {
  color: var(--color-success-700);
  background: var(--color-success-50);
}

.status-pill--failed {
  color: var(--color-danger-700);
  background: var(--color-danger-50);
}

.status-pill--warning {
  color: var(--color-warning-700);
  background: var(--color-warning-50);
}

.health-note {
  margin: var(--space-4) 0 0;
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  background: var(--surface-sunken);
  font-size: var(--text-sm);
}

.health-note code {
  color: var(--text);
}

@media (max-width: 640px) {
  .incident-controls {
    grid-template-columns: 1fr;
  }

  .incident-controls :deep(.btn) {
    width: 100%;
  }

  .diagnostic-step {
    grid-template-columns: 32px minmax(0, 1fr);
  }

  .diagnostic-step :deep(.btn) {
    grid-column: 1 / -1;
    width: 100%;
  }
}
</style>
