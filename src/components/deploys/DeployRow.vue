<template>
  <div class="row">
    <span class="badge" :class="deploy.phase">{{ phaseLabel[deploy.phase] }}</span>
    <div class="what">
      <strong class="message">{{ deploy.message || fallbackTitle }}</strong>
      <span class="meta">
        {{ timeAgo(deploy.startedAt) }} via {{ triggerLabel[deploy.trigger] ?? deploy.trigger }}
        <template v-if="deploy.shortRevision">
          · <span class="mono">{{ deploy.branch ? `${deploy.branch}@` : "" }}{{ deploy.shortRevision }}</span>
        </template>
      </span>
    </div>
    <button type="button" class="btn btn-secondary btn-sm" @click="emit('logs')">View logs</button>
    <Popover v-if="actions.length" v-model:open="menuOpen" align="right" width="180px">
      <template #trigger="{ toggle }">
        <button type="button" class="more" aria-label="More actions" :aria-expanded="menuOpen" @click="toggle">
          <Icon name="ellipsis-vertical" :size="15" />
        </button>
      </template>
      <template #default="{ close }">
        <ul class="menu">
          <li v-for="a in actions" :key="a">
            <button
              type="button"
              @click="
                close();
                emit('action', a);
              "
            >
              <Icon :name="actionIcon[a]" :size="14" />{{ actionLabel[a] }}
            </button>
          </li>
        </ul>
      </template>
    </Popover>
  </div>
</template>

<script lang="ts">
import type { DeployPhase, DeployTrigger } from "@/types";

export type CardAction = "redeploy" | "restart" | "rollback";

export const phaseLabel: Record<DeployPhase, string> = {
  queued: "Queued",
  building: "Building",
  deploying: "Deploying",
  active: "Active",
  failed: "Failed",
  removed: "Removed",
};
</script>

<script setup lang="ts">
import { computed, ref } from "vue";
import Icon from "@/components/base/Icon.vue";
import Popover from "@/components/base/Popover.vue";
import type { Deploy } from "@/model/project";
import { timeAgo } from "@/utils/time";

const props = defineProps<{ deploy: Deploy; actions: CardAction[] }>();
const emit = defineEmits<{ logs: []; action: [action: CardAction] }>();

const menuOpen = ref(false);

const triggerLabel: Record<DeployTrigger, string> = {
  manual: "manual deploy",
  push: "push",
  pull_request: "pull request",
  rollback: "rollback",
};

const actionLabel: Record<CardAction, string> = {
  redeploy: "Redeploy",
  restart: "Restart",
  rollback: "Roll back to this",
};
const actionIcon: Record<CardAction, string> = { redeploy: "rocket", restart: "rotate-cw", rollback: "undo-2" };

const fallbackTitle = computed(() =>
  props.deploy.action === "rebuild" ? "Rebuild" : `Deploy ${props.deploy.shortRevision ?? ""}`.trim(),
);
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3);
}

.badge {
  flex-shrink: 0;
  min-width: 76px;
  padding: 2px var(--space-2);
  border: 1px solid currentColor;
  border-radius: var(--radius-sm);
  font-size: 11px;
  font-weight: var(--font-semibold);
  letter-spacing: 0.04em;
  text-align: center;
  text-transform: uppercase;
}

.badge.active {
  color: var(--status-running);
}

.badge.failed {
  color: var(--status-failed);
}

.badge.queued,
.badge.building,
.badge.deploying {
  color: var(--accent);
}

.badge.removed {
  color: var(--text-subtle);
}

.what {
  display: flex;
  min-width: 0;
  flex: 1;
  flex-direction: column;
  gap: 2px;
}

.message {
  overflow: hidden;
  font-size: var(--text-base);
  font-weight: var(--font-medium);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.meta {
  color: var(--text-muted);
  font-size: var(--text-sm);
}

.mono {
  font-family: var(--font-mono);
}

.more {
  display: inline-grid;
  width: var(--control-h-sm);
  height: var(--control-h-sm);
  place-items: center;
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
}

.more:hover,
.more[aria-expanded="true"] {
  background: var(--surface-inset);
  color: var(--text);
}

.menu {
  margin: 0;
  padding: var(--space-1);
  list-style: none;
}

.menu button {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--space-2);
  padding: 6px var(--space-2);
  background: none;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--text);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-base);
  text-align: left;
}

.menu button:hover {
  background: var(--surface-inset);
}

@media (max-width: 600px) {
  .row {
    flex-wrap: wrap;
  }

  .what {
    flex-basis: calc(100% - 100px);
  }
}
</style>
