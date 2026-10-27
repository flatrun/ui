<template>
  <div class="deploys-tab">
    <template v-if="source">
      <BaseCard v-if="birch" title="Recent deploys" icon="rocket">
        <DeployCards
          :deployment-name="deploymentName"
          :deploys="deploys"
          :job-running="jobRunning"
          :can-write="canWrite"
          @redeploy="emit('deploy')"
          @restart="emit('restart')"
          @rollback="(id: string) => emit('rollback', id)"
        />
      </BaseCard>

      <BaseCard title="Source" icon="git-branch">
        <template #actions>
          <BaseButton variant="primary" size="sm" icon="rocket" :disabled="jobRunning" @click="emit('deploy')">
            Deploy latest
          </BaseButton>
        </template>
        <dl class="source-facts">
          <div>
            <dt>Repository</dt>
            <dd class="mono">{{ source.ref }}</dd>
          </div>
          <div>
            <dt>Branch</dt>
            <dd>
              <form class="branch-form" @submit.prevent="saveBranch">
                <BaseInput v-model="branch" placeholder="default branch" />
                <BaseButton v-if="branch !== (source.branch || '')" size="sm" type="submit" :loading="saving">
                  Save
                </BaseButton>
              </form>
            </dd>
          </div>
          <div>
            <dt>Build</dt>
            <dd>
              <span class="pill">{{ builderLabel }}</span>
            </dd>
          </div>
          <div>
            <dt>Running revision</dt>
            <dd class="mono">{{ source.last_revision ? source.last_revision.slice(0, 12) : "Not deployed yet" }}</dd>
          </div>
        </dl>
        <div class="toggles">
          <label class="toggle-row">
            <input type="checkbox" :checked="source.auto_deploy" @change="toggle('auto_deploy', $event)" />
            <span>
              <strong>Deploy on push</strong>
              <small>A push to {{ source.branch || "the default branch" }} deploys it here.</small>
            </span>
          </label>
          <label class="toggle-row">
            <input type="checkbox" :checked="source.previews" @change="toggle('previews', $event)" />
            <span>
              <strong>Pull request previews</strong>
              <small>Each open pull request gets its own environment, removed when it closes.</small>
            </span>
          </label>
        </div>
      </BaseCard>

      <BaseCard title="Webhook" icon="webhook">
        <p class="hint">
          Point your repository's webhook at one of these addresses. Send push events, and pull request events for
          previews.
        </p>
        <div v-for="provider in providers" :key="provider.id" class="hook-row">
          <span class="hook-provider">{{ provider.label }}</span>
          <code class="mono">{{ hookUrl(provider.id) }}</code>
          <BaseButton
            size="sm"
            variant="ghost"
            icon="copy"
            :aria-label="`Copy ${provider.label} URL`"
            @click="copy(hookUrl(provider.id))"
          />
        </div>
        <p class="hint">
          GitHub signs with the secret (content type <code>application/json</code>). GitLab sends it as the secret
          token. Other services send it in the <code>X-FlatRun-Token</code> header.
        </p>
        <div class="secret-row">
          <template v-if="secret">
            <code class="mono secret">{{ secret }}</code>
            <BaseButton size="sm" variant="ghost" icon="copy" aria-label="Copy secret" @click="copy(secret)" />
            <small class="warn">Shown once. Store it in your repository's webhook settings now.</small>
          </template>
          <template v-else>
            <span class="secret-state">{{ webhookConfigured ? "A secret is set." : "No secret yet." }}</span>
          </template>
          <BaseButton size="sm" :loading="rotating" @click="rotate">
            {{ webhookConfigured || secret ? "Replace secret" : "Create secret" }}
          </BaseButton>
        </div>
      </BaseCard>

      <BaseCard title="Environments" icon="layers">
        <ul v-if="environments.length" class="env-list">
          <li v-for="env in environments" :key="env.name">
            <RouterLink :to="`/deployments/${env.name}?tab=deploys`" class="env-name">{{ env.name }}</RouterLink>
            <span v-if="env.metadata?.environment?.pr" class="pill">PR #{{ env.metadata.environment.pr }}</span>
            <span class="muted">{{ env.metadata?.source?.branch || "default branch" }}</span>
            <span class="status-dot" :class="env.status" />
            <span class="muted">{{ env.status }}</span>
          </li>
        </ul>
        <p v-else class="hint">
          No environments yet. An environment is a copy of this deployment that tracks its own branch.
        </p>
        <form class="env-form" @submit.prevent="addEnvironment">
          <BaseInput v-model="newEnv.name" placeholder="staging" />
          <BaseInput v-model="newEnv.branch" placeholder="branch (optional)" />
          <BaseButton size="sm" type="submit" :loading="creatingEnv" :disabled="!newEnv.name.trim()">
            Create environment
          </BaseButton>
        </form>
      </BaseCard>

      <BaseCard v-if="!birch" title="History" icon="history">
        <table v-if="deploys.length" class="history">
          <thead>
            <tr>
              <th>Revision</th>
              <th>Trigger</th>
              <th>Status</th>
              <th>Started</th>
              <th>Took</th>
              <th />
            </tr>
          </thead>
          <tbody>
            <tr v-for="deploy in deploys" :key="deploy.id">
              <td class="mono">{{ deploy.revision ? deploy.revision.slice(0, 12) : "unknown" }}</td>
              <td>{{ triggerLabel[deploy.trigger] || deploy.trigger }}</td>
              <td>
                <span class="status-dot" :class="deploy.status" />
                {{ deploy.status }}
                <small v-if="deploy.error" class="error-text" :title="deploy.error">{{ deploy.error }}</small>
              </td>
              <td :title="deploy.started_at">{{ timeAgo(deploy.started_at) }}</td>
              <td>{{ duration(deploy.started_at, deploy.finished_at) }}</td>
              <td class="row-actions">
                <BaseButton
                  v-if="canRollback(deploy)"
                  size="sm"
                  variant="ghost"
                  icon="undo-2"
                  :disabled="jobRunning"
                  @click="emit('rollback', deploy.id)"
                >
                  Roll back
                </BaseButton>
                <span v-else-if="deploy.revision && deploy.revision === source.last_revision" class="pill"
                  >Running</span
                >
              </td>
            </tr>
          </tbody>
        </table>
        <p v-else class="hint">No deploys recorded yet.</p>
      </BaseCard>
    </template>

    <BaseCard v-else title="Deploy from git" icon="git-branch">
      <p class="hint">
        This deployment was not created from a repository, so it has no deploy history, webhooks or environments. Create
        a deployment from a git repository to get them.
      </p>
    </BaseCard>

    <BaseCard title="Sleep when idle" icon="moon">
      <label class="toggle-row">
        <input v-model="sleepForm.enabled" type="checkbox" />
        <span>
          <strong>Stop this deployment when nobody uses it</strong>
          <small>The next visit starts it again and shows a short waiting page while it boots.</small>
        </span>
      </label>
      <div v-if="sleepForm.enabled" class="sleep-row">
        <BaseField label="Idle minutes" hint="At least 5">
          <BaseInput v-model.number="sleepForm.idle_minutes" type="number" />
        </BaseField>
      </div>
      <p v-if="sleep?.sleeping" class="sleeping"><Icon name="moon" :size="14" /> Asleep now</p>
      <p class="sleep-note">
        To stop only one service, such as a worker, turn on sleep in that service's panel instead. Those settings are
        not used while this one is on.
      </p>
      <template #footer>
        <BaseButton size="sm" :loading="savingSleep" :disabled="!sleepChanged" @click="saveSleep">Save</BaseButton>
      </template>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from "vue";
import { RouterLink } from "vue-router";
import { deploymentsApi, publicAgentUrl } from "@/services/api";
import type { Deployment, DeployRecord, DeployTrigger, SleepConfig, SourceConfig, WebhookPaths } from "@/types";
import { useNotificationsStore } from "@/stores/notifications";
import { duration, timeAgo } from "@/utils/time";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseField from "@/components/base/BaseField.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import Icon from "@/components/base/Icon.vue";
import DeployCards from "./DeployCards.vue";
import { useTheme } from "@/composables/useTheme";
import { useAuthStore } from "@/stores/auth";

const props = defineProps<{
  deploymentName: string;
  source?: SourceConfig;
  sleep?: SleepConfig;
  jobRunning: boolean;
}>();

const emit = defineEmits<{
  deploy: [];
  restart: [];
  rollback: [deployId: string];
  changed: [];
  "environment-created": [name: string, jobId?: string];
}>();

const notifications = useNotificationsStore();
const { current: currentStyle } = useTheme();
const birch = computed(() => currentStyle.value.layout === "birch");
const auth = useAuthStore();
const canWrite = computed(() => auth.hasPermission("deployments:write"));

const providers = [
  { id: "github", label: "GitHub" },
  { id: "gitlab", label: "GitLab" },
  { id: "generic", label: "Other" },
] as const;

const triggerLabel: Record<DeployTrigger, string> = {
  manual: "Manual",
  push: "Push",
  pull_request: "Pull request",
  rollback: "Rollback",
};

const builderLabel = computed(() => {
  switch (props.source?.builder) {
    case "dockerfile":
      return "Dockerfile";
    case "railpack":
      return "Railpack";
    case "compose":
    case undefined:
    case "":
      return "Compose file";
    default:
      return props.source?.builder;
  }
});

const deploys = ref<DeployRecord[]>([]);
const environments = ref<Deployment[]>([]);
const webhookPaths = ref<WebhookPaths | null>(null);
const webhookConfigured = ref(false);
const secret = ref("");
const rotating = ref(false);
const saving = ref(false);
const branch = ref(props.source?.branch || "");
const newEnv = reactive({ name: "", branch: "" });
const creatingEnv = ref(false);

const sleepForm = reactive({ enabled: !!props.sleep?.enabled, idle_minutes: props.sleep?.idle_minutes || 15 });
const savingSleep = ref(false);
const sleepChanged = computed(
  () =>
    sleepForm.enabled !== !!props.sleep?.enabled ||
    (sleepForm.enabled && sleepForm.idle_minutes !== (props.sleep?.idle_minutes || 15)),
);

watch(
  () => props.source?.branch,
  (value) => (branch.value = value || ""),
);
watch(
  () => props.sleep,
  (value) => {
    sleepForm.enabled = !!value?.enabled;
    sleepForm.idle_minutes = value?.idle_minutes || 15;
  },
);
watch(
  () => props.jobRunning,
  (running, was) => {
    if (was && !running) load();
  },
);

function errorText(e: any): string {
  return e?.response?.data?.error || e?.message || "Request failed";
}

async function load() {
  if (!props.source) return;
  const [history, envs, hook] = await Promise.allSettled([
    deploymentsApi.deploys(props.deploymentName),
    deploymentsApi.environments(props.deploymentName),
    deploymentsApi.webhook(props.deploymentName),
  ]);
  if (history.status === "fulfilled") deploys.value = history.value.data.deploys || [];
  if (envs.status === "fulfilled") environments.value = envs.value.data.environments || [];
  if (hook.status === "fulfilled") {
    webhookPaths.value = hook.value.data.paths;
    webhookConfigured.value = hook.value.data.configured;
  }
}

function hookUrl(provider: keyof WebhookPaths): string {
  const path = webhookPaths.value?.[provider] || `/api/hooks/${provider}/${props.deploymentName}`;
  return publicAgentUrl(path);
}

async function copy(text: string) {
  try {
    await navigator.clipboard.writeText(text);
    notifications.success("Copied", "");
  } catch {
    notifications.error("Copy failed", "Select the text and copy it manually.");
  }
}

function canRollback(deploy: DeployRecord): boolean {
  return deploy.status === "succeeded" && !!deploy.revision && deploy.revision !== props.source?.last_revision;
}

async function toggle(field: "auto_deploy" | "previews", event: Event) {
  const checked = (event.target as HTMLInputElement).checked;
  try {
    await deploymentsApi.updateSource(props.deploymentName, { [field]: checked });
    emit("changed");
  } catch (e) {
    (event.target as HTMLInputElement).checked = !checked;
    notifications.error("Could not update source", errorText(e));
  }
}

async function saveBranch() {
  saving.value = true;
  try {
    await deploymentsApi.updateSource(props.deploymentName, { branch: branch.value.trim() });
    emit("changed");
  } catch (e) {
    notifications.error("Could not change branch", errorText(e));
  } finally {
    saving.value = false;
  }
}

async function rotate() {
  rotating.value = true;
  try {
    const { data } = await deploymentsApi.rotateWebhook(props.deploymentName);
    webhookPaths.value = data.paths;
    secret.value = data.secret;
    webhookConfigured.value = true;
  } catch (e) {
    notifications.error("Could not create secret", errorText(e));
  } finally {
    rotating.value = false;
  }
}

async function addEnvironment() {
  creatingEnv.value = true;
  try {
    const { data } = await deploymentsApi.createEnvironment(props.deploymentName, {
      name: newEnv.name.trim(),
      branch: newEnv.branch.trim() || undefined,
    });
    newEnv.name = "";
    newEnv.branch = "";
    emit("environment-created", data.name, data.job_id);
    await load();
  } catch (e) {
    notifications.error("Could not create environment", errorText(e));
  } finally {
    creatingEnv.value = false;
  }
}

async function saveSleep() {
  savingSleep.value = true;
  try {
    await deploymentsApi.updateSleep(props.deploymentName, {
      enabled: sleepForm.enabled,
      idle_minutes: sleepForm.idle_minutes,
    });
    emit("changed");
  } catch (e) {
    notifications.error("Could not save sleep settings", errorText(e));
  } finally {
    savingSleep.value = false;
  }
}

onMounted(load);
defineExpose({ load });
</script>

<style scoped>
.deploys-tab {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.source-facts {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
  gap: var(--space-4);
  margin: 0;
}

.source-facts dt {
  color: var(--text-muted);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.source-facts dd {
  margin: var(--space-1) 0 0;
  overflow-wrap: anywhere;
}

.branch-form,
.env-form {
  display: flex;
  gap: var(--space-2);
  align-items: center;
}

.env-form {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  margin-top: var(--space-3);
}

@media (max-width: 720px) {
  .env-form {
    grid-template-columns: 1fr;
  }
}

.mono {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.pill {
  display: inline-block;
  padding: 1px var(--space-2);
  background: var(--accent-subtle);
  border-radius: var(--radius-sm);
  color: var(--accent);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
}

.toggles {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-subtle);
}

.toggle-row {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  cursor: pointer;
}

.toggle-row input {
  margin-top: 3px;
  accent-color: var(--accent);
}

.toggle-row span {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.toggle-row strong {
  font-size: var(--text-md);
  font-weight: var(--font-medium);
}

.toggle-row small,
.hint,
.muted {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.hint {
  margin: 0 0 var(--space-3);
}

.hook-row {
  display: grid;
  grid-template-columns: 70px 1fr auto;
  gap: var(--space-2);
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
}

.hook-row code {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.hook-provider {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.hook-row + .hint {
  margin-top: var(--space-3);
}

.secret-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  align-items: center;
}

.secret {
  padding: var(--space-1) var(--space-2);
  background: var(--surface-inset);
  border-radius: var(--radius-sm);
  overflow-wrap: anywhere;
}

.warn {
  color: var(--color-warning-700);
}

.secret-state {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.env-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.env-list li {
  display: flex;
  gap: var(--space-3);
  align-items: center;
  padding: var(--space-2) 0;
  border-bottom: 1px solid var(--border-subtle);
}

.env-name {
  color: var(--accent);
  font-weight: var(--font-medium);
  text-decoration: none;
}

.status-dot {
  display: inline-block;
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--text-subtle);
}

.status-dot.running,
.status-dot.succeeded {
  background: var(--c-green);
}

.status-dot.failed,
.status-dot.error {
  background: var(--c-red);
}

.history {
  width: 100%;
  border-collapse: collapse;
  font-size: var(--text-sm);
}

.history th {
  padding: var(--space-2);
  color: var(--text-muted);
  font-weight: var(--font-medium);
  text-align: left;
}

.history td {
  padding: var(--space-2);
  border-top: 1px solid var(--border-subtle);
  vertical-align: middle;
}

.history td.row-actions {
  text-align: right;
}

.error-text {
  display: block;
  max-width: 280px;
  overflow: hidden;
  color: var(--color-danger-700);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.sleep-row {
  max-width: 200px;
  margin-top: var(--space-3);
}

.sleeping {
  display: flex;
  gap: var(--space-2);
  align-items: center;
  margin: var(--space-3) 0 0;
  color: var(--accent);
}

.sleep-note {
  margin: var(--space-3) 0 0;
  font-size: var(--text-xs);
  color: var(--text-muted);
}

@media (max-width: 720px) {
  .history th:nth-child(5),
  .history td:nth-child(5) {
    display: none;
  }
}
</style>
