<template>
  <div v-if="rejections.length" class="upload-rejections">
    <div v-for="rejection in rejections" :key="rejection.domain_id" class="rejection" role="status">
      <Icon name="file-warning" :size="18" class="rejection-icon" />
      <div class="rejection-text">
        <strong>
          {{ rejection.count }} {{ rejection.count === 1 ? "request was" : "requests were" }} refused as too large on
          {{ rejection.domain }}
        </strong>
        <span>
          The limit is {{ formatSize(rejection.limit) }}. Last refused {{ formatAgo(rejection.last_at) }}
          <template v-if="rejection.last_path">
            on <code>{{ rejection.last_path }}</code></template
          >.
        </span>
      </div>
      <BaseButton v-if="canWrite" size="sm" icon="sliders-horizontal" @click="openDomain(rejection.domain_id)">
        Change limit
      </BaseButton>
    </div>

    <DomainFormModal
      :visible="editing !== null"
      :domain="editing"
      :services="services"
      :deployment-name="deploymentName"
      :loading="saving"
      focus="upload-limit"
      @save="save"
      @cancel="editing = null"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import type { DomainConfig, Service, UploadRejection } from "@/types";
import { deploymentsApi } from "@/services/api";
import { usePlanFlow } from "@/composables/usePlanFlow";
import { useNotificationsStore } from "@/stores/notifications";
import DomainFormModal from "@/components/DomainFormModal.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import Icon from "@/components/base/Icon.vue";

const props = defineProps<{
  deploymentName: string;
  services: Service[];
  canWrite: boolean;
}>();

const emit = defineEmits<{ updated: [] }>();

const rejections = ref<UploadRejection[]>([]);
const editing = ref<DomainConfig | null>(null);
const saving = ref(false);
const { runGuarded } = usePlanFlow();
const notifications = useNotificationsStore();

async function load() {
  try {
    const response = await deploymentsApi.getUploadRejections(props.deploymentName);
    rejections.value = response.data.rejections || [];
  } catch {
    rejections.value = [];
  }
}

watch(() => props.deploymentName, load, { immediate: true });

async function openDomain(domainId: string) {
  try {
    const response = await deploymentsApi.listDomains(props.deploymentName);
    editing.value = response.data.domains.find((d) => d.id === domainId) || null;
    if (!editing.value) notifications.error("Domain not found", "The domain may have been removed.");
  } catch {
    notifications.error("Could not load the domain", "Try again in a moment.");
  }
}

async function save(domain: DomainConfig) {
  if (!editing.value) return;
  const id = editing.value.id;
  saving.value = true;
  try {
    const result = await runGuarded(
      () => deploymentsApi.updateDomain(props.deploymentName, id, domain),
      () => deploymentsApi.updateDomain(props.deploymentName, id, domain, { plan: true }),
      "Save Failed",
    );
    if (result === false) return;
    notifications.success("Domain Updated", `${domain.domain} has been updated`);
    editing.value = null;
    await load();
    emit("updated");
  } finally {
    saving.value = false;
  }
}

function formatSize(size: string): string {
  const match = /^(\d+)([kmg]?)$/i.exec(size);
  if (!match) return size;
  if (match[1] === "0") return "unlimited";
  const unit = { "": " bytes", k: " KB", m: " MB", g: " GB" }[match[2].toLowerCase() as "" | "k" | "m" | "g"];
  return `${match[1]}${unit}`;
}

function formatAgo(at: string): string {
  const minutes = Math.round((Date.now() - new Date(at).getTime()) / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  return `${Math.round(hours / 24)} d ago`;
}

defineExpose({ load });
</script>

<style scoped>
.upload-rejections {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.rejection {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  border: 1px solid var(--color-warning-100);
  border-radius: var(--radius-md);
  background: var(--color-warning-50);
}

.rejection-icon {
  flex-shrink: 0;
  color: var(--color-warning-700);
}

.rejection-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
  font-size: var(--text-sm);
  color: var(--text);
}

.rejection-text span {
  color: var(--text-muted);
  overflow-wrap: anywhere;
}

.rejection-text code {
  font-family: var(--font-mono);
  font-size: 0.95em;
}

@media (max-width: 640px) {
  .rejection {
    flex-wrap: wrap;
  }
}
</style>
