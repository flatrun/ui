<template>
  <div class="storage-settings">
    <!-- S3 credentials -->
    <BaseCard title="Object storage credentials" icon="key-round">
      <template #actions>
        <BaseButton v-if="canWriteCreds" variant="secondary" size="sm" icon="plus" @click="openCredModal">
          Add
        </BaseButton>
      </template>

      <p class="hint">
        Access keys for S3-compatible storage (AWS S3, Cloudflare R2, Backblaze B2, MinIO). Secrets are stored on the
        agent and never shown again after saving.
      </p>

      <div v-if="loadingCreds" class="muted"><Icon name="loader-circle" spin :size="18" /></div>

      <div v-else class="row-list">
        <div v-for="c in creds" :key="c.id" class="item-row">
          <Icon name="key-round" :size="15" class="row-icon" />
          <div class="item-summary">
            <span class="i-name">{{ c.name }}</span>
            <span class="i-tag">{{ c.data.access_key_id || "s3" }}</span>
          </div>
          <BaseButton v-if="canDeleteCreds" variant="ghost" icon="trash-2" @click="deleteCredential(c)" />
        </div>
        <p v-if="!creds.length" class="muted">No credentials yet.</p>
      </div>
    </BaseCard>

    <!-- Backup destinations -->
    <BaseCard title="Remote backup destinations" icon="cloud-upload">
      <template #actions>
        <BaseButton v-if="canWriteDests" variant="secondary" size="sm" icon="plus" @click="openDestModal"
          >Add</BaseButton
        >
      </template>

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
            <span class="i-kind" :class="storeKind(d)">{{ storeKind(d) === "managed" ? "Managed" : "External" }}</span>
            <span class="i-tag">{{ d.bucket }}</span>
            <span class="i-muted">{{ credName(d.credential_id) }}</span>
          </div>
          <BaseButton variant="ghost" icon="plug" :loading="testing === i" @click="testDestination(d, i)"
            >Test</BaseButton
          >
          <BaseButton v-if="canWriteDests" variant="ghost" icon="trash-2" @click="removeDestination(i)" />
        </div>
        <p v-if="!dests.length" class="muted">No destinations. Backups stay local only.</p>
      </div>

      <div v-if="canWriteDests && dests.length" class="save-footer">
        <span v-if="savedNote" class="saved-note"><Icon name="check" :size="14" /> Saved</span>
        <BaseButton variant="primary" :loading="savingDests" @click="saveDestinations">Save destinations</BaseButton>
      </div>
    </BaseCard>

    <!-- Add credential modal -->
    <BaseModal :visible="showCredModal" title="Add object storage credential" @close="showCredModal = false">
      <div class="form-stack">
        <BaseField label="Name"><BaseInput v-model="credForm.name" placeholder="e.g. prod-r2" /></BaseField>
        <BaseField label="Access key ID"><BaseInput v-model="credForm.access_key_id" placeholder="AKIA…" /></BaseField>
        <BaseField label="Secret access key">
          <BaseInput v-model="credForm.secret_access_key" type="password" placeholder="••••••••" />
        </BaseField>
      </div>
      <template #footer>
        <BaseButton variant="ghost" @click="showCredModal = false">Cancel</BaseButton>
        <BaseButton
          variant="primary"
          icon="plus"
          :loading="savingCred"
          :disabled="!canSubmitCred"
          @click="addCredential"
        >
          Add credential
        </BaseButton>
      </template>
    </BaseModal>

    <!-- Add destination modal -->
    <BaseModal :visible="showDestModal" title="Add backup destination" size="lg" @close="showDestModal = false">
      <div class="form-stack">
        <BaseField label="Kind">
          <div class="kind-toggle">
            <button
              type="button"
              class="kind-opt"
              :class="{ active: destForm.kind === 'external' }"
              @click="destForm.kind = 'external'"
            >
              External
            </button>
            <button
              type="button"
              class="kind-opt"
              :class="{ active: destForm.kind === 'managed' }"
              @click="destForm.kind = 'managed'"
            >
              Managed
            </button>
          </div>
        </BaseField>
        <BaseField
          v-if="destForm.kind === 'managed'"
          label="Deployment"
          hint="The object-store deployment FlatRun runs (e.g. a MinIO you deployed)."
        >
          <BaseInput v-model="destForm.deployment" placeholder="my-minio" />
        </BaseField>
        <div class="grid2">
          <BaseField label="Name"><BaseInput v-model="destForm.name" placeholder="s3-prod" /></BaseField>
          <BaseField label="Credential">
            <BaseSelect v-model="destForm.credential_id">
              <option value="" disabled>Select a credential</option>
              <option v-for="c in creds" :key="c.id" :value="c.id">{{ c.name }}</option>
            </BaseSelect>
          </BaseField>
        </div>
        <div class="grid2">
          <BaseField label="Endpoint">
            <BaseInput v-model="destForm.endpoint" placeholder="https://s3.us-east-1.amazonaws.com" />
          </BaseField>
          <BaseField label="Region"><BaseInput v-model="destForm.region" placeholder="us-east-1" /></BaseField>
        </div>
        <div class="grid2">
          <BaseField label="Bucket"><BaseInput v-model="destForm.bucket" placeholder="flatrun-backups" /></BaseField>
          <BaseField label="Prefix (optional)"
            ><BaseInput v-model="destForm.prefix" placeholder="agent-01"
          /></BaseField>
        </div>
        <label class="checkbox-line">
          <input v-model="destForm.use_path_style" type="checkbox" />
          Use path-style addressing (required by MinIO and some providers)
        </label>
        <p v-if="!creds.length" class="muted">Add a credential first, then create a destination that uses it.</p>
      </div>
      <template #footer>
        <BaseButton variant="ghost" @click="showDestModal = false">Cancel</BaseButton>
        <BaseButton variant="primary" icon="plus" :disabled="!canSubmitDest" @click="addDestination">
          Add destination
        </BaseButton>
      </template>
    </BaseModal>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import Icon from "@/components/base/Icon.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseField from "@/components/base/BaseField.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";
import BaseButton from "@/components/base/BaseButton.vue";
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
const showCredModal = ref(false);
const showDestModal = ref(false);

const credForm = reactive({ name: "", access_key_id: "", secret_access_key: "" });
const destForm = reactive({
  name: "",
  kind: "external",
  deployment: "",
  endpoint: "",
  region: "",
  bucket: "",
  prefix: "",
  credential_id: "",
  use_path_style: false,
});

function storeKind(d: BackupDestination): string {
  return d.kind || "external";
}

const canSubmitCred = computed(
  () => credForm.name.trim() && credForm.access_key_id.trim() && credForm.secret_access_key.trim(),
);
const canSubmitDest = computed(() => destForm.name.trim() && destForm.bucket.trim() && destForm.credential_id);

function credName(id: string): string {
  return creds.value.find((c) => c.id === id)?.name || "missing credential";
}

function openCredModal() {
  credForm.name = "";
  credForm.access_key_id = "";
  credForm.secret_access_key = "";
  showCredModal.value = true;
}

function openDestModal() {
  destForm.name = "";
  destForm.kind = "external";
  destForm.deployment = "";
  destForm.endpoint = "";
  destForm.region = "";
  destForm.bucket = "";
  destForm.prefix = "";
  destForm.credential_id = "";
  destForm.use_path_style = false;
  showDestModal.value = true;
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
    showCredModal.value = false;
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
    kind: destForm.kind,
    deployment: destForm.kind === "managed" ? destForm.deployment.trim() : "",
    endpoint: destForm.endpoint.trim(),
    region: destForm.region.trim(),
    bucket: destForm.bucket.trim(),
    prefix: destForm.prefix.trim(),
    credential_id: destForm.credential_id,
    use_path_style: destForm.use_path_style,
    enabled: true,
  });
  showDestModal.value = false;
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
}

.item-row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-sm);
}

.row-icon {
  color: var(--text-muted);
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

.i-kind {
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  padding: 0.05rem 0.4rem;
  border-radius: var(--radius-full);
}

.i-kind.external {
  background: var(--surface-inset);
  color: var(--text-muted);
}

.i-kind.managed {
  background: var(--color-info-50);
  color: var(--color-info-700);
}

.kind-toggle {
  display: inline-flex;
  gap: 2px;
  padding: 2px;
  background: var(--surface-inset);
  border-radius: var(--radius-sm);
}

.kind-opt {
  padding: 0.3rem 0.8rem;
  border: none;
  background: transparent;
  border-radius: calc(var(--radius-sm) - 2px);
  font-size: var(--text-sm);
  color: var(--text-muted);
  cursor: pointer;
}

.kind-opt.active {
  background: var(--surface-raised);
  color: var(--accent);
  box-shadow: var(--shadow-sm);
}

.form-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.checkbox-line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.save-footer {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-3);
  padding-top: var(--space-3);
  margin-top: var(--space-3);
  border-top: 1px solid var(--border-subtle);
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
