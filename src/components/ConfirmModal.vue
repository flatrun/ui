<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="!loading && emit('cancel')">
        <div class="confirm-modal" :class="variant">
          <div class="modal-header">
            <div class="header-icon" :class="variant">
              <i :class="iconClass" />
            </div>
            <h3>{{ title }}</h3>
          </div>
          <div class="modal-body">
            <p>{{ message }}</p>
            <p v-if="warning" class="warning-text">{{ warning }}</p>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" :disabled="loading" @click="emit('cancel')">
              {{ cancelText }}
            </button>
            <button class="btn" :class="confirmButtonClass" :disabled="loading" @click="emit('confirm')">
              <i v-if="loading" class="pi pi-spin pi-spinner" />
              {{ confirmText }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title: string;
    message: string;
    warning?: string;
    variant?: "danger" | "warning" | "info";
    confirmText?: string;
    cancelText?: string;
    loading?: boolean;
  }>(),
  {
    variant: "danger",
    confirmText: "Confirm",
    cancelText: "Cancel",
    loading: false,
  },
);

const emit = defineEmits<{
  confirm: [];
  cancel: [];
}>();

const iconClass = computed(() => {
  switch (props.variant) {
    case "danger":
      return "pi pi-exclamation-triangle";
    case "warning":
      return "pi pi-exclamation-circle";
    case "info":
      return "pi pi-info-circle";
    default:
      return "pi pi-question-circle";
  }
});

const confirmButtonClass = computed(() => {
  switch (props.variant) {
    case "danger":
      return "btn-danger";
    case "warning":
      return "btn-warning";
    case "info":
      return "btn-primary";
    default:
      return "btn-primary";
  }
});
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.confirm-modal {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  width: 420px;
  max-width: 90vw;
  animation: slideIn 0.2s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-5);
  padding-bottom: var(--space-3);
}

.header-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-icon i {
  font-size: 1.5rem;
}

.header-icon.danger {
  background: var(--color-danger-100);
  color: var(--color-danger-600);
}

.header-icon.warning {
  background: var(--color-warning-100);
  color: var(--color-warning-600);
}

.header-icon.info {
  background: var(--color-primary-100);
  color: var(--color-primary-600);
}

.modal-header h3 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
}

.modal-body {
  padding: 0 var(--space-5);
  padding-bottom: var(--space-4);
}

.modal-body p {
  margin: 0;
  color: var(--color-gray-600);
  line-height: 1.6;
}

.warning-text {
  margin-top: var(--space-2) !important;
  padding: var(--space-2) var(--space-3);
  background: var(--color-warning-50);
  color: var(--color-warning-700);
  border-radius: var(--radius-md);
  font-size: var(--text-sm);
}

.modal-footer {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-gray-100);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
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

.btn-warning {
  background: var(--color-warning-500);
  color: white;
}

.btn-warning:hover:not(:disabled) {
  background: var(--color-warning-600);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
