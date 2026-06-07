<template>
  <div id="app">
    <ToastNotifications />
    <PlanFlowHost />
    <div v-if="!ready" class="app-loading">
      <Logo variant="icon" size="lg" />
    </div>
    <router-view v-else />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from "vue";
import ToastNotifications from "@/components/ToastNotifications.vue";
import PlanFlowHost from "@/components/plan/PlanFlowHost.vue";
import Logo from "@/components/base/Logo.vue";
import { useSetupStore } from "@/stores/setup";
import { useRouter } from "vue-router";

const ready = ref(false);
const router = useRouter();
const setup = useSetupStore();

onMounted(async () => {
  try {
    await setup.checkSetupStatus();
    if (setup.initialized === false) {
      router.replace("/setup");
    }
  } finally {
    ready.value = true;
  }
});
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, sans-serif;
  background-color: #f8fafc;
  color: #1e293b;
}

.app-loading {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
}

.app-loading .logo-img {
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
    transform: scale(1);
  }
  50% {
    opacity: 0.5;
    transform: scale(0.95);
  }
}
</style>
