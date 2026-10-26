<template>
  <section class="service-sleep">
    <h4>Sleep when idle</h4>
    <p v-if="deploymentSleeps" class="hint">
      The whole deployment sleeps when idle, which takes precedence. Turn that off on the Deploys tab to let
      {{ service }} sleep on its own.
    </p>
    <template v-else>
      <label class="toggle-row">
        <input id="svc-sleep" v-model="form.enabled" type="checkbox" :disabled="!canWrite" />
        <span>
          <strong>Stop {{ service }} when nobody uses it</strong>
          <small>
            The rest of the deployment keeps running. The next request starts it again, after any stopped service it
            waits for. It stays up while a running service waits for it.
          </small>
        </span>
      </label>
      <div v-if="form.enabled" class="field">
        <label for="svc-sleep-minutes">Idle minutes</label>
        <input
          id="svc-sleep-minutes"
          v-model.number="form.idle_minutes"
          class="form-input"
          type="number"
          min="5"
          :disabled="!canWrite"
        />
        <p v-if="error" class="field-error">{{ error }}</p>
      </div>
      <p v-if="config?.sleeping" class="asleep"><Icon name="moon" :size="14" /> Asleep now</p>
      <div v-if="canWrite" class="actions">
        <BaseButton size="sm" :loading="saving" :disabled="!changed || !!error" @click="save">Save</BaseButton>
      </div>
    </template>
  </section>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from "vue";
import type { SleepConfig } from "@/types";
import { deploymentsApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import BaseButton from "@/components/base/BaseButton.vue";
import Icon from "@/components/base/Icon.vue";

const props = defineProps<{
  deploymentName: string;
  service: string;
  config?: SleepConfig;
  deploymentSleeps?: boolean;
  canWrite: boolean;
}>();
const emit = defineEmits<{ changed: [] }>();

const DEFAULT_MINUTES = 15;
const notifications = useNotificationsStore();
const saving = ref(false);
const form = reactive({ enabled: false, idle_minutes: DEFAULT_MINUTES });

function reset() {
  form.enabled = !!props.config?.enabled;
  form.idle_minutes = props.config?.idle_minutes || DEFAULT_MINUTES;
}
watch(() => [props.config, props.service], reset, { immediate: true });

const changed = computed(
  () =>
    form.enabled !== !!props.config?.enabled ||
    (form.enabled && form.idle_minutes !== (props.config?.idle_minutes || DEFAULT_MINUTES)),
);
const error = computed(() =>
  form.enabled && !(Number.isInteger(form.idle_minutes) && form.idle_minutes >= 5)
    ? "Idle time must be at least 5 minutes."
    : "",
);

async function save() {
  saving.value = true;
  try {
    await deploymentsApi.updateServiceSleep(props.deploymentName, props.service, {
      enabled: form.enabled,
      idle_minutes: form.idle_minutes,
    });
    notifications.success(
      "Sleep settings saved",
      form.enabled ? `${props.service} sleeps after ${form.idle_minutes} idle minutes` : `${props.service} stays up`,
    );
    emit("changed");
  } catch (e: any) {
    notifications.error("Could not save sleep settings", e?.response?.data?.error || e?.message || "Request failed");
  } finally {
    saving.value = false;
  }
}
</script>

<style scoped>
.service-sleep {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

h4 {
  margin: 0;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text);
}

.toggle-row {
  display: flex;
  align-items: flex-start;
  gap: var(--space-2);
  font-size: var(--text-sm);
  cursor: pointer;
}

.toggle-row input {
  margin-top: 3px;
}

.toggle-row span {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.toggle-row small,
.hint {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.field {
  display: flex;
  max-width: 10rem;
  flex-direction: column;
  gap: var(--space-1);
}

.field label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.form-input {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
  color: var(--text);
  font: inherit;
  font-size: var(--text-sm);
}

.field-error {
  margin: 0;
  font-size: var(--text-xs);
  color: var(--color-danger-600);
}

.asleep {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.actions {
  display: flex;
}
</style>
