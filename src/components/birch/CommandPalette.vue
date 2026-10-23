<template>
  <Teleport to="body">
    <div v-if="open" class="palette-backdrop" @mousedown.self="close">
      <div class="palette" role="dialog" aria-label="Command palette">
        <div class="palette-input">
          <Icon name="search" :size="16" />
          <input
            ref="input"
            v-model="query"
            placeholder="Search projects, pages and actions..."
            aria-label="Search"
            @keydown.down.prevent="move(1)"
            @keydown.up.prevent="move(-1)"
            @keydown.enter.prevent="choose(results[active])"
            @keydown.esc.prevent="close"
          />
          <kbd>Esc</kbd>
        </div>
        <ul class="palette-results" role="listbox">
          <li v-if="!results.length" class="palette-empty">Nothing matches "{{ query }}".</li>
          <li
            v-for="(item, i) in results"
            :key="item.key"
            role="option"
            :aria-selected="i === active"
            :class="{ active: i === active }"
            @mouseenter="active = i"
            @click="choose(item)"
          >
            <Icon :name="item.icon" :size="15" />
            <span class="label">{{ item.label }}</span>
            <span class="group">{{ item.group }}</span>
          </li>
        </ul>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { computed, nextTick, ref, watch } from "vue";
import { useRouter } from "vue-router";
import Icon from "@/components/base/Icon.vue";
import { useSearchIndex, type SearchItem } from "@/navigation/search";

export interface PaletteAction {
  key: string;
  label: string;
  icon: string;
  run: () => void;
}

const props = defineProps<{ actions: PaletteAction[] }>();
const open = defineModel<boolean>("open", { default: false });

const router = useRouter();
const index = useSearchIndex();
const query = ref("");
const active = ref(0);
const input = ref<HTMLInputElement | null>(null);

type Result = SearchItem & { run?: () => void };

const results = computed<Result[]>(() => {
  const q = query.value.trim().toLowerCase();
  const actions: Result[] = props.actions
    .filter((a) => !q || a.label.toLowerCase().includes(q))
    .map((a) => ({ key: `action:${a.key}`, label: a.label, icon: a.icon, group: "Action", path: "", run: a.run }));
  if (q) return [...index.search(q, 12), ...actions].slice(0, 14);
  const projects = index.entities.value.filter((e) => e.key.startsWith("Deployment:")).slice(0, 6);
  return [...projects, ...actions, ...index.pages.value.slice(0, 6)].slice(0, 14);
});

function move(delta: number) {
  const n = results.value.length;
  if (n) active.value = (active.value + delta + n) % n;
}

function close() {
  open.value = false;
}

function choose(item?: Result) {
  if (!item) return;
  close();
  if (item.run) item.run();
  else router.push(item.path);
}

watch(open, async (isOpen) => {
  if (!isOpen) return;
  query.value = "";
  active.value = 0;
  index.load();
  await nextTick();
  input.value?.focus();
});

watch(query, () => (active.value = 0));
</script>

<style scoped>
.palette-backdrop {
  position: fixed;
  inset: 0;
  z-index: var(--z-modal);
  display: flex;
  justify-content: center;
  padding: 8px var(--space-4) 0;
  background: rgba(0, 0, 0, 0.35);
}

.palette {
  width: 640px;
  max-width: 100%;
  max-height: 60vh;
  display: flex;
  flex-direction: column;
  align-self: flex-start;
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  transform-origin: top center;
  animation: palette-drop 140ms ease-out;
}

@keyframes palette-drop {
  from {
    opacity: 0;
    transform: translateY(-6px) scaleY(0.97);
  }
}

@media (prefers-reduced-motion: reduce) {
  .palette {
    animation: none;
  }
}

.palette-input {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-3);
  border-bottom: 1px solid var(--border);
  color: var(--text-muted);
}

.palette-input input {
  flex: 1;
  height: 44px;
  background: transparent;
  border: 0;
  color: var(--text);
  font: inherit;
  font-size: var(--text-md);
  outline: none;
}

kbd {
  padding: 1px 6px;
  border: 1px solid var(--border);
  border-radius: var(--radius-xs);
  color: var(--text-subtle);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.palette-results {
  overflow-y: auto;
  margin: 0;
  padding: var(--space-1);
  list-style: none;
}

.palette-results li {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 7px var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--text);
  cursor: pointer;
  font-size: var(--text-base);
}

.palette-results li.active {
  background: var(--surface-inset);
}

.palette-results li .app-icon {
  color: var(--text-muted);
}

.group {
  margin-left: auto;
  color: var(--text-subtle);
  font-size: var(--text-xs);
}

.palette-empty {
  color: var(--text-muted) !important;
  cursor: default !important;
}
</style>
