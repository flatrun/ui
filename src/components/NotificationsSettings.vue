<template>
  <section class="notifications-settings">
    <div class="section-toolbar">
      <nav class="section-tabs" aria-label="Notification sections">
        <button v-for="tab in tabs" :key="tab.id" :class="{ active: activeTab === tab.id }" @click="activeTab = tab.id">
          <Icon :name="tab.icon" :size="16" />{{ tab.label }}
          <span v-if="tab.count()" class="count-chip">{{ tab.count() }}</span>
        </button>
      </nav>
      <a class="docs-link" href="https://flatrun.dev/docs/ui/notifications" target="_blank" rel="noopener noreferrer">
        <Icon name="book-open" :size="16" /> Notification guide <Icon name="external-link" :size="14" />
      </a>
    </div>

    <div v-if="loading" class="state-panel loading-panel">
      <span v-for="item in 3" :key="item" class="skeleton-row" />
    </div>
    <div v-else-if="loadError" class="state-panel error-panel">
      <Icon name="solar:danger-triangle-bold" :size="28" />
      <div>
        <strong>Notifications could not be loaded</strong>
        <p>{{ loadError }}</p>
      </div>
      <BaseButton icon="refresh-cw" @click="load">Try again</BaseButton>
    </div>

    <template v-else>
      <section v-if="activeTab === 'incidents'" class="content-card">
        <header class="content-header">
          <div>
            <h3>Incidents</h3>
            <p>Related events remain grouped across agent restarts.</p>
          </div>
          <BaseButton icon="refresh-cw" @click="load">Refresh</BaseButton>
        </header>
        <div v-if="!incidents.length" class="empty-state">
          <div class="empty-icon success"><Icon name="solar:check-circle-bold" :size="30" /></div>
          <strong>No incidents recorded</strong>
          <p>New infrastructure and application events will appear here as grouped incidents.</p>
        </div>
        <div v-else class="incident-list">
          <article v-for="incident in incidents" :key="incident.id" class="incident-row">
            <div class="incident-icon" :class="incident.status === 'resolved' ? 'resolved' : incident.severity">
              <Icon
                :name="incident.status === 'resolved' ? 'solar:check-circle-bold' : 'solar:danger-circle-bold-duotone'"
                :size="20"
              />
            </div>
            <div class="incident-main">
              <div class="incident-title">
                <strong>{{ incident.title }}</strong
                ><span class="status-chip" :class="incident.status">{{ incident.status }}</span>
              </div>
              <span>{{ incident.last_event.message || incident.last_event.type }}</span>
              <div class="incident-scope">
                <span v-if="incident.last_event.scope.node"
                  ><Icon name="server" :size="13" />{{ incident.last_event.scope.node }}</span
                >
                <span v-if="incident.last_event.scope.deployment"
                  ><Icon name="box" :size="13" />{{ incident.last_event.scope.deployment }}</span
                >
                <span><Icon name="layers" :size="13" />{{ incident.event_count }} events</span>
              </div>
            </div>
            <div class="incident-time">
              <span>{{ formatRelative(incident.last_event_at) }}</span
              ><code>{{ incident.id }}</code>
            </div>
            <BaseButton variant="ghost" size="sm" icon="eye" @click="selectedIncident = incident">View</BaseButton>
          </article>
        </div>
      </section>

      <section v-if="activeTab === 'rules'" class="content-card">
        <header class="content-header">
          <div>
            <h3>Delivery rules</h3>
            <p>Choose which events reach each destination.</p>
          </div>
          <BaseButton v-if="canWrite" variant="primary" icon="plus" @click="openRuleModal()">New rule</BaseButton>
        </header>
        <div v-if="!rules.length" class="empty-state">
          <div class="empty-icon"><Icon name="filter" :size="28" /></div>
          <strong>No delivery rules</strong>
          <p>Without rules, enabled targets receive every incident update. Add a rule to filter delivery.</p>
          <BaseButton v-if="canWrite" variant="primary" icon="plus" @click="openRuleModal()">Create rule</BaseButton>
        </div>
        <div v-else class="rule-list">
          <article v-for="rule in rules" :key="rule.id" class="rule-row">
            <label class="toggle" :title="rule.enabled ? 'Enabled' : 'Disabled'"
              ><input v-model="rule.enabled" type="checkbox" :disabled="!canWrite" @change="saveRules" /><span
            /></label>
            <div class="rule-main">
              <strong>{{ rule.name }}</strong>
              <div class="chip-row">
                <span v-for="topic in rule.topics || []" :key="topic" class="filter-chip">{{ topic }}</span
                ><span
                  v-for="severity in rule.severities || []"
                  :key="severity"
                  class="severity-chip"
                  :class="severity"
                  >{{ severity }}</span
                >
              </div>
            </div>
            <div class="rule-targets">
              <span>{{ rule.target_ids.length }} target{{ rule.target_ids.length === 1 ? "" : "s" }}</span
              ><small>{{ notificationLabel(rule) }}</small>
            </div>
            <BaseButton variant="ghost" size="sm" :icon="canWrite ? 'pencil' : 'eye'" @click="openRuleModal(rule)">
              {{ canWrite ? "Edit" : "View" }}
            </BaseButton>
            <BaseButton v-if="canWrite" variant="ghost" size="sm" icon="trash-2" @click="askDeleteRule(rule)"
              >Remove</BaseButton
            >
          </article>
        </div>
      </section>

      <section v-if="activeTab === 'targets'" class="content-card">
        <header class="content-header">
          <div>
            <h3>Delivery targets</h3>
            <p>Email, webhook, and supported Shoutrrr destinations.</p>
          </div>
          <BaseButton v-if="canWrite" variant="primary" icon="plus" @click="openTargetModal()">Add target</BaseButton>
        </header>
        <div v-if="!targets.length" class="empty-state">
          <div class="empty-icon"><Icon name="send" :size="28" /></div>
          <strong>No delivery targets</strong>
          <p>Add the first destination before creating delivery rules.</p>
          <BaseButton v-if="canWrite" variant="primary" icon="plus" @click="openTargetModal()">Add target</BaseButton>
        </div>
        <div v-else class="target-list">
          <article v-for="target in targets" :key="target.id" class="target-row">
            <label class="toggle"
              ><input v-model="target.enabled" type="checkbox" :disabled="!canWrite" @change="saveTargets" /><span
            /></label>
            <div class="target-icon">
              <Icon :name="kindOf(target) === 'Email' ? 'mail' : 'webhook'" :size="18" />
            </div>
            <div class="target-main">
              <strong>{{ target.name || "Untitled target" }}</strong
              ><span>{{ kindOf(target) }}</span>
            </div>
            <BaseButton
              size="sm"
              icon="send"
              :loading="testing === target.id"
              :disabled="!target.url"
              @click="testTarget(target)"
              >Test</BaseButton
            >
            <BaseButton variant="ghost" size="sm" :icon="canWrite ? 'pencil' : 'eye'" @click="openTargetModal(target)">
              {{ canWrite ? "Edit" : "View" }}
            </BaseButton>
            <BaseButton v-if="canWrite" variant="ghost" size="sm" icon="trash-2" @click="askDeleteTarget(target)"
              >Remove</BaseButton
            >
          </article>
        </div>
      </section>
    </template>

    <BaseModal
      :visible="showTargetModal"
      :title="editingTargetId ? (canWrite ? 'Edit delivery target' : 'Delivery target') : 'Add delivery target'"
      :subtitle="editingTargetId ? 'Saved credentials remain hidden.' : 'Test the destination before saving it.'"
      icon="send"
      size="md"
      @close="closeTargetModal"
    >
      <form id="target-form" class="modal-form" @submit.prevent="saveTarget">
        <label for="target-name">Name</label
        ><input
          id="target-name"
          v-model.trim="targetForm.name"
          class="form-input"
          placeholder="Operations email"
          :disabled="!canWrite"
          required
        />
        <div v-if="editingTargetId && !replaceTargetConnection" class="configured-target">
          <div>
            <strong>{{
              targetForm.type === "email" ? "Email" : targetForm.type === "webhook" ? "Webhook" : "Custom"
            }}</strong>
            <span>The saved connection is hidden and will remain unchanged.</span>
          </div>
          <BaseButton v-if="canWrite" size="sm" icon="refresh-cw" @click="replaceTargetConnection = true">
            Replace connection
          </BaseButton>
        </div>
        <template v-if="replaceTargetConnection">
          <div class="segmented-control">
            <button
              v-for="option in targetTypes"
              :key="option.id"
              type="button"
              :class="{ active: targetForm.type === option.id }"
              @click="targetForm.type = option.id"
            >
              <Icon :name="option.icon" :size="15" />{{ option.label }}
            </button>
          </div>
          <template v-if="targetForm.type === 'email'">
            <div class="form-grid">
              <div>
                <label for="smtp-host">SMTP host</label
                ><input
                  id="smtp-host"
                  v-model.trim="targetForm.host"
                  class="form-input"
                  placeholder="smtp.example.com"
                  required
                />
              </div>
              <div>
                <label for="smtp-port">Port</label
                ><input id="smtp-port" v-model.trim="targetForm.port" class="form-input" inputmode="numeric" required />
              </div>
            </div>
            <div class="form-grid">
              <div>
                <label for="smtp-user">Username</label
                ><input id="smtp-user" v-model="targetForm.username" class="form-input" autocomplete="username" />
              </div>
              <div>
                <label for="smtp-password">Password</label
                ><input
                  id="smtp-password"
                  v-model="targetForm.password"
                  class="form-input"
                  type="password"
                  autocomplete="new-password"
                />
              </div>
            </div>
            <div class="form-grid">
              <div>
                <label for="smtp-from">From</label
                ><input id="smtp-from" v-model.trim="targetForm.from" class="form-input" type="email" required />
              </div>
              <div>
                <label for="smtp-to">To</label
                ><input id="smtp-to" v-model.trim="targetForm.to" class="form-input" type="email" required />
              </div>
            </div>
          </template>
          <template v-else
            ><label for="target-url">{{ targetForm.type === "webhook" ? "Webhook URL" : "Shoutrrr URL" }}</label
            ><input
              id="target-url"
              v-model.trim="targetForm.url"
              class="form-input"
              :placeholder="
                targetForm.type === 'webhook' ? 'https://hooks.example.com/…' : 'slack://token-a/token-b/token-c'
              "
              required
          /></template>
        </template>
      </form>
      <template #footer
        ><BaseButton v-if="!canWrite" @click="closeTargetModal">Close</BaseButton
        ><BaseButton
          v-if="canWrite && replaceTargetConnection"
          :loading="testing === 'draft'"
          :disabled="!targetURL"
          icon="send"
          @click="testDraft"
          >Test</BaseButton
        ><BaseButton
          v-if="canWrite"
          form="target-form"
          type="submit"
          variant="primary"
          :disabled="!targetForm.name || (replaceTargetConnection && !targetURL)"
          >Save target</BaseButton
        ></template
      >
    </BaseModal>

    <BaseModal
      :visible="showRuleModal"
      :title="editingRuleId ? (canWrite ? 'Edit delivery rule' : 'Delivery rule') : 'Create delivery rule'"
      subtitle="Events must match every selected filter."
      icon="filter"
      size="lg"
      @close="showRuleModal = false"
    >
      <form id="rule-form" class="modal-form" @submit.prevent="saveRule">
        <label for="rule-name">Rule name</label
        ><input
          id="rule-name"
          v-model.trim="ruleForm.name"
          class="form-input"
          placeholder="Critical fleet incidents"
          :disabled="!canWrite"
          required
        />
        <fieldset>
          <legend>Topics</legend>
          <div class="choice-grid">
            <label v-for="topic in topicOptions" :key="topic"
              ><input v-model="ruleForm.topics" type="checkbox" :value="topic" :disabled="!canWrite" />{{
                topic
              }}</label
            >
          </div>
        </fieldset>
        <fieldset>
          <legend>Severity</legend>
          <div class="choice-grid">
            <label v-for="severity in severityOptions" :key="severity"
              ><input v-model="ruleForm.severities" type="checkbox" :value="severity" :disabled="!canWrite" />{{
                severity
              }}</label
            >
          </div>
        </fieldset>
        <fieldset>
          <legend>Incident updates</legend>
          <div class="choice-grid">
            <label v-for="action in actionOptions" :key="action"
              ><input v-model="ruleForm.notifications" type="checkbox" :value="action" :disabled="!canWrite" />{{
                action
              }}</label
            >
          </div>
        </fieldset>
        <fieldset>
          <legend>Delivery targets</legend>
          <div v-if="targets.length" class="choice-grid">
            <label v-for="target in targets" :key="target.id"
              ><input v-model="ruleForm.target_ids" type="checkbox" :value="target.id" :disabled="!canWrite" />{{
                target.name
              }}</label
            >
          </div>
          <p v-else class="field-help">Add a delivery target first.</p>
        </fieldset>
      </form>
      <template #footer
        ><BaseButton @click="showRuleModal = false">{{ canWrite ? "Cancel" : "Close" }}</BaseButton
        ><BaseButton
          v-if="canWrite"
          form="rule-form"
          type="submit"
          variant="primary"
          :disabled="!ruleForm.name || !ruleForm.target_ids.length"
          >Save rule</BaseButton
        ></template
      >
    </BaseModal>

    <BaseModal
      :visible="selectedIncident !== null"
      :title="selectedIncident?.title || 'Incident'"
      subtitle="Incident details"
      icon="history"
      size="md"
      @close="selectedIncident = null"
    >
      <dl v-if="selectedIncident" class="incident-details">
        <div>
          <dt>Status</dt>
          <dd>{{ selectedIncident.status }}</dd>
        </div>
        <div>
          <dt>Severity</dt>
          <dd>{{ selectedIncident.severity }}</dd>
        </div>
        <div>
          <dt>Events</dt>
          <dd>{{ selectedIncident.event_count }}</dd>
        </div>
        <div>
          <dt>Source</dt>
          <dd>{{ selectedIncident.last_event.source }}</dd>
        </div>
        <div>
          <dt>Event type</dt>
          <dd>
            <code>{{ selectedIncident.last_event.type }}</code>
          </dd>
        </div>
        <div>
          <dt>First seen</dt>
          <dd>{{ new Date(selectedIncident.first_event_at).toLocaleString() }}</dd>
        </div>
        <div>
          <dt>Last seen</dt>
          <dd>{{ new Date(selectedIncident.last_event_at).toLocaleString() }}</dd>
        </div>
        <div class="detail-wide">
          <dt>Message</dt>
          <dd>{{ selectedIncident.last_event.message || "No message" }}</dd>
        </div>
        <div class="detail-wide">
          <dt>Incident ID</dt>
          <dd>
            <code>{{ selectedIncident.id }}</code>
          </dd>
        </div>
      </dl>
      <template #footer><BaseButton @click="selectedIncident = null">Close</BaseButton></template>
    </BaseModal>

    <BaseModal
      :visible="deleteRequest !== null"
      title="Remove notification configuration"
      subtitle="This change takes effect immediately."
      icon="trash-2"
      icon-color="danger"
      size="sm"
      @close="deleteRequest = null"
    >
      <p>
        Remove <strong>{{ deleteRequest?.name }}</strong
        >?
      </p>
      <template #footer
        ><BaseButton @click="deleteRequest = null">Cancel</BaseButton
        ><BaseButton variant="danger" @click="confirmDelete">Remove</BaseButton></template
      >
    </BaseModal>
  </section>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import Icon from "@/components/base/Icon.vue";
import {
  notificationsApi,
  type IncidentAction,
  type NotificationIncident,
  type NotificationRule,
  type NotificationSeverity,
  type NotificationTarget,
} from "@/services/api";
import { useAuthStore } from "@/stores/auth";
import { useNotificationsStore } from "@/stores/notifications";
import { randomUUID } from "@/utils/uuid";

const auth = useAuthStore();
const notifications = useNotificationsStore();
const canWrite = auth.hasPermission("settings:write");
const reviewMode = import.meta.env.DEV && new URLSearchParams(window.location.search).get("review") === "notifications";
const activeTab = ref<"incidents" | "rules" | "targets">("incidents");
const targets = ref<NotificationTarget[]>([]);
const rules = ref<NotificationRule[]>([]);
const incidents = ref<NotificationIncident[]>([]);
const loading = ref(true);
const loadError = ref("");
const testing = ref<string | null>(null);
const showTargetModal = ref(false);
const showRuleModal = ref(false);
const selectedIncident = ref<NotificationIncident | null>(null);
const editingTargetId = ref<string | null>(null);
const replaceTargetConnection = ref(false);
const editingRuleId = ref<string | null>(null);
const deleteRequest = ref<{ type: "target" | "rule"; id: string; name: string } | null>(null);

const targetTypes = [
  { id: "email", label: "Email", icon: "mail" },
  { id: "webhook", label: "Webhook", icon: "webhook" },
  { id: "custom", label: "Custom", icon: "settings-2" },
] as const;
const topicOptions = ["fleet", "capacity", "security", "backups", "certificates", "deployments"];
const severityOptions: NotificationSeverity[] = ["critical", "warning", "info"];
const actionOptions: IncidentAction[] = ["opened", "updated", "resolved"];
const tabs = [
  { id: "incidents" as const, label: "Incidents", icon: "history", count: () => openIncidentCount.value },
  { id: "rules" as const, label: "Rules", icon: "filter", count: () => rules.value.length },
  { id: "targets" as const, label: "Targets", icon: "send", count: () => targets.value.length },
];
const openIncidentCount = computed(() => incidents.value.filter((item) => item.status === "open").length);

const targetForm = reactive({
  type: "email" as "email" | "webhook" | "custom",
  name: "",
  host: "",
  port: "587",
  username: "",
  password: "",
  from: "",
  to: "",
  url: "",
});
const ruleForm = reactive<{
  name: string;
  topics: string[];
  severities: NotificationSeverity[];
  notifications: IncidentAction[];
  target_ids: string[];
}>({ name: "", topics: [], severities: [], notifications: ["opened", "resolved"], target_ids: [] });
const targetURL = computed(() => {
  if (targetForm.type === "email") {
    if (!targetForm.host || !targetForm.from || !targetForm.to) return "";
    const credentials = targetForm.username
      ? `${encodeURIComponent(targetForm.username)}:${encodeURIComponent(targetForm.password)}@`
      : "";
    const query = new URLSearchParams({ fromAddress: targetForm.from, toAddresses: targetForm.to, useStartTLS: "yes" });
    return `smtp://${credentials}${targetForm.host}:${targetForm.port || "587"}/?${query}`;
  }
  return targetForm.type === "webhook" && targetForm.url ? `generic+${targetForm.url}` : targetForm.url;
});

async function load() {
  loading.value = true;
  loadError.value = "";
  if (reviewMode) {
    targets.value = [
      { id: "ops-email", name: "Operations email", url: "********", kind: "email", enabled: true },
      { id: "incident-webhook", name: "Incident webhook", url: "********", kind: "webhook", enabled: true },
    ];
    rules.value = [
      {
        id: "critical-fleet",
        name: "Critical Fleet incidents",
        enabled: true,
        topics: ["fleet", "capacity"],
        severities: ["critical"],
        notifications: ["opened", "resolved"],
        target_ids: ["ops-email", "incident-webhook"],
      },
    ];
    incidents.value = [
      {
        id: "autoscale:prod-1:shop:1787406000000",
        correlation_key: "autoscale:prod-1:shop",
        status: "open",
        severity: "warning",
        title: "Autoscaling needs attention",
        event_count: 8,
        first_event_at: new Date(Date.now() - 24 * 60_000).toISOString(),
        last_event_at: new Date(Date.now() - 2 * 60_000).toISOString(),
        last_event: {
          source: "capacity",
          type: "autoscale.blocked",
          title: "Autoscaling needs attention",
          message: "No permitted Fleet capacity is available.",
          scope: { node: "prod-1", deployment: "shop" },
        },
      },
    ];
    loading.value = false;
    return;
  }
  try {
    const [targetResponse, ruleResponse, incidentResponse] = await Promise.all([
      notificationsApi.getTargets(),
      notificationsApi.getRules(),
      notificationsApi.getIncidents(),
    ]);
    targets.value = targetResponse.data.targets || [];
    rules.value = ruleResponse.data.rules || [];
    incidents.value = incidentResponse.data.incidents || [];
  } catch (error: any) {
    loadError.value = error.response?.data?.error || error.message;
  } finally {
    loading.value = false;
  }
}

const kindOf = (target: NotificationTarget) =>
  target.kind === "email" || target.url.startsWith("smtp://")
    ? "Email"
    : target.kind === "webhook" || target.url.startsWith("generic")
      ? "Webhook"
      : "Custom";
const formatRelative = (value: string) => {
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  return hours < 24 ? `${hours}h ago` : `${Math.floor(hours / 24)}d ago`;
};
const notificationLabel = (rule: NotificationRule) =>
  rule.notifications?.length ? rule.notifications.join(", ") : "All incident updates";

async function saveTargets() {
  if (reviewMode) return;
  try {
    await notificationsApi.updateTargets(targets.value);
  } catch (error: any) {
    notifications.error("Targets not saved", error.response?.data?.error || error.message);
  }
}
async function saveRules() {
  if (reviewMode) return;
  try {
    await notificationsApi.updateRules(rules.value);
  } catch (error: any) {
    notifications.error("Rules not saved", error.response?.data?.error || error.message);
  }
}
async function runTest(id: string, url: string) {
  testing.value = id;
  try {
    if (reviewMode) {
      notifications.success("Review test", "The preview target accepted the test notification.");
      return;
    }
    await notificationsApi.test(url);
    notifications.success("Test sent", "Check the destination for the test notification.");
  } catch (error: any) {
    notifications.error("Test failed", error.response?.data?.error || error.message);
  } finally {
    testing.value = null;
  }
}
const testTarget = async (target: NotificationTarget) => {
  testing.value = target.id;
  try {
    if (reviewMode) {
      notifications.success("Review test", "The preview target accepted the test notification.");
      return;
    }
    await notificationsApi.testTarget(target.id);
    notifications.success("Test sent", "Check the destination for the test notification.");
  } catch (error: any) {
    notifications.error("Test failed", error.response?.data?.error || error.message);
  } finally {
    testing.value = null;
  }
};
const testDraft = () => runTest("draft", targetURL.value);

async function saveTarget() {
  if (editingTargetId.value) {
    const index = targets.value.findIndex((target) => target.id === editingTargetId.value);
    if (index >= 0) {
      targets.value[index] = {
        ...targets.value[index],
        name: targetForm.name,
        url: replaceTargetConnection.value ? targetURL.value : targets.value[index].url,
        kind: replaceTargetConnection.value ? targetForm.type : targets.value[index].kind,
      };
    }
  } else {
    targets.value.push({
      id: randomUUID(),
      name: targetForm.name,
      url: targetURL.value,
      enabled: true,
      kind: targetForm.type,
    });
  }
  await saveTargets();
  closeTargetModal();
}
function openTargetModal(target?: NotificationTarget) {
  editingTargetId.value = target?.id || null;
  replaceTargetConnection.value = !target;
  Object.assign(targetForm, {
    type: target?.kind || "email",
    name: target?.name || "",
    host: "",
    port: "587",
    username: "",
    password: "",
    from: "",
    to: "",
    url: "",
  });
  showTargetModal.value = true;
}
function closeTargetModal() {
  showTargetModal.value = false;
  editingTargetId.value = null;
  replaceTargetConnection.value = false;
  Object.assign(targetForm, {
    type: "email",
    name: "",
    host: "",
    port: "587",
    username: "",
    password: "",
    from: "",
    to: "",
    url: "",
  });
}
function openRuleModal(rule?: NotificationRule) {
  editingRuleId.value = rule?.id || null;
  Object.assign(ruleForm, {
    name: rule?.name || "",
    topics: [...(rule?.topics || [])],
    severities: [...(rule?.severities || [])],
    notifications: [...(rule?.notifications || ["opened", "resolved"])],
    target_ids: [...(rule?.target_ids || [])],
  });
  showRuleModal.value = true;
}
async function saveRule() {
  const rule: NotificationRule = {
    id: editingRuleId.value || randomUUID(),
    name: ruleForm.name,
    enabled: true,
    topics: [...ruleForm.topics],
    severities: [...ruleForm.severities],
    notifications: [...ruleForm.notifications],
    target_ids: [...ruleForm.target_ids],
  };
  const index = rules.value.findIndex((item) => item.id === rule.id);
  if (index >= 0) rules.value[index] = { ...rules.value[index], ...rule };
  else rules.value.push(rule);
  await saveRules();
  showRuleModal.value = false;
}
const askDeleteTarget = (target: NotificationTarget) =>
  (deleteRequest.value = { type: "target", id: target.id, name: target.name });
const askDeleteRule = (rule: NotificationRule) =>
  (deleteRequest.value = { type: "rule", id: rule.id, name: rule.name });
async function confirmDelete() {
  if (!deleteRequest.value) return;
  if (deleteRequest.value.type === "target") {
    targets.value = targets.value.filter((item) => item.id !== deleteRequest.value?.id);
    await saveTargets();
  } else {
    rules.value = rules.value.filter((item) => item.id !== deleteRequest.value?.id);
    await saveRules();
  }
  deleteRequest.value = null;
}

onMounted(load);
</script>

<style scoped>
.notifications-settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
.section-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-3);
}
.docs-link {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 44px;
  padding: var(--space-2) var(--space-3);
  color: var(--color-primary-700);
  background: var(--surface-raised);
  border: 1px solid var(--color-primary-200);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  text-decoration: none;
}
.empty-icon,
.incident-icon,
.target-icon {
  display: grid;
  place-items: center;
  border-radius: var(--radius-lg);
}
.configured-target {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4);
  background: var(--surface-inset);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}
.configured-target div {
  display: flex;
  min-width: 0;
  flex-direction: column;
  gap: var(--space-1);
}
.configured-target strong {
  color: var(--text);
}
.configured-target span {
  color: var(--text-muted);
  font-size: var(--text-sm);
}
.incident-details {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
  margin: 0;
}
.incident-details div {
  min-width: 0;
  padding: var(--space-3);
  background: var(--surface-inset);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}
.incident-details .detail-wide {
  grid-column: 1 / -1;
}
.incident-details dt {
  margin-bottom: var(--space-1);
  color: var(--text-muted);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: uppercase;
}
.incident-details dd {
  overflow-wrap: anywhere;
  margin: 0;
  color: var(--text);
}
.content-header h3 {
  margin: 0;
  color: var(--text);
}
.content-header p {
  margin: var(--space-1) 0 0;
  color: var(--text-muted);
}
.section-tabs {
  display: flex;
  gap: var(--space-1);
  padding: var(--space-1);
  width: fit-content;
  background: var(--surface-inset);
  border-radius: var(--radius-sm);
}
.section-tabs button {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 36px;
  padding: var(--space-2) var(--space-4);
  border: 0;
  border-radius: var(--radius-xs);
  color: var(--text-muted);
  background: transparent;
  cursor: pointer;
}
.section-tabs button.active {
  color: var(--color-primary-700);
  background: var(--surface-raised);
  box-shadow: var(--shadow-sm);
}
.count-chip,
.filter-chip,
.severity-chip,
.status-chip {
  display: inline-flex;
  border-radius: var(--radius-full);
  padding: 2px var(--space-2);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}
.count-chip,
.filter-chip {
  color: var(--text-muted);
  background: var(--surface-inset);
}
.content-card,
.state-panel {
  overflow: hidden;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  box-shadow: var(--shadow-xs);
}
.content-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}
.content-header h3 {
  font-size: var(--text-lg);
}
.content-header p {
  font-size: var(--text-sm);
}
.empty-state {
  display: flex;
  min-height: 250px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--space-3);
  padding: var(--space-8);
  text-align: center;
}
.empty-state strong {
  color: var(--text);
  font-size: var(--text-lg);
}
.empty-state p {
  max-width: 440px;
  margin: 0;
  color: var(--text-muted);
}
.empty-icon {
  width: 52px;
  height: 52px;
  color: var(--color-primary-700);
  background: var(--color-primary-50);
}
.empty-icon.success {
  color: var(--color-success-700);
  background: var(--color-success-50);
}
.incident-row,
.rule-row,
.target-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: 10px var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}
.incident-row:last-child,
.rule-row:last-child,
.target-row:last-child {
  border-bottom: 0;
}
.incident-icon,
.target-icon {
  width: 38px;
  height: 38px;
  flex: 0 0 auto;
}
.incident-icon.critical {
  color: var(--color-danger-700);
  background: var(--color-danger-50);
}
.incident-icon.warning {
  color: var(--color-warning-700);
  background: var(--color-warning-50);
}
.incident-icon.resolved {
  color: var(--color-success-700);
  background: var(--color-success-50);
}
.incident-main,
.rule-main,
.target-main {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: var(--space-1);
}
.incident-main > span,
.target-main span {
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--text-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}
.incident-title,
.chip-row,
.incident-scope {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: var(--space-2);
}
.incident-title strong,
.rule-main strong,
.target-main strong {
  color: var(--text);
}
.status-chip.open {
  color: var(--color-danger-700);
  background: var(--color-danger-50);
}
.status-chip.resolved {
  color: var(--color-success-700);
  background: var(--color-success-50);
}
.severity-chip.critical {
  color: var(--color-danger-700);
  background: var(--color-danger-50);
}
.severity-chip.warning {
  color: var(--color-warning-700);
  background: var(--color-warning-50);
}
.severity-chip.info {
  color: var(--color-info-700);
  background: var(--color-info-50);
}
.incident-scope {
  color: var(--text-muted);
  font-size: var(--text-xs);
}
.incident-scope span {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
}
.incident-time,
.rule-targets {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: var(--space-1);
  color: var(--text-muted);
  font-size: var(--text-xs);
}
.incident-time code {
  max-width: 180px;
  overflow: hidden;
  text-overflow: ellipsis;
}
.target-icon {
  color: var(--color-primary-700);
  background: var(--color-primary-50);
}
.toggle {
  position: relative;
  width: 34px;
  height: 20px;
  flex: 0 0 auto;
}
.toggle input {
  position: absolute;
  opacity: 0;
}
.toggle span {
  position: absolute;
  inset: 0;
  border-radius: var(--radius-full);
  background: var(--surface-inset);
  cursor: pointer;
  transition: background var(--transition-fast);
}
.toggle span::after {
  position: absolute;
  top: 3px;
  left: 3px;
  width: 14px;
  height: 14px;
  content: "";
  border-radius: var(--radius-xs);
  background: var(--surface-raised);
  box-shadow: var(--shadow-xs);
  transition: transform var(--transition-fast);
}
.toggle input:checked + span {
  background: var(--color-primary-500);
}
.toggle input:checked + span::after {
  transform: translateX(14px);
}
.modal-form {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}
.modal-form > label,
.modal-form div > label,
fieldset legend {
  color: var(--text);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}
.form-grid,
.choice-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-3);
}
.form-grid > div {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}
.segmented-control {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: var(--space-1);
  padding: var(--space-1);
  background: var(--surface-inset);
  border-radius: var(--radius-lg);
}
.segmented-control button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2);
  border: 0;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  background: transparent;
  cursor: pointer;
}
.segmented-control button.active {
  color: var(--color-primary-700);
  background: var(--surface-raised);
  box-shadow: var(--shadow-sm);
}
fieldset {
  margin: 0;
  padding: var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
}
fieldset legend {
  padding: 0 var(--space-2);
}
.choice-grid label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-height: 32px;
  color: var(--text-muted);
  font-size: var(--text-sm);
}
.field-help {
  color: var(--text-muted);
  font-size: var(--text-sm);
}
.loading-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  padding: var(--space-5);
}
.skeleton-row {
  height: 54px;
  border-radius: var(--radius-lg);
  background: var(--surface-inset);
  animation: pulse 1.4s ease-in-out infinite;
}
.error-panel {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  color: var(--color-danger-700);
}
.error-panel div {
  flex: 1;
}
.error-panel p {
  margin: var(--space-1) 0 0;
  color: var(--text-muted);
}
@keyframes pulse {
  50% {
    opacity: 0.55;
  }
}
@media (prefers-reduced-motion: reduce) {
  .skeleton-row {
    animation: none;
  }
}
@media (max-width: 760px) {
  .section-toolbar {
    align-items: stretch;
    flex-direction: column;
  }
  .section-tabs {
    width: 100%;
  }
  .section-tabs button {
    flex: 1;
    justify-content: center;
  }
  .docs-link {
    justify-content: center;
  }
  .configured-target {
    align-items: stretch;
    flex-direction: column;
  }
  .incident-details {
    grid-template-columns: 1fr;
  }
  .incident-details .detail-wide {
    grid-column: auto;
  }
  .content-header {
    align-items: flex-start;
    flex-direction: column;
  }
  .content-header :deep(.btn-primary) {
    width: 100%;
  }
  .incident-row,
  .rule-row,
  .target-row {
    align-items: flex-start;
    flex-wrap: wrap;
  }
  .incident-time,
  .rule-targets {
    width: 100%;
    align-items: flex-start;
    padding-left: 50px;
  }
  .form-grid,
  .choice-grid {
    grid-template-columns: 1fr;
  }
}
</style>
