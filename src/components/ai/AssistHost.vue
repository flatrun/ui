<template>
  <AssistModal
    v-if="store.visible"
    :visible="store.visible"
    :subject="store.context?.subject || ''"
    :intent="store.intent"
    :loading="store.loading"
    :error="store.error"
    :result="store.result"
    :running-index="store.runningIndex"
    :suggestion-outputs="store.suggestionOutputs"
    :settings-hint="store.error === AI_DISABLED_MESSAGE"
    @run="store.runSuggestion"
    @rerun="store.rerun"
    @close="store.close"
  />
</template>

<script setup lang="ts">
import AssistModal from "./AssistModal.vue";
import { useAssistStore, AI_DISABLED_MESSAGE } from "@/stores/assist";

const store = useAssistStore();
</script>
