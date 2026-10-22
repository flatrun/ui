<template>
  <div class="birch-shell" :class="{ 'is-full-height': fullHeight }">
    <header class="topbar">
      <div class="topbar-left">
        <RouterLink to="/" class="brand" aria-label="FlatRun home">
          <span class="brand-mark" :style="{ '--mark': `url(${markUrl})` }" />
        </RouterLink>
        <span class="sep">/</span>
        <template v-if="canSeeWorkspaces">
          <WorkspaceSwitcher />
          <span class="sep">/</span>
        </template>
        <Popover v-if="peers.length" v-model:open="serverOpen" width="240px">
          <template #trigger="{ toggle }">
            <button type="button" class="crumb" aria-haspopup="dialog" @click="toggle">
              <Icon name="server" :size="14" />
              <span>{{ serverName }}</span>
              <Icon name="chevrons-up-down" :size="14" />
            </button>
          </template>
          <template #default="{ close }">
            <ul class="menu-list">
              <li>
                <button type="button" @click="openServer('', close)">
                  <Icon name="server" :size="14" />{{ serverName }}
                  <small>This server</small>
                </button>
              </li>
              <li v-for="peer in peers" :key="peer.name">
                <button type="button" :disabled="!peer.online" @click="openServer(peer.name, close)">
                  <Icon name="server" :size="14" />{{ peer.name }}
                  <small>{{ peer.online ? "Online" : "Offline" }}</small>
                </button>
              </li>
            </ul>
          </template>
        </Popover>
        <span v-if="peers.length" class="sep">/</span>
        <DeploymentSwitcher />
      </div>

      <nav class="topbar-nav" aria-label="Main">
        <RouterLink v-for="item in primaryItems" :key="item.id" :to="item.path" class="nav-link" active-class="active">
          {{ item.label }}
        </RouterLink>
        <Popover v-model:open="moreOpen" align="right" width="460px">
          <template #trigger="{ toggle }">
            <button type="button" class="nav-link" :class="{ active: moreActive }" @click="toggle">
              More <Icon name="chevron-down" :size="13" />
            </button>
          </template>
          <template #default="{ close }">
            <div class="more-grid">
              <section class="more-primary">
                <h4>Main</h4>
                <RouterLink v-for="item in primaryItems" :key="item.id" :to="item.path" @click="close">
                  <Icon :name="item.icon" :size="14" />{{ item.label }}
                </RouterLink>
              </section>
              <section v-for="group in moreGroups" :key="group.name">
                <h4>{{ group.name }}</h4>
                <RouterLink v-for="item in group.items" :key="item.id" :to="item.path" @click="close">
                  <Icon :name="item.icon" :size="14" />{{ item.label }}
                </RouterLink>
              </section>
            </div>
          </template>
        </Popover>
      </nav>

      <div class="topbar-right">
        <button type="button" class="search-btn" aria-label="Search" @click="paletteOpen = true">
          <Icon name="search" :size="14" />
          <span>Search</span>
          <kbd>{{ kbdHint }}</kbd>
        </button>
        <Popover v-if="canCreate" v-model:open="newOpen" align="right" width="260px">
          <template #trigger="{ toggle }">
            <button type="button" class="btn btn-primary btn-sm" @click="toggle">
              <Icon name="plus" :size="14" /> New
            </button>
          </template>
          <template #default="{ close }">
            <ul class="menu-list">
              <li v-for="option in newOptions" :key="option.mode">
                <button type="button" @click="startNew(option.mode, close)">
                  <Icon :name="option.icon" :size="15" />
                  <span class="menu-copy">
                    {{ option.label }}
                    <small>{{ option.hint }}</small>
                  </span>
                </button>
              </li>
            </ul>
          </template>
        </Popover>
        <span class="agent-dot" :class="{ online: statsStore.agentOnline }" :title="agentTitle" />
        <UserMenu
          :username="authStore.currentUser?.username"
          :role="authStore.currentUser?.role"
          :style-id="style"
          :styles="styles"
          :scheme="schemePreference"
          @select-style="setStyle"
          @select-scheme="setScheme"
          @sign-out="logout"
        />
      </div>
    </header>

    <div v-if="!statsStore.agentCompatible && !statsStore.versionWarningDismissed" class="version-warning">
      <Icon name="triangle-alert" :size="15" />
      <span>{{ statsStore.agentCompatibilityMessage }}</span>
      <button v-if="statsStore.agentDevBuild" type="button" @click="statsStore.versionWarningDismissed = true">
        <Icon name="x" :size="15" />
      </button>
    </div>

    <main class="birch-content" :class="{ 'is-full-height': fullHeight }">
      <RouterView :key="workspaceStore.slug" />
    </main>

    <CommandPalette v-model:open="paletteOpen" :actions="paletteActions" />
    <NewDeploymentPanel
      :visible="!!newMode"
      :initial-mode="newMode ?? undefined"
      @close="newMode = null"
      @created="onCreated"
      @wizard="openWizard"
    />
    <NewDeploymentModal
      v-if="wizardMode"
      :visible="!!wizardMode"
      :initial-mode="wizardMode"
      @close="wizardMode = null"
      @created="onCreated"
    />
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from "vue";
import { RouterLink, RouterView, useRoute, useRouter } from "vue-router";
import Icon from "@/components/base/Icon.vue";
import Popover from "@/components/base/Popover.vue";
import UserMenu from "@/components/UserMenu.vue";
import NewDeploymentModal from "@/components/NewDeploymentModal.vue";
import NewDeploymentPanel from "@/components/birch/NewDeploymentPanel.vue";
import DeploymentSwitcher from "@/components/birch/DeploymentSwitcher.vue";
import WorkspaceSwitcher from "@/components/birch/WorkspaceSwitcher.vue";
import { useWorkspaceStore } from "@/stores/workspace";
import CommandPalette, { type PaletteAction } from "@/components/birch/CommandPalette.vue";
import { useShellData } from "@/composables/useShellData";
import { useTheme } from "@/composables/useTheme";
import { NAV_GROUPS, visibleNavItems } from "@/navigation/items";
import { projectPath } from "@/navigation/projects";
import markUrl from "@/assets/flatrun-icon.svg";
import type { CreateMode } from "@/deploy/createPayload";

type NewMode = CreateMode;

const route = useRoute();
const router = useRouter();
const { statsStore, authStore, serverName, peers, logout } = useShellData();
const { style, styles, schemePreference, scheme, setStyle, setScheme } = useTheme();

const serverOpen = ref(false);
const moreOpen = ref(false);
const newOpen = ref(false);
const paletteOpen = ref(false);
const newMode = ref<NewMode | null>(null);
const wizardMode = ref<NewMode | null>(null);

const workspaceStore = useWorkspaceStore();
const canSeeWorkspaces = computed(() => authStore.hasPermission("workspaces:read"));
const fullHeight = computed(() => route.matched.some((r) => Boolean(r.meta?.fullHeight)));
const canCreate = computed(() => authStore.hasPermission("deployments:write"));
const items = computed(() => visibleNavItems((p) => authStore.hasPermission(p), "birch"));
const primaryItems = computed(() => items.value.filter((i) => i.primary));
const moreGroups = computed(() =>
  NAV_GROUPS.map((name) => ({ name, items: items.value.filter((i) => !i.primary && i.group === name) })).filter(
    (g) => g.items.length,
  ),
);
const moreActive = computed(() =>
  items.value.some((i) => !i.primary && i.path !== "/" && route.path.startsWith(i.path)),
);

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const kbdHint = isMac ? "⌘K" : "Ctrl K";
const agentTitle = computed(() =>
  statsStore.agentOnline ? `Agent online (v${statsStore.agentVersion})` : "Agent unreachable",
);

const newOptions: { mode: NewMode; label: string; hint: string; icon: string }[] = [
  { mode: "git", label: "Git repository", hint: "Deploy on every push", icon: "git-branch" },
  { mode: "image", label: "Docker image", hint: "Run a published image", icon: "box" },
  { mode: "easy", label: "Template", hint: "Databases, CMSs and more", icon: "layout-template" },
  { mode: "compose", label: "Compose file", hint: "Paste a docker-compose.yml", icon: "file-code" },
];

function startNew(mode: NewMode, close: () => void) {
  close();
  newMode.value = mode;
}

function openWizard(mode: NewMode) {
  newMode.value = null;
  wizardMode.value = mode;
}

function onCreated(name?: string) {
  newMode.value = null;
  wizardMode.value = null;
  if (name) router.push(projectPath(name));
}

function openServer(server: string, close: () => void) {
  close();
  router.push({ path: projectPath(), query: server ? { server } : {} });
}

const paletteActions = computed<PaletteAction[]>(() => [
  ...(canCreate.value
    ? newOptions.map((o) => ({
        key: `new-${o.mode}`,
        label: `New from ${o.label.toLowerCase()}`,
        icon: "plus",
        run: () => (newMode.value = o.mode),
      }))
    : []),
  {
    key: "scheme",
    label: scheme.value === "dark" ? "Switch to light appearance" : "Switch to dark appearance",
    icon: scheme.value === "dark" ? "sun" : "moon",
    run: () => setScheme(scheme.value === "dark" ? "light" : "dark"),
  },
  { key: "classic", label: "Use the Classic style", icon: "panel-left", run: () => setStyle("classic") },
]);

function onKeydown(e: KeyboardEvent) {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    paletteOpen.value = !paletteOpen.value;
  }
}

onMounted(() => document.addEventListener("keydown", onKeydown));
onBeforeUnmount(() => document.removeEventListener("keydown", onKeydown));
</script>

<style scoped>
.birch-shell {
  display: flex;
  min-height: 100vh;
  flex-direction: column;
  background: var(--app-bg);
  color: var(--text);
}

.birch-shell.is-full-height {
  height: 100vh;
}

.topbar {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  display: flex;
  height: 48px;
  flex-shrink: 0;
  align-items: center;
  gap: var(--space-4);
  padding: 0 var(--space-4);
  background: var(--app-bg);
  border-bottom: 1px solid var(--border);
}

.topbar-left,
.topbar-right,
.topbar-nav {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: var(--space-1);
}

.topbar-left {
  flex: 1;
}

.topbar-right {
  gap: var(--space-2);
}

.brand {
  display: grid;
  width: 28px;
  height: 28px;
  place-items: center;
}

.brand-mark {
  width: 22px;
  height: 22px;
  background: var(--text);
  mask: var(--mark) center / contain no-repeat;
  -webkit-mask: var(--mark) center / contain no-repeat;
}

.sep {
  color: var(--text-subtle);
}

.crumb,
.nav-link {
  display: inline-flex;
  height: var(--control-h-sm);
  align-items: center;
  gap: 6px;
  padding: 0 var(--space-2);
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--text-muted);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-base);
  text-decoration: none;
  white-space: nowrap;
}

.crumb {
  color: var(--text);
  font-weight: var(--font-medium);
}

.crumb:hover,
.nav-link:hover {
  background: var(--surface-inset);
  color: var(--text);
}

.nav-link.active {
  color: var(--text);
  box-shadow: inset 0 -2px 0 var(--text);
  border-radius: 0;
}

.search-btn {
  display: inline-flex;
  width: 200px;
  height: var(--control-h-sm);
  align-items: center;
  gap: var(--space-2);
  padding: 0 var(--space-2);
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  color: var(--text-subtle);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-sm);
}

.search-btn kbd {
  margin-left: auto;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
}

.agent-dot {
  width: 7px;
  height: 7px;
  background: var(--status-failed);
  border-radius: 50%;
}

.agent-dot.online {
  background: var(--status-running);
}

.menu-list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.menu-list button {
  display: flex;
  width: 100%;
  align-items: center;
  gap: var(--space-2);
  padding: 7px var(--space-2);
  background: transparent;
  border: 0;
  border-radius: var(--radius-sm);
  color: var(--text);
  cursor: pointer;
  font: inherit;
  font-size: var(--text-base);
  text-align: left;
}

.menu-list button:hover:not(:disabled) {
  background: var(--surface-inset);
}

.menu-list button:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.menu-list .app-icon {
  color: var(--text-muted);
}

.menu-list small {
  margin-left: auto;
  color: var(--text-subtle);
  font-size: var(--text-xs);
}

.menu-copy {
  display: flex;
  flex-direction: column;
  line-height: 1.25;
}

.menu-copy small {
  margin-left: 0;
}

.more-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--space-2) var(--space-3);
  padding: var(--space-2);
}

.more-grid h4 {
  margin: var(--space-1) 0;
  color: var(--text-subtle);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.more-grid a {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: 5px var(--space-1);
  border-radius: var(--radius-sm);
  color: var(--text);
  font-size: var(--text-base);
  text-decoration: none;
}

.more-grid a:hover,
.more-grid a.router-link-active {
  background: var(--surface-inset);
}

.more-grid .app-icon {
  color: var(--text-muted);
}

.version-warning {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-warning-50);
  border-bottom: 1px solid var(--border);
  color: var(--color-warning-700);
  font-size: var(--text-sm);
}

.version-warning button {
  margin-left: auto;
  background: transparent;
  border: 0;
  color: inherit;
  cursor: pointer;
}

.birch-content {
  width: 100%;
  max-width: 1400px;
  flex: 1;
  margin: 0 auto;
  padding: var(--space-6) var(--space-6);
}

.birch-content.is-full-height {
  max-width: none;
  min-height: 0;
  overflow: hidden;
  padding: 0;
}

@media (max-width: 1100px) {
  .search-btn span,
  .search-btn kbd {
    display: none;
  }

  .search-btn {
    width: auto;
  }
}

.more-primary {
  display: none;
}

@media (max-width: 860px) {
  .topbar-nav .nav-link:not(:last-child) {
    display: none;
  }

  .more-primary {
    display: block;
  }

  .topbar {
    gap: var(--space-2);
    padding: 0 var(--space-3);
  }

  .birch-content {
    padding: var(--space-4);
  }
}

@media (max-width: 600px) {
  .agent-dot {
    display: none;
  }
}
</style>
