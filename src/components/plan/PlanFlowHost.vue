<template>
  <PlanReviewModal
    v-if="store.plan"
    :plan="store.plan"
    :loading="store.applying"
    @apply="store.apply"
    @discard="store.discard"
  />
</template>

<script setup lang="ts">
import { usePlanFlowStore } from "@/stores/planFlow";
import PlanReviewModal from "./PlanReviewModal.vue";

const store = usePlanFlowStore();
</script>
