<template>
  <div class="toast-container">
    <TransitionGroup name="toast">
      <div v-for="notification in notifications" :key="notification.id" class="toast" :class="notification.type">
        <div class="toast-icon">
          <i :class="getIcon(notification.type)" />
        </div>
        <div class="toast-content">
          <div class="toast-title">
            {{ notification.title }}
          </div>
          <div v-if="notification.message" class="toast-message">
            {{ notification.message }}
          </div>
          <div
            v-if="notification.type === 'progress'"
            class="toast-progress"
            role="progressbar"
            :aria-valuenow="notification.progress"
            aria-valuemin="0"
            aria-valuemax="100"
          >
            <div class="toast-progress-fill" :style="{ width: `${notification.progress ?? 0}%` }" />
          </div>
        </div>
        <button class="toast-close" @click="remove(notification.id)">
          <i class="pi pi-times" />
        </button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup lang="ts">
import { storeToRefs } from "pinia";
import { useNotificationsStore } from "@/stores/notifications";

const store = useNotificationsStore();
const { notifications } = storeToRefs(store);
const { remove } = store;

const getIcon = (type: string) => {
  const icons: Record<string, string> = {
    success: "pi pi-check-circle",
    error: "pi pi-times-circle",
    warning: "pi pi-exclamation-triangle",
    info: "pi pi-info-circle",
    progress: "pi pi-spin pi-spinner",
  };
  return icons[type] || "pi pi-info-circle";
};
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: var(--z-toast);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  max-width: 420px;
  width: 100%;
}

.toast {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 1rem;
  background: var(--surface-raised);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-xl);
  border: 1px solid var(--border);
  border-left: 4px solid;
}

.toast.success {
  border-left-color: var(--color-success-500);
}

.toast.error {
  border-left-color: var(--color-danger-500);
}

.toast.warning {
  border-left-color: var(--color-warning-500);
}

.toast.info,
.toast.progress {
  border-left-color: var(--color-info-500);
}

.toast-icon {
  flex-shrink: 0;
  width: 24px;
  height: 24px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.toast.success .toast-icon {
  color: var(--color-success-500);
}

.toast.error .toast-icon {
  color: var(--color-danger-500);
}

.toast.warning .toast-icon {
  color: var(--color-warning-500);
}

.toast.info .toast-icon,
.toast.progress .toast-icon {
  color: var(--color-info-500);
}

.toast-content {
  flex: 1;
}

.toast-title {
  font-weight: 600;
  color: var(--text);
  font-size: 0.9375rem;
}

.toast-message {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: var(--text-muted);
  line-height: 1.4;
}

.toast-progress {
  height: var(--space-1);
  margin-top: var(--space-2);
  overflow: hidden;
  background: var(--surface-inset);
  border-radius: var(--radius-full);
}

.toast-progress-fill {
  height: 100%;
  background: var(--color-info-500);
  border-radius: inherit;
  transition: width var(--transition-base);
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: var(--text-subtle);
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.toast-close:hover {
  background: var(--surface-inset);
  color: var(--text-muted);
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from {
  opacity: 0;
  transform: translateX(100%);
}

.toast-leave-to {
  opacity: 0;
  transform: translateX(100%);
}
</style>
