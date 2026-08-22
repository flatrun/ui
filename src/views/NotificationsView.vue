<template>
  <div class="notifications-view">
    <div class="view-header">
      <div>
        <h1>Notifications</h1>
        <p>Review incidents and control where updates are delivered.</p>
      </div>
    </div>
    <NotificationsSettings />
  </div>
</template>

<script setup lang="ts">
import NotificationsSettings from "@/components/NotificationsSettings.vue";
</script>

<style scoped>
.notifications-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.view-header {
  padding: var(--space-4);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
}

h1 {
  margin: 0;
  color: var(--text);
  font-size: var(--text-2xl);
}

p {
  margin: var(--space-1) 0 0;
  color: var(--text-muted);
  font-size: var(--text-sm);
}
</style>
