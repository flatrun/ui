<template>
  <BaseModal
    :visible="visible"
    title="Review changes"
    :subtitle="`${displayPlan.action} on ${displayPlan.resource.id}`"
    icon="pi pi-list"
    icon-color="primary"
    size="lg"
    :close-disabled="loading"
    :close-on-overlay="false"
    @close="emit('discard')"
  >
    <div class="summary-chips">
      <span v-for="chip in summaryChips" :key="chip.key" class="summary-chip" :class="`chip-${chip.key}`">
        {{ chip.count }} {{ chip.label }}
      </span>
    </div>

    <div class="changes-list">
      <PlanChangeCard
        v-for="(change, index) in displayPlan.changes"
        :key="`${change.type}-${change.id}-${index}`"
        :change="change"
        @reveal="revealSensitive"
      />
    </div>

    <p class="expiry-note">
      <i class="pi pi-clock" />
      This plan expires {{ formatExpiry(displayPlan.expires_at) }}.
    </p>
    <p class="preview-warning">
      <i class="pi pi-exclamation-triangle" />
      A plan is a preview; applying can still fail.
    </p>

    <template #footer>
      <button class="btn btn-secondary" :disabled="loading" @click="emit('discard')">Discard</button>
      <button
        class="btn"
        :class="isDestructive ? 'btn-danger' : 'btn-primary'"
        :disabled="loading"
        @click="emit('apply')"
      >
        <i v-if="loading" class="pi pi-spin pi-spinner" />
        Apply
      </button>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { Plan } from "@/types";
import { plansApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import BaseModal from "@/components/base/BaseModal.vue";
import PlanChangeCard from "./PlanChangeCard.vue";

const props = withDefaults(
  defineProps<{
    visible?: boolean;
    plan: Plan;
    loading?: boolean;
  }>(),
  {
    visible: true,
    loading: false,
  },
);

const emit = defineEmits<{
  apply: [];
  discard: [];
}>();

const notifications = useNotificationsStore();

const revealedPlan = ref<Plan | null>(null);

watch(
  () => props.plan.id,
  () => {
    revealedPlan.value = null;
  },
);

const displayPlan = computed(() => revealedPlan.value ?? props.plan);

const summaryLabels: Array<{ key: keyof Plan["summary"]; label: string }> = [
  { key: "create", label: "create" },
  { key: "update", label: "update" },
  { key: "replace", label: "replace" },
  { key: "delete", label: "delete" },
  { key: "no-op", label: "no-op" },
];

const summaryChips = computed(() =>
  summaryLabels
    .map(({ key, label }) => ({ key, label, count: displayPlan.value.summary[key] }))
    .filter((chip) => chip.count > 0),
);

const isDestructive = computed(
  () => displayPlan.value.summary.delete > 0 || displayPlan.value.action === "deployment.delete",
);

const formatExpiry = (date: string) => new Date(date).toLocaleString();

const revealSensitive = async () => {
  try {
    const response = await plansApi.get(props.plan.id, true);
    revealedPlan.value = response.data.plan;
  } catch (err: any) {
    const msg = err.response?.data?.error || err.message;
    notifications.error("Reveal Failed", msg);
  }
};
</script>

<style scoped>
.summary-chips {
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-2);
  margin-bottom: var(--space-4);
}

.summary-chip {
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
}

.chip-create {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

.chip-update {
  background: var(--color-info-100);
  color: var(--color-info-700);
}

.chip-replace {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

.chip-delete {
  background: var(--color-danger-100);
  color: var(--color-danger-700);
}

.chip-no-op {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.changes-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.expiry-note {
  margin: var(--space-4) 0 0;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.preview-warning {
  margin: var(--space-2) 0 0;
  padding: var(--space-2) var(--space-3);
  background: var(--color-warning-50);
  color: var(--color-warning-700);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  display: flex;
  align-items: center;
  gap: var(--space-2);
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

.btn-secondary {
  background: var(--color-gray-100);
  color: var(--color-gray-700);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-gray-200);
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-600);
}

.btn-danger {
  background: var(--color-danger-500);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: var(--color-danger-600);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}
</style>
