<template>
  <section class="services-panel">
    <header class="panel-header">
      <div>
        <span class="panel-kicker">Runtime configuration</span>
        <h2>Services</h2>
        <p>Review each container image and change its repository or tag without editing YAML.</p>
      </div>
      <BaseButton v-if="canWrite" icon="file-code-2" variant="secondary" @click="$emit('open-compose')">
        Compose editor
      </BaseButton>
    </header>

    <div v-if="services.length" class="service-table-wrap">
      <table class="service-table">
        <thead>
          <tr>
            <th>Service</th>
            <th>Image</th>
            <th>Status</th>
            <th>Ports</th>
            <th v-if="canWrite" aria-label="Actions" />
          </tr>
        </thead>
        <tbody>
          <tr v-for="service in services" :key="service.name">
            <td data-label="Service">
              <strong>{{ service.name }}</strong>
            </td>
            <td data-label="Image">
              <code>{{ service.image || "Build output" }}</code>
            </td>
            <td data-label="Status">
              <span class="status-chip" :class="service.status">{{ service.status || "unknown" }}</span>
            </td>
            <td data-label="Ports">{{ service.ports?.join(", ") || "None" }}</td>
            <td v-if="canWrite" class="service-action">
              <BaseButton size="sm" icon="pencil" variant="secondary" @click="openImageEditor(service)">
                Edit image
              </BaseButton>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div v-else class="empty-state">
      <Icon name="solar:box-minimalistic-bold-duotone" :size="32" />
      <h3>No services found</h3>
      <p>Add a service in the Compose editor, then rebuild the deployment.</p>
      <BaseButton v-if="canWrite" icon="file-code-2" variant="primary" @click="$emit('open-compose')">
        Open Compose editor
      </BaseButton>
    </div>

    <BaseModal
      :visible="Boolean(editingService)"
      title="Change service image"
      :subtitle="editingService ? `Update the image used by ${editingService.name}.` : ''"
      icon="solar:box-bold-duotone"
      size="sm"
      @close="closeImageEditor"
    >
      <form id="service-image-form" class="image-form" @submit.prevent="saveImage">
        <label for="service-image">Image reference</label>
        <input
          id="service-image"
          v-model.trim="imageReference"
          class="form-input"
          autocomplete="off"
          placeholder="nginx:1.27"
          required
        />
        <span class="field-help">Use a complete image reference, including the tag or digest you want to deploy.</span>
        <div v-if="saveError" class="form-error" role="alert">{{ saveError }}</div>
      </form>
      <template #footer>
        <BaseButton variant="secondary" :disabled="saving" @click="closeImageEditor">Cancel</BaseButton>
        <BaseButton form="service-image-form" type="submit" variant="primary" :loading="saving">Save image</BaseButton>
      </template>
    </BaseModal>
  </section>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { deploymentsApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import { usePlanFlow } from "@/composables/usePlanFlow";
import { updateComposeServiceImage } from "@/utils/compose";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import Icon from "@/components/base/Icon.vue";

interface DeploymentService {
  name: string;
  image?: string;
  status?: string;
  ports?: string[];
}

const props = defineProps<{
  deployment: string;
  composeContent: string;
  services: DeploymentService[];
  canWrite: boolean;
}>();

const emit = defineEmits<{
  saved: [content: string];
  "open-compose": [];
}>();

const notifications = useNotificationsStore();
const { runGuarded } = usePlanFlow();
const editingService = ref<DeploymentService | null>(null);
const imageReference = ref("");
const saving = ref(false);
const saveError = ref("");

const openImageEditor = (service: DeploymentService) => {
  editingService.value = service;
  imageReference.value = service.image || "";
  saveError.value = "";
};

const closeImageEditor = () => {
  if (saving.value) return;
  editingService.value = null;
  saveError.value = "";
};

const saveImage = async () => {
  if (!editingService.value) return;
  saveError.value = "";
  saving.value = true;
  try {
    const updated = updateComposeServiceImage(
      props.composeContent,
      editingService.value.name,
      imageReference.value,
    ).content;
    const result = await runGuarded(
      () => deploymentsApi.update(props.deployment, { compose_content: updated }),
      () => deploymentsApi.update(props.deployment, { compose_content: updated }, { plan: true }),
      "Image update failed",
    );
    if (result === false) return;
    emit("saved", updated);
    notifications.success("Image updated", `${editingService.value.name} will use ${imageReference.value}`);
    editingService.value = null;
  } catch (error: any) {
    saveError.value = error.response?.data?.error || error.message;
  } finally {
    saving.value = false;
  }
};
</script>

<style scoped>
.services-panel {
  overflow: hidden;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-xs);
}

.panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4);
  border-bottom: 1px solid var(--border);
}

.panel-header h2,
.panel-header p,
.empty-state h3,
.empty-state p {
  margin: 0;
}

.panel-header h2 {
  margin-top: var(--space-1);
  color: var(--text);
  font-size: var(--text-lg);
}

.panel-header p {
  margin-top: var(--space-1);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.panel-kicker {
  color: var(--accent);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.service-table-wrap {
  overflow-x: auto;
}

.service-table {
  width: 100%;
  border-collapse: collapse;
}

.service-table th,
.service-table td {
  padding: 6px 10px;
  border-bottom: 1px solid var(--border-subtle);
  text-align: left;
}

.service-table th {
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.service-table td {
  color: var(--text);
  font-size: var(--text-sm);
}

.service-table tbody tr:last-child td {
  border-bottom: 0;
}

.service-table code {
  color: var(--text-muted);
}

.service-action {
  width: 1%;
  text-align: right;
  white-space: nowrap;
}

.status-chip {
  display: inline-flex;
  padding: 2px var(--space-2);
  background: var(--surface-sunken);
  border-radius: var(--radius-full);
  color: var(--text-muted);
  font-size: var(--text-xs);
  text-transform: capitalize;
}

.status-chip.running {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.status-chip.stopped,
.status-chip.exited,
.status-chip.error {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

.empty-state {
  display: flex;
  min-height: 240px;
  align-items: center;
  justify-content: center;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-6);
  color: var(--text-muted);
  text-align: center;
}

.empty-state h3 {
  color: var(--text);
  font-size: var(--text-base);
}

.image-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.image-form label {
  color: var(--text);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.field-help {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.form-error {
  padding: var(--space-2) var(--space-3);
  background: var(--color-danger-50);
  border: 1px solid var(--color-danger-200);
  border-radius: var(--radius-sm);
  color: var(--color-danger-700);
  font-size: var(--text-sm);
}

@media (max-width: 720px) {
  .panel-header {
    align-items: stretch;
    flex-direction: column;
  }

  .service-table thead {
    display: none;
  }

  .service-table,
  .service-table tbody,
  .service-table tr,
  .service-table td {
    display: block;
  }

  .service-table tr {
    padding: var(--space-2) var(--space-3);
    border-bottom: 1px solid var(--border);
  }

  .service-table td {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: var(--space-3);
    padding: var(--space-2) 0;
    border: 0;
    text-align: right;
  }

  .service-table td::before {
    flex: none;
    color: var(--text-muted);
    content: attr(data-label);
    font-size: var(--text-xs);
  }

  .service-action {
    width: auto;
  }

  .service-action::before {
    content: none;
  }
}
</style>
