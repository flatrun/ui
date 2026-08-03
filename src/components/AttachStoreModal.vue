<template>
  <BaseModal
    :visible="visible"
    :title="store ? `Use ${store.name} in an app` : 'Use store in an app'"
    subtitle="Injects the store's connection details into a deployment's environment."
    size="md"
    :close-disabled="busy"
    @close="emit('close')"
  >
    <div v-if="result" class="result">
      <p class="ok"><Icon name="circle-check" :size="16" /> Attached to {{ result.deployment }}.</p>
      <p class="muted">These were written to its environment. Restart the deployment to apply.</p>
      <ul class="keys">
        <li v-for="k in result.keys" :key="k">
          <code>{{ k }}</code>
        </li>
      </ul>
    </div>

    <div v-else class="form-stack">
      <BaseField label="Deployment" hint="The app that should use this store.">
        <BaseSelect v-model="deployment" :disabled="busy">
          <option value="" disabled>Select a deployment</option>
          <option v-for="d in deployments" :key="d" :value="d">{{ d }}</option>
        </BaseSelect>
      </BaseField>
      <BaseField label="Variable prefix" hint="e.g. S3_ gives S3_ENDPOINT, S3_BUCKET, S3_ACCESS_KEY_ID…">
        <BaseInput v-model="prefix" placeholder="S3_" :disabled="busy" />
      </BaseField>
    </div>

    <template #footer>
      <BaseButton v-if="result" variant="primary" @click="emit('close')">Done</BaseButton>
      <template v-else>
        <BaseButton variant="ghost" :disabled="busy" @click="emit('close')">Cancel</BaseButton>
        <BaseButton variant="primary" icon="plug" :loading="busy" :disabled="!deployment" @click="attach">
          Attach
        </BaseButton>
      </template>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseField from "@/components/base/BaseField.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import Icon from "@/components/base/Icon.vue";
import { objectStoresApi, deploymentsApi, type BackupDestination } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";

const props = defineProps<{ visible: boolean; store: BackupDestination | null }>();
const emit = defineEmits(["close"]);

const notifications = useNotificationsStore();

const deployments = ref<string[]>([]);
const deployment = ref("");
const prefix = ref("S3_");
const busy = ref(false);
const result = ref<{ deployment: string; keys: string[] } | null>(null);

watch(
  () => props.visible,
  async (open) => {
    if (!open) return;
    deployment.value = "";
    prefix.value = "S3_";
    result.value = null;
    try {
      const res = await deploymentsApi.list();
      deployments.value = res.data.deployments
        .map((d: { name: string }) => d.name)
        .filter((n: string) => n !== props.store?.deployment);
    } catch (e: any) {
      notifications.error("Could not load deployments", e.response?.data?.error || e.message);
      deployments.value = [];
    }
  },
);

async function attach() {
  if (!props.store || !deployment.value) return;
  busy.value = true;
  try {
    const res = await objectStoresApi.attach(props.store.name, {
      deployment: deployment.value,
      prefix: prefix.value.trim() || undefined,
    });
    result.value = { deployment: deployment.value, keys: res.data.keys };
  } catch (e: any) {
    notifications.error("Attach failed", e.response?.data?.error || e.message);
  } finally {
    busy.value = false;
  }
}
</script>

<style scoped>
.form-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.result {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.ok {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  color: var(--color-success-700, #15803d);
  font-weight: var(--font-medium);
}

.keys {
  margin: 0;
  padding-left: var(--space-4);
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.keys code {
  font-size: var(--text-sm);
}

.muted {
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>
