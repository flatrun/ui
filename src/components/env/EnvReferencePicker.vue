<template>
  <div class="ref-picker">
    <span class="ref-label">Use a value from another deployment</span>
    <div class="ref-row">
      <select v-model="deployment" class="form-input" aria-label="Deployment" @change="loadKeys">
        <option value="">Deployment</option>
        <option v-for="name in deployments" :key="name" :value="name">{{ name }}</option>
      </select>
      <select v-model="key" class="form-input" aria-label="Variable" :disabled="!deployment">
        <option value="">Variable</option>
        <option :value="HOST_KEY">Address ({{ HOST_KEY }})</option>
        <option v-for="k in keys" :key="k" :value="k">{{ k }}</option>
      </select>
      <button type="button" class="btn btn-sm btn-secondary" :disabled="!deployment || !key" @click="insert">
        Insert
      </button>
    </div>
    <span class="ref-hint">
      Inserts <code>{{ preview }}</code
      >. It is resolved when this deployment starts, so changes to the other deployment flow through on the next
      restart.
    </span>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from "vue";
import { deploymentsApi } from "@/services/api";
import { formatReference, HOST_KEY } from "@/utils/envref";

const props = defineProps<{ self: string }>();
const emit = defineEmits<{ insert: [text: string] }>();

const deployments = ref<string[]>([]);
const deployment = ref("");
const keys = ref<string[]>([]);
const key = ref("");

const preview = computed(() => formatReference(deployment.value || "deployment", key.value || "KEY"));

onMounted(async () => {
  try {
    const { data } = await deploymentsApi.list();
    deployments.value = (data.deployments || []).map((d) => d.name).filter((n) => n !== props.self);
  } catch {
    deployments.value = [];
  }
});

async function loadKeys() {
  key.value = "";
  keys.value = [];
  if (!deployment.value) return;
  try {
    const { data } = await deploymentsApi.getEnvVars(deployment.value);
    keys.value = (data.env_vars || []).map((e) => e.key);
  } catch {
    keys.value = [];
  }
}

function insert() {
  emit("insert", formatReference(deployment.value, key.value));
}
</script>

<style scoped>
.ref-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  padding: var(--space-3);
  background: var(--surface-sunken);
  border: 1px dashed var(--border);
  border-radius: var(--radius-md);
}

.ref-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.ref-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  gap: var(--space-2);
}

.ref-hint {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.ref-hint code {
  font-family: var(--font-mono);
}
</style>
