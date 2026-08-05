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
          <p v-if="firingSnapshot(rule.id)" class="arp-rule-top">Top: {{ firingSnapshot(rule.id) }}</p>
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

        <BaseField
          label="Deployment"
          :hint="isHostMetric ? 'A host metric watches the whole machine.' : 'Leave empty to watch every deployment.'"
        >
          <BaseSelect v-model="draft.deployment" :disabled="isHostMetric">
            <option value="">{{ isHostMetric ? "Whole host" : "Every deployment" }}</option>
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

        <BaseField label="Notify" hint="Which targets to alert. None selected sends to all.">
          <div v-if="notifyTargets.length" class="arp-targets">
            <label v-for="t in notifyTargets" :key="t.id" class="arp-target">
              <input type="checkbox" :checked="draft.targets?.includes(t.id)" @change="toggleTarget(t.id)" />
              {{ t.name }}
            </label>
          </div>
          <p v-else class="arp-muted">No notification targets yet. Add one in Settings to send anywhere.</p>
        </BaseField>

        <BaseField
          v-if="!isHostMetric"
          label="When it fires"
          hint="Optionally restart the offending deployment. Managed deployments only, rate-limited so it cannot loop."
        >
          <BaseSelect v-model="draft.action">
            <option value="">Notify only</option>
            <option value="restart">Notify and restart the deployment</option>
          </BaseSelect>
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
import { ref, computed, watch, onMounted } from "vue";
import { observabilityApi, METRIC } from "@/services/observability";
import type { AlertRule, AlertEvent } from "@/services/observability";
import { notificationsApi, type NotificationTarget } from "@/services/api";
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
const firingByRule = computed(() => {
  const m = new Map<string, AlertEvent>();
  for (const f of firing.value) m.set(f.rule_id, f);
  return m;
});

// firingSnapshot renders the top-consuming containers recorded when a rule
// fired, so the panel shows what was using the resource, not just that a line
// was crossed.
const firingSnapshot = (id?: string): string => {
  const ev = id ? firingByRule.value.get(id) : undefined;
  if (!ev?.snapshot?.length) return "";
  const asBytes = ev.metric.includes("memory");
  return ev.snapshot.map((c) => `${c.container} (${asBytes ? bytes(c.value) : `${c.value.toFixed(1)}%`})`).join(", ");
};

const metricOptions: { value: string; label: string; unit: string; host?: boolean; rate?: boolean }[] = [
  { value: METRIC.cpu, label: "Container CPU usage", unit: "percent" },
  { value: METRIC.memUsage, label: "Container memory usage", unit: "bytes" },
  { value: METRIC.netRx, label: "Container network in (per second)", unit: "bytes", rate: true },
  { value: METRIC.netTx, label: "Container network out (per second)", unit: "bytes", rate: true },
  { value: METRIC.hostCpu, label: "Host CPU", unit: "percent", host: true },
  { value: METRIC.hostMemUtil, label: "Host memory used %", unit: "percent", host: true },
  { value: METRIC.hostMemUsage, label: "Host memory used", unit: "bytes", host: true },
  { value: METRIC.hostDisk, label: "Host disk used %", unit: "percent", host: true },
];

const notifyTargets = ref<NotificationTarget[]>([]);

const blank = (): AlertRule => ({
  name: "",
  deployment: "",
  metric: METRIC.cpu,
  comparison: "above",
  threshold: 80,
  for_seconds: 60,
  enabled: true,
  targets: [],
  action: "",
});

const draft = ref<AlertRule>(blank());

const toggleTarget = (id: string) => {
  const list = draft.value.targets ?? (draft.value.targets = []);
  const i = list.indexOf(id);
  if (i === -1) list.push(id);
  else list.splice(i, 1);
};

// A host metric is machine-wide, so it is never scoped to a deployment; picking
// one clears any deployment so the rule reads the host series. It also has no
// deployment to restart, so the action is cleared too.
const isHostMetric = computed(() => metricOptions.find((m) => m.value === draft.value.metric)?.host === true);
watch(isHostMetric, (host) => {
  if (host) {
    draft.value.deployment = "";
    draft.value.action = "";
  }
});

const unitHint = computed(() => {
  const opt = metricOptions.find((m) => m.value === draft.value.metric);
  if (opt?.unit !== "bytes") return "A percentage.";
  return opt.rate ? "In bytes per second." : "In bytes.";
});

const describe = (rule: AlertRule) => {
  const opt = metricOptions.find((m) => m.value === rule.metric);
  const metric = opt?.label ?? rule.metric;
  const value = opt?.unit === "bytes" ? bytes(rule.threshold) + (opt.rate ? "/s" : "") : `${rule.threshold}%`;
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
  const [rulesResult, firingResult, targetsResult] = await Promise.allSettled([
    observabilityApi.alertRules(),
    observabilityApi.firingAlerts(),
    notificationsApi.getTargets(),
  ]);
  if (rulesResult.status === "fulfilled") rules.value = rulesResult.value.data || [];
  if (firingResult.status === "fulfilled") firing.value = firingResult.value.data || [];
  if (targetsResult.status === "fulfilled") notifyTargets.value = targetsResult.value.data.targets || [];
};

const openNew = () => {
  draft.value = blank();
  formError.value = "";
  editing.value = draft.value;
};

const openEdit = (rule: AlertRule) => {
  draft.value = { ...rule, targets: [...(rule.targets ?? [])] };
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

.arp-rule-top {
  margin: 3px 0 0;
  font-size: var(--text-xs);
  color: var(--color-danger-600, #dc2626);
}

.arp-targets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.arp-target {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  font-size: var(--text-sm);
  color: var(--text);
  cursor: pointer;
}

.arp-muted {
  margin: 0;
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
