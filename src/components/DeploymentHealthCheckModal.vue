<template>
  <BaseModal
    :visible="visible"
    title="Application health check"
    subtitle="Choose the request FlatRun should make and what counts as healthy."
    icon="pi pi-check-circle"
    size="md"
    :close-disabled="saving"
    :close-on-overlay="false"
    @close="emit('close')"
  >
    <form class="health-form" @submit.prevent="save">
      <div class="target-grid">
        <BaseField label="Service" hint="The container that receives the request.">
          <BaseSelect v-model="service" :disabled="saving">
            <option value="" disabled>Select a service</option>
            <option v-for="name in services" :key="name" :value="name">{{ name }}</option>
          </BaseSelect>
        </BaseField>

        <BaseField label="Container port" hint="The port used inside the container.">
          <BaseInput v-model="port" type="number" placeholder="8080" :disabled="saving" />
        </BaseField>
      </div>

      <BaseField label="Request path" hint="Any endpoint is valid. It does not need to be /health.">
        <BaseInput v-model="path" placeholder="/" :disabled="saving" />
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
import BaseButton from "@/components/base/BaseButton.vue";
import { deploymentsApi, type ServiceMetadata } from "@/services/api";

const props = defineProps<{
  visible: boolean;
  deploymentName: string;
  services: string[];
  metadata?: ServiceMetadata;
}>();
const emit = defineEmits<{ close: []; saved: [] }>();

const service = ref("");
const port = ref("");
const path = ref("/");
const statuses = ref("");
const responseContains = ref("");
const saving = ref(false);
const error = ref("");

watch(
  () => props.visible,
  (open) => {
    if (!open) return;
    service.value = props.metadata?.primary_service || props.metadata?.networking?.service || "";
    port.value = props.metadata?.networking?.container_port ? String(props.metadata.networking.container_port) : "";
    path.value = props.metadata?.healthcheck?.path || "/";
    statuses.value = props.metadata?.healthcheck?.success_statuses?.join(", ") || "";
    responseContains.value = props.metadata?.healthcheck?.response_contains || "";
    error.value = "";
  },
);

function parsedStatuses(): number[] | null {
  if (!statuses.value.trim()) return [];
  const values = statuses.value.split(",").map((value) => Number(value.trim()));
  if (values.some((value) => !Number.isInteger(value) || value < 100 || value > 599)) return null;
  return [...new Set(values)];
}

async function save() {
  const acceptedStatuses = parsedStatuses();
  const containerPort = Number(port.value);
  if (!service.value) {
    error.value = "Select the service that should receive the health request.";
    return;
  }
  if (!Number.isInteger(containerPort) || containerPort < 1 || containerPort > 65535) {
    error.value = "Enter a container port from 1 through 65535.";
    return;
  }
  if (!path.value.startsWith("/")) {
    error.value = "The request path must start with /.";
    return;
  }
  if (acceptedStatuses === null) {
    error.value = "Enter status codes separated by commas, such as 200, 204.";
    return;
  }

  saving.value = true;
  error.value = "";
  try {
    await deploymentsApi.updateMetadata(props.deploymentName, {
      primary_service: service.value,
      networking: {
        ...(props.metadata?.networking || {
          expose: false,
          domain: "",
          container_port: containerPort,
          protocol: "http",
        }),
        service: service.value,
        container_port: containerPort,
      },
      healthcheck: {
        path: path.value,
        interval: props.metadata?.healthcheck?.interval || "30s",
        success_statuses: acceptedStatuses,
        response_contains: responseContains.value,
      },
    });
    emit("saved");
  } catch (cause: any) {
    error.value = cause.response?.data?.error || cause.message || "The health check could not be saved.";
  } finally {
    saving.value = false;
  }
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

.form-error {
  margin: 0;
  padding: var(--space-3);
  border-radius: var(--radius-md);
  background: var(--color-danger-50);
  color: var(--color-danger-700);
  font-size: var(--text-sm);
}

@media (max-width: 540px) {
  .target-grid {
    grid-template-columns: 1fr;
  }
}
</style>
