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
  };
  return icons[type] || "pi pi-info-circle";
};
</script>

<style scoped>
.toast-container {
  position: fixed;
  top: 1rem;
  right: 1rem;
  z-index: 9999;
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
  background: white;
  border-radius: var(--radius-sm);
  box-shadow:
    0 10px 40px rgba(0, 0, 0, 0.15),
    0 2px 10px rgba(0, 0, 0, 0.1);
  border-left: 4px solid;
}

.toast.success {
  border-left-color: #22c55e;
}

.toast.error {
  border-left-color: #ef4444;
}

.toast.warning {
  border-left-color: #f59e0b;
}

.toast.info {
  border-left-color: #3b82f6;
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
  color: #22c55e;
}

.toast.error .toast-icon {
  color: #ef4444;
}

.toast.warning .toast-icon {
  color: #f59e0b;
}

.toast.info .toast-icon {
  color: #3b82f6;
}

.toast-content {
  flex: 1;
}

.toast-title {
  font-weight: 600;
  color: #1f2937;
  font-size: 0.9375rem;
}

.toast-message {
  margin-top: 0.25rem;
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.4;
}

.toast-close {
  flex-shrink: 0;
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.25rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.toast-close:hover {
  background: #f3f4f6;
  color: #6b7280;
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
