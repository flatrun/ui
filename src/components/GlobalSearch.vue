<template>
  <div ref="rootEl" class="global-search">
    <div class="search-field" :class="{ open: open && results.length > 0 }">
      <Icon name="search" :size="16" class="search-icon" />
      <input
        ref="inputEl"
        v-model="query"
        type="text"
        class="search-input"
        placeholder="Search deployments, containers, images..."
        @focus="onFocus"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="choose"
        @keydown.esc="close"
      />
      <kbd class="search-kbd">{{ kbdHint }}</kbd>
    </div>

    <div v-if="open && results.length" class="search-results">
      <button
        v-for="(r, i) in results"
        :key="r.key"
        type="button"
        class="search-result"
        :class="{ active: i === activeIndex }"
        @mousedown.prevent="go(r)"
        @mouseenter="activeIndex = i"
      >
        <Icon :name="r.icon" :size="16" class="result-icon" />
        <span class="result-label">{{ r.label }}</span>
        <span class="result-group">{{ r.group }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import Icon from "@/components/base/Icon.vue";
import { useSearchIndex, type SearchItem } from "@/navigation/search";

const router = useRouter();
const index = useSearchIndex();

const rootEl = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);
const query = ref("");
const open = ref(false);
const activeIndex = ref(0);

// Keep the keyboard highlight valid as the result set shrinks while typing.
watch(query, () => {
  activeIndex.value = 0;
});

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const kbdHint = computed(() => (isMac ? "⌘K" : "Ctrl K"));

const results = computed<SearchItem[]>(() => index.search(query.value));

const move = (delta: number) => {
  if (!results.value.length) return;
  open.value = true;
  activeIndex.value = (activeIndex.value + delta + results.value.length) % results.value.length;
};

const go = (dest: SearchItem) => {
  router.push(dest.path);
  query.value = "";
  open.value = false;
  inputEl.value?.blur();
};

const onFocus = () => {
  open.value = true;
  index.load();
};

const choose = () => {
  const dest = results.value[activeIndex.value];
  if (dest) go(dest);
};

const close = () => {
  open.value = false;
  inputEl.value?.blur();
};

const onDocClick = (e: MouseEvent) => {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) open.value = false;
};

const onKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    inputEl.value?.focus();
    open.value = true;
  }
};

onMounted(() => {
  document.addEventListener("click", onDocClick);
  document.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick);
  document.removeEventListener("keydown", onKeydown);
});
</script>

<style scoped>
.global-search {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 440px;
}

.search-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.75rem;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base),
    background var(--transition-base);
}

.search-field:focus-within {
  background: var(--surface);
  border-color: var(--accent);
  box-shadow: 0 0 0 var(--ring-width) var(--ring-color);
}

.search-field.open {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.search-icon {
  color: var(--text-subtle);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: none;
  outline: none;
  font-size: var(--text-md);
  color: var(--text);
  min-width: 0;
}

.search-input::placeholder {
  color: var(--text-subtle);
}

.search-kbd {
  font-size: var(--text-xs);
  color: var(--text-subtle);
  background: var(--surface-inset);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.05rem 0.35rem;
  flex-shrink: 0;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--surface-raised);
  border: 1px solid var(--accent);
  border-top: none;
  border-bottom-left-radius: var(--radius-lg);
  border-bottom-right-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  z-index: var(--z-dropdown);
}

.search-result {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  color: var(--text);
  font-size: var(--text-md);
}

.search-result.active {
  background: var(--accent-subtle);
}

.result-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.result-label {
  flex: 1;
}

.result-group {
  font-size: var(--text-xs);
  color: var(--text-subtle);
}

@media (max-width: 900px) {
  .global-search {
    display: none;
  }
}
</style>
