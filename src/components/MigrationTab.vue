<template>
  <div class="migration-tab">
    <BaseCard title="Migration and cutover">
      <div class="migration-grid">
        <BaseField label="Source"><BaseInput v-model="plan.source" placeholder="legacy-server" /></BaseField>
        <BaseField label="Target address"
          ><BaseInput v-model="plan.expected_address" placeholder="203.0.113.10"
        /></BaseField>
      </div>
      <label class="inventory-check"
        ><input v-model="plan.inventory_complete" type="checkbox" /> Source inventory complete</label
      >
      <div v-for="(site, index) in plan.sites" :key="index" class="site-row">
        <BaseInput v-model="site.hostname" placeholder="site.example.com" />
        <BaseInput v-model="site.source_path" placeholder="/srv/site" />
        <BaseInput v-model="site.bytes" type="number" placeholder="Bytes" />
        <label><input v-model="site.transferred" type="checkbox" /> Transferred</label>
        <BaseButton variant="secondary" size="sm" @click="plan.sites.splice(index, 1)">Remove</BaseButton>
      </div>
      <BaseButton variant="secondary" size="sm" @click="addSite">Add site</BaseButton>
      <div class="milestones">
        <BaseButton variant="secondary" @click="markTransfer">Record initial transfer</BaseButton>
        <BaseButton variant="secondary" @click="markSync">Record synchronization</BaseButton>
        <BaseButton variant="secondary" @click="markCutover">Record cutover</BaseButton>
        <BaseButton variant="secondary" @click="checkDns">Check DNS</BaseButton>
      </div>
      <div v-if="status" class="readiness" :class="{ ready: status.retirement_ready }">
        <strong>{{ status.retirement_ready ? "Source can be retired" : "Source must remain online" }}</strong>
        <ul v-if="status.blockers.length">
          <li v-for="blocker in status.blockers" :key="blocker">{{ blocker }}</li>
        </ul>
      </div>
      <template #footer><BaseButton :loading="saving" @click="save">Save migration</BaseButton></template>
    </BaseCard>
  </div>
</template>

<script setup lang="ts">
import { onMounted, reactive, ref } from "vue";
import { migrationsApi } from "@/services/api";
import type { MigrationPlan, MigrationStatus } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import BaseButton from "@/components/base/BaseButton.vue";
import BaseCard from "@/components/base/BaseCard.vue";
import BaseField from "@/components/base/BaseField.vue";
import BaseInput from "@/components/base/BaseInput.vue";

const props = defineProps<{ deploymentName: string }>();
const notifications = useNotificationsStore();
const saving = ref(false);
const status = ref<MigrationStatus | null>(null);
const plan = reactive<MigrationPlan>({ source: "", sites: [], inventory_complete: false });

const load = async () => {
  const response = await migrationsApi.get(props.deploymentName);
  status.value = response.data.migration;
  if (status.value.plan) Object.assign(plan, status.value.plan);
};
const save = async () => {
  saving.value = true;
  try {
    const response = await migrationsApi.update(props.deploymentName, plan);
    status.value = response.data.migration;
    notifications.success("Migration Saved", "Migration progress has been updated");
  } catch (err: any) {
    notifications.error("Migration Failed", err.response?.data?.error || "Failed to save migration");
  } finally {
    saving.value = false;
  }
};
const addSite = () =>
  plan.sites.push({ hostname: "", source_path: "", bytes: 0, transferred: false, dns_propagated: false });
const now = () => new Date().toISOString();
const markTransfer = () => {
  plan.initial_transfer_at = now();
  plan.sites.forEach((site) => (site.transferred = true));
};
const markSync = () => {
  plan.last_sync_at = now();
  plan.sites.forEach((site) => (site.last_synced_at = plan.last_sync_at));
};
const markCutover = () => (plan.cutover_at = now());
const checkDns = async () => {
  const response = await migrationsApi.checkDns(props.deploymentName);
  status.value = response.data.migration;
  if (status.value.plan) Object.assign(plan, status.value.plan);
};
onMounted(load);
</script>

<style scoped>
.migration-grid,
.site-row,
.milestones {
  display: flex;
  gap: var(--space-3);
  flex-wrap: wrap;
  margin-bottom: var(--space-3);
}
.site-row > * {
  flex: 1;
  min-width: 150px;
}
.inventory-check {
  display: block;
  margin-bottom: var(--space-3);
}
.readiness {
  margin-top: var(--space-4);
  padding: var(--space-3);
  border-radius: var(--radius-sm);
  background: var(--warning-bg);
}
.readiness.ready {
  background: var(--success-bg);
}
</style>
