<template>
  <section class="arp">
    <header class="arp-head">
      <h3><Icon name="bell" :size="16" /> Alert rules</h3>
      <button class="btn btn-sm btn-primary" @click="openNew">
        <Icon name="plus" :size="14" />
        New rule
      </button>
    </header>

    <p v-if="!rules.length" class="arp-empty">
      Nothing is watched yet. A rule tells you when a deployment crosses a line you care about, through the notification
      targets you have configured.
    </p>

    <ul v-else class="arp-list">
      <li v-for="rule in rules" :key="rule.id" class="arp-rule" :class="{ 'arp-rule--off': !rule.enabled }">
        <span class="arp-state" :class="firingIds.has(rule.id ?? '') ? 'arp-state--firing' : 'arp-state--ok'" />

        <div class="arp-rule-main">
          <p class="arp-rule-name">{{ rule.name }}</p>
          <p class="arp-rule-cond">{{ describe(rule) }}</p>
        </div>

        <span v-if="firingIds.has(rule.id ?? '')" class="arp-firing">Firing</span>
        <span v-else-if="!rule.enabled" class="arp-off">Off</span>

        <div class="arp-rule-actions">
          <button class="btn btn-sm btn-icon" title="Edit rule" @click="openEdit(rule)">
            <Icon name="pencil" :size="14" />
          </button>
          <button class="btn btn-sm btn-icon" title="Delete rule" @click="remove(rule)">
            <Icon name="trash-2" :size="14" />
          </button>
        </div>
      </li>
    </ul>

    <BaseModal :visible="editing !== null" :title="draft.id ? 'Edit rule' : 'New rule'" size="md" @close="cancel">
      <div class="arp-form">
        <BaseField label="Name" hint="What you will see in the notification.">
          <BaseInput v-model="draft.name" placeholder="Memory close to the limit" />
        </BaseField>

        <BaseField label="Deployment" hint="Leave empty to watch every deployment.">
          <BaseSelect v-model="draft.deployment">
            <option value="">Every deployment</option>
            <option v-for="d in deployments" :key="d" :value="d">{{ d }}</option>
          </BaseSelect>
        </BaseField>

        <div class="arp-form-row">
          <BaseField label="Metric">
            <BaseSelect v-model="draft.metric">
              <option v-for="m in metricOptions" :key="m.value" :value="m.value">{{ m.label }}</option>
            </BaseSelect>
          </BaseField>

          <BaseField label="Goes">
            <BaseSelect v-model="draft.comparison">
              <option value="above">above</option>
              <option value="below">below</option>
            </BaseSelect>
          </BaseField>

          <BaseField label="Threshold" :hint="unitHint">
            <BaseInput v-model="draft.threshold" type="number" />
          </BaseField>
        </div>

        <BaseField
          label="For at least (seconds)"
          hint="A container is briefly at full CPU every time it starts. Waiting stops that reaching you."
        >
          <BaseInput v-model="draft.for_seconds" type="number" min="0" />
        </BaseField>

        <label class="arp-enable">
          <input v-model="draft.enabled" type="checkbox" />
          Enabled
        </label>

        <p v-if="formError" class="arp-error">{{ formError }}</p>
      </div>

      <template #footer>
        <button class="btn btn-secondary" @click="cancel">Cancel</button>
        <button class="btn btn-primary" :disabled="saving" @click="save">
          {{ saving ? "Saving..." : "Save rule" }}
        </button>
      </template>
    </BaseModal>
  </section>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from "vue";
import { observabilityApi, METRIC } from "@/services/observability";
import type { AlertRule, AlertEvent } from "@/services/observability";
import { useNotificationsStore } from "@/stores/notifications";
import Icon from "@/components/base/Icon.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseField from "@/components/base/BaseField.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";

defineProps<{ deployments: string[] }>();

const notifications = useNotificationsStore();

const rules = ref<AlertRule[]>([]);
const firing = ref<AlertEvent[]>([]);
const editing = ref<AlertRule | null>(null);
const saving = ref(false);
const formError = ref("");

const firingIds = computed(() => new Set(firing.value.map((f) => f.rule_id)));

const metricOptions = [
  { value: METRIC.cpu, label: "CPU usage", unit: "percent" },
  { value: METRIC.memUsage, label: "Memory usage", unit: "bytes" },
  { value: METRIC.netRx, label: "Network in", unit: "bytes" },
  { value: METRIC.netTx, label: "Network out", unit: "bytes" },
];

const blank = (): AlertRule => ({
  name: "",
  deployment: "",
  metric: METRIC.cpu,
  comparison: "above",
  threshold: 80,
  for_seconds: 60,
  enabled: true,
});

const draft = ref<AlertRule>(blank());

const unitHint = computed(() =>
  metricOptions.find((m) => m.value === draft.value.metric)?.unit === "bytes" ? "In bytes." : "A percentage.",
);

const describe = (rule: AlertRule) => {
  const metric = metricOptions.find((m) => m.value === rule.metric)?.label ?? rule.metric;
  const value =
    metricOptions.find((m) => m.value === rule.metric)?.unit === "bytes" ? bytes(rule.threshold) : `${rule.threshold}%`;
  const where = rule.deployment ? rule.deployment : "any deployment";
  const held = rule.for_seconds ? ` for ${rule.for_seconds}s` : "";
  return `${metric} ${rule.comparison} ${value}${held}, on ${where}`;
};

function bytes(v: number): string {
  const units = ["B", "KB", "MB", "GB", "TB"];
  let i = 0;
  while (v >= 1024 && i < units.length - 1) {
    v /= 1024;
    i++;
  }
  return `${i ? v.toFixed(1) : v} ${units[i]}`;
}

const load = async () => {
  const [rulesResult, firingResult] = await Promise.allSettled([
    observabilityApi.alertRules(),
    observabilityApi.firingAlerts(),
  ]);
  if (rulesResult.status === "fulfilled") rules.value = rulesResult.value.data || [];
  if (firingResult.status === "fulfilled") firing.value = firingResult.value.data || [];
};

const openNew = () => {
  draft.value = blank();
  formError.value = "";
  editing.value = draft.value;
};

const openEdit = (rule: AlertRule) => {
  draft.value = { ...rule };
  formError.value = "";
  editing.value = draft.value;
};

const cancel = () => {
  editing.value = null;
};

// The rules are saved as a set, so an edit is the list with this rule swapped in.
const save = async () => {
  saving.value = true;
  formError.value = "";
  try {
    // An input hands back a string whatever its type, and the agent's threshold is a
    // number, so it is cast here rather than rejected there.
    const rule: AlertRule = {
      ...draft.value,
      threshold: Number(draft.value.threshold),
      for_seconds: Number(draft.value.for_seconds) || 0,
    };
    const next = rule.id ? rules.value.map((r) => (r.id === rule.id ? rule : r)) : [...rules.value, rule];
    const response = await observabilityApi.saveAlertRules(next);
    rules.value = response.data || [];
    editing.value = null;
    await load();
  } catch (err: any) {
    // The agent refuses a rule it could never evaluate, and says why.
    formError.value = err.response?.data?.error || err.response?.data || err.message || "Could not save the rule";
  } finally {
    saving.value = false;
  }
};

const remove = async (rule: AlertRule) => {
  try {
    const response = await observabilityApi.saveAlertRules(rules.value.filter((r) => r.id !== rule.id));
    rules.value = response.data || [];
    notifications.success("Rule deleted", `${rule.name} will not alert again.`);
  } catch (err: any) {
    notifications.error("Could not delete", err.response?.data?.error || err.message);
  }
};

onMounted(load);
</script>

<style scoped>
.arp {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  padding: var(--space-4);
}

.arp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
  margin-bottom: var(--space-3);
}

.arp-head h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--text-md);
}

.arp-empty {
  margin: 0;
  max-width: 70ch;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.arp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
}

.arp-rule {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) 0;
  border-bottom: 1px solid var(--border-subtle);
}

.arp-rule:last-child {
  border-bottom: 0;
}

.arp-rule--off {
  opacity: 0.6;
}

.arp-state {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
  flex-shrink: 0;
}

.arp-state--ok {
  background: var(--color-success-500);
}

.arp-state--firing {
  background: var(--color-danger-500);
}

.arp-rule-main {
  flex: 1;
  min-width: 0;
}

.arp-rule-name {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text);
}

.arp-rule-cond {
  margin: 2px 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.arp-firing,
.arp-off {
  font-size: var(--text-xs);
  padding: 0 var(--space-2);
  border-radius: var(--radius-full);
  white-space: nowrap;
}

.arp-firing {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
  border: 1px solid var(--color-danger-200);
}

.arp-off {
  color: var(--text-muted);
  border: 1px solid var(--border);
}

.arp-rule-actions {
  display: flex;
  gap: var(--space-1);
}

.arp-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.arp-form-row {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr;
  gap: var(--space-3);
}

.arp-enable {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text);
}

.arp-error {
  margin: 0;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--color-danger-50);
  border: 1px solid var(--color-danger-200);
  color: var(--color-danger-700);
  font-size: var(--text-sm);
}
</style>
