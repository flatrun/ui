<template>
  <BaseModal
    :visible="visible"
    :title="modalTitle"
    :subtitle="modalSubtitle"
    size="lg"
    :close-disabled="busy"
    @close="close"
  >
    <!-- Step: pick a store type -->
    <div v-if="step === 'pick'">
      <div v-if="loading" class="muted"><Icon name="loader-circle" spin :size="18" /> Loading stores…</div>

      <div v-else class="store-picker">
        <button v-for="t in stores" :key="t.id" type="button" class="store-option" @click="selectStore(t)">
          <img v-if="t.logo" :src="t.logo" :alt="t.name" class="store-logo" />
          <Icon v-else name="container" :size="20" />
          <div class="store-option-text">
            <span class="store-option-name">{{ t.name }}</span>
            <span class="store-option-desc">{{ t.description }}</span>
          </div>
          <Icon name="chevron-right" :size="16" class="store-option-chevron" />
        </button>

        <button type="button" class="store-option" @click="startCustom">
          <Icon name="plug" :size="20" />
          <div class="store-option-text">
            <span class="store-option-name">Use an existing deployment</span>
            <span class="store-option-desc">Connect any S3-compatible container you already run.</span>
          </div>
          <Icon name="chevron-right" :size="16" class="store-option-chevron" />
        </button>
      </div>
    </div>

    <!-- Step: configure a template store -->
    <div v-else-if="step === 'configure'" class="form-stack">
      <BaseField label="Store name" hint="Used as the deployment and connected-store name.">
        <BaseInput v-model="form.name" placeholder="e.g. minio-store" :disabled="busy" />
      </BaseField>

      <label class="toggle-line">
        <input v-model="form.autoRegister" type="checkbox" :disabled="busy" />
        <span>
          <strong>Auto-register as a connected store</strong>
          <span class="toggle-hint">
            Create the credential and backup destination so this store is ready for backups immediately. Turn off to
            wire it up yourself later in Settings.
          </span>
        </span>
      </label>
    </div>

    <!-- Step: connect an existing deployment -->
    <div v-else class="form-stack">
      <BaseField label="Deployment" hint="The running container that serves the S3 API.">
        <BaseSelect v-model="custom.deployment" :disabled="busy">
          <option value="" disabled>Select a deployment</option>
          <option v-for="d in deployments" :key="d" :value="d">{{ d }}</option>
        </BaseSelect>
      </BaseField>
      <div class="grid2">
        <BaseField label="Store name"
          ><BaseInput v-model="custom.name" placeholder="my-store" :disabled="busy"
        /></BaseField>
        <BaseField label="S3 API port"
          ><BaseInput v-model="custom.apiPort" placeholder="9000" :disabled="busy"
        /></BaseField>
      </div>
      <div class="grid2">
        <BaseField label="Access key"
          ><BaseInput v-model="custom.accessKey" placeholder="access key" :disabled="busy"
        /></BaseField>
        <BaseField label="Secret key">
          <BaseInput v-model="custom.secretKey" type="password" placeholder="••••••••" :disabled="busy" />
        </BaseField>
      </div>
      <BaseField label="Bucket"><BaseInput v-model="custom.bucket" placeholder="backups" :disabled="busy" /></BaseField>
      <label class="checkbox-line">
        <input v-model="custom.usePathStyle" type="checkbox" :disabled="busy" />
        Use path-style addressing (required by MinIO and most self-hosted stores)
      </label>
    </div>

    <template #footer>
      <BaseButton v-if="step !== 'pick'" variant="ghost" :disabled="busy" @click="step = 'pick'">Back</BaseButton>
      <BaseButton variant="ghost" :disabled="busy" @click="close">Cancel</BaseButton>
      <BaseButton
        v-if="step === 'configure'"
        variant="primary"
        icon="rocket"
        :loading="busy"
        :disabled="!canDeploy"
        @click="deployTemplate"
      >
        Deploy store
      </BaseButton>
      <BaseButton
        v-else-if="step === 'custom'"
        variant="primary"
        icon="link"
        :loading="busy"
        :disabled="!canConnect"
        @click="connectExisting"
      >
        Connect store
      </BaseButton>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, reactive, computed, watch } from "vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseField from "@/components/base/BaseField.vue";
import BaseInput from "@/components/base/BaseInput.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";
import BaseButton from "@/components/base/BaseButton.vue";
import Icon from "@/components/base/Icon.vue";
import { templatesApi, deploymentsApi, objectStoresApi, type ObjectStoreContract } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";

interface ObjectStoreTemplate {
  id: string;
  name: string;
  description: string;
  logo?: string;
  object_store?: ObjectStoreContract;
}

const props = defineProps<{ visible: boolean }>();
const emit = defineEmits(["close", "created"]);

const notifications = useNotificationsStore();

const loading = ref(false);
const busy = ref(false);
const stores = ref<ObjectStoreTemplate[]>([]);
const deployments = ref<string[]>([]);
const step = ref<"pick" | "configure" | "custom">("pick");
const selectedTemplate = ref<ObjectStoreTemplate | null>(null);

const form = reactive({ name: "", autoRegister: true });
const custom = reactive({
  deployment: "",
  name: "",
  apiPort: "",
  accessKey: "",
  secretKey: "",
  bucket: "",
  usePathStyle: true,
});

const validName = (v: string) => /^[a-z0-9][a-z0-9-]*$/.test(v.trim());

const canDeploy = computed(() => validName(form.name) && !!selectedTemplate.value);
const canConnect = computed(
  () =>
    !!custom.deployment &&
    validName(custom.name) &&
    /^[0-9]+$/.test(custom.apiPort.trim()) &&
    !!custom.accessKey.trim() &&
    !!custom.secretKey.trim(),
);

const modalTitle = computed(() => {
  if (step.value === "configure") return `Deploy ${selectedTemplate.value?.name}`;
  if (step.value === "custom") return "Connect an existing store";
  return "Deploy a local store";
});
const modalSubtitle = computed(() => {
  if (step.value === "configure") return "Name the store and choose whether FlatRun connects it automatically.";
  if (step.value === "custom") return "Register a deployment you already run as a connected store.";
  return "Run a self-hosted object store, or connect one you already deployed.";
});

watch(
  () => props.visible,
  (open) => {
    if (open) {
      step.value = "pick";
      selectedTemplate.value = null;
      form.name = "";
      form.autoRegister = true;
      Object.assign(custom, {
        deployment: "",
        name: "",
        apiPort: "",
        accessKey: "",
        secretKey: "",
        bucket: "",
        usePathStyle: true,
      });
      loadStores();
    }
  },
);

async function loadStores() {
  loading.value = true;
  try {
    const res = await templatesApi.list();
    stores.value = (res.data.templates || []).filter((t: ObjectStoreTemplate) => t.object_store);
  } catch (e: any) {
    notifications.error("Could not load stores", e.response?.data?.error || e.message);
    stores.value = [];
  } finally {
    loading.value = false;
  }
}

function selectStore(t: ObjectStoreTemplate) {
  selectedTemplate.value = t;
  form.name = t.id;
  step.value = "configure";
}

async function startCustom() {
  step.value = "custom";
  try {
    const res = await deploymentsApi.list();
    deployments.value = res.data.deployments.map((d: { name: string }) => d.name);
  } catch (e: any) {
    notifications.error("Could not load deployments", e.response?.data?.error || e.message);
    deployments.value = [];
  }
}

async function deployTemplate() {
  if (!canDeploy.value || !selectedTemplate.value) return;
  const name = form.name.trim();
  const template = selectedTemplate.value;

  busy.value = true;
  try {
    const compose = await templatesApi.getCompose(template.id, name);
    await deploymentsApi.create({
      name,
      compose_content: compose.data.content,
      template_id: template.id,
      auto_start: true,
    });

    if (form.autoRegister && template.object_store) {
      try {
        const c = template.object_store;
        await objectStoresApi.provisionManaged({
          deployment: name,
          store_name: name,
          access_key_env: c.access_key_env,
          secret_key_env: c.secret_key_env,
          api_port: c.api_port,
          region: c.region,
          use_path_style: c.use_path_style,
        });
        notifications.success("Store deployed", `${name} is deployed and connected.`);
      } catch (e: any) {
        notifications.error(
          "Store deployed, not connected",
          `${name} is running, but auto-registering it failed: ${e.response?.data?.error || e.message}. You can connect it from Object Stores → Deploy → Use an existing deployment.`,
        );
      }
    } else {
      notifications.success("Store deployed", `${name} is deployed.`);
    }

    emit("created");
    close();
  } catch (e: any) {
    notifications.error("Failed to deploy store", e.response?.data?.error || e.message);
  } finally {
    busy.value = false;
  }
}

async function connectExisting() {
  if (!canConnect.value) return;
  busy.value = true;
  try {
    await objectStoresApi.provisionManaged({
      deployment: custom.deployment,
      store_name: custom.name.trim(),
      bucket: custom.bucket.trim() || undefined,
      access_key: custom.accessKey.trim(),
      secret_key: custom.secretKey.trim(),
      api_port: parseInt(custom.apiPort.trim(), 10),
      use_path_style: custom.usePathStyle,
    });
    notifications.success("Store connected", `${custom.name.trim()} is now a connected store.`);
    emit("created");
    close();
  } catch (e: any) {
    notifications.error("Could not connect store", e.response?.data?.error || e.message);
  } finally {
    busy.value = false;
  }
}

function close() {
  if (busy.value) return;
  emit("close");
}
</script>

<style scoped>
.form-stack {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.grid2 {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
}

.store-picker {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.store-option {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
  padding: var(--space-3);
  background: transparent;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  color: var(--text);
}

.store-option:hover {
  border-color: var(--accent);
  background: var(--surface-inset);
}

.store-logo {
  width: 24px;
  height: 24px;
  object-fit: contain;
}

.store-option-text {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  flex: 1;
  min-width: 0;
}

.store-option-name {
  font-weight: var(--font-semibold);
}

.store-option-desc {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.store-option-chevron {
  color: var(--text-muted);
  flex-shrink: 0;
}

.toggle-line {
  display: flex;
  gap: var(--space-3);
  align-items: flex-start;
  cursor: pointer;
}

.toggle-line input {
  margin-top: 0.2rem;
}

.toggle-line span {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}

.toggle-hint {
  font-size: var(--text-sm);
  color: var(--text-muted);
}

.checkbox-line {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  color: var(--text);
  cursor: pointer;
}

.muted {
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>
