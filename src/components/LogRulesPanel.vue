<template>
  <section class="lrp">
    <header class="lrp-head">
      <h3><Icon name="file-search" :size="16" /> Log rules</h3>
      <button v-if="canCreate" class="btn btn-sm btn-primary" @click="openNew">
        <Icon name="plus" :size="14" />
        New rule
      </button>
    </header>

    <p v-if="!rules.length" class="lrp-empty">
      Nothing is watched yet. A log rule turns what a deployment writes into an incident, once the same fault has
      happened often enough to be worth your attention.
    </p>

    <ul v-else class="lrp-list">
      <li v-for="rule in rules" :key="rule.id" class="lrp-rule" :class="{ 'lrp-rule--off': !rule.enabled }">
        <div class="lrp-rule-main">
          <p class="lrp-rule-name">
            {{ rule.name }}
            <span v-if="rule.triage" class="lrp-tag lrp-tag--triage">triage</span>
          </p>
          <p class="lrp-rule-cond">{{ describe(rule) }}</p>
        </div>

        <span v-if="!rule.enabled" class="lrp-off">Off</span>

        <div v-if="canEditRule(rule)" class="lrp-rule-actions">
          <button class="btn btn-sm btn-icon" title="Edit rule" @click="openEdit(rule)">
            <Icon name="pencil" :size="14" />
          </button>
          <button class="btn btn-sm btn-icon" title="Delete rule" @click="remove(rule)">
            <Icon name="trash-2" :size="14" />
          </button>
        </div>
      </li>
    </ul>

    <BaseModal
      :visible="editing !== null"
      :title="draft.id ? 'Edit log rule' : 'New log rule'"
      size="md"
      @close="cancel"
    >
      <div class="lrp-form">
        <BaseField label="Name" hint="What you will see in the notification.">
          <BaseInput v-model="draft.name" placeholder="Checkout errors" />
        </BaseField>

        <div class="lrp-form-row">
          <BaseField label="Deployment">
            <BaseSelect v-model="draft.deployment">
              <option value="" disabled>Pick a deployment</option>
              <option v-for="d in writableDeployments" :key="d" :value="d">{{ d }}</option>
            </BaseSelect>
          </BaseField>

          <BaseField label="Service" hint="Empty watches every service.">
            <BaseInput v-model="draft.service" placeholder="web" />
          </BaseField>
        </div>

        <div class="lrp-form-row">
          <BaseField label="From level" hint="Below error, a pattern is required.">
            <BaseSelect v-model="draft.min_level">
              <option value="error">error and worse</option>
              <option value="fatal">fatal only</option>
              <option value="warn">warn and worse</option>
            </BaseSelect>
          </BaseField>

          <BaseField label="Matching" hint="Optional regular expression, matched on the message.">
            <BaseInput v-model="draft.pattern" placeholder="(?i)out of memory" />
          </BaseField>
        </div>

        <div class="lrp-form-row">
          <BaseField label="At least" hint="Occurrences before it counts.">
            <BaseInput v-model="draft.min_count" type="number" min="1" />
          </BaseField>

          <BaseField label="Within (seconds)">
            <BaseInput v-model="draft.window_seconds" type="number" min="1" />
          </BaseField>

          <BaseField label="Then stay quiet (seconds)" hint="Repeats are counted, not repeated.">
            <BaseInput v-model="draft.cooldown_seconds" type="number" min="1" />
          </BaseField>
        </div>

        <BaseField label="Notify" hint="Which targets to alert. None selected sends to all.">
          <div v-if="notifyTargets.length" class="lrp-targets">
            <label v-for="t in notifyTargets" :key="t.id" class="lrp-target">
              <input type="checkbox" :checked="draft.targets?.includes(t.id)" @change="toggleTarget(t.id)" />
              {{ t.name }}
            </label>
          </div>
          <p v-else class="lrp-muted">No enabled notification targets are available. An administrator can add one.</p>
        </BaseField>

        <label class="lrp-check">
          <input v-model="draft.triage" type="checkbox" />
          Ask the assistant to explain it
        </label>
        <p class="lrp-hint">
          One explanation per distinct fault, reused while the same fault keeps happening, and bounded by the agent's
          daily cap. Needs the assistant configured and log triage enabled in the Observability settings.
        </p>

        <label class="lrp-check">
          <input v-model="draft.enabled" type="checkbox" />
          Enabled
        </label>

        <p v-if="formError" class="lrp-error">{{ formError }}</p>
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
import { observabilityApi } from "@/services/observability";
import type { LogRule } from "@/services/observability";
import { notificationsApi, type NotificationTarget } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import { useAuthStore } from "@/stores/auth";
import Icon from "@/components/base/Icon.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseField from "@/components/base/BaseField.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";

const props = defineProps<{ deployments: string[] }>();
const emit = defineEmits<{ changed: [] }>();

const notifications = useNotificationsStore();
const auth = useAuthStore();
const canWrite = computed(() => auth.hasPermission("alerts:write"));
const writableDeployments = computed(() => props.deployments.filter((name) => auth.canAccessDeployment(name, "write")));
const canCreate = computed(() => canWrite.value && writableDeployments.value.length > 0);
const canEditRule = (rule: LogRule) => canWrite.value && auth.canAccessDeployment(rule.deployment, "write");

const rules = ref<LogRule[]>([]);
const notifyTargets = ref<Pick<NotificationTarget, "id" | "name">[]>([]);
const editing = ref<LogRule | null>(null);
const saving = ref(false);
const formError = ref("");

const blank = (): LogRule => ({
  name: "",
  enabled: true,
  deployment: writableDeployments.value[0] ?? "",
  service: "",
  source: "stdout",
  min_level: "error",
  pattern: "",
  min_count: 3,
  window_seconds: 300,
  cooldown_seconds: 3600,
  triage: false,
  targets: [],
});

const draft = ref<LogRule>(blank());

const describe = (rule: LogRule) => {
  const where = rule.service ? `${rule.deployment}/${rule.service}` : rule.deployment;
  const what = rule.pattern ? `${rule.min_level} matching /${rule.pattern}/` : `${rule.min_level} and worse`;
  return `${what} on ${where}, ${rule.min_count}+ in ${rule.window_seconds}s`;
};

const toggleTarget = (id: string) => {
  const list = draft.value.targets ?? (draft.value.targets = []);
  const i = list.indexOf(id);
  if (i === -1) list.push(id);
  else list.splice(i, 1);
};

const load = async () => {
  const [rulesResult, targetsResult] = await Promise.allSettled([
    observabilityApi.logRules(),
    notificationsApi.getAlertTargetOptions(),
  ]);
  if (rulesResult.status === "fulfilled") rules.value = rulesResult.value.data || [];
  if (targetsResult.status === "fulfilled") notifyTargets.value = targetsResult.value.data.targets || [];
};

const openNew = () => {
  draft.value = blank();
  formError.value = "";
  editing.value = draft.value;
};

const openEdit = (rule: LogRule) => {
  draft.value = { ...rule, targets: [...(rule.targets ?? [])] };
  formError.value = "";
  editing.value = draft.value;
};

const cancel = () => {
  editing.value = null;
};

const persist = async (next: LogRule[]) => {
  const response = await observabilityApi.saveLogRules(next);
  rules.value = response.data || [];
  emit("changed");
};

// The rules are saved as a set, so an edit is the list with this rule swapped in.
const save = async () => {
  saving.value = true;
  formError.value = "";
  try {
    const rule: LogRule = {
      ...draft.value,
      min_count: Number(draft.value.min_count) || 0,
      window_seconds: Number(draft.value.window_seconds) || 0,
      cooldown_seconds: Number(draft.value.cooldown_seconds) || 0,
    };
    await persist(rule.id ? rules.value.map((r) => (r.id === rule.id ? rule : r)) : [...rules.value, rule]);
    editing.value = null;
  } catch (err: any) {
    formError.value = err?.response?.data || err?.message || "The rule could not be saved.";
  } finally {
    saving.value = false;
  }
};

const remove = async (rule: LogRule) => {
  try {
    await persist(rules.value.filter((r) => r.id !== rule.id));
  } catch (err: any) {
    notifications.error("Delete failed", err?.message || "The rule could not be deleted.");
  }
};

onMounted(load);
defineExpose({ load });
</script>

<style scoped>
.lrp {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  padding: var(--space-4);
}

.lrp-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: var(--space-3);
}

.lrp-head h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-size: var(--text-lg);
}

.lrp-empty,
.lrp-muted,
.lrp-hint {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin: 0;
}

.lrp-hint {
  margin-top: calc(var(--space-1) * -1);
}

.lrp-list {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.lrp-rule {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface);
}

.lrp-rule--off {
  opacity: 0.6;
}

.lrp-rule-main {
  flex: 1;
  min-width: 0;
}

.lrp-rule-name {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin: 0;
  font-weight: var(--font-medium);
  color: var(--text);
}

.lrp-rule-cond {
  margin: 0;
  font-size: var(--text-sm);
  color: var(--text-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.lrp-tag {
  font-size: var(--text-xs);
  padding: 0.1rem 0.4rem;
  border-radius: var(--radius-sm);
  background: var(--accent-subtle);
  color: var(--accent);
}

.lrp-off {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.lrp-rule-actions {
  display: flex;
  gap: var(--space-1);
}

.lrp-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.lrp-form-row {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: var(--space-3);
}

.lrp-targets {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-3);
}

.lrp-target,
.lrp-check {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text);
}

.lrp-error {
  color: var(--danger);
  font-size: var(--text-sm);
  margin: 0;
}
</style>
