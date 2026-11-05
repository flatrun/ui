<template>
  <div class="kv-rows">
    <div v-for="(row, i) in modelValue" :key="i" class="kv-row">
      <BaseInput
        :model-value="row.key"
        placeholder="NAME"
        :aria-label="`${label} name ${i + 1}`"
        @update:model-value="update(i, 'key', String($event))"
      />
      <BaseInput
        :model-value="row.value"
        :type="secret ? 'password' : 'text'"
        placeholder="value"
        :aria-label="`${label} value ${i + 1}`"
        @update:model-value="update(i, 'value', String($event))"
      />
      <BaseButton variant="ghost" size="sm" icon="x" :aria-label="`Remove ${label} ${i + 1}`" @click="remove(i)" />
    </div>
    <BaseButton variant="ghost" size="sm" icon="plus" @click="add">Add {{ label }}</BaseButton>
  </div>
</template>

<script setup lang="ts">
import BaseInput from "@/components/base/BaseInput.vue";
import BaseButton from "@/components/base/BaseButton.vue";

export interface KeyValueRow {
  key: string;
  value: string;
}

const props = defineProps<{ modelValue: KeyValueRow[]; label: string; secret?: boolean }>();
const emit = defineEmits<{ "update:modelValue": [rows: KeyValueRow[]] }>();

function update(index: number, field: keyof KeyValueRow, value: string) {
  emit(
    "update:modelValue",
    props.modelValue.map((row, i) => (i === index ? { ...row, [field]: value } : row)),
  );
}

function add() {
  emit("update:modelValue", [...props.modelValue, { key: "", value: "" }]);
}

function remove(index: number) {
  emit(
    "update:modelValue",
    props.modelValue.filter((_, i) => i !== index),
  );
}
</script>

<style scoped>
.kv-rows {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
  align-items: flex-start;
}

.kv-row {
  display: grid;
  grid-template-columns: minmax(0, 2fr) minmax(0, 3fr) auto;
  gap: var(--space-2);
  width: 100%;
  align-items: center;
}
</style>
