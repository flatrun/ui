<template>
  <component
    :is="linkTo ? 'router-link' : 'div'"
    :to="linkTo"
    class="logo"
    :class="[`logo-${variant}`, `logo-${size}`]"
  >
    <img v-if="variant === 'icon'" :src="iconSrc" alt="FlatRun" class="logo-img" />
    <img v-else :src="fullSrc" alt="FlatRun" class="logo-img" />
  </component>
</template>

<script setup lang="ts">
import { computed } from "vue";
import flatrunLogo from "@/assets/flatrun.svg";
import flatrunIcon from "@/assets/flatrun-icon.svg";

const props = withDefaults(
  defineProps<{
    variant?: "full" | "icon";
    size?: "sm" | "md" | "lg";
    linkTo?: string;
  }>(),
  {
    variant: "full",
    size: "md",
    linkTo: undefined,
  },
);

const fullSrc = computed(() => flatrunLogo);
const iconSrc = computed(() => flatrunIcon);
</script>

<style scoped>
.logo {
  display: inline-flex;
  align-items: center;
  text-decoration: none;
}

.logo:hover {
  text-decoration: none;
}

.logo-img {
  height: auto;
  width: auto;
  object-fit: contain;
}

.logo-full.logo-sm .logo-img {
  height: 28px;
}

.logo-full.logo-md .logo-img {
  height: 40px;
}

.logo-full.logo-lg .logo-img {
  height: 52px;
}

.logo-icon.logo-sm .logo-img {
  height: 28px;
  width: 28px;
}

.logo-icon.logo-md .logo-img {
  height: 40px;
  width: 40px;
}

.logo-icon.logo-lg .logo-img {
  height: 52px;
  width: 52px;
}
</style>
