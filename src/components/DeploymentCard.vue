<template>
  <div class="deployment-card" :class="[status, { clickable: clickable }]" @click="$emit('click')">
    <div class="card-header" :class="status">
      <div class="header-content">
        <div v-if="logo || icon" class="service-icon" :class="iconClass">
          <img v-if="logo" :src="logo" :alt="name" class="service-logo" />
          <i v-else :class="icon" />
        </div>
        <div class="header-info">
          <h3>{{ name }}</h3>
          <div v-if="subtitle || external" class="header-meta">
            <span v-if="subtitle" class="subtitle">{{ subtitle }}</span>
            <span v-if="external" class="external-tag">External</span>
          </div>
        </div>
        <span class="status-badge" :class="status">
          <span class="status-dot" />
          {{ status }}
        </span>
      </div>
    </div>

    <div class="card-body">
      <slot />
    </div>

    <div v-if="$slots.footer" class="card-footer" @click.stop>
      <slot name="footer" />
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  name: string;
  status: "running" | "stopped" | "error" | "unknown" | "external";
  subtitle?: string;
  icon?: string;
  iconClass?: string;
  logo?: string;
  external?: boolean;
  clickable?: boolean;
}>();

defineEmits<{
  (e: "click"): void;
}>();
</script>

<style scoped>
.deployment-card {
  background: white;
  border-radius: var(--radius-md);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.2s;
}

.deployment-card.clickable {
  cursor: pointer;
}

.deployment-card.clickable:hover {
  transform: translateY(-2px);
  box-shadow: 0 8px 16px rgba(0, 0, 0, 0.1);
}

.deployment-card.running {
  box-shadow:
    0 0 8px rgba(34, 197, 94, 0.25),
    0 0 20px rgba(34, 197, 94, 0.1);
}

.deployment-card.stopped {
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.deployment-card.error {
  box-shadow:
    0 0 8px rgba(239, 68, 68, 0.2),
    0 0 16px rgba(239, 68, 68, 0.1);
}

.deployment-card.external {
  background: linear-gradient(to bottom, var(--color-gray-50), white);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
}

.card-header {
  padding: var(--space-3) var(--space-4);
  border-bottom: 1px solid var(--color-gray-100);
}

.card-header.running {
  background: linear-gradient(135deg, var(--color-success-50) 0%, var(--color-success-100) 100%);
}

.card-header.stopped {
  background: linear-gradient(135deg, var(--color-gray-50) 0%, var(--color-gray-100) 100%);
}

.card-header.error {
  background: linear-gradient(135deg, var(--color-danger-50) 0%, var(--color-danger-100) 100%);
}

.card-header.external {
  background: linear-gradient(135deg, var(--color-info-50) 0%, var(--color-info-100) 100%);
}

.header-content {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  width: 100%;
}

.service-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.service-icon i {
  font-size: 0.875rem;
  color: white;
}

.service-logo {
  width: 18px;
  height: 18px;
  object-fit: contain;
}

.service-icon.icon-nginx {
  background: linear-gradient(135deg, #009639, #00b74a);
}

.service-icon.icon-database {
  background: linear-gradient(135deg, #00758f, #00a4c4);
}

.service-icon.icon-redis {
  background: linear-gradient(135deg, #dc382d, #ff4438);
}

.service-icon.icon-certbot {
  background: linear-gradient(135deg, #ffa500, #ffcc00);
}

.service-icon.icon-default {
  background: linear-gradient(135deg, #6b7280, #9ca3af);
}

.service-icon.icon-node {
  background: linear-gradient(135deg, #339933, #6cc24a);
}

.service-icon.icon-php {
  background: linear-gradient(135deg, #777bb4, #8892be);
}

.service-icon.icon-python {
  background: linear-gradient(135deg, #3776ab, #ffd43b);
}

.service-icon.icon-wordpress {
  background: linear-gradient(135deg, #21759b, #464646);
}

.service-icon.icon-ghost {
  background: linear-gradient(135deg, #212121, #738a94);
}

.service-icon.icon-nextcloud {
  background: linear-gradient(135deg, #0082c9, #00b4d8);
}

.service-icon.icon-grafana {
  background: linear-gradient(135deg, #f46800, #e6522c);
}

.service-icon.icon-prometheus {
  background: linear-gradient(135deg, #e6522c, #da4e31);
}

.service-icon.icon-trakli {
  background: #1a1a2e;
}

.service-icon.icon-custom {
  background: #374151;
}

.header-info {
  flex: 1;
  min-width: 0;
}

.header-info h3 {
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-gray-900);
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.header-meta {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-top: 2px;
}

.subtitle {
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  text-transform: uppercase;
  letter-spacing: 0.025em;
}

.external-tag {
  font-size: 0.625rem;
  padding: 0.125rem 0.375rem;
  background: var(--color-info-100);
  color: var(--color-info-700);
  border-radius: var(--radius-sm);
  font-weight: 600;
  text-transform: uppercase;
}

.status-badge {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-1) var(--space-3);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: 600;
  text-transform: capitalize;
  flex-shrink: 0;
}

.status-badge .status-dot {
  width: 8px;
  height: 8px;
  border-radius: var(--radius-full);
}

.status-badge.running {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

.status-badge.running .status-dot {
  background: var(--color-success-500);
  box-shadow: 0 0 0 2px var(--color-success-200);
  animation: pulse 2s infinite;
}

.status-badge.stopped {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.status-badge.stopped .status-dot {
  background: var(--color-gray-400);
}

.status-badge.error {
  background: var(--color-danger-100);
  color: var(--color-danger-700);
}

.status-badge.error .status-dot {
  background: var(--color-danger-500);
}

.status-badge.external {
  background: var(--color-info-100);
  color: var(--color-info-700);
}

.status-badge.external .status-dot {
  background: var(--color-info-500);
}

.status-badge.unknown {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.status-badge.unknown .status-dot {
  background: var(--color-gray-400);
}

@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}

.card-body {
  padding: var(--space-3) var(--space-4);
  background: white;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.card-body:empty {
  display: none;
}

.card-footer {
  padding: var(--space-2) var(--space-4);
  background: var(--color-gray-50);
  border-top: 1px solid var(--color-gray-100);
  display: flex;
  gap: var(--space-2);
}
</style>
