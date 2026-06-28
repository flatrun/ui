<template>
  <Teleport to="body">
    <Transition name="slide-panel">
      <div v-if="visible" class="panel-overlay" @click.self="handleOverlayClick">
        <aside class="panel" :class="`panel-${size}`" role="dialog" aria-modal="true">
          <header class="panel-header">
            <div class="panel-header-content">
              <slot name="header">
                <h3 class="panel-title">{{ title }}</h3>
              </slot>
            </div>
            <button v-if="showClose" class="panel-close" :disabled="closeDisabled" @click="emit('close')">
              <Icon name="x" :size="18" />
            </button>
          </header>

          <div class="panel-body">
            <slot />
          </div>

          <footer v-if="$slots.footer" class="panel-footer">
            <slot name="footer" />
          </footer>
        </aside>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import Icon from "@/components/base/Icon.vue";

const props = withDefaults(
  defineProps<{
    visible: boolean;
    title?: string;
    size?: "sm" | "md" | "lg" | "xl";
    showClose?: boolean;
    closeDisabled?: boolean;
    closeOnOverlay?: boolean;
  }>(),
  {
    title: "",
    size: "md",
    showClose: true,
    closeDisabled: false,
    closeOnOverlay: true,
  },
);

const emit = defineEmits(["close"]);

const handleOverlayClick = () => {
  if (props.closeOnOverlay && !props.closeDisabled) {
    emit("close");
  }
};
</script>

<style scoped>
.panel-overlay {
  position: fixed;
  inset: 0;
  background: rgba(15, 23, 42, 0.4);
  backdrop-filter: blur(4px);
  display: flex;
  justify-content: flex-end;
  z-index: var(--z-modal);
}

.panel {
  width: 480px;
  max-width: 92vw;
  height: 100%;
  background: var(--surface-raised);
  border-left: 1px solid var(--border);
  box-shadow: var(--shadow-2xl);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.panel-sm {
  width: 380px;
}

.panel-lg {
  width: 620px;
}

.panel-xl {
  width: 700px;
}

.panel-header {
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--border-subtle);
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--space-4);
  flex-shrink: 0;
}

.panel-header-content {
  flex: 1;
  min-width: 0;
}

.panel-title {
  font-size: var(--text-2xl);
  font-weight: var(--font-semibold);
  color: var(--text);
  margin: 0;
}

.panel-close {
  background: none;
  border: none;
  color: var(--text-subtle);
  cursor: pointer;
  padding: var(--space-2);
  border-radius: var(--radius-md);
  transition: all var(--transition-base);
  flex-shrink: 0;
  display: flex;
}

.panel-close:hover:not(:disabled) {
  background: var(--surface-sunken);
  color: var(--text);
}

.panel-close:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.panel-body {
  flex: 1;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.panel-footer {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--border-subtle);
  background: var(--surface-sunken);
  flex-shrink: 0;
}

.slide-panel-enter-active,
.slide-panel-leave-active {
  transition: opacity var(--transition-base);
}

.slide-panel-enter-from,
.slide-panel-leave-to {
  opacity: 0;
}

.slide-panel-enter-active .panel,
.slide-panel-leave-active .panel {
  transition: transform var(--transition-slow) cubic-bezier(0.16, 1, 0.3, 1);
}

.slide-panel-enter-from .panel,
.slide-panel-leave-to .panel {
  transform: translateX(100%);
}

@media (max-width: 640px) {
  .panel,
  .panel-sm,
  .panel-lg,
  .panel-xl {
    width: 100%;
    max-width: 100%;
  }
}

@media (prefers-reduced-motion: reduce) {
  .slide-panel-enter-active .panel,
  .slide-panel-leave-active .panel {
    transition: none;
  }
}
</style>
