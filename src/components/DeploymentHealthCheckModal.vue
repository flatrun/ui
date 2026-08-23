<template>
  <BaseModal
    :visible="visible"
    title="Application health check"
    subtitle="Choose how FlatRun should verify this service."
    icon="pi pi-check-circle"
    size="md"
    :close-disabled="saving"
    :close-on-overlay="false"
    @close="emit('close')"
  >
    <form class="health-form" @submit.prevent="save">
      <div v-if="configuredChecks.length" class="configured-checks">
        <div v-for="check in configuredChecks" :key="check.service" class="configured-check">
          <button type="button" class="configured-check-main" @click="selectCheck(check.service || '')">
            <strong>{{ check.service }}</strong>
            <span>{{ checkLabel(check) }}</span>
          </button>
          <BaseButton
            variant="ghost"
            size="sm"
            icon="trash-2"
            :disabled="saving"
            @click="removeCheck(check.service || '')"
          >
            Remove
          </BaseButton>
        </div>
      </div>
      <div class="target-grid">
        <BaseField label="Check type" hint="Use TCP or a command for services that do not speak HTTP.">
          <BaseSelect v-model="checkType" :disabled="saving">
            <option value="http">HTTP request</option>
            <option value="tcp">TCP connection</option>
            <option value="exec">Container command</option>
          </BaseSelect>
        </BaseField>

        <BaseField label="Service" hint="The container that receives the request.">
          <BaseSelect v-model="service" :disabled="saving">
            <option value="" disabled>Select a service</option>
            <option v-for="name in services" :key="name" :value="name">{{ name }}</option>
          </BaseSelect>
        </BaseField>

        <BaseField v-if="checkType !== 'exec'" label="Container port" hint="The port used inside the container.">
          <BaseInput v-model="port" type="number" placeholder="8080" :disabled="saving" />
        </BaseField>
      </div>

      <template v-if="checkType === 'http'">
        <BaseField label="Request path" hint="Any endpoint is valid. It does not need to be /health.">
          <BaseInput v-model="path" placeholder="/health" :disabled="saving" />
        </BaseField>

        <BaseField label="Accepted status codes" hint="Leave empty to accept every response from 200 through 399.">
          <BaseInput v-model="statuses" placeholder="200, 204" :disabled="saving" />
        </BaseField>

        <BaseField
          label="Response must contain"
          hint='Optional text FlatRun must find in the response body, such as "status":"ready".'
        >
          <BaseInput v-model="responseContains" placeholder='"status":"ready"' :disabled="saving" />
        </BaseField>
      </template>

      <BaseField
        v-else-if="checkType === 'tcp'"
        label="TCP check"
        hint="FlatRun will open a connection to this port without sending an HTTP request."
      >
        <p class="check-summary">A successful connection marks the service healthy.</p>
      </BaseField>

      <BaseField
        v-else
        label="Health command"
        hint="The command runs inside the selected service. Exit code 0 means healthy."
      >
        <BaseTextarea v-model="command" placeholder="pg_isready -U postgres" :disabled="saving" :rows="3" />
      </BaseField>

      <p v-if="error" class="form-error">{{ error }}</p>
    </form>

    <template #footer>
      <BaseButton variant="ghost" :disabled="saving" @click="emit('close')">Cancel</BaseButton>
      <BaseButton variant="primary" icon="circle-check" :loading="saving" @click="save">Save and check</BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseField from "@/components/base/BaseField.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseTextarea from "@/components/base/BaseTextarea.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import { deploymentsApi, type ServiceMetadata } from "@/services/api";

type HealthCheck = ServiceMetadata["healthcheck"];

const props = defineProps<{
  visible: boolean;
  deploymentName: string;
  services: string[];
  metadata?: ServiceMetadata;
}>();
const emit = defineEmits<{ close: []; saved: [] }>();

const service = ref("");
const port = ref("");
const checkType = ref<"http" | "tcp" | "exec">("http");
const path = ref("");
const statuses = ref("");
const responseContains = ref("");
const command = ref("");
const saving = ref(false);
const error = ref("");

const configuredChecks = ref<HealthCheck[]>([]);

function legacyChecks(): HealthCheck[] {
  if (props.metadata?.healthchecks?.length) return props.metadata.healthchecks.map((check) => ({ ...check }));
  const legacy = props.metadata?.healthcheck;
  if (legacy && (legacy.type || legacy.path || legacy.command || legacy.port)) return [{ ...legacy }];
  return [];
}

function checkLabel(check: HealthCheck) {
  if (check.type === "exec") return "Container command";
  if (check.type === "tcp") return `TCP port ${check.port}`;
  return `HTTP ${check.path || "/"}`;
}

function loadCheck(name: string) {
  const configured = configuredChecks.value.find((check) => check.service === name);
  const check = configured || ({} as HealthCheck);
  checkType.value = check.type === "tcp" || check.type === "exec" ? check.type : "http";
  service.value = name;
  const fallbackPort = name === props.metadata?.networking?.service ? props.metadata.networking.container_port : 0;
  port.value = check.port ? String(check.port) : fallbackPort ? String(fallbackPort) : "";
  path.value = check.path || "";
  statuses.value = check.success_statuses?.join(", ") || "";
  responseContains.value = check.response_contains || "";
  command.value = check.command || "";
}

function selectCheck(name: string) {
  loadCheck(name);
}

watch(
  () => props.visible,
  (open) => {
    if (!open) return;
    configuredChecks.value = legacyChecks();
    const initialService =
      configuredChecks.value[0]?.service ||
      props.metadata?.primary_service ||
      props.metadata?.networking?.service ||
      "";
    loadCheck(initialService);
    error.value = "";
  },
);

watch(service, (name) => {
  if (name) loadCheck(name);
});

function parsedStatuses(): number[] | null {
  if (!statuses.value.trim()) return [];
  const values = statuses.value.split(",").map((value) => Number(value.trim()));
  if (values.some((value) => !Number.isInteger(value) || value < 100 || value > 599)) return null;
  return [...new Set(values)];
}

async function save() {
  const acceptedStatuses = parsedStatuses();
  const containerPort = checkType.value === "exec" ? 0 : Number(port.value);
  if (!service.value) {
    error.value = "Select the service that should receive the health request.";
    return;
  }
  if (checkType.value !== "exec" && (!Number.isInteger(containerPort) || containerPort < 1 || containerPort > 65535)) {
    error.value = "Enter a container port from 1 through 65535.";
    return;
  }
  if (checkType.value === "http" && !path.value.startsWith("/")) {
    error.value = "The request path must start with /.";
    return;
  }
  if (checkType.value === "http" && acceptedStatuses === null) {
    error.value = "Enter status codes separated by commas, such as 200, 204.";
    return;
  }
  if (checkType.value === "exec" && !command.value.trim()) {
    error.value = "Enter the command that should report service health.";
    return;
  }

  saving.value = true;
  error.value = "";
  try {
    const nextCheck: HealthCheck = {
      type: checkType.value,
      service: service.value,
      port: containerPort,
      path: checkType.value === "http" ? path.value : "",
      interval: props.metadata?.healthcheck?.interval || "30s",
      success_statuses: checkType.value === "http" ? acceptedStatuses || [] : [],
      response_contains: checkType.value === "http" ? responseContains.value : "",
      command: checkType.value === "exec" ? command.value.trim() : "",
    };
    const healthchecks = configuredChecks.value.filter((check) => check.service !== service.value);
    healthchecks.push(nextCheck);
    await deploymentsApi.updateMetadata(props.deploymentName, { healthcheck: emptyHealthCheck(), healthchecks });
    emit("saved");
  } catch (cause: any) {
    error.value = cause.response?.data?.error || cause.message || "The health check could not be saved.";
  } finally {
    saving.value = false;
  }
}

async function removeCheck(name: string) {
  if (!name) return;
  saving.value = true;
  error.value = "";
  try {
    const healthchecks = configuredChecks.value.filter((check) => check.service !== name);
    await deploymentsApi.updateMetadata(props.deploymentName, { healthcheck: emptyHealthCheck(), healthchecks });
    configuredChecks.value = healthchecks;
    loadCheck(healthchecks[0]?.service || props.services[0] || "");
  } catch (cause: any) {
    error.value = cause.response?.data?.error || cause.message || "The health check could not be removed.";
  } finally {
    saving.value = false;
  }
}

function emptyHealthCheck(): HealthCheck {
  return { path: "", interval: "" };
}
</script>

<style scoped>
.health-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.target-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(8rem, 0.55fr);
  gap: var(--space-4);
}

.configured-checks {
  display: flex;
  flex-direction: column;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-sunken);
}

.configured-check {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border-bottom: 1px solid var(--border);
}

.configured-check:last-child {
  border-bottom: 0;
}

.configured-check-main {
  flex: 1;
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: var(--space-3);
  padding: var(--space-2);
  border: 0;
  background: transparent;
  color: var(--text);
  text-align: left;
  cursor: pointer;
}

.configured-check-main span {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.form-error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-danger-50);
  color: var(--color-danger-700);
  font-size: var(--text-sm);
}

.check-summary {
  margin: 0;
  min-height: 2.5rem;
  display: flex;
  align-items: center;
  padding: 0 var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-sunken);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

@media (max-width: 540px) {
  .target-grid {
    grid-template-columns: 1fr;
  }
}
</style>
