<template>
  <div class="language-dropdown" @keydown.esc="closeMenu">
    <button class="language-trigger" type="button" :aria-expanded="isOpen" aria-haspopup="menu" @click="toggleMenu">
      <img class="language-flag" :src="currentLanguage.flagPath" :alt="currentLanguage.code" />
      <span class="language-label">{{ currentLanguage.label }}</span>
      <i class="pi pi-chevron-down" />
    </button>
    <div v-if="isOpen" class="language-menu" role="menu">
      <button
        v-for="lang in languages"
        :key="lang.code"
        class="language-item"
        type="button"
        role="menuitem"
        @click="selectLanguage(lang)"
      >
        <img class="language-flag" :src="lang.flagPath" :alt="lang.code" />
        <span class="language-label">{{ lang.label }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useLanguage } from "@/composables/useLanguage";
import type { LanguageConfig } from "@/config/languages";

const emit = defineEmits<{
  (e: "change", language: LanguageConfig): void;
}>();

const { languages, currentLanguage, setLanguage } = useLanguage();

const isOpen = ref(false);

const toggleMenu = () => {
  isOpen.value = !isOpen.value;
};

const closeMenu = () => {
  isOpen.value = false;
};

const selectLanguage = (lang: LanguageConfig) => {
  setLanguage(lang.code);
  isOpen.value = false;
  emit("change", lang);
};
</script>

<style scoped>
.language-dropdown {
  position: relative;
}

.language-trigger {
  height: 36px;
  padding: 0 0.75rem;
  border: 1px solid #e2e8f0;
  background: white;
  border-radius: var(--radius-md);
  color: #0f172a;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
  transition:
    background 0.2s,
    border-color 0.2s,
    box-shadow 0.2s;
}

.language-trigger:hover {
  background: #f8fafc;
  border-color: #cbd5e1;
}

.language-trigger:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.25);
  border-color: #3b82f6;
}

.language-trigger i {
  font-size: 0.75rem;
  color: #64748b;
}

.language-flag {
  width: 20px;
  height: 14px;
  object-fit: cover;
  border-radius: 2px;
  flex-shrink: 0;
}

.language-label {
  font-size: 0.8125rem;
  font-weight: 500;
  color: #0f172a;
  white-space: nowrap;
}

.language-menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  min-width: 200px;
  background: #ffffff;
  border: 1px solid #e2e8f0;
  border-radius: var(--radius-md);
  box-shadow: 0 12px 28px rgba(2, 6, 23, 0.35);
  padding: 0.5rem;
  z-index: 1000;
}

.language-item {
  width: 100%;
  background: transparent;
  border: none;
  color: #0f172a;
  display: flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.75rem;
  border-radius: var(--radius-sm);
  cursor: pointer;
  text-align: left;
  transition:
    background 0.15s,
    color 0.15s;
}

.language-item:hover {
  background: rgba(59, 130, 246, 0.12);
  color: #0f172a;
}

.language-item:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px rgba(96, 165, 250, 0.25);
}

.language-menu .language-label {
  color: #0f172a;
}
</style>
