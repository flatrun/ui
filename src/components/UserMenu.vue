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
      <div class="user-menu-group" role="radiogroup" aria-label="Style">
        <span class="user-menu-label">Style</span>
        <button
          v-for="option in styles"
          :key="option.id"
          type="button"
          role="radio"
          :aria-checked="option.id === styleId"
          :class="{ active: option.id === styleId }"
          @click="emit('select-style', option.id)"
        >
          <span class="style-swatch" :data-swatch="option.id" />
          <span class="style-copy">
            {{ option.label }}
            <small>{{ option.description }}</small>
          </span>
          <Icon v-if="option.id === styleId" name="check" :size="14" class="theme-check" />
        </button>
      </div>
      <div class="user-menu-group">
        <span class="user-menu-label">Appearance</span>
        <div class="scheme-switch" role="radiogroup" aria-label="Appearance">
          <button
            v-for="option in schemeOptions"
            :key="option.id"
            type="button"
            role="radio"
            :aria-checked="option.id === scheme"
            :class="{ active: option.id === scheme }"
            :title="option.label"
            @click="emit('select-scheme', option.id)"
          >
            <Icon :name="option.icon" :size="14" />
            {{ option.label }}
          </button>
        </div>
      </div>
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
import type { SchemePreference, StyleDefinition } from "@/themes/registry";

const props = defineProps<{
  username?: string;
  role?: string;
  styleId: string;
  styles: StyleDefinition[];
  scheme: SchemePreference;
}>();

const emit = defineEmits<{
  "select-style": [id: string];
  "select-scheme": [preference: SchemePreference];
  "sign-out": [];
}>();

const menu = ref<HTMLDetailsElement | null>(null);
const schemeOptions: { id: SchemePreference; label: string; icon: string }[] = [
  { id: "light", label: "Light", icon: "sun" },
  { id: "dark", label: "Dark", icon: "moon" },
  { id: "system", label: "Auto", icon: "monitor" },
];

const initial = computed(() => (props.username || "A").trim().charAt(0).toUpperCase());

function close() {
  if (menu.value) menu.value.open = false;
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
  width: 230px;
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

.user-menu-group {
  padding: var(--space-1) 0;
  border-bottom: 1px solid var(--border-subtle);
}

.user-menu-label {
  display: block;
  padding: var(--space-2) var(--space-2) 0;
  color: var(--text-subtle);
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.04em;
}

.user-menu-panel .user-menu-group button.active {
  background: var(--accent-subtle);
}

.style-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.2;
}

.style-copy small {
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.scheme-switch {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 2px;
  margin: var(--space-1) var(--space-2) var(--space-1);
  padding: 2px;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

.user-menu-panel .scheme-switch button {
  justify-content: center;
  gap: 4px;
  margin: 0;
  padding: var(--space-1);
  color: var(--text-muted);
  font-size: var(--text-xs);
}

.user-menu-panel .scheme-switch button.active {
  background: var(--surface-raised);
  color: var(--text);
}

.theme-check {
  margin-left: auto;
  color: var(--accent);
}

.style-swatch {
  width: 14px;
  height: 14px;
  flex-shrink: 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
}

.style-swatch[data-swatch="modern"] {
  background: linear-gradient(90deg, #0f0f10 0 30%, #fafafa 30%);
}

.style-swatch[data-swatch="classic"] {
  border-radius: var(--radius-sm);
  background: linear-gradient(90deg, #0f172a 0 30%, #f8fafc 30%);
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
