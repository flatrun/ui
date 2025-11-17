<template>
  <div class="plugin-widget" :class="[`size-${plugin.widget?.size || 'medium'}`]">
    <div class="widget-header">
      <div class="widget-title">
        <i :class="getPluginIcon(plugin.category)"></i>
        <span>{{ plugin.display_name }}</span>
      </div>
      <div class="widget-version">v{{ plugin.version }}</div>
    </div>

    <div class="widget-body">
      <div class="widget-description">
        {{ plugin.description }}
      </div>

      <div v-if="plugin.capabilities?.length" class="widget-capabilities">
        <span
          v-for="cap in plugin.capabilities"
          :key="cap"
          class="capability-badge"
        >
          {{ formatCapability(cap) }}
        </span>
      </div>
    </div>

    <div v-if="plugin.widget?.actions?.length" class="widget-actions">
      <button
        v-for="action in plugin.widget.actions"
        :key="action.name"
        class="widget-action-btn"
        @click="$emit('action', { plugin: plugin.name, action: action.name })"
      >
        <i :class="'pi ' + action.icon"></i>
        {{ action.label }}
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import type { Plugin } from '@/stores/plugins'

defineProps<{
  plugin: Plugin
}>()

defineEmits(['action'])

const getPluginIcon = (category: string) => {
  const icons: Record<string, string> = {
    infrastructure: 'pi pi-server',
    monitoring: 'pi pi-chart-line',
    security: 'pi pi-shield',
    database: 'pi pi-database',
    web: 'pi pi-globe',
    default: 'pi pi-puzzle-piece'
  }
  return icons[category] || icons.default
}

const formatCapability = (cap: string) => {
  return cap.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())
}
</script>

<style scoped>
.plugin-widget {
  background: white;
  border-radius: 12px;
  border: 1px solid #e5e7eb;
  overflow: hidden;
  transition: all 0.3s ease;
}

.plugin-widget:hover {
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.08);
  transform: translateY(-2px);
}

.plugin-widget.size-small {
  max-width: 300px;
}

.plugin-widget.size-medium {
  max-width: 400px;
}

.plugin-widget.size-large {
  max-width: 600px;
}

.widget-header {
  padding: 1rem;
  border-bottom: 1px solid #f3f4f6;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.widget-title {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-weight: 600;
  color: #1f2937;
}

.widget-title i {
  color: #3b82f6;
}

.widget-version {
  font-size: 0.75rem;
  color: #9ca3af;
  background: #f3f4f6;
  padding: 0.125rem 0.5rem;
  border-radius: 4px;
}

.widget-body {
  padding: 1rem;
}

.widget-description {
  font-size: 0.875rem;
  color: #6b7280;
  line-height: 1.5;
  margin-bottom: 0.75rem;
}

.widget-capabilities {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.capability-badge {
  font-size: 0.6875rem;
  padding: 0.125rem 0.5rem;
  background: #dbeafe;
  color: #1e40af;
  border-radius: 9999px;
  font-weight: 500;
}

.widget-actions {
  padding: 0.75rem 1rem;
  border-top: 1px solid #f3f4f6;
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.widget-action-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.375rem 0.75rem;
  background: #f3f4f6;
  border: none;
  border-radius: 6px;
  font-size: 0.75rem;
  color: #4b5563;
  cursor: pointer;
  transition: all 0.2s;
}

.widget-action-btn:hover {
  background: #e5e7eb;
  color: #1f2937;
}

.widget-action-btn i {
  font-size: 0.875rem;
}
</style>
