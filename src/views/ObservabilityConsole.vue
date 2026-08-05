<template>
  <div class="obs-console">
    <aside class="obs-rail">
      <div class="obs-rail-title">Observability</div>
      <nav class="obs-rail-nav">
        <router-link
          v-for="section in sections"
          :key="section.name"
          :to="{ name: section.name }"
          class="obs-rail-item"
          :class="{ active: isActive(section) }"
        >
          <Icon :name="section.icon" :size="16" />
          <span>{{ section.label }}</span>
        </router-link>
      </nav>
    </aside>
    <div class="obs-main">
      <router-view />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRoute } from "vue-router";
import Icon from "@/components/base/Icon.vue";

const route = useRoute();

const sections = [
  { name: "observability", label: "Overview", icon: "activity", match: ["observability"] },
  { name: "logs", label: "Logs", icon: "scroll-text", match: ["logs"] },
  { name: "alerts", label: "Alerts", icon: "bell", match: ["alerts"] },
  { name: "dashboards", label: "Dashboards", icon: "layout-dashboard", match: ["dashboards", "dashboard-detail"] },
];

function isActive(section: { match: string[] }): boolean {
  return section.match.includes(route.name as string);
}
</script>

<style scoped>
.obs-console {
  display: flex;
  align-items: stretch;
  min-height: calc(100vh - 70px);
}

.obs-rail {
  flex-shrink: 0;
  width: 210px;
  border-right: 1px solid var(--border);
  padding: var(--space-4) var(--space-2);
  background: var(--surface);
}

.obs-rail-title {
  font-size: var(--text-xs);
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--text-subtle, var(--text-muted));
  padding: 0 var(--space-2);
  margin-bottom: var(--space-3);
}

.obs-rail-nav {
  display: flex;
  flex-direction: column;
  gap: 2px;
}

.obs-rail-item {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-2);
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  text-decoration: none;
  font-size: var(--text-sm);
  transition: all var(--transition-base);
}

.obs-rail-item:hover {
  background: var(--surface-sunken);
  color: var(--text);
}

.obs-rail-item.active {
  background: var(--color-primary-50, var(--surface-sunken));
  color: var(--color-primary-700, var(--text));
  font-weight: var(--font-medium);
}

.obs-main {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

@media (max-width: 720px) {
  .obs-console {
    flex-direction: column;
  }

  .obs-rail {
    width: 100%;
    border-right: none;
    border-bottom: 1px solid var(--border);
  }

  .obs-rail-nav {
    flex-direction: row;
    flex-wrap: wrap;
  }
}
</style>
