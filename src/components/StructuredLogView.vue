<template>
  <div class="structured-logs">
    <div class="level-bar">
      <button
        v-for="lvl in levelFilters"
        :key="lvl.value"
        class="level-chip"
        :class="[lvl.value, { active: activeLevels.has(lvl.value) }]"
        @click="toggleLevel(lvl.value)"
      >
        {{ lvl.label }}
        <span v-if="counts[lvl.value]" class="level-count">{{ counts[lvl.value] }}</span>
      </button>
      <span v-if="truncated" class="truncation-note">
        showing last {{ visibleEntries.length }} of {{ filtered.length }}
      </span>
    </div>

    <div ref="scrollBox" class="rows" @scroll="onScroll">
      <div
        v-for="entry in visibleEntries"
        :key="entry.key"
        class="row"
        :class="[levelClass(entry.record.level), { expanded: expanded.has(entry.key) }]"
        @click="toggleExpand(entry.key)"
      >
        <div class="row-head">
          <i class="chevron" :class="expanded.has(entry.key) ? 'pi pi-chevron-down' : 'pi pi-chevron-right'" />
          <span v-if="entry.record.timestamp" class="ts">{{ formatTs(entry.record.timestamp) }}</span>
          <span v-if="entry.record.service" class="service" :title="entry.record.service">{{
            entry.record.service
          }}</span>
          <span class="level-tag" :class="levelClass(entry.record.level)">{{ entry.record.level || "log" }}</span>
          <span class="msg">{{ entry.record.message }}</span>
          <span v-if="entry.lines.length > 1" class="line-count" title="Lines folded into this entry">
            +{{ entry.lines.length - 1 }}
          </span>
        </div>

        <div v-if="expanded.has(entry.key)" class="row-detail" @click.stop>
          <div v-if="entry.record.fields" class="fields">
            <div v-for="(val, key) in entry.record.fields" :key="key" class="field">
              <span class="field-key">{{ key }}</span>
              <span class="field-val">{{ val }}</span>
            </div>
          </div>
          <pre class="raw">{{ entry.lines.join("\n") }}</pre>
          <div class="row-actions">
            <button class="copy-btn" @click.stop="copyEntry(entry)">
              <i :class="copiedKey === entry.key ? 'pi pi-check' : 'pi pi-copy'" />
              {{ copiedKey === entry.key ? "Copied" : "Copy entry" }}
            </button>
            <button class="copy-btn" @click.stop="emit('debug', entry)">
              <Sparkles :size="13" />
              Debug with AI
            </button>
          </div>
        </div>
      </div>

      <div v-if="!filtered.length" class="empty">
        <i class="pi pi-file-edit" />
        <p>{{ emptyMessage }}</p>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, nextTick } from "vue";
import { Sparkles } from "lucide-vue-next";
import { groupLogRecords, type LogRecord, type LogEntry } from "@/types/logs";

const emit = defineEmits<{ debug: [entry: LogEntry] }>();

const props = withDefaults(
  defineProps<{
    records: LogRecord[];
    autoScroll?: boolean;
    searchQuery?: string;
    emptyMessage?: string;
    renderLimit?: number;
  }>(),
  {
    autoScroll: true,
    searchQuery: "",
    emptyMessage: "No logs available",
    renderLimit: 1500,
  },
);

const levelFilters = [
  { value: "error", label: "Errors" },
  { value: "warn", label: "Warnings" },
  { value: "info", label: "Info" },
  { value: "debug", label: "Debug" },
] as const;

const scrollBox = ref<HTMLElement | null>(null);
const expanded = ref<Set<number>>(new Set());
const activeLevels = ref<Set<string>>(new Set());
const pinnedToBottom = ref(true);

const entries = computed(() => groupLogRecords(props.records));

const counts = computed(() => {
  const c: Record<string, number> = { error: 0, warn: 0, info: 0, debug: 0 };
  for (const entry of entries.value) {
    const cls = levelClass(entry.record.level);
    if (cls in c) c[cls]++;
  }
  return c;
});

const filtered = computed(() => {
  const q = props.searchQuery.trim().toLowerCase();
  const levels = activeLevels.value;
  return entries.value.filter((entry) => {
    if (levels.size && !levels.has(levelClass(entry.record.level))) return false;
    if (q && !entry.lines.some((l) => l.toLowerCase().includes(q))) return false;
    return true;
  });
});

const truncated = computed(() => filtered.value.length > props.renderLimit);

const visibleEntries = computed(() => (truncated.value ? filtered.value.slice(-props.renderLimit) : filtered.value));

function levelClass(level?: string): string {
  switch (level) {
    case "error":
    case "fatal":
      return "error";
    case "warn":
      return "warn";
    case "debug":
    case "trace":
      return "debug";
    case "info":
      return "info";
    default:
      return "info";
  }
}

function toggleLevel(value: string) {
  const next = new Set(activeLevels.value);
  if (next.has(value)) next.delete(value);
  else next.add(value);
  activeLevels.value = next;
}

function toggleExpand(key: number) {
  const next = new Set(expanded.value);
  if (next.has(key)) next.delete(key);
  else next.add(key);
  expanded.value = next;
}

function formatTs(ts: string): string {
  const d = new Date(ts);
  if (isNaN(d.getTime())) return ts;
  return d.toLocaleTimeString(undefined, { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
}

const copiedKey = ref<number | null>(null);
let copiedTimer: ReturnType<typeof setTimeout> | undefined;

function copyEntry(entry: LogEntry) {
  navigator.clipboard?.writeText(entry.lines.join("\n"));
  copiedKey.value = entry.key;
  clearTimeout(copiedTimer);
  copiedTimer = setTimeout(() => (copiedKey.value = null), 1500);
}

function onScroll() {
  const el = scrollBox.value;
  if (!el) return;
  pinnedToBottom.value = el.scrollHeight - el.scrollTop - el.clientHeight < 40;
}

function scrollToBottom() {
  nextTick(() => {
    const el = scrollBox.value;
    if (el) el.scrollTop = el.scrollHeight;
  });
}

watch(
  () => props.records.length,
  () => {
    if (props.autoScroll && pinnedToBottom.value) scrollToBottom();
  },
);

watch(
  () => props.autoScroll,
  (on) => {
    if (on) scrollToBottom();
  },
);

defineExpose({ scrollToBottom });
</script>

<style scoped>
.structured-logs {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: #1a1b26;
  overflow: hidden;
}

.level-bar {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border-bottom: 1px solid #2a2e3d;
  flex-wrap: wrap;
}

.level-chip {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border: 1px solid #2a2e3d;
  border-radius: 999px;
  background: transparent;
  color: #787c99;
  font-size: var(--text-xs);
  cursor: pointer;
  transition: all var(--transition-base);
}

.level-chip:hover {
  border-color: #3b4261;
  color: #a9b1d6;
}

.level-chip.active.error {
  color: #f7768e;
  border-color: #f7768e;
  background: rgba(247, 118, 142, 0.12);
}

.level-chip.active.warn {
  color: #e0af68;
  border-color: #e0af68;
  background: rgba(224, 175, 104, 0.12);
}

.level-chip.active.info {
  color: #7aa2f7;
  border-color: #7aa2f7;
  background: rgba(122, 162, 247, 0.12);
}

.level-chip.active.debug {
  color: #9ece6a;
  border-color: #9ece6a;
  background: rgba(158, 206, 106, 0.12);
}

.level-count {
  font-variant-numeric: tabular-nums;
  opacity: 0.8;
}

.truncation-note {
  margin-left: auto;
  font-size: var(--text-xs);
  color: #565f89;
}

.rows {
  flex: 1;
  overflow-y: auto;
  font-family: "JetBrains Mono", "Fira Code", monospace;
  font-size: 12.5px;
  line-height: 1.5;
}

.row {
  border-bottom: 1px solid rgba(42, 46, 61, 0.4);
  cursor: pointer;
}

.row:hover {
  background: rgba(42, 46, 61, 0.35);
}

.row.error {
  box-shadow: inset 3px 0 0 #f7768e;
}

.row.warn {
  box-shadow: inset 3px 0 0 #e0af68;
}

.row.debug {
  box-shadow: inset 3px 0 0 rgba(158, 206, 106, 0.5);
}

.row.info {
  box-shadow: inset 3px 0 0 transparent;
}

.row-head {
  display: flex;
  align-items: baseline;
  gap: var(--space-2);
  padding: 3px var(--space-3) 3px var(--space-2);
  white-space: nowrap;
}

.chevron {
  font-size: 9px;
  color: #565f89;
  flex-shrink: 0;
  align-self: center;
}

.ts {
  color: #565f89;
  flex-shrink: 0;
  font-variant-numeric: tabular-nums;
}

.service {
  color: #bb9af7;
  flex-shrink: 0;
  max-width: 140px;
  overflow: hidden;
  text-overflow: ellipsis;
}

.level-tag {
  flex-shrink: 0;
  text-transform: uppercase;
  font-size: 9.5px;
  letter-spacing: 0.04em;
  padding: 1px 5px;
  border-radius: var(--radius-xs);
  align-self: center;
}

.level-tag.error {
  color: #f7768e;
  background: rgba(247, 118, 142, 0.15);
}

.level-tag.warn {
  color: #e0af68;
  background: rgba(224, 175, 104, 0.15);
}

.level-tag.info {
  color: #7aa2f7;
  background: rgba(122, 162, 247, 0.12);
}

.level-tag.debug {
  color: #9ece6a;
  background: rgba(158, 206, 106, 0.12);
}

.msg {
  color: #a9b1d6;
  overflow: hidden;
  text-overflow: ellipsis;
  flex: 1;
  min-width: 0;
}

.line-count {
  flex-shrink: 0;
  align-self: center;
  font-size: 10px;
  color: #7dcfff;
  background: rgba(125, 207, 255, 0.12);
  border-radius: 999px;
  padding: 1px 6px;
}

.row.expanded .msg {
  white-space: normal;
  word-break: break-word;
}

.row-detail {
  padding: var(--space-2) var(--space-3) var(--space-3) 28px;
  cursor: default;
  background: rgba(13, 14, 20, 0.5);
}

.fields {
  display: grid;
  grid-template-columns: max-content 1fr;
  gap: 2px var(--space-3);
  margin-bottom: var(--space-2);
}

.field-key {
  color: #7dcfff;
}

.field-val {
  color: #a9b1d6;
  word-break: break-word;
}

.raw {
  margin: 0 0 var(--space-2);
  padding: var(--space-2);
  background: #16161e;
  border-radius: var(--radius-sm);
  color: #787c99;
  white-space: pre-wrap;
  word-break: break-word;
  font-size: 11.5px;
}

.row-actions {
  display: flex;
  gap: var(--space-2);
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-1);
  padding: 2px var(--space-2);
  border: 1px solid #2a2e3d;
  border-radius: var(--radius-sm);
  background: transparent;
  color: #787c99;
  font-size: var(--text-xs);
  cursor: pointer;
}

.copy-btn:hover {
  color: #a9b1d6;
  border-color: #3b4261;
}

.empty {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #565f89;
  gap: var(--space-2);
}

.empty i {
  font-size: 2.5rem;
}

.empty p {
  margin: 0;
}
</style>
