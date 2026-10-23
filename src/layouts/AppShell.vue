<template>
  <BirchLayout v-if="current.layout === 'birch'" />
  <OakLayout v-else />
</template>

<script setup lang="ts">
import { useTheme } from "@/composables/useTheme";
import OakLayout from "./OakLayout.vue";
import BirchLayout from "./BirchLayout.vue";

const { current } = useTheme();
</script>
