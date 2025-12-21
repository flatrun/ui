<template>
  <div class="connection-status" :class="status">
    <div class="status-indicator" :class="{ pulse: status === 'connected' }">
      <component :is="statusIcon" :size="12" />
    </div>
    <span class="status-text">{{ statusLabel }}</span>
    <span v-if="latency !== null && status === 'connected'" class="latency"> {{ latency }}ms </span>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { Wifi, WifiOff, AlertCircle } from "lucide-vue-next";

const props = defineProps<{
  status: "connected" | "disconnected" | "error";
  latency?: number | null;
}>();

const statusIcon = computed(() => {
  switch (props.status) {
    case "connected":
      return Wifi;
    case "error":
      return AlertCircle;
    default:
      return WifiOff;
  }
});

const statusLabel = computed(() => {
  switch (props.status) {
    case "connected":
      return "Connected";
    case "error":
      return "Error";
    default:
      return "Disconnected";
  }
});
</script>

<style scoped>
.connection-status {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0.25rem 0.75rem;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-semibold);
  text-transform: capitalize;
}

.connection-status.connected {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.connection-status.disconnected {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.connection-status.error {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

.status-indicator {
  display: flex;
  align-items: center;
  justify-content: center;
}

.status-indicator.pulse {
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.latency {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  opacity: 0.8;
}
</style>
