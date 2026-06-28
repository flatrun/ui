<template>
  <button v-if="!store.visible" class="assist-fab" title="Ask the AI assistant" @click="open">
    <Icon name="bot" :size="24" />
  </button>
</template>

<script setup lang="ts">
import Icon from "@/components/base/Icon.vue";
import { useAssistStore } from "@/stores/assist";

const store = useAssistStore();

const open = () => {
  store.open({ scope: "system", subject: "this instance" });
};
</script>

<style scoped>
.assist-fab {
  position: fixed;
  bottom: 1.5rem;
  right: 1.5rem;
  width: 56px;
  height: 56px;
  border-radius: 50%;
  background: var(--accent);
  color: var(--accent-contrast);
  border: none;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: var(--shadow-lg);
  z-index: var(--z-sticky);
  transition:
    transform var(--transition-fast),
    box-shadow var(--transition-fast),
    background var(--transition-fast);
}

.assist-fab:hover {
  transform: translateY(-2px);
  box-shadow: var(--shadow-xl);
  background: var(--accent-hover);
}

.assist-fab:active {
  transform: translateY(0);
}

@media (prefers-reduced-motion: reduce) {
  .assist-fab {
    transition: none;
  }
}
</style>
