<template>
  <div class="notifications-view">
    <ContextBanner id="notifications" icon="bell-ring" width="half" align="end" dismissible>
      Related failures are grouped into incidents before delivery, which prevents repeated alerts for the same problem.
      <template #actions>
        <a
          class="guide-link btn btn-secondary btn-sm"
          href="https://flatrun.dev/docs/ui/notifications"
          target="_blank"
          rel="noopener noreferrer"
        >
          <Icon name="book-open" :size="14" />Guide<Icon name="external-link" :size="12" />
        </a>
      </template>
    </ContextBanner>
    <NotificationsSettings />
  </div>
</template>

<script setup lang="ts">
import NotificationsSettings from "@/components/NotificationsSettings.vue";
import ContextBanner from "@/components/base/ContextBanner.vue";
import Icon from "@/components/base/Icon.vue";
</script>

<style scoped>
.notifications-view {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.guide-link {
  flex: none;
  text-decoration: none;
}
</style>
