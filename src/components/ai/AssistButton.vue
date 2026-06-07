<template>
  <button class="btn btn-sm btn-secondary" :title="title" @click="open">
    <Sparkles :size="14" /> {{ label }}
  </button>
</template>

<script setup lang="ts">
import { Sparkles } from "lucide-vue-next";
import { useAssistStore, type AssistContext } from "@/stores/assist";

const props = withDefaults(
  defineProps<{
    context: AssistContext;
    label?: string;
    title?: string;
  }>(),
  {
    label: "Ask AI",
    title: "Analyze this with the AI assistant",
  },
);

const store = useAssistStore();

const open = () => {
  store.open(props.context);
};
</script>
