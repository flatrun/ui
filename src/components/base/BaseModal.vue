<template>
  <Teleport to="body">
    <div
      v-if="visible"
      class="modal-overlay"
      @click.self="handleOverlayClick"
    >
      <div
        class="modal-container"
        :class="[sizeClass]"
      >
        <div class="modal-header">
          <div class="header-content">
            <slot name="header">
              <h3>
                <i
                  v-if="icon"
                  :class="icon"
                />
                {{ title }}
              </h3>
            </slot>
          </div>
          <button
            v-if="showClose"
            class="close-btn"
            :disabled="closeDisabled"
            @click="emit('close')"
          >
            <i class="pi pi-times" />
          </button>
        </div>

        <div class="modal-body">
          <slot />
        </div>

        <div
          v-if="$slots.footer"
          class="modal-footer"
        >
          <slot name="footer" />
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed } from "vue";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title?: string;
    icon?: string;
    size?: "sm" | "md" | "lg" | "xl";
    showClose?: boolean;
    closeDisabled?: boolean;
    closeOnOverlay?: boolean;
  }>(),
  {
    title: "",
    icon: "",
    size: "md",
    showClose: true,
    closeDisabled: false,
    closeOnOverlay: true,
  },
);

const emit = defineEmits(["close"]);

const sizeClass = computed(() => `modal-${props.size}`);

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
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: var(--space-8);
}

.modal-container {
  background: white;
  border-radius: var(--radius-lg);
  display: flex;
  flex-direction: column;
  box-shadow: var(--shadow-xl);
  width: 100%;
  max-height: 90vh;
}

.modal-sm {
  max-width: 400px;
}

.modal-md {
  max-width: 600px;
}

.modal-lg {
  max-width: 800px;
}

.modal-xl {
  max-width: 1000px;
}

.modal-header {
  padding: var(--space-5) var(--space-6);
  border-bottom: 1px solid var(--color-gray-200);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.header-content {
  flex: 1;
  min-width: 0;
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-xl);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0;
}

.modal-header h3 i {
  color: var(--color-gray-500);
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

.modal-footer {
  padding: var(--space-4) var(--space-6);
  border-top: 1px solid var(--color-gray-200);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}
</style>
