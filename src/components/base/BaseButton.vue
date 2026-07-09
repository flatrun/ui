<template>
  <button :class="['btn', `btn-${variant}`, { 'btn-sm': size === 'sm' }]" :disabled="disabled || loading" :type="type">
    <Icon v-if="loading" name="loader-circle" spin :size="size === 'sm' ? 14 : 16" />
    <Icon v-else-if="icon" :name="icon" :size="size === 'sm' ? 14 : 16" />
    <slot />
  </button>
</template>

<script setup lang="ts">
import Icon from "./Icon.vue";

withDefaults(
  defineProps<{
    variant?: "primary" | "secondary" | "danger" | "ghost";
    size?: "sm" | "md";
    icon?: string;
    loading?: boolean;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
  }>(),
  { variant: "secondary", size: "md", type: "button" },
);
</script>
