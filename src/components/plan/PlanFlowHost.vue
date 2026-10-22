<template>
  <template v-if="store.plan && birch">
    <StagedChangesBar
      :plan="store.plan"
      :applying="store.applying"
      @apply="store.apply"
      @discard="store.discard"
      @details="details = true"
    />
    <PlanReviewModal
      v-if="details"
      :plan="store.plan"
      :loading="store.applying"
      @apply="store.apply"
      @discard="store.discard"
      @close="details = false"
    />
  </template>
  <PlanReviewModal
    v-else-if="store.plan"
    :plan="store.plan"
    :loading="store.applying"
    @apply="store.apply"
    @discard="store.discard"
    @close="store.discard"
  />
</template>

<script setup lang="ts">
import { computed, ref, watch } from "vue";
import { usePlanFlowStore } from "@/stores/planFlow";
import { useTheme } from "@/composables/useTheme";
import PlanReviewModal from "./PlanReviewModal.vue";
import StagedChangesBar from "./StagedChangesBar.vue";

const store = usePlanFlowStore();
const { current } = useTheme();
const birch = computed(() => current.value.layout === "birch");
const details = ref(false);

watch(
  () => store.plan?.id,
  () => (details.value = false),
);
</script>
