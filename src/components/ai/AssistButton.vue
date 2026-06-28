<template>
  <button class="btn btn-sm btn-secondary assist-button" :title="title" @click="open">
    <Icon name="bot" :size="15" /> {{ label }}
  </button>
</template>

<script setup lang="ts">
import Icon from "@/components/base/Icon.vue";
import { useAssistStore, type AssistContext } from "@/stores/assist";

const props = withDefaults(
  defineProps<{
    context: AssistContext;
    label?: string;
    title?: string;
  }>(),
  {
    label: "Ask the assistant",
    title: "Ask the assistant about this",
  },
);

const store = useAssistStore();

const open = () => {
  store.open(props.context);
};
</script>
