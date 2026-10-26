<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="!loading && emit('cancel')">
        <div class="domain-form-modal">
          <div class="modal-header">
            <h3>{{ domain ? "Edit Domain" : "Add Domain" }}</h3>
            <button class="close-btn" :disabled="loading" @click="emit('cancel')">
              <i class="pi pi-times" />
            </button>
          </div>

          <form class="modal-body" @submit.prevent="handleSubmit">
            <div class="form-group">
              <label>Domain <span class="required">*</span></label>
              <input v-model="form.domain" type="text" class="form-input" placeholder="api.example.com" required />
              <span class="hint">The primary domain name</span>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Service</label>
                <select v-model="form.service" class="form-select">
                  <option value="">Default ({{ deploymentName }})</option>
                  <option v-for="service in services" :key="service.name" :value="service.name">
                    {{ service.name }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>Container Port</label>
                <input
                  v-model.number="form.container_port"
                  type="number"
                  class="form-input"
                  placeholder="80"
                  min="1"
                  max="65535"
                />
              </div>
            </div>

            <div class="form-group">
              <label>Path Prefix</label>
              <input v-model="form.path_prefix" type="text" class="form-input" placeholder="/api/v1" />
              <span class="hint">Optional path prefix (e.g., /api/*)</span>
            </div>

            <div v-if="form.path_prefix" class="form-group checkbox-group">
              <label class="checkbox-label">
                <input v-model="form.strip_prefix" type="checkbox" />
                <span>Strip prefix before proxying</span>
              </label>
              <span class="hint">If enabled, /api/users will be sent to the backend as /users</span>
            </div>

            <div class="form-section">
              <h4>SSL Configuration</h4>

              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input v-model="form.ssl.enabled" type="checkbox" />
                  <span>Enable SSL (HTTPS)</span>
                </label>
              </div>

              <div v-if="form.ssl.enabled" class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input v-model="form.ssl.auto_cert" type="checkbox" />
                  <span>Auto-request Let's Encrypt certificate</span>
                </label>
              </div>
            </div>

            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input v-model="form.static_cache" type="checkbox" />
                <span>Cache static assets in the browser</span>
              </label>
              <span class="hint">
                Sets a long cache on static files (styles, scripts, images, fonts). Dynamic responses keep the app's own
                cache headers.
              </span>
            </div>

            <div ref="requestsSection" class="form-section">
              <h4>Requests</h4>

              <div class="form-group">
                <label for="upload-limit-amount">Maximum upload request size</label>
                <div class="size-input">
                  <input
                    id="upload-limit-amount"
                    ref="uploadAmountInput"
                    v-model.trim="form.upload_amount"
                    type="text"
                    inputmode="numeric"
                    class="form-input"
                    :class="{ invalid: uploadLimitError }"
                    placeholder="Server default"
                  />
                  <select v-model="form.upload_unit" class="form-select" aria-label="Upload size unit">
                    <option value="k">KB</option>
                    <option value="m">MB</option>
                    <option value="g">GB</option>
                  </select>
                </div>
                <span v-if="uploadLimitError" class="field-error">{{ uploadLimitError }}</span>
                <span class="hint">
                  The largest request this domain accepts; larger ones are refused with HTTP 413. Set it above your
                  app's per-file upload limit: a multipart upload wraps each file in boundaries and other form fields,
                  so allow about 10% extra (for 100 MB files, use 110 MB). PHP apps also enforce
                  <code>upload_max_filesize</code> and <code>post_max_size</code>. Leave empty for the server default,
                  or enter 0 for no limit.
                </span>
              </div>

              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input v-model="form.upload_limit_page" type="checkbox" />
                  <span>Show the limit when an upload is refused</span>
                </label>
                <span class="hint">
                  Visitors see a page stating the limit instead of the plain 413 response, and API clients get JSON.
                  Leave this off if a client of this app expects the plain response. Errors sent by the app itself are
                  never changed.
                </span>
              </div>

              <div class="form-group">
                <label for="proxy-timeout">Proxy timeout (seconds)</label>
                <input
                  id="proxy-timeout"
                  v-model.number="form.proxy_timeout"
                  type="number"
                  class="form-input"
                  placeholder="60"
                  min="1"
                  max="86400"
                />
                <span class="hint">
                  How long the proxy waits for the app to answer, and how long an idle WebSocket stays open. Default 60.
                </span>
              </div>
            </div>

            <div class="form-section">
              <h4>Visitor Access</h4>

              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input v-model="form.access.enabled" type="checkbox" />
                  <span>Require email verification</span>
                </label>
                <span class="hint">Protects this domain and path without changing the application.</span>
              </div>

              <template v-if="form.access.enabled">
                <BaseField label="Who can sign in">
                  <BaseSelect v-model="form.access.mode">
                    <option value="allowlist">Only listed email addresses</option>
                    <option value="any_verified">Anyone with a verified email</option>
                  </BaseSelect>
                </BaseField>

                <BaseField
                  v-if="form.access.mode === 'allowlist'"
                  label="Allowed emails and domains"
                  hint="Enter an email or @domain on each line, or separate entries with commas."
                >
                  <BaseTextarea
                    v-model="form.access.allowed_emails"
                    :rows="4"
                    placeholder="person@example.com&#10;@flatrun.dev"
                  />
                </BaseField>

                <BaseField
                  label="Sign-in method"
                  hint="What the email contains. A code lets people read it on another device."
                >
                  <BaseSelect v-model="form.access.method">
                    <option value="">Code and link</option>
                    <option value="code">Code only</option>
                    <option value="link">Link only</option>
                  </BaseSelect>
                </BaseField>

                <BaseField label="Email delivery target" hint="FlatRun sends sign-in emails through this SMTP target.">
                  <BaseSelect v-model="form.access.email_target_id" required>
                    <option value="" disabled>Select an email target</option>
                    <option v-for="target in emailTargets" :key="target.id" :value="target.id">
                      {{ target.name }}
                    </option>
                  </BaseSelect>
                </BaseField>

                <BaseField label="Session length" hint="Hours before a visitor must verify again.">
                  <BaseInput v-model.number="form.access.session_hours" type="number" min="1" max="720" />
                </BaseField>
              </template>
            </div>

            <div class="form-group">
              <label>Domain Aliases</label>
              <div class="aliases-input">
                <div v-for="(alias, index) in form.aliases" :key="index" class="alias-item">
                  <input v-model="form.aliases[index]" type="text" class="form-input" placeholder="www.example.com" />
                  <button type="button" class="remove-btn" @click="removeAlias(index)">
                    <i class="pi pi-times" />
                  </button>
                </div>
                <button type="button" class="btn btn-sm btn-secondary" @click="addAlias">
                  <i class="pi pi-plus" />
                  Add Alias
                </button>
              </div>
              <span class="hint">Additional domain names that should also resolve here</span>
            </div>

            <div class="form-group">
              <label>Routing-only hostnames</label>
              <div class="aliases-input">
                <div v-for="(alias, index) in form.route_only_aliases" :key="index" class="alias-item">
                  <input
                    v-model="form.route_only_aliases[index]"
                    type="text"
                    class="form-input"
                    placeholder="dashboard.example.com"
                  />
                  <button type="button" class="remove-btn" @click="removeRouteOnly(index)">
                    <i class="pi pi-times" />
                  </button>
                </div>
                <button type="button" class="btn btn-sm btn-secondary" @click="addRouteOnly">
                  <i class="pi pi-plus" />
                  Add hostname
                </button>
              </div>
              <span class="hint">
                Routed here but never issued a certificate, for a hostname whose TLS is terminated by an external proxy
                (e.g. Cloudflare). It shares this domain's certificate over the proxy's SNI.
              </span>
            </div>
          </form>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" :disabled="loading" @click="emit('cancel')">Cancel</button>
            <button type="button" class="btn btn-primary" :disabled="loading || !isValid" @click="handleSubmit">
              <i v-if="loading" class="pi pi-spin pi-spinner" />
              {{ domain ? "Update" : "Add Domain" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import type { DomainConfig, Service } from "@/types";
import { notificationsApi, type NotificationTarget } from "@/services/api";
import BaseField from "@/components/base/BaseField.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";
import BaseTextarea from "@/components/base/BaseTextarea.vue";

const props = defineProps<{
  visible: boolean;
  domain?: DomainConfig | null;
  services: Service[];
  deploymentName: string;
  loading?: boolean;
  focus?: "upload-limit" | null;
}>();

const emit = defineEmits<{
  save: [domain: DomainConfig];
  cancel: [];
}>();

const form = ref<{
  domain: string;
  service: string;
  container_port: number;
  path_prefix: string;
  strip_prefix: boolean;
  ssl: { enabled: boolean; auto_cert: boolean };
  aliases: string[];
  route_only_aliases: string[];
  static_cache: boolean;
  upload_amount: string;
  upload_unit: "k" | "m" | "g";
  upload_limit_page: boolean;
  proxy_timeout: number | "";
  access: {
    enabled: boolean;
    mode: "allowlist" | "any_verified";
    allowed_emails: string;
    email_target_id: string;
    session_hours: number;
    method: "" | "link" | "code";
  };
}>({
  domain: "",
  service: "",
  container_port: 80,
  path_prefix: "",
  strip_prefix: false,
  ssl: { enabled: false, auto_cert: false },
  aliases: [],
  route_only_aliases: [],
  static_cache: false,
  ...emptyRequestSettings(),
  access: { enabled: false, mode: "allowlist", allowed_emails: "", email_target_id: "", session_hours: 24, method: "" },
});

const requestsSection = ref<HTMLElement | null>(null);
const uploadAmountInput = ref<HTMLInputElement | null>(null);

function emptyRequestSettings() {
  return {
    upload_amount: "",
    upload_unit: "m" as const,
    upload_limit_page: false,
    proxy_timeout: "" as const,
  };
}

function splitBodySize(size?: string): { upload_amount: string; upload_unit: "k" | "m" | "g" } {
  const match = /^(\d+)([kmg]?)$/i.exec(size || "");
  if (!match) return { upload_amount: "", upload_unit: "m" };
  if (!match[2]) {
    const bytes = Number(match[1]);
    if (bytes === 0) return { upload_amount: "0", upload_unit: "m" };
    if (bytes % 2 ** 20 === 0) return { upload_amount: String(bytes / 2 ** 20), upload_unit: "m" };
    return { upload_amount: String(Math.ceil(bytes / 1024)), upload_unit: "k" };
  }
  return { upload_amount: match[1], upload_unit: match[2].toLowerCase() as "k" | "m" | "g" };
}

function bodySize(): string | undefined {
  const amount = form.value.upload_amount;
  if (amount === "") return undefined;
  return amount === "0" ? "0" : `${amount}${form.value.upload_unit}`;
}

const emailTargets = ref<Pick<NotificationTarget, "id" | "name">[]>([]);

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      void loadEmailTargets();
      if (props.domain) {
        form.value = {
          domain: props.domain.domain || "",
          service: props.domain.service || "",
          container_port: props.domain.container_port || 80,
          path_prefix: props.domain.path_prefix || "",
          strip_prefix: props.domain.strip_prefix || false,
          ssl: {
            enabled: props.domain.ssl?.enabled || false,
            auto_cert: props.domain.ssl?.auto_cert || false,
          },
          aliases: [...(props.domain.aliases || [])],
          route_only_aliases: [...(props.domain.route_only_aliases || [])],
          static_cache: props.domain.static_cache || false,
          ...splitBodySize(props.domain.client_max_body_size),
          upload_limit_page: props.domain.upload_limit_page || false,
          proxy_timeout: props.domain.proxy_timeout || "",
          access: {
            enabled: props.domain.access?.enabled || false,
            mode: props.domain.access?.mode || "allowlist",
            allowed_emails: (props.domain.access?.allowed_emails || []).join("\n"),
            email_target_id: props.domain.access?.email_target_id || "",
            session_hours: props.domain.access?.session_hours || 24,
            method: props.domain.access?.method || "",
          },
        };
      } else {
        form.value = {
          domain: "",
          service: "",
          container_port: 80,
          path_prefix: "",
          strip_prefix: false,
          ssl: { enabled: false, auto_cert: false },
          aliases: [],
          route_only_aliases: [],
          static_cache: false,
          ...emptyRequestSettings(),
          access: {
            enabled: false,
            mode: "allowlist",
            allowed_emails: "",
            email_target_id: "",
            session_hours: 24,
            method: "",
          },
        };
      }
      if (props.focus === "upload-limit") {
        void nextTick(() => {
          requestsSection.value?.scrollIntoView({ block: "start", behavior: "smooth" });
          uploadAmountInput.value?.focus();
        });
      }
    }
  },
  { immediate: true },
);

const uploadLimitError = computed(() => {
  const amount = form.value.upload_amount;
  if (amount === "") return "";
  if (!/^\d+$/.test(amount)) return "Enter a whole number, or leave it empty for the server default.";
  const shift = { k: 10, m: 20, g: 30 }[form.value.upload_unit];
  if (Number(amount) * 2 ** shift > 10 * 2 ** 30) return "The largest limit is 10 GB.";
  return "";
});

const isValid = computed(() => {
  if (form.value.domain.trim() === "") return false;
  if (uploadLimitError.value) return false;
  if (!form.value.access.enabled) return true;
  if (!form.value.access.email_target_id) return false;
  if (form.value.access.session_hours < 1 || form.value.access.session_hours > 720) return false;
  if (form.value.access.mode === "allowlist") return accessEmails().length > 0;
  return true;
});

async function loadEmailTargets() {
  try {
    const response = await notificationsApi.getAccessEmailTargets(props.deploymentName);
    emailTargets.value = response.data.targets || [];
  } catch {
    emailTargets.value = [];
  }
}

function accessEmails() {
  return form.value.access.allowed_emails
    .split(/[\n,]/)
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

function addAlias() {
  form.value.aliases.push("");
}

function removeAlias(index: number) {
  form.value.aliases.splice(index, 1);
}

function addRouteOnly() {
  form.value.route_only_aliases.push("");
}

function removeRouteOnly(index: number) {
  form.value.route_only_aliases.splice(index, 1);
}

function handleSubmit() {
  if (!isValid.value) return;

  const domainData: DomainConfig = {
    id: props.domain?.id || "",
    domain: form.value.domain.trim(),
    service: form.value.service,
    container_port: form.value.container_port || 80,
    path_prefix: form.value.path_prefix.trim() || undefined,
    strip_prefix: form.value.strip_prefix || undefined,
    ssl: form.value.ssl,
    aliases: form.value.aliases.filter((a) => a.trim() !== ""),
    route_only_aliases: form.value.route_only_aliases.filter((a) => a.trim() !== ""),
    static_cache: form.value.static_cache || undefined,
    client_max_body_size: bodySize(),
    upload_limit_page: form.value.upload_limit_page || undefined,
    proxy_timeout: form.value.proxy_timeout || undefined,
    access: form.value.access.enabled
      ? {
          enabled: true,
          mode: form.value.access.mode,
          allowed_emails: form.value.access.mode === "allowlist" ? accessEmails() : undefined,
          email_target_id: form.value.access.email_target_id,
          session_hours: form.value.access.session_hours || 24,
          method: form.value.access.method || undefined,
        }
      : undefined,
  };

  emit("save", domainData);
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.domain-form-modal {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  width: 520px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.2s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
}

.modal-header h3 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--text);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--surface-inset);
  color: var(--text);
}

.modal-body {
  padding: var(--space-5);
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: var(--space-4);
}

.form-group label {
  display: block;
  margin-bottom: var(--space-1);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  color: var(--text);
}

.required {
  color: var(--color-danger-500);
}

.form-input,
.form-select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  font-size: var(--text-md);
  transition: border-color var(--transition-base);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.hint {
  display: block;
  margin-top: var(--space-1);
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.hint code {
  font-family: var(--font-mono);
  font-size: 0.95em;
}

.size-input {
  display: grid;
  grid-template-columns: 1fr auto;
  gap: var(--space-2);
}

.size-input .form-select {
  width: auto;
}

.form-input.invalid {
  border-color: var(--color-danger-500);
}

.field-error {
  display: block;
  margin-top: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-danger-500);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.form-section {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--border-subtle);
}

.form-section h4 {
  margin: 0 0 var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--text);
}

.checkbox-group {
  margin-bottom: var(--space-2);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary-500);
}

.checkbox-label span {
  font-weight: normal;
}

.aliases-input {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.alias-item {
  display: flex;
  gap: var(--space-2);
}

.alias-item .form-input {
  flex: 1;
}

.remove-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--border);
  background: var(--surface);
  color: var(--text-muted);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.remove-btn:hover {
  background: var(--color-danger-50);
  border-color: var(--color-danger-300);
  color: var(--color-danger-600);
}

.modal-footer {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border-subtle);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  font-weight: var(--font-medium);
  font-size: var(--text-md);
  cursor: pointer;
  transition: all var(--transition-base);
  border: none;
}

.btn-sm {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-sm);
}

.btn-secondary {
  background: var(--surface-inset);
  color: var(--text);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--border);
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-600);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
