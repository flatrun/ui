<template>
  <ModernLayout v-if="current.layout === 'modern'" />
  <DashboardLayout v-else />
</template>

<script setup lang="ts">
import { useTheme } from "@/composables/useTheme";
import DashboardLayout from "./DashboardLayout.vue";
import ModernLayout from "./ModernLayout.vue";

const { current } = useTheme();
</script>
