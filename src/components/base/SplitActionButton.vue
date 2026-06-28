<template>
  <div ref="rootEl" class="split-action">
    <button class="btn main-btn" :class="btnClass" :disabled="disabled" @click="select('deployment')">
      <i :class="icon" /> {{ label }}
    </button>
    <button
      class="btn caret-btn"
      :class="btnClass"
      :disabled="disabled || !services.length"
      :title="`${label} a single service`"
      @click.stop="open = !open"
    >
      <i class="pi pi-chevron-down" />
    </button>
    <Transition name="menu">
      <div v-if="open" class="split-menu">
        <button class="menu-item" @click="select('deployment')">
          <i class="pi pi-clone" />
          Entire deployment
        </button>
        <div class="menu-divider" />
        <button v-for="svc in services" :key="svc" class="menu-item" @click="select(svc)">
          <i class="pi pi-box" />
          {{ svc }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from "vue";

withDefaults(
  defineProps<{
    label: string;
    icon: string;
    btnClass?: string;
    disabled?: boolean;
    services?: string[];
  }>(),
  {
    btnClass: "btn-secondary",
    disabled: false,
    services: () => [],
  },
);

const emit = defineEmits<{
  action: [scope: string];
}>();

const open = ref(false);
const rootEl = ref<HTMLElement | null>(null);

const select = (scope: string) => {
  open.value = false;
  emit("action", scope);
};

const onDocumentClick = (event: MouseEvent) => {
  if (open.value && rootEl.value && !rootEl.value.contains(event.target as Node)) {
    open.value = false;
  }
};

onMounted(() => document.addEventListener("click", onDocumentClick));
onBeforeUnmount(() => document.removeEventListener("click", onDocumentClick));
</script>

<style scoped>
.split-action {
  position: relative;
  display: inline-flex;
}

.main-btn {
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.caret-btn {
  border-top-left-radius: 0;
  border-bottom-left-radius: 0;
  padding-left: 0.5rem;
  padding-right: 0.5rem;
  margin-left: 1px;
}

.split-menu {
  position: absolute;
  top: calc(100% + 4px);
  right: 0;
  min-width: 200px;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md, 8px);
  box-shadow:
    0 4px 6px rgba(0, 0, 0, 0.05),
    0 10px 24px rgba(0, 0, 0, 0.1);
  padding: 0.25rem;
  z-index: 50;
}

.menu-item {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  width: 100%;
  padding: 0.5rem 0.75rem;
  border: none;
  background: none;
  border-radius: var(--radius-sm, 6px);
  font-size: 0.85rem;
  color: var(--text);
  cursor: pointer;
  text-align: left;
}

.menu-item:hover {
  background: var(--surface-hover, #f1f5f9);
}

.menu-item i {
  font-size: 0.8rem;
  color: var(--text-muted);
}

.menu-divider {
  height: 1px;
  background: var(--border);
  margin: 0.25rem 0;
}

.menu-enter-active,
.menu-leave-active {
  transition:
    opacity 0.12s ease,
    transform 0.12s ease;
}

.menu-enter-from,
.menu-leave-to {
  opacity: 0;
  transform: translateY(-4px);
}
</style>
