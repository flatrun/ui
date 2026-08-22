<template>
  <details ref="menu" class="user-menu">
    <summary class="user-chip" aria-label="Open user menu">
      <span class="user-chip-avatar">{{ initial }}</span>
      <span class="user-chip-copy">
        <strong>{{ username || "Account" }}</strong>
        <small v-if="role">{{ role }}</small>
      </span>
      <Icon name="chevron-down" :size="14" />
    </summary>
    <div class="user-menu-panel">
      <div class="user-menu-identity">
        <strong>{{ username || "Account" }}</strong>
        <span v-if="role">{{ role }}</span>
      </div>
      <button type="button" @click="selectTheme">
        <Icon :name="theme === 'dark' ? 'sun' : 'moon'" :size="16" />
        {{ theme === "dark" ? "Use light theme" : "Use dark theme" }}
      </button>
      <button type="button" class="sign-out" @click="selectSignOut">
        <Icon name="log-out" :size="16" />
        Sign out
      </button>
    </div>
  </details>
</template>

<script setup lang="ts">
import { computed, ref } from "vue";
import Icon from "@/components/base/Icon.vue";

const props = defineProps<{
  username?: string;
  role?: string;
  theme: "light" | "dark";
}>();

const emit = defineEmits<{
  "toggle-theme": [];
  "sign-out": [];
}>();

const menu = ref<HTMLDetailsElement | null>(null);
const initial = computed(() => (props.username || "A").trim().charAt(0).toUpperCase());

function close() {
  if (menu.value) menu.value.open = false;
}

function selectTheme() {
  emit("toggle-theme");
  close();
}

function selectSignOut() {
  emit("sign-out");
  close();
}
</script>

<style scoped>
.user-menu {
  position: relative;
}

.user-chip {
  display: flex;
  min-height: 36px;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-2);
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text);
  cursor: pointer;
  list-style: none;
}

.user-chip::-webkit-details-marker {
  display: none;
}

.user-chip:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: 2px;
}

.user-chip-avatar {
  display: grid;
  width: 26px;
  height: 26px;
  place-items: center;
  background: var(--accent);
  border-radius: var(--radius-xs);
  color: var(--accent-contrast);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
}

.user-chip-copy {
  display: flex;
  min-width: 70px;
  flex-direction: column;
  line-height: 1.1;
  text-align: left;
}

.user-chip-copy strong {
  max-width: 130px;
  overflow: hidden;
  font-size: var(--text-sm);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.user-chip-copy small,
.user-menu-identity span {
  color: var(--text-muted);
  font-size: var(--text-xs);
  text-transform: capitalize;
}

.user-menu-panel {
  position: absolute;
  top: calc(100% + var(--space-2));
  right: 0;
  z-index: 60;
  width: 210px;
  padding: var(--space-2);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  box-shadow: var(--shadow-lg);
}

.user-menu-identity {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
  padding: var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
}

.user-menu-panel button {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--space-2);
  margin-top: var(--space-1);
  padding: var(--space-2);
  background: transparent;
  border: 0;
  border-radius: var(--radius-xs);
  color: var(--text);
  cursor: pointer;
  font: inherit;
  text-align: left;
}

.user-menu-panel button:hover {
  background: var(--surface-inset);
}

.user-menu-panel button:focus-visible {
  outline: 2px solid var(--accent);
  outline-offset: -2px;
}

.user-menu-panel .sign-out {
  color: var(--c-red);
}

@media (max-width: 720px) {
  .user-chip-copy {
    display: none;
  }
}
</style>
