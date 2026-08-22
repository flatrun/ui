<template>
  <section class="remote-overview" aria-label="Peer deployment details">
    <div class="peer-context">
      <Icon name="server" :size="18" />
      <span>Managed on</span>
      <strong>{{ server }}</strong>
    </div>

    <div class="overview-grid">
      <article class="overview-card">
        <div class="card-heading">
          <Icon name="info" :size="18" />
          <h2>Deployment</h2>
        </div>
        <dl>
          <div>
            <dt>Status</dt>
            <dd><span class="status-dot" :class="deployment.status" />{{ deployment.status }}</dd>
          </div>
          <div>
            <dt>Path</dt>
            <dd>
              <code>{{ deployment.path }}</code>
            </dd>
          </div>
          <div>
            <dt>Updated</dt>
            <dd>{{ formatDate(deployment.updated_at) }}</dd>
          </div>
        </dl>
      </article>

      <article class="overview-card">
        <div class="card-heading">
          <Icon name="boxes" :size="18" />
          <h2>Services</h2>
        </div>
        <div v-if="deployment.services?.length" class="service-list">
          <div v-for="service in deployment.services" :key="service.name" class="service-row">
            <span><span class="status-dot" :class="serviceStatus(service)" />{{ service.name }}</span>
            <code>{{ service.image }}</code>
          </div>
        </div>
        <div v-else class="empty-copy">This deployment has no reported services.</div>
      </article>

      <article class="overview-card">
        <div class="card-heading">
          <Icon name="globe" :size="18" />
          <h2>Domain and SSL</h2>
        </div>
        <dl>
          <div>
            <dt>Exposure</dt>
            <dd>{{ proxyStatus?.exposed ? "Public" : "Not exposed" }}</dd>
          </div>
          <div>
            <dt>Domain</dt>
            <dd>{{ proxyStatus?.domain || deployment.metadata?.networking?.domain || "None" }}</dd>
          </div>
          <div>
            <dt>SSL</dt>
            <dd>{{ proxyStatus?.ssl_enabled ? "Enabled" : "Not enabled" }}</dd>
          </div>
        </dl>
      </article>
    </div>

    <p class="remote-note">Changes remain on {{ server }}. Open that server directly to edit this deployment.</p>
  </section>
</template>

<script setup lang="ts">
import Icon from "@/components/base/Icon.vue";
import type { Deployment, ProxyStatus, Service } from "@/types";

defineProps<{
  deployment: Deployment;
  server: string;
  proxyStatus: ProxyStatus | null;
}>();

const formatDate = (value: string) => (value ? new Date(value).toLocaleString() : "Unknown");
const serviceStatus = (service: Service) => {
  if (service.health === "unhealthy" || service.status === "error") return "error";
  if (service.status === "running") return "running";
  return "stopped";
};
</script>

<style scoped>
.remote-overview {
  display: grid;
  gap: var(--space-3);
}

.peer-context {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--space-2);
  min-height: 32px;
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.peer-context strong {
  color: var(--text-primary);
}

.overview-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--space-3);
}

.overview-card {
  min-width: 0;
  padding: var(--space-4);
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xs);
}

.card-heading {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  margin-bottom: var(--space-3);
  color: var(--accent);
}

.card-heading h2 {
  margin: 0;
  color: var(--text-primary);
  font-size: var(--text-lg);
}

dl,
.service-list {
  display: grid;
  gap: var(--space-2);
  margin: 0;
}

dl > div,
.service-row {
  display: grid;
  grid-template-columns: minmax(80px, 0.7fr) minmax(0, 1.3fr);
  gap: var(--space-3);
  padding-block: var(--space-2);
  border-bottom: 1px solid var(--border-subtle);
}

dl > div:last-child,
.service-row:last-child {
  border-bottom: 0;
}

dt {
  color: var(--text-muted);
}

dd {
  margin: 0;
  min-width: 0;
  color: var(--text-primary);
  overflow-wrap: anywhere;
}

.service-row span,
dd {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.service-row code {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.status-dot {
  width: 7px;
  height: 7px;
  flex: 0 0 7px;
  border-radius: var(--radius-full);
  background: var(--text-subtle);
}

.status-dot.running {
  background: var(--color-success-500);
}

.status-dot.stopped {
  background: var(--color-warning-500);
}

.status-dot.error {
  background: var(--color-danger-500);
}

.empty-copy,
.remote-note {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.remote-note {
  margin: 0;
  text-align: right;
}

@media (max-width: 900px) {
  .overview-grid {
    grid-template-columns: 1fr;
  }

  .peer-context,
  .remote-note {
    justify-content: flex-start;
    text-align: left;
  }
}
</style>
