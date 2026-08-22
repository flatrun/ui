<template>
  <div class="notifications-view">
    <PageHeader
      title="Notifications"
      subtitle="Review incidents and control where updates are delivered."
      section="Operations"
      icon="bell-ring"
    />
    <NotificationsSettings />
  </div>
</template>

<script setup lang="ts">
import NotificationsSettings from "@/components/NotificationsSettings.vue";
import PageHeader from "@/components/base/PageHeader.vue";
</script>

<style scoped>
.notifications-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}
</style>
