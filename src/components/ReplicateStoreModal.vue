<template>
  <BaseModal
    :visible="visible"
    :title="store ? `Replicate ${store.name}` : 'Replicate store'"
    subtitle="Copy this store's objects to another store (offsite copy or local cache)."
    size="md"
    :close-disabled="busy"
    @close="emit('close')"
  >
    <div v-if="result" class="result">
      <p class="ok"><Icon name="circle-check" :size="16" /> {{ result.message }}</p>
      <dl class="stats">
        <dt>Copied</dt>
        <dd>{{ result.copied }}</dd>
        <dt>Skipped (unchanged)</dt>
        <dd>{{ result.skipped }}</dd>
        <dt v-if="result.failed">Failed</dt>
        <dd v-if="result.failed" class="fail">{{ result.failed }}</dd>
      </dl>
    </div>

    <div v-else class="form-stack">
      <BaseField label="Target store" hint="Where to copy this store's objects.">
        <BaseSelect v-model="target" :disabled="busy">
          <option value="" disabled>Select a target store</option>
          <option v-for="t in targets" :key="t.name" :value="t.name">
            {{ t.name }} ({{ t.kind === "managed" ? "managed" : "external" }})
          </option>
        </BaseSelect>
      </BaseField>
      <p v-if="!targets.length" class="muted">No other store to replicate to. Connect one first.</p>
    </div>

    <template #footer>
      <BaseButton v-if="result" variant="primary" @click="emit('close')">Done</BaseButton>
      <template v-else>
        <BaseButton variant="ghost" :disabled="busy" @click="emit('close')">Cancel</BaseButton>
        <BaseButton variant="primary" icon="copy" :loading="busy" :disabled="!target" @click="run">
          Replicate now
        </BaseButton>
      </template>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseField from "@/components/base/BaseField.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import Icon from "@/components/base/Icon.vue";
import { objectStoresApi, backupDestinationsApi, type BackupDestination } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";

const props = defineProps<{ visible: boolean; store: BackupDestination | null }>();
const emit = defineEmits(["close"]);

const notifications = useNotificationsStore();

const targets = ref<BackupDestination[]>([]);
const target = ref("");
const busy = ref(false);
const result = ref<{ message: string; copied: number; skipped: number; failed: number } | null>(null);

watch(
  () => props.visible,
  async (open) => {
    if (!open) return;
    target.value = "";
    result.value = null;
    try {
      const res = await backupDestinationsApi.list();
      targets.value = (res.data.destinations || []).filter((d) => d.name !== props.store?.name);
    } catch (e: any) {
      notifications.error("Could not load stores", e.response?.data?.error || e.message);
      targets.value = [];
    }
  },
);

async function run() {
  if (!props.store || !target.value) return;
  busy.value = true;
  try {
    const res = await objectStoresApi.replicate(props.store.name, target.value);
    result.value = res.data;
  } catch (e: any) {
    notifications.error("Replication failed", e.response?.data?.error || e.message);
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.form-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.result {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.ok {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-success-700, #15803d);
  font-weight: var(--font-medium);
}

.stats {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.3rem 1rem;
  margin: 0;
}

.stats dt {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.stats dd {
  margin: 0;
  font-weight: var(--font-medium);
}

.stats dd.fail {
  color: var(--color-danger-600, #dc2626);
}

.muted {
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>
