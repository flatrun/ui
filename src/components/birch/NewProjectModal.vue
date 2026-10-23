<template>
  <BaseModal
    :visible="visible"
    title="New project"
    size="xl"
    no-padding
    :close-disabled="creating"
    @close="emit('close')"
  >
    <div class="new-project">
      <nav class="source-list" aria-label="Source">
        <button
          v-for="s in SOURCES"
          :key="s.id"
          type="button"
          :aria-current="selectedSource === s.id"
          :class="{ active: selectedSource === s.id }"
          @click="selectSource(s.id)"
        >
          <Icon :name="s.icon" :size="16" />
          <span class="source-copy">
            <span class="source-label">{{ s.label }}</span>
            <small>{{ s.hint }}</small>
          </span>
        </button>
      </nav>

      <div class="source-pane">
        <div v-if="selectedSource === 'github'" class="github-pane">
          <div class="gh-toolbar">
            <span class="gh-account">
              <Icon name="github" :size="16" />
              <span>No account connected</span>
            </span>
            <BaseInput
              v-model="repoQuery"
              name="github-search"
              placeholder="Search repositories"
              aria-label="Search repositories"
              disabled
            />
          </div>

          <div class="gh-repos">
            <ul class="gh-placeholder" aria-hidden="true">
              <li v-for="n in 5" :key="n">
                <span class="bar" :style="{ width: `${28 + ((n * 17) % 30)}%` }" />
                <span class="bar short" />
              </li>
            </ul>
            <div class="gh-connect">
              <span class="gh-badge"><Icon name="github" :size="22" /></span>
              <h4>Connect GitHub</h4>
              <p>Pick a repository, deploy on every push and preview each pull request in its own environment.</p>
              <BaseButton variant="primary" icon="github" @click="connectGithub">Connect GitHub</BaseButton>
              <p v-if="githubMissing" class="gh-missing" role="alert">
                No GitHub App is connected to this server.
                <a href="https://flatrun.dev/docs/configuration/github" target="_blank" rel="noopener"
                  >Connect GitHub with a token and webhook</a
                >, or
                <button type="button" class="link-button" @click="selectSource('git')">
                  deploy from a repository URL</button
                >.
              </p>
            </div>
          </div>

          <div class="gh-options">
            <label class="check"><input type="checkbox" checked disabled /> Deploy on every push</label>
            <label class="check"><input type="checkbox" disabled /> Preview pull requests</label>
          </div>
        </div>

        <form v-else id="new-deployment-form" class="new-panel" @submit.prevent="create">
          <template v-if="mode === 'git'">
            <BaseField label="Repository" hint="A public URL, or add a token under Advanced for a private one.">
              <BaseInput v-model="repoUrl" name="repo" placeholder="https://github.com/acme/web.git" />
            </BaseField>
            <BaseField label="Branch">
              <BaseInput v-model="branch" name="branch" placeholder="main" />
            </BaseField>
          </template>

          <template v-else-if="mode === 'image'">
            <BaseField label="Image">
              <BaseInput v-model="image" name="image" placeholder="ghcr.io/acme/web:latest" />
            </BaseField>
          </template>

          <template v-else-if="mode === 'easy'">
            <BaseField label="Template">
              <BaseInput v-model="templateQuery" name="template-search" placeholder="Search templates" />
            </BaseField>
            <ul class="template-list" role="listbox" aria-label="Templates">
              <li v-for="t in filteredTemplates" :key="t.id">
                <button
                  type="button"
                  role="option"
                  :aria-selected="templateId === t.id"
                  :class="{ active: templateId === t.id }"
                  @click="pickTemplate(t)"
                >
                  <img v-if="t.logo" :src="t.logo" alt="" width="18" height="18" loading="lazy" />
                  <span class="template-name">{{ t.name }}</span>
                  <span class="template-desc">{{ t.description }}</span>
                </button>
              </li>
              <li v-if="!filteredTemplates.length" class="muted">No template matches.</li>
            </ul>
          </template>

          <template v-else>
            <BaseField label="docker-compose.yml">
              <textarea
                v-model="composeContent"
                name="compose"
                class="form-input compose-input"
                spellcheck="false"
                rows="12"
              />
            </BaseField>
          </template>

          <BaseField label="Name" :hint="nameError || 'Lowercase letters, numbers and hyphens.'">
            <BaseInput v-model="name" name="name" placeholder="my-app" @update:model-value="nameTouched = true" />
          </BaseField>

          <p v-if="generatedDomain && !customDomain" class="domain-note">
            Served at <strong>{{ generatedDomain }}</strong>
          </p>

          <details class="advanced">
            <summary>Advanced</summary>
            <div class="advanced-body">
              <BaseField v-if="mode !== 'compose'" label="Container port">
                <BaseInput v-model="port" name="port" type="number" />
              </BaseField>
              <BaseField label="Domain" :hint="generatedDomain ? 'Leave empty to use the generated one.' : undefined">
                <BaseInput v-model="customDomain" name="domain" placeholder="app.example.com" />
              </BaseField>
              <template v-if="mode === 'git'">
                <BaseField label="Subdirectory">
                  <BaseInput v-model="subpath" name="subpath" placeholder="apps/web" />
                </BaseField>
                <BaseField v-if="sourceCredentials.length" label="Repository access">
                  <select v-model="gitCredentialId" name="git-credential" class="form-input">
                    <option value="">Public, or a token below</option>
                    <option v-for="c in sourceCredentials" :key="c.id" :value="c.id">{{ c.name }}</option>
                  </select>
                </BaseField>
                <BaseField
                  v-if="!gitCredentialId"
                  label="Access token"
                  :hint="
                    saveToken
                      ? 'For a private repository.'
                      : 'For a private repository. Used once to clone, not stored.'
                  "
                >
                  <BaseInput v-model="token" name="token" type="password" autocomplete="off" />
                </BaseField>
                <label v-if="!gitCredentialId && token" class="check">
                  <input v-model="saveToken" type="checkbox" name="save-token" />
                  Save this token for later deploys
                </label>
                <label class="check">
                  <input v-model="autoDeploy" type="checkbox" name="auto-deploy" />
                  Deploy on every push
                </label>
              </template>
              <BaseField label="Environment variables" hint="One KEY=value per line.">
                <textarea
                  v-model="envText"
                  name="env"
                  class="form-input env-input"
                  spellcheck="false"
                  rows="4"
                  placeholder="NODE_ENV=production"
                />
              </BaseField>
              <label class="check">
                <input v-model="autoStart" type="checkbox" name="auto-start" />
                Start after creating
              </label>
              <fieldset class="section">
                <legend>More domains</legend>
                <div v-for="(d, i) in extraDomains" :key="i" class="row-fields">
                  <BaseInput v-model="d.domain" :name="`extra-domain-${i}`" placeholder="admin.example.com" />
                  <BaseInput v-model="d.service" :name="`extra-service-${i}`" placeholder="service" />
                  <BaseInput
                    v-model="d.containerPort"
                    class="port-field"
                    :name="`extra-port-${i}`"
                    type="number"
                    placeholder="80"
                  />
                  <button
                    type="button"
                    class="icon-button"
                    aria-label="Remove domain"
                    @click="extraDomains.splice(i, 1)"
                  >
                    <Icon name="x" :size="14" />
                  </button>
                </div>
                <button
                  type="button"
                  class="link-button"
                  @click="extraDomains.push({ domain: '', service: '', containerPort: 80 })"
                >
                  <Icon name="plus" :size="13" />Add a domain
                </button>
              </fieldset>

              <fieldset class="section">
                <legend>Database</legend>
                <select v-model="dbMode" name="db-mode" class="form-input" aria-label="Database">
                  <option value="none">None</option>
                  <option value="shared">A database on the shared server</option>
                  <option value="existing" :disabled="!dbContainers.length">An existing database container</option>
                </select>
                <template v-if="dbMode === 'existing'">
                  <select v-model="dbContainer" name="db-container" class="form-input" aria-label="Database container">
                    <option v-for="c in dbContainers" :key="c.name" :value="c.name">
                      {{ c.name }} ({{ c.image }})
                    </option>
                  </select>
                  <div class="row-fields">
                    <BaseInput v-model="dbName" name="db-name" placeholder="database" />
                    <BaseInput v-model="dbUser" name="db-user" placeholder="user" />
                    <BaseInput v-model="dbPassword" name="db-password" type="password" placeholder="password" />
                  </div>
                </template>
              </fieldset>

              <fieldset v-if="mode !== 'git'" class="section">
                <legend>Registry login</legend>
                <select v-model="registryMode" name="registry-mode" class="form-input" aria-label="Registry login">
                  <option value="">Public image</option>
                  <option v-for="c in registryCredentials" :key="c.id" :value="c.id">
                    {{ c.name }} ({{ c.username }})
                  </option>
                  <option value="new">Sign in with a username and token</option>
                </select>
                <div v-if="registryMode === 'new'" class="row-fields">
                  <BaseInput v-model="registryUser" name="registry-user" placeholder="username" autocomplete="off" />
                  <BaseInput
                    v-model="registryPassword"
                    name="registry-password"
                    type="password"
                    placeholder="token"
                    autocomplete="off"
                  />
                </div>
                <label v-if="registryMode === 'new'" class="check">
                  <input v-model="registrySave" type="checkbox" name="registry-save" />
                  Save this login for later deployments
                </label>
              </fieldset>
            </div>
          </details>
        </form>
      </div>
    </div>

    <template #footer>
      <div class="panel-actions">
        <p v-if="summary" class="deploy-summary">
          Deploys <strong>{{ name }}</strong> from <span>{{ summary }}</span>
        </p>
        <BaseButton :disabled="creating" @click="emit('close')">Cancel</BaseButton>
        <BaseButton
          type="submit"
          form="new-deployment-form"
          variant="primary"
          icon="rocket"
          :loading="creating"
          :disabled="!canSubmit"
        >
          Deploy
        </BaseButton>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseField from "@/components/base/BaseField.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import Icon from "@/components/base/Icon.vue";
import {
  containersApi,
  credentialsApi,
  deploymentsApi,
  settingsApi,
  sourceCredentialsApi,
  templatesApi,
  type SourceCredential,
} from "@/services/api";
import type { RegistryCredential } from "@/types";
import { rememberDeploymentJob } from "@/composables/useDeploymentJob";
import { useNotificationsStore } from "@/stores/notifications";
import {
  NAME_PATTERN,
  buildCreatePayload,
  composeFromImage,
  suggestName,
  type CreateMode,
  type DatabaseChoice,
  type ExtraDomain,
  type RegistryLogin,
} from "@/deploy/createPayload";

interface TemplateSummary {
  id: string;
  name: string;
  description?: string;
  logo?: string;
  category?: string;
  container_port?: number;
  mounts?: { id: string; required: boolean; type: "file" | "volume" }[];
}

const props = defineProps<{ visible: boolean; initialMode?: CreateMode }>();
const emit = defineEmits<{
  (e: "close"): void;
  (e: "created", name: string): void;
  (e: "wizard", mode: CreateMode): void;
}>();

type SourceId = CreateMode | "github";

const SOURCES: { id: SourceId; label: string; hint: string; icon: string }[] = [
  { id: "github", label: "GitHub", hint: "Pick a repository", icon: "github" },
  { id: "git", label: "Git repository", hint: "Any repository URL", icon: "git-branch" },
  { id: "image", label: "Docker image", hint: "From a registry", icon: "box" },
  { id: "easy", label: "Template", hint: "A ready-made app", icon: "layout-template" },
  { id: "compose", label: "Compose file", hint: "Paste docker-compose.yml", icon: "file-code" },
];

const notifications = useNotificationsStore();

const mode = ref<CreateMode>(props.initialMode ?? "git");
const githubSelected = ref(false);
const selectedSource = computed<SourceId>(() => (githubSelected.value ? "github" : mode.value));

function selectSource(id: SourceId) {
  githubSelected.value = id === "github";
  if (id !== "github") mode.value = id;
}

const repoQuery = ref("");
const githubMissing = ref(false);

function connectGithub() {
  githubMissing.value = true;
}
const repoUrl = ref("");
const branch = ref("");
const subpath = ref("");
const token = ref("");
const autoDeploy = ref(true);
const image = ref("");
const composeContent = ref("");
const templateId = ref("");
const templateQuery = ref("");
const templates = ref<TemplateSummary[]>([]);
const name = ref("");
const nameTouched = ref(false);
const port = ref<string | number>(80);
const customDomain = ref("");
const generatedDomain = ref("");
const autoSsl = ref(false);
const proxyNetwork = ref("proxy");
const envText = ref("");
const autoStart = ref(true);
const existingNames = ref<string[]>([]);
const creating = ref(false);
const gitCredentialId = ref("");
const saveToken = ref(true);
const sourceCredentials = ref<SourceCredential[]>([]);
const extraDomains = ref<ExtraDomain[]>([]);
const dbMode = ref<"none" | "shared" | "existing">("none");
const dbContainers = ref<{ name: string; image: string; type: string }[]>([]);
const dbContainer = ref("");
const dbName = ref("");
const dbUser = ref("");
const dbPassword = ref("");
const registryCredentials = ref<RegistryCredential[]>([]);
const registryMode = ref("");
const registryUser = ref("");
const registryPassword = ref("");
const registrySave = ref(false);

function databaseType(image: string): string {
  const i = image.toLowerCase();
  if (i.includes("mariadb")) return "mariadb";
  if (i.includes("mysql")) return "mysql";
  if (i.includes("postgres")) return "postgres";
  if (i.includes("mongo")) return "mongodb";
  return "";
}

const database = computed<DatabaseChoice>(() => {
  if (dbMode.value === "shared") return { mode: "shared" };
  const container = dbContainers.value.find((c) => c.name === dbContainer.value);
  if (dbMode.value === "existing" && container) {
    return {
      mode: "existing",
      type: container.type,
      container: container.name,
      dbName: dbName.value.trim(),
      dbUser: dbUser.value.trim(),
      dbPassword: dbPassword.value,
    };
  }
  return { mode: "none" };
});

const registry = computed<RegistryLogin | undefined>(() => {
  if (mode.value === "git" || !registryMode.value) return undefined;
  if (registryMode.value !== "new") return { credentialId: registryMode.value };
  if (!registryUser.value.trim() || !registryPassword.value) return undefined;
  return { username: registryUser.value.trim(), password: registryPassword.value, save: registrySave.value };
});

const selectedTemplate = computed(() => templates.value.find((t) => t.id === templateId.value));

const filteredTemplates = computed(() => {
  const q = templateQuery.value.trim().toLowerCase();
  if (!q) return templates.value;
  return templates.value.filter((t) => [t.name, t.description, t.category].some((v) => v?.toLowerCase().includes(q)));
});

const sourceValue = computed(() => {
  if (mode.value === "git") return repoUrl.value;
  if (mode.value === "image") return image.value;
  if (mode.value === "easy") return templateId.value;
  return "";
});

watch(sourceValue, (value) => {
  if (!nameTouched.value) name.value = suggestName(value);
});

const nameError = computed(() => {
  if (!name.value) return "";
  if (!NAME_PATTERN.test(name.value)) return "Only lowercase letters, numbers and hyphens.";
  if (existingNames.value.includes(name.value)) return "A deployment with this name already exists.";
  return "";
});

const hasSource = computed(() => {
  if (mode.value === "compose") return composeContent.value.trim().length > 0;
  return sourceValue.value.trim().length > 0;
});

const canSubmit = computed(
  () => !githubSelected.value && !creating.value && hasSource.value && !!name.value && !nameError.value,
);

const summary = computed(() => {
  if (githubSelected.value || !name.value || !hasSource.value) return "";
  if (mode.value === "git") return branch.value ? `${repoUrl.value} (${branch.value})` : repoUrl.value;
  if (mode.value === "image") return image.value;
  if (mode.value === "easy") return selectedTemplate.value?.name ?? templateId.value;
  return "a compose file";
});

function pickTemplate(t: TemplateSummary) {
  templateId.value = t.id;
  if (t.container_port) port.value = t.container_port;
}

function parseEnv(text: string) {
  return text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#") && line.includes("="))
    .map((line) => {
      const i = line.indexOf("=");
      return { key: line.slice(0, i).trim(), value: line.slice(i + 1) };
    });
}

async function load() {
  const [deployments, settings, tpl, sourceCreds, registryCreds, containers] = await Promise.allSettled([
    deploymentsApi.list(),
    settingsApi.get(),
    templatesApi.list(),
    sourceCredentialsApi.list(),
    credentialsApi.list(),
    containersApi.list(),
  ]);
  if (sourceCreds.status === "fulfilled") sourceCredentials.value = sourceCreds.value.data.credentials || [];
  if (registryCreds.status === "fulfilled") registryCredentials.value = registryCreds.value.data.credentials || [];
  if (containers.status === "fulfilled") {
    dbContainers.value = (containers.value.data.containers || [])
      .map((c: { name: string; image: string }) => ({ name: c.name, image: c.image, type: databaseType(c.image) }))
      .filter((c: { type: string }) => c.type);
    if (!dbContainer.value && dbContainers.value.length) dbContainer.value = dbContainers.value[0].name;
  }
  if (deployments.status === "fulfilled") {
    existingNames.value = (deployments.value.data.deployments || []).map((d: { name: string }) => d.name);
  }
  if (tpl.status === "fulfilled") templates.value = tpl.value.data.templates || [];
  if (settings.status === "fulfilled") {
    const s = settings.value.data.settings;
    proxyNetwork.value = s?.infrastructure?.default_proxy_network || "proxy";
    autoSsl.value = Boolean(s?.domain?.auto_ssl);
    if (s?.domain?.default_domain) {
      try {
        const { data } = await settingsApi.generateSubdomain();
        generatedDomain.value = data.full_domain;
      } catch {
        generatedDomain.value = "";
      }
    }
  }
}

watch(
  () => props.visible,
  (open) => {
    if (!open) return;
    mode.value = props.initialMode ?? mode.value;
    githubSelected.value = false;
    load();
  },
  { immediate: true },
);

async function composeFor(containerPort: number): Promise<string> {
  if (mode.value === "compose") return composeContent.value;
  if (mode.value === "image")
    return composeFromImage(name.value, image.value.trim(), containerPort, proxyNetwork.value);
  if (mode.value === "easy") {
    const mounts = (selectedTemplate.value?.mounts || []).map((m) => ({ id: m.id, enabled: m.required, type: m.type }));
    const { data } = await templatesApi.generateCompose(templateId.value, {
      name: name.value,
      container_port: containerPort,
      map_ports: false,
      mounts: mounts.length ? mounts : undefined,
    });
    return data.content;
  }
  return "";
}

function repoLabel(url: string): string {
  const parts = url
    .trim()
    .replace(/\.git$/, "")
    .split(/[/:]/)
    .filter(Boolean);
  return parts.slice(-2).join("/") || name.value;
}

async function create() {
  if (!canSubmit.value) return;
  creating.value = true;
  try {
    const containerPort = Number(port.value) || 80;
    const domain = customDomain.value.trim() || generatedDomain.value;
    let credentialId = gitCredentialId.value;
    if (mode.value === "git" && !credentialId && token.value && saveToken.value) {
      const { data: saved } = await sourceCredentialsApi.create({ name: repoLabel(repoUrl.value), token: token.value });
      credentialId = saved.credential.id;
    }
    const payload = buildCreatePayload({
      mode: mode.value,
      name: name.value,
      composeContent: await composeFor(containerPort),
      templateId: mode.value === "easy" ? templateId.value : undefined,
      envVars: parseEnv(envText.value),
      autoStart: autoStart.value,
      containerPort,
      domain,
      ssl: Boolean(domain) && autoSsl.value,
      git:
        mode.value === "git"
          ? {
              repoUrl: repoUrl.value,
              branch: branch.value,
              subpath: subpath.value,
              autoDeploy: autoDeploy.value,
              token: credentialId ? undefined : token.value || undefined,
              credentialId: credentialId || undefined,
            }
          : undefined,
      extraDomains: extraDomains.value,
      database: database.value,
      registry: registry.value,
    });
    const { data } = await deploymentsApi.create(payload);
    if (data?.build_job_id) rememberDeploymentJob(name.value, data.build_job_id, "redeploy");
    emit("created", name.value);
  } catch (e: any) {
    notifications.error("Failed to create deployment", e.response?.data?.error || e.message);
  } finally {
    creating.value = false;
  }
}
</script>

<style scoped>
.new-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
}

.new-project {
  display: grid;
  grid-template-columns: 240px minmax(0, 1fr);
  min-height: 420px;
  max-height: 72vh;
}

.source-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  padding: var(--space-3);
  overflow-y: auto;
  border-right: 1px solid var(--border-subtle);
}

.source-list button {
  position: relative;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: 0;
  border-radius: var(--radius-md);
  color: var(--text-muted);
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.source-list button:hover {
  background: var(--surface-inset);
  color: var(--text);
}

.source-list button.active {
  background: var(--accent-subtle);
  color: var(--accent);
}

.source-list button.active::before {
  position: absolute;
  top: 6px;
  bottom: 6px;
  left: 0;
  width: 2px;
  border-radius: 2px;
  background: var(--accent);
  content: "";
}

.source-list button.active .source-label {
  color: var(--text);
}

.source-copy {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
}

.source-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.source-copy small {
  color: var(--text-subtle);
  font-size: var(--text-xs);
}

.source-pane {
  min-width: 0;
  overflow-y: auto;
}

.github-pane {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  padding: var(--space-5);
}

.gh-toolbar {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr);
  align-items: center;
  gap: var(--space-3);
}

.gh-account {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  height: var(--control-h);
  padding: 0 var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-md);
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.gh-repos {
  position: relative;
  min-height: 300px;
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.gh-placeholder {
  margin: 0;
  padding: 0;
  list-style: none;
  opacity: 0.6;
}

.gh-placeholder li {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--space-4);
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--border-subtle);
}

.gh-placeholder .bar {
  height: 8px;
  border-radius: 4px;
  background: var(--surface-inset);
}

.gh-placeholder .bar.short {
  width: 56px;
}

.gh-connect {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding: var(--space-5) var(--space-5) var(--space-6);
  background: linear-gradient(to bottom, transparent 10%, var(--surface-raised) 55%);
  text-align: center;
}

.gh-badge {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: var(--radius-xl);
  background: var(--accent-subtle);
  color: var(--accent);
}

.gh-connect h4 {
  margin: 0;
  color: var(--text);
  font-size: var(--text-lg);
}

.gh-connect p {
  max-width: 380px;
  margin: 0;
  color: var(--text-muted);
  line-height: 1.5;
}

.gh-connect .gh-missing {
  color: var(--text);
  font-size: var(--text-sm);
}

.gh-missing a {
  color: var(--accent);
}

.gh-options {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-5);
  color: var(--text-subtle);
}

.deploy-summary {
  min-width: 0;
  flex: 1;
  margin: 0;
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--text-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.deploy-summary strong {
  color: var(--text);
}

@media (max-width: 720px) {
  .new-project {
    grid-template-columns: 1fr;
    min-height: 0;
  }

  .source-list {
    flex-direction: row;
    overflow-x: auto;
    border-right: 0;
    border-bottom: 1px solid var(--border);
  }

  .source-copy small {
    display: none;
  }
}

.template-list {
  display: flex;
  max-height: 260px;
  flex-direction: column;
  gap: 1px;
  margin: calc(var(--space-2) * -1) 0 0;
  padding: 0;
  overflow-y: auto;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  list-style: none;
}

.template-list button {
  display: grid;
  width: 100%;
  grid-template-columns: 18px auto 1fr;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: transparent;
  border: 0;
  color: var(--text);
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.template-list button:hover,
.template-list button.active {
  background: var(--surface-inset);
}

.template-list button.active {
  box-shadow: inset 2px 0 0 var(--accent);
}

.template-name {
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  white-space: nowrap;
}

.template-desc {
  overflow: hidden;
  color: var(--text-muted);
  font-size: var(--text-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.template-list .muted {
  padding: var(--space-3);
}

.compose-input,
.env-input {
  min-height: 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  resize: vertical;
}

.domain-note {
  margin: calc(var(--space-2) * -1) 0 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.advanced {
  border-top: 1px solid var(--border);
  padding-top: var(--space-3);
}

.advanced summary {
  color: var(--text-muted);
  cursor: pointer;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.advanced-body {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
  margin-top: var(--space-4);
}

.check {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-base);
}

.link-button {
  align-self: flex-start;
  padding: 0;
  background: none;
  border: 0;
  color: var(--accent);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-sm);
}

.muted {
  color: var(--text-muted);
}

.panel-actions {
  display: flex;
  width: 100%;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-2);
}

.section {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin: 0;
  padding: var(--space-3) 0 0;
  border: 0;
  border-top: 1px solid var(--border-subtle);
}

.section legend {
  padding: 0;
  color: var(--text);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
}

.row-fields {
  display: flex;
  gap: var(--space-2);
}

.row-fields > * {
  min-width: 0;
  flex: 1;
}

.row-fields > .port-field {
  flex: 0 0 88px;
}

.icon-button {
  display: inline-grid;
  width: var(--control-h);
  flex: 0 0 auto;
  place-items: center;
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
}

.icon-button:hover {
  background: var(--surface-inset);
  color: var(--text);
}
</style>
