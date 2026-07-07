<template>
  <div class="storage-settings">
    <!-- S3 credentials -->
    <div class="settings-card">
      <div class="card-header">
        <h3><Icon name="key-round" :size="16" /> Object storage credentials</h3>
      </div>
      <div class="card-body">
        <p class="hint">
          Access keys for S3-compatible storage (AWS S3, Cloudflare R2, Backblaze B2, MinIO). Secrets are stored on the
          agent and never shown again after saving.
        </p>

        <div v-if="loadingCreds" class="muted"><Icon name="loader-circle" spin :size="18" /></div>

        <div v-else class="row-list">
          <div v-for="c in creds" :key="c.id" class="item-row">
            <div class="item-summary">
              <span class="i-name">{{ c.name }}</span>
              <span class="i-tag">{{ c.data.access_key_id || "s3" }}</span>
            </div>
            <button v-if="canDeleteCreds" class="btn btn-ghost danger" title="Delete" @click="deleteCredential(c)">
              <Icon name="trash-2" :size="14" />
            </button>
          </div>
          <p v-if="!creds.length" class="muted">No credentials yet.</p>
        </div>

        <div v-if="canWriteCreds" class="add-panel">
          <div class="add-title">Add credential</div>
          <div class="field">
            <label>Name</label>
            <input v-model="credForm.name" placeholder="e.g. prod-r2" />
          </div>
          <div class="grid2">
            <div class="field">
              <label>Access key ID</label>
              <input v-model="credForm.access_key_id" placeholder="AKIA…" />
            </div>
            <div class="field">
              <label>Secret access key</label>
              <input v-model="credForm.secret_access_key" type="password" placeholder="••••••••" />
            </div>
          </div>
          <div class="add-actions">
            <button class="btn btn-secondary" :disabled="!canSubmitCred || savingCred" @click="addCredential">
              <Icon v-if="savingCred" name="loader-circle" spin :size="14" />
              <Icon v-else name="plus" :size="14" />
              Add
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Backup destinations -->
    <div class="settings-card">
      <div class="card-header">
        <h3><Icon name="cloud-upload" :size="16" /> Remote backup destinations</h3>
      </div>
      <div class="card-body">
        <p class="hint">
          Backups are always written locally first, then mirrored to each enabled destination. A destination references
          one of the credentials above.
        </p>

        <div v-if="loadingDests" class="muted"><Icon name="loader-circle" spin :size="18" /></div>

        <div v-else class="row-list">
          <div v-for="(d, i) in dests" :key="i" class="item-row">
            <input v-model="d.enabled" type="checkbox" :disabled="!canWriteDests" title="Enabled" />
            <div class="item-summary">
              <span class="i-name">{{ d.name || "Untitled" }}</span>
              <span class="i-tag">{{ d.bucket }}</span>
              <span class="i-muted">{{ credName(d.credential_id) }}</span>
            </div>
            <button class="btn btn-ghost" :disabled="testing === i" @click="testDestination(d, i)">
              <Icon v-if="testing === i" name="loader-circle" spin :size="14" />
              <Icon v-else name="plug" :size="14" />
              Test
            </button>
            <button v-if="canWriteDests" class="btn btn-ghost danger" title="Remove" @click="removeDestination(i)">
              <Icon name="trash-2" :size="14" />
            </button>
          </div>
          <p v-if="!dests.length" class="muted">No destinations. Backups stay local only.</p>
        </div>

        <div v-if="canWriteDests" class="add-panel">
          <div class="add-title">Add destination</div>
          <div class="grid2">
            <div class="field"><label>Name</label><input v-model="destForm.name" placeholder="s3-prod" /></div>
            <div class="field">
              <label>Credential</label>
              <select v-model="destForm.credential_id">
                <option value="" disabled>Select a credential</option>
                <option v-for="c in creds" :key="c.id" :value="c.id">{{ c.name }}</option>
              </select>
            </div>
          </div>
          <div class="grid2">
            <div class="field">
              <label>Endpoint</label
              ><input v-model="destForm.endpoint" placeholder="https://s3.us-east-1.amazonaws.com" />
            </div>
            <div class="field"><label>Region</label><input v-model="destForm.region" placeholder="us-east-1" /></div>
          </div>
          <div class="grid2">
            <div class="field">
              <label>Bucket</label><input v-model="destForm.bucket" placeholder="flatrun-backups" />
            </div>
            <div class="field">
              <label>Prefix (optional)</label><input v-model="destForm.prefix" placeholder="agent-01" />
            </div>
          </div>
          <label class="checkbox-line">
            <input v-model="destForm.use_path_style" type="checkbox" />
            Use path-style addressing (required by MinIO and some providers)
          </label>
          <div class="add-actions">
            <button class="btn btn-secondary" :disabled="!canSubmitDest" @click="addDestination">
              <Icon name="plus" :size="14" /> Add
            </button>
          </div>
        </div>
      </div>

      <div v-if="canWriteDests" class="save-footer">
        <span v-if="savedNote" class="saved-note"><Icon name="check" :size="14" /> Saved</span>
        <button class="btn btn-primary" :disabled="savingDests" @click="saveDestinations">
          <Icon v-if="savingDests" name="loader-circle" spin :size="14" />
          Save destinations
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import Icon from "@/components/base/Icon.vue";
import {
  storageCredentialsApi,
  backupDestinationsApi,
  configApi,
  type StorageCredential,
  type BackupDestination,
} from "@/services/api";
import { useAuthStore } from "@/stores/auth";
import { useNotificationsStore } from "@/stores/notifications";

const auth = useAuthStore();
const notifications = useNotificationsStore();
const canWriteCreds = auth.hasPermission("backups:write");
const canDeleteCreds = auth.hasPermission("backups:delete");
const canWriteDests = auth.hasPermission("config:write");

const creds = ref<StorageCredential[]>([]);
const dests = ref<BackupDestination[]>([]);
const loadingCreds = ref(true);
const loadingDests = ref(true);
const savingCred = ref(false);
const savingDests = ref(false);
const savedNote = ref(false);
const testing = ref<number | null>(null);

const credForm = reactive({ name: "", access_key_id: "", secret_access_key: "" });
const destForm = reactive({
  name: "",
  endpoint: "",
  region: "",
  bucket: "",
  prefix: "",
  credential_id: "",
  use_path_style: false,
});

const canSubmitCred = computed(
  () => credForm.name.trim() && credForm.access_key_id.trim() && credForm.secret_access_key.trim(),
);
const canSubmitDest = computed(() => destForm.name.trim() && destForm.bucket.trim() && destForm.credential_id);

function credName(id: string): string {
  return creds.value.find((c) => c.id === id)?.name || "missing credential";
}

async function loadCreds() {
  loadingCreds.value = true;
  try {
    const res = await storageCredentialsApi.list("s3");
    creds.value = res.data.credentials || [];
  } catch {
    creds.value = [];
  } finally {
    loadingCreds.value = false;
  }
}

async function loadDests() {
  loadingDests.value = true;
  try {
    const res = await configApi.get("backup.destinations");
    const value = (res.data.entry?.value as BackupDestination[]) || [];
    dests.value = value.map((d) => ({ ...d, enabled: d.enabled !== false }));
  } catch {
    dests.value = [];
  } finally {
    loadingDests.value = false;
  }
}

async function addCredential() {
  if (!canSubmitCred.value) return;
  savingCred.value = true;
  try {
    await storageCredentialsApi.create({
      name: credForm.name.trim(),
      kind: "s3",
      data: { access_key_id: credForm.access_key_id.trim(), secret_access_key: credForm.secret_access_key },
    });
    credForm.name = "";
    credForm.access_key_id = "";
    credForm.secret_access_key = "";
    await loadCreds();
  } catch (e: any) {
    notifications.error("Could not add credential", e.response?.data?.error || e.message);
  } finally {
    savingCred.value = false;
  }
}

async function deleteCredential(c: StorageCredential) {
  try {
    await storageCredentialsApi.delete(c.id);
    await loadCreds();
  } catch (e: any) {
    notifications.error("Could not delete credential", e.response?.data?.error || e.message);
  }
}

function addDestination() {
  if (!canSubmitDest.value) return;
  dests.value.push({
    name: destForm.name.trim(),
    type: "s3",
    endpoint: destForm.endpoint.trim(),
    region: destForm.region.trim(),
    bucket: destForm.bucket.trim(),
    prefix: destForm.prefix.trim(),
    credential_id: destForm.credential_id,
    use_path_style: destForm.use_path_style,
    enabled: true,
  });
  destForm.name = "";
  destForm.endpoint = "";
  destForm.region = "";
  destForm.bucket = "";
  destForm.prefix = "";
  destForm.credential_id = "";
  destForm.use_path_style = false;
}

function removeDestination(i: number) {
  dests.value.splice(i, 1);
}

async function saveDestinations() {
  savingDests.value = true;
  savedNote.value = false;
  try {
    await configApi.set("backup.destinations", dests.value);
    savedNote.value = true;
    setTimeout(() => (savedNote.value = false), 2000);
  } catch (e: any) {
    notifications.error("Save failed", e.response?.data?.error || e.message);
  } finally {
    savingDests.value = false;
  }
}

async function testDestination(d: BackupDestination, i: number) {
  testing.value = i;
  try {
    const res = await backupDestinationsApi.test(d);
    if (res.data.success) {
      notifications.success("Destination reachable", res.data.message || "Write and delete succeeded.");
    } else {
      notifications.error("Destination unreachable", res.data.error || "Test failed.");
    }
  } catch (e: any) {
    notifications.error("Destination unreachable", e.response?.data?.error || e.message);
  } finally {
    testing.value = null;
  }
}

onMounted(() => {
  loadCreds();
  loadDests();
});
</script>

<style scoped>
.storage-settings {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.hint {
  font-size: var(--text-sm);
  color: var(--text-muted);
  margin: 0 0 var(--space-4) 0;
}

.row-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.item-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.item-summary {
  flex: 1;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  min-width: 0;
}

.i-name {
  font-weight: var(--font-medium);
  color: var(--text);
  font-size: var(--text-sm);
}

.i-tag {
  font-size: var(--text-xs);
  padding: 0.05rem 0.4rem;
  border-radius: var(--radius-full);
  background: var(--surface-inset);
  color: var(--text-muted);
}

.i-muted {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.add-panel {
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: var(--space-4);
  background: var(--surface-sunken);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.add-title {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--text);
}

.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.field {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.field label {
  font-size: var(--text-xs);
  color: var(--text-muted);
}

.field input,
.field select {
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--surface);
  color: var(--text);
  font-size: var(--text-sm);
}

.checkbox-line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.add-actions {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: var(--space-2) var(--space-3);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  cursor: pointer;
  border: 1px solid transparent;
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:disabled {
  opacity: 0.6;
}

.btn-secondary {
  background: var(--surface-inset);
  color: var(--text);
}

.btn-secondary:disabled {
  opacity: 0.6;
}

.btn-ghost {
  background: none;
  border: 1px solid var(--border);
  color: var(--text-muted);
}

.btn-ghost.danger:hover {
  color: var(--color-danger-600, #dc2626);
}

.save-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-3);
}

.saved-note {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  color: var(--color-success-600);
  font-size: var(--text-sm);
}

.muted {
  color: var(--text-muted);
  font-size: var(--text-sm);
  margin: var(--space-2) 0;
}
</style>
