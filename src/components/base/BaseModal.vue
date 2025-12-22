<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="handleOverlayClick">
        <div class="modal-container" :class="[sizeClass, { 'modal-fullscreen': fullscreen, 'no-radius': noPadding }]">
          <div class="modal-header" :class="{ 'header-accent': accentHeader }">
            <div class="header-content">
              <slot name="header">
                <div class="header-title">
                  <div v-if="icon" class="header-icon" :class="iconColorClass">
                    <i :class="icon" />
                  </div>
                  <div class="header-text">
                    <h3>{{ title }}</h3>
                    <p v-if="subtitle" class="header-subtitle">
                      {{ subtitle }}
                    </p>
                  </div>
                </div>
              </slot>
            </div>
            <button v-if="showClose" class="close-btn" :disabled="closeDisabled" @click="emit('close')">
              <i class="pi pi-times" />
            </button>
          </div>

          <div class="modal-body" :class="{ 'no-padding': noPadding }">
            <slot />
          </div>

          <div v-if="$slots.footer" class="modal-footer">
            <slot name="footer" />
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
    title?: string;
    subtitle?: string;
    icon?: string;
    iconColor?: "primary" | "success" | "warning" | "danger" | "info";
    size?: "sm" | "md" | "lg" | "xl" | "2xl" | "3xl";
    showClose?: boolean;
    closeDisabled?: boolean;
    closeOnOverlay?: boolean;
    accentHeader?: boolean;
    fullscreen?: boolean;
    noPadding?: boolean;
  }>(),
  {
    title: "",
    subtitle: "",
    icon: "",
    iconColor: "primary",
    size: "md",
    showClose: true,
    closeDisabled: false,
    closeOnOverlay: true,
    accentHeader: false,
    fullscreen: false,
    noPadding: false,
  },
);

const emit = defineEmits(["close"]);

const sizeClass = computed(() => `modal-${props.size}`);
const iconColorClass = computed(() => `icon-${props.iconColor}`);

const handleOverlayClick = () => {
  if (props.closeOnOverlay && !props.closeDisabled) {
    emit("close");
  }
};
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(15, 23, 42, 0.7);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-6);
}

.modal-container {
  background: white;
  border-radius: var(--radius-xl);
  display: flex;
  flex-direction: column;
  box-shadow:
    0 0 0 1px rgba(0, 0, 0, 0.03),
    0 2px 4px rgba(0, 0, 0, 0.03),
    0 12px 24px rgba(0, 0, 0, 0.08),
    0 24px 48px rgba(0, 0, 0, 0.12);
  width: 100%;
  max-height: 90vh;
  overflow: hidden;
}

.modal-container.no-radius {
  border-radius: 0;
}

.modal-sm {
  max-width: 400px;
}

.modal-md {
  max-width: 560px;
}

.modal-lg {
  max-width: 720px;
}

.modal-xl {
  max-width: 900px;
}

.modal-2xl {
  max-width: 1100px;
}

.modal-3xl {
  max-width: 1280px;
}

.modal-fullscreen {
  max-width: calc(100vw - var(--space-8));
  max-height: calc(100vh - var(--space-8));
}

.modal-header {
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-gray-100);
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: var(--space-4);
  background: linear-gradient(to bottom, var(--color-gray-50), white);
  flex-shrink: 0;
}

.modal-header.header-accent {
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  border-bottom: none;
}

.modal-header.header-accent .header-text h3 {
  color: white;
}

.modal-header.header-accent .header-subtitle {
  color: rgba(255, 255, 255, 0.8);
}

.modal-header.header-accent .close-btn {
  color: rgba(255, 255, 255, 0.7);
}

.modal-header.header-accent .close-btn:hover:not(:disabled) {
  background: rgba(255, 255, 255, 0.1);
  color: white;
}

.header-content {
  flex: 1;
  min-width: 0;
}

.header-title {
  display: flex;
  align-items: flex-start;
  gap: var(--space-4);
}

.header-icon {
  width: 44px;
  height: 44px;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.header-icon i {
  font-size: 1.25rem;
}

.header-icon.icon-primary {
  background: linear-gradient(135deg, var(--color-primary-100), var(--color-primary-50));
  color: var(--color-primary-600);
  box-shadow: 0 2px 8px rgba(79, 70, 229, 0.15);
}

.header-icon.icon-success {
  background: linear-gradient(135deg, var(--color-success-100), var(--color-success-50));
  color: var(--color-success-600);
  box-shadow: 0 2px 8px rgba(16, 185, 129, 0.15);
}

.header-icon.icon-warning {
  background: linear-gradient(135deg, var(--color-warning-100), var(--color-warning-50));
  color: var(--color-warning-600);
  box-shadow: 0 2px 8px rgba(245, 158, 11, 0.15);
}

.header-icon.icon-danger {
  background: linear-gradient(135deg, var(--color-danger-100), var(--color-danger-50));
  color: var(--color-danger-600);
  box-shadow: 0 2px 8px rgba(239, 68, 68, 0.15);
}

.header-icon.icon-info {
  background: linear-gradient(135deg, var(--color-info-100), var(--color-info-50));
  color: var(--color-info-600);
  box-shadow: 0 2px 8px rgba(59, 130, 246, 0.15);
}

.header-accent .header-icon {
  background: rgba(255, 255, 255, 0.2);
  color: white;
}

.header-text {
  flex: 1;
  min-width: 0;
}

.header-text h3 {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0;
  line-height: 1.3;
}

.header-subtitle {
  font-size: var(--text-md);
  color: var(--color-gray-500);
  margin: var(--space-1) 0 0;
  line-height: 1.4;
}

.close-btn {
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  flex-shrink: 0;
  margin: calc(var(--space-1) * -1);
}

.close-btn:hover:not(:disabled) {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.close-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.modal-body {
  padding: var(--space-6);
  flex: 1;
  overflow-y: auto;
}

.modal-body.no-padding {
  padding: 0;
}

.modal-footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-gray-100);
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: var(--space-3);
  background: var(--color-gray-50);
  flex-shrink: 0;
}

/* Transition animations */
.modal-enter-active {
  animation: modalOverlayIn 200ms ease-out;
}

.modal-leave-active {
  animation: modalOverlayIn 150ms ease-in reverse;
}

.modal-enter-active .modal-container {
  animation: modalSlideIn 300ms cubic-bezier(0.16, 1, 0.3, 1);
}

.modal-leave-active .modal-container {
  animation: modalSlideIn 200ms ease-in reverse;
}

@keyframes modalOverlayIn {
  from {
    opacity: 0;
  }
  to {
    opacity: 1;
  }
}

@keyframes modalSlideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}

@media (max-width: 640px) {
  .modal-overlay {
    padding: var(--space-4);
  }

  .modal-container {
    max-height: calc(100vh - var(--space-8));
  }

  .modal-header {
    padding: var(--space-4) var(--space-5);
  }

  .modal-body {
    padding: var(--space-5);
  }

  .modal-footer {
    padding: var(--space-3) var(--space-5);
  }

  .header-icon {
    width: 40px;
    height: 40px;
  }

  .header-text h3 {
    font-size: var(--text-xl);
  }
}
</style>
