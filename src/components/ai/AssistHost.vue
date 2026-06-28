<template>
  <AssistLauncher v-if="authStore.isAuthenticated && aiStore.status?.enabled" />
  <AssistChat />
</template>

<script setup lang="ts">
import AssistChat from "./AssistChat.vue";
import AssistLauncher from "./AssistLauncher.vue";
import { useAIStore } from "@/stores/ai";
import { useAuthStore } from "@/stores/auth";

const aiStore = useAIStore();
const authStore = useAuthStore();
</script>
