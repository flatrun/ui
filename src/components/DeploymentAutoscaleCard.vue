<template>
  <section class="autoscale-card">
    <div class="autoscale-header">
      <div class="autoscale-title">
        <span class="autoscale-icon"><Icon name="gauge" :size="20" /></span>
        <div>
          <h3>Autoscaling</h3>
          <p>Adjust resources first, then add replicas when pressure continues.</p>
        </div>
      </div>
      <div v-if="canWrite && policy" class="autoscale-actions">
        <BaseButton
          v-if="policy.enabled && compatibility?.compatible && !policy.state.active"
          class="activate-button"
          size="sm"
          variant="primary"
          icon="play"
          @click="showActivationModal = true"
          >Activate</BaseButton
        >
        <BaseButton size="sm" icon="settings" @click="openModal">Configure</BaseButton>
      </div>
    </div>
    <div v-if="loading" class="autoscale-state"><Icon name="loader-circle" spin :size="18" /> Loading policy</div>
    <div v-else-if="error" class="autoscale-state error"><Icon name="triangle-alert" :size="18" /> {{ error }}</div>
    <div v-else-if="policy" class="autoscale-summary">
      <span class="policy-status" :class="{ enabled: policy.enabled }">{{
        policy.state.active ? "Managed" : policy.enabled ? "Enabled" : "Disabled"
      }}</span>
      <div>
        <small>Replica range</small><strong>{{ policy.min_replicas }} to {{ policy.max_replicas }}</strong>
      </div>
      <div>
        <small>Scale up</small><strong>{{ policy.scale_up_percent }}% for {{ policy.scale_up_windows }} checks</strong>
      </div>
      <div>
        <small>Scale down</small
        ><strong>{{ policy.scale_down_percent }}% for {{ policy.scale_down_windows }} checks</strong>
      </div>
      <div>
        <small>Fleet capacity</small><strong>{{ policy.allow_fleet_capacity ? "Allowed" : "Local only" }}</strong>
      </div>
      <div>
        <small>Workload</small>
        <strong :class="{ 'compatibility-warning': !compatibility?.compatible }">
          {{ compatibility?.compatible ? compatibility.service : "Needs configuration" }}
        </strong>
      </div>
    </div>
    <BaseModal
      :visible="showModal"
      title="Autoscaling policy"
      subtitle="Set sustained thresholds that prevent rapid scaling changes."
      icon="gauge"
      size="lg"
      @close="closeModal"
    >
      <form id="autoscale-policy-form" class="policy-form" @submit.prevent="save">
        <section class="workload-section">
          <div>
            <strong>Scale-ready workload</strong>
            <small>Declare the portable service before Fleet can create replicas.</small>
          </div>
          <div class="policy-grid">
            <label>
              Service
              <BaseSelect v-model="workloadForm.service">
                <option value="" disabled>Choose a service</option>
                <option v-for="service in compatibility?.services" :key="service" :value="service">
                  {{ service }}
                </option>
              </BaseSelect>
            </label>
            <label>
              Storage
              <BaseSelect v-model="workloadForm.storage.mode">
                <option value="none">No persistent storage</option>
                <option value="shared">Shared storage</option>
              </BaseSelect>
            </label>
            <label v-if="workloadForm.storage.mode === 'shared'">
              Storage class
              <input v-model.trim="workloadForm.storage.class" type="text" placeholder="shared-app-data" required />
            </label>
          </div>
          <label class="toggle-row">
            <input v-model="workloadForm.stateless" type="checkbox" />
            <span
              ><strong>Stateless service</strong
              ><small>Any replica may handle any request without local state.</small></span
            >
          </label>
          <div v-if="compatibility?.blockers.length" class="compatibility-list warning">
            <strong>Resolve before activation</strong>
            <ul>
              <li v-for="blocker in compatibility.blockers" :key="blocker">{{ blocker }}</li>
            </ul>
          </div>
          <div v-if="compatibility?.warnings.length" class="compatibility-list">
            <strong>Check before activation</strong>
            <ul>
              <li v-for="warning in compatibility.warnings" :key="warning">{{ warning }}</li>
            </ul>
          </div>
        </section>
        <label class="toggle-row"
          ><input v-model="form.enabled" type="checkbox" /><span
            ><strong>Enable autoscaling</strong><small>FlatRun may resize or replicate this deployment.</small></span
          ></label
        >
        <div class="policy-grid">
          <label>Minimum replicas<input v-model.number="form.min_replicas" type="number" min="1" required /></label>
          <label>Maximum replicas<input v-model.number="form.max_replicas" type="number" min="1" required /></label>
          <label
            >Scale up at (%)<input v-model.number="form.scale_up_percent" type="number" min="1" max="100" required
          /></label>
          <label>After checks<input v-model.number="form.scale_up_windows" type="number" min="1" required /></label>
          <label
            >Scale down at (%)<input v-model.number="form.scale_down_percent" type="number" min="0" max="99" required
          /></label>
          <label>After checks<input v-model.number="form.scale_down_windows" type="number" min="1" required /></label>
          <label
            >Cooldown (seconds)<input v-model.number="form.cooldown_seconds" type="number" min="0" required
          /></label>
        </div>
        <label class="toggle-row"
          ><input v-model="form.allow_fleet_capacity" type="checkbox" /><span
            ><strong>Use permitted Fleet capacity</strong
            ><small>Place extra replicas on permitted servers in the same runtime cluster.</small></span
          ></label
        >
        <div v-if="saveError" class="save-error"><Icon name="triangle-alert" :size="18" /> {{ saveError }}</div>
      </form>
      <template #footer
        ><BaseButton @click="closeModal">Cancel</BaseButton
        ><BaseButton form="autoscale-policy-form" type="submit" variant="primary" :loading="saving"
          >Save policy</BaseButton
        ></template
      >
    </BaseModal>
    <BaseModal
      :visible="showActivationModal"
      title="Activate managed scaling"
      subtitle="Move this service from Compose to the configured cluster provider."
      icon="play"
      size="sm"
      @close="closeActivationModal"
    >
      <div class="activation-copy">
        <p>FlatRun will create {{ policy?.min_replicas }} ready replicas before switching traffic.</p>
        <p>The current Compose service stops only after the new route is live.</p>
        <div v-if="activationError" class="save-error">
          <Icon name="triangle-alert" :size="18" /> {{ activationError }}
        </div>
      </div>
      <template #footer>
        <BaseButton :disabled="activating" @click="closeActivationModal">Cancel</BaseButton>
        <BaseButton variant="primary" :loading="activating" @click="activate">Activate scaling</BaseButton>
      </template>
    </BaseModal>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import {
  autoscaleApi,
  type AutoscaleCompatibility,
  type AutoscalePolicy,
  type AutoscaleWorkload,
} from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseModal from "@/components/base/BaseModal.vue";
import BaseSelect from "@/components/base/BaseSelect.vue";
import Icon from "@/components/base/Icon.vue";

const props = defineProps<{ deployment: string; canWrite: boolean }>();
const notifications = useNotificationsStore();
const loading = ref(true);
const saving = ref(false);
const activating = ref(false);
const error = ref("");
const saveError = ref("");
const showModal = ref(false);
const showActivationModal = ref(false);
const activationError = ref("");
const policy = ref<AutoscalePolicy | null>(null);
const compatibility = ref<AutoscaleCompatibility | null>(null);
const workloadForm = ref<AutoscaleWorkload>({ service: "", stateless: false, storage: { mode: "none", class: "" } });
const form = ref<Omit<AutoscalePolicy, "state">>({
  enabled: false,
  min_replicas: 1,
  max_replicas: 3,
  scale_up_percent: 80,
  scale_down_percent: 30,
  scale_up_windows: 3,
  scale_down_windows: 10,
  cooldown_seconds: 300,
  allow_fleet_capacity: false,
});

const editablePolicy = (value: AutoscalePolicy): Omit<AutoscalePolicy, "state"> => ({
  enabled: value.enabled,
  min_replicas: value.min_replicas,
  max_replicas: value.max_replicas,
  scale_up_percent: value.scale_up_percent,
  scale_down_percent: value.scale_down_percent,
  scale_up_windows: value.scale_up_windows,
  scale_down_windows: value.scale_down_windows,
  cooldown_seconds: value.cooldown_seconds,
  allow_fleet_capacity: value.allow_fleet_capacity,
});

const load = async () => {
  loading.value = true;
  error.value = "";
  try {
    const [policyResponse, compatibilityResponse] = await Promise.all([
      autoscaleApi.getPolicy(props.deployment),
      autoscaleApi.getCompatibility(props.deployment),
    ]);
    policy.value = policyResponse.data;
    compatibility.value = compatibilityResponse.data;
  } catch (cause: any) {
    error.value = cause.response?.data?.error || cause.message || "Autoscaling policy is unavailable";
  } finally {
    loading.value = false;
  }
};
const openModal = () => {
  if (!policy.value) return;
  form.value = editablePolicy(policy.value);
  const workload = compatibility.value?.workload;
  workloadForm.value = workload
    ? {
        service: workload.service,
        stateless: workload.stateless,
        storage: { mode: workload.storage.mode, class: workload.storage.class },
      }
    : { service: "", stateless: false, storage: { mode: "none", class: "" } };
  showModal.value = true;
  saveError.value = "";
};
const closeModal = () => {
  if (!saving.value) showModal.value = false;
};
const closeActivationModal = () => {
  if (!activating.value) showActivationModal.value = false;
};
const activate = async () => {
  activating.value = true;
  activationError.value = "";
  try {
    await autoscaleApi.activate(props.deployment);
    policy.value = (await autoscaleApi.getPolicy(props.deployment)).data;
    showActivationModal.value = false;
    notifications.success("Managed scaling active", "Traffic now uses the ready cluster replicas.");
  } catch (cause: any) {
    activationError.value = cause.response?.data?.error || cause.message || "Managed scaling could not be activated";
  } finally {
    activating.value = false;
  }
};
const save = async () => {
  saving.value = true;
  saveError.value = "";
  try {
    compatibility.value = (await autoscaleApi.updateWorkload(props.deployment, workloadForm.value)).data;
    if (form.value.enabled && !compatibility.value.compatible) {
      saveError.value = "Resolve the workload blockers before enabling autoscaling";
      return;
    }
    policy.value = (await autoscaleApi.updatePolicy(props.deployment, form.value)).data;
    showModal.value = false;
    notifications.success("Autoscaling updated", "The deployment now uses the new scaling policy.");
  } catch (cause: any) {
    saveError.value = cause.response?.data?.error || cause.message || "Autoscaling policy could not be saved";
  } finally {
    saving.value = false;
  }
};
onMounted(load);
</script>

<style scoped>
.autoscale-card {
  margin-top: 1rem;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
}
.autoscale-header,
.autoscale-title,
.autoscale-summary,
.autoscale-state {
  display: flex;
  align-items: center;
}
.autoscale-header {
  justify-content: space-between;
  gap: 1rem;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}
.autoscale-actions {
  display: flex;
  gap: 0.5rem;
}
.autoscale-title {
  gap: 0.75rem;
}
.autoscale-title h3,
.autoscale-title p {
  margin: 0;
}
.autoscale-title h3 {
  color: var(--text);
  font-size: 0.9375rem;
}
.autoscale-title p {
  margin-top: 0.2rem;
  color: var(--text-muted);
  font-size: 0.75rem;
}
.autoscale-icon {
  display: grid;
  place-items: center;
  width: 2.25rem;
  height: 2.25rem;
  color: var(--accent);
  background: var(--accent-subtle);
  border-radius: var(--radius-sm);
}
.autoscale-state {
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  color: var(--text-muted);
  font-size: 0.8125rem;
}
.autoscale-state.error,
.save-error {
  color: var(--color-danger-700);
}
.activation-copy {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  color: var(--text-muted);
  font-size: 0.875rem;
}
.activation-copy p {
  margin: 0;
}
.autoscale-summary {
  flex-wrap: wrap;
  gap: 1rem 2rem;
  padding: 1rem 1.25rem;
}
.autoscale-summary > div {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
}
.autoscale-summary small {
  color: var(--text-muted);
}
.autoscale-summary strong {
  color: var(--text);
  font-size: 0.8125rem;
}
.policy-status {
  padding: 0.25rem 0.5rem;
  color: var(--text-muted);
  background: var(--surface-sunken);
  border-radius: var(--radius-sm);
  font-size: 0.75rem;
  font-weight: 600;
}
.policy-status.enabled {
  color: var(--color-success-700);
  background: var(--color-success-50);
}
.policy-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.workload-section {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  padding: 0.875rem;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.workload-section > div:first-child {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.workload-section small,
.compatibility-list {
  color: var(--text-muted);
}
.compatibility-warning,
.compatibility-list.warning {
  color: var(--color-warning-700);
}
.compatibility-list {
  font-size: 0.75rem;
}
.compatibility-list ul {
  margin: 0.35rem 0 0;
  padding-left: 1.25rem;
}
.policy-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
}
.policy-grid label {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  color: var(--text);
  font-size: 0.75rem;
  font-weight: 500;
}
.policy-grid input {
  width: 100%;
  box-sizing: border-box;
  padding: 0.55rem 0.65rem;
  color: var(--text);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}
.toggle-row {
  display: flex;
  align-items: flex-start;
  gap: 0.65rem;
  padding: 0.75rem;
  background: var(--surface-sunken);
  border-radius: var(--radius-sm);
}
.toggle-row span {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}
.toggle-row strong {
  color: var(--text);
  font-size: 0.8125rem;
}
.toggle-row small {
  color: var(--text-muted);
}
.save-error {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--color-danger-50);
  border-radius: var(--radius-sm);
  font-size: 0.8125rem;
}
@media (max-width: 640px) {
  .autoscale-header {
    align-items: flex-start;
  }
  .autoscale-summary,
  .policy-grid {
    display: grid;
    grid-template-columns: 1fr;
  }
  .autoscale-summary {
    gap: 0.75rem;
  }
}
</style>
