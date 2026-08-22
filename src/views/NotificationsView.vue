<template>
  <div class="notifications-view">
    <ContextBanner id="notifications" icon="bell-ring">
      Related failures are grouped into incidents before delivery, which prevents repeated alerts for the same problem.
    </ContextBanner>
    <NotificationsSettings />
  </div>
</template>

<script setup lang="ts">
import NotificationsSettings from "@/components/NotificationsSettings.vue";
import ContextBanner from "@/components/base/ContextBanner.vue";
</script>

<style scoped>
.notifications-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
