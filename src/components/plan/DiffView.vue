<template>
  <div class="diff-view">
    <template v-for="(part, index) in parts" :key="index">
      <div
        v-for="(line, lineIndex) in partLines(part)"
        :key="`${index}-${lineIndex}`"
        class="diff-line"
        :class="{ added: part.added, removed: part.removed }"
      >
        <span class="diff-marker">{{ part.added ? "+" : part.removed ? "-" : " " }}</span>
        <span class="diff-text">{{ line }}</span>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { diffLines, type ChangeObject } from "diff";

const props = defineProps<{
  before: string | null;
  after: string | null;
}>();

const parts = computed(() => diffLines(props.before ?? "", props.after ?? ""));

const partLines = (part: ChangeObject<string>) => {
  const lines = part.value.split("\n");
  if (lines[lines.length - 1] === "") {
    lines.pop();
  }
  return lines;
};
</script>

<style scoped>
.diff-view {
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: 1.5;
  background: var(--color-gray-50);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  max-height: 320px;
  overflow: auto;
}

.diff-line {
  display: flex;
  gap: var(--space-2);
  padding: 0 var(--space-2);
  white-space: pre;
}

.diff-line.added {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.diff-line.removed {
  background: var(--color-danger-50);
  color: var(--color-danger-700);
}

.diff-marker {
  flex-shrink: 0;
  user-select: none;
  color: var(--color-gray-400);
}

.diff-line.added .diff-marker {
  color: var(--color-success-600);
}

.diff-line.removed .diff-marker {
  color: var(--color-danger-600);
}

.diff-text {
  white-space: pre;
}
</style>
