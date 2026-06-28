<template>
  <div ref="rootEl" class="global-search">
    <div class="search-field" :class="{ open: open && results.length > 0 }">
      <Icon name="search" :size="16" class="search-icon" />
      <input
        ref="inputEl"
        v-model="query"
        type="text"
        class="search-input"
        placeholder="Search deployments, containers, images..."
        @focus="onFocus"
        @keydown.down.prevent="move(1)"
        @keydown.up.prevent="move(-1)"
        @keydown.enter.prevent="choose"
        @keydown.esc="close"
      />
      <kbd class="search-kbd">{{ kbdHint }}</kbd>
    </div>

    <div v-if="open && results.length" class="search-results">
      <button
        v-for="(r, i) in results"
        :key="r.key"
        type="button"
        class="search-result"
        :class="{ active: i === activeIndex }"
        @mousedown.prevent="go(r)"
        @mouseenter="activeIndex = i"
      >
        <Icon :name="r.icon" :size="16" class="result-icon" />
        <span class="result-label">{{ r.label }}</span>
        <span class="result-group">{{ r.group }}</span>
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, onBeforeUnmount } from "vue";
import { useRouter } from "vue-router";
import Icon from "@/components/base/Icon.vue";
import { useAuthStore } from "@/stores/auth";
import { deploymentsApi, containersApi, imagesApi, volumesApi, networksApi } from "@/services/api";
import type { Permission } from "@/types";

interface Destination {
  label: string;
  path: string;
  icon: string;
  group: string;
  perm?: Permission;
}

const DESTINATIONS: Destination[] = [
  { label: "Dashboard", path: "/", icon: "layout-dashboard", group: "" },
  { label: "Deployments", path: "/deployments", icon: "layers", group: "Stacks", perm: "deployments:read" },
  { label: "Containers", path: "/containers", icon: "box", group: "Docker", perm: "containers:read" },
  { label: "Images", path: "/images", icon: "disc", group: "Docker", perm: "images:read" },
  { label: "Volumes", path: "/volumes", icon: "hard-drive", group: "Docker", perm: "volumes:read" },
  { label: "Networks", path: "/networks", icon: "network", group: "Docker", perm: "networks:read" },
  { label: "Port Mappings", path: "/docker-ports", icon: "plug", group: "Docker", perm: "containers:read" },
  { label: "Server Info", path: "/server-info", icon: "server", group: "System", perm: "system:read" },
  { label: "Terminal", path: "/system-terminal", icon: "terminal", group: "System", perm: "system:write" },
  { label: "Files", path: "/system/files", icon: "folder", group: "System", perm: "system:files" },
  { label: "Cluster", path: "/cluster", icon: "boxes", group: "System", perm: "cluster:read" },
  {
    label: "Infrastructure",
    path: "/infrastructure",
    icon: "server-cog",
    group: "System",
    perm: "infrastructure:read",
  },
  { label: "Ports", path: "/system-ports", icon: "ethernet-port", group: "System", perm: "system:read" },
  { label: "Services", path: "/services", icon: "cog", group: "System", perm: "system:read" },
  { label: "Cron Jobs", path: "/cron-jobs", icon: "clock", group: "System", perm: "scheduler:read" },
  { label: "Database Servers", path: "/databases", icon: "database", group: "Databases", perm: "databases:read" },
  { label: "DNS Zones", path: "/dns/zones", icon: "globe", group: "DNS", perm: "dns:read" },
  { label: "External Providers", path: "/dns/external", icon: "globe", group: "DNS", perm: "dns:read" },
  { label: "Security & Monitoring", path: "/security", icon: "shield", group: "Security", perm: "security:read" },
  { label: "Certificates", path: "/certificates", icon: "shield-check", group: "Security", perm: "certificates:read" },
  { label: "Installed Apps", path: "/apps", icon: "layout-grid", group: "Apps", perm: "templates:read" },
  { label: "Marketplace", path: "/marketplace", icon: "store", group: "Apps", perm: "templates:read" },
  { label: "Settings", path: "/settings", icon: "settings", group: "Administration", perm: "settings:read" },
  { label: "Users", path: "/users", icon: "users", group: "Administration", perm: "users:read" },
  { label: "API Keys", path: "/api-keys", icon: "key", group: "Administration", perm: "apikeys:read" },
];

const router = useRouter();
const authStore = useAuthStore();

interface SearchItem {
  key: string;
  label: string;
  path: string;
  icon: string;
  group: string;
}

interface EntitySource {
  group: string;
  icon: string;
  perm: Permission;
  path: (name: string) => string;
  fetch: () => Promise<string[]>;
}

// Searchable resources across the dashboard. Each fetches its list and maps to
// labels; results navigate to the resource (deployments to their detail page,
// others to the relevant list page).
const ENTITY_SOURCES: EntitySource[] = [
  {
    group: "Deployment",
    icon: "box",
    perm: "deployments:read",
    path: (n) => `/deployments/${n}`,
    fetch: async () => (await deploymentsApi.list()).data.deployments.map((d) => d.name),
  },
  {
    group: "Container",
    icon: "container",
    perm: "containers:read",
    path: () => "/containers",
    fetch: async () => (await containersApi.list()).data.containers.map((c) => c.name).filter(Boolean),
  },
  {
    group: "Image",
    icon: "disc",
    perm: "images:read",
    path: () => "/images",
    fetch: async () => (await imagesApi.list()).data.images.flatMap((i) => i.tags ?? []).filter(Boolean),
  },
  {
    group: "Volume",
    icon: "hard-drive",
    perm: "volumes:read",
    path: () => "/volumes",
    fetch: async () => (await volumesApi.list()).data.volumes.map((v) => v.name).filter(Boolean),
  },
  {
    group: "Network",
    icon: "network",
    perm: "networks:read",
    path: () => "/networks",
    fetch: async () => (await networksApi.list()).data.networks.map((n) => n.name).filter(Boolean),
  },
];

const entities = ref<SearchItem[]>([]);
const entitiesLoaded = ref(false);
const entitiesLoading = ref(false);

async function loadEntities() {
  if (entitiesLoaded.value || entitiesLoading.value) return;
  entitiesLoading.value = true;
  const sources = ENTITY_SOURCES.filter((s) => authStore.hasPermission(s.perm));
  const lists = await Promise.all(
    sources.map(async (s): Promise<SearchItem[]> => {
      try {
        const labels = await s.fetch();
        return labels.map((label) => ({
          key: `${s.group}:${label}`,
          label,
          path: s.path(label),
          icon: s.icon,
          group: s.group,
        }));
      } catch {
        return [];
      }
    }),
  );
  const seen = new Set<string>();
  entities.value = lists.flat().filter((e) => {
    if (seen.has(e.key)) return false;
    seen.add(e.key);
    return true;
  });
  entitiesLoaded.value = true;
  entitiesLoading.value = false;
}

const rootEl = ref<HTMLElement | null>(null);
const inputEl = ref<HTMLInputElement | null>(null);
const query = ref("");
const open = ref(false);
const activeIndex = ref(0);

// Keep the keyboard highlight valid as the result set shrinks while typing.
watch(query, () => {
  activeIndex.value = 0;
});

const isMac = typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform);
const kbdHint = computed(() => (isMac ? "⌘K" : "Ctrl K"));

const allowedPages = computed<SearchItem[]>(() =>
  DESTINATIONS.filter((d) => !d.perm || authStore.hasPermission(d.perm)).map((d) => ({
    key: d.path,
    label: d.label,
    path: d.path,
    icon: d.icon,
    group: d.group,
  })),
);

const results = computed<SearchItem[]>(() => {
  const q = query.value.trim().toLowerCase();
  if (!q) return allowedPages.value.slice(0, 8);
  const ents = entities.value.filter((e) => e.label.toLowerCase().includes(q));
  const pages = allowedPages.value.filter((d) => d.label.toLowerCase().includes(q));
  // Resources first: you're usually searching for a specific deployment/container/etc.
  return [...ents, ...pages].slice(0, 10);
});

const move = (delta: number) => {
  if (!results.value.length) return;
  open.value = true;
  activeIndex.value = (activeIndex.value + delta + results.value.length) % results.value.length;
};

const go = (dest: SearchItem) => {
  router.push(dest.path);
  query.value = "";
  open.value = false;
  inputEl.value?.blur();
};

const onFocus = () => {
  open.value = true;
  loadEntities();
};

const choose = () => {
  const dest = results.value[activeIndex.value];
  if (dest) go(dest);
};

const close = () => {
  open.value = false;
  inputEl.value?.blur();
};

const onDocClick = (e: MouseEvent) => {
  if (rootEl.value && !rootEl.value.contains(e.target as Node)) open.value = false;
};

const onKeydown = (e: KeyboardEvent) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
    e.preventDefault();
    inputEl.value?.focus();
    open.value = true;
  }
};

onMounted(() => {
  document.addEventListener("click", onDocClick);
  document.addEventListener("keydown", onKeydown);
});

onBeforeUnmount(() => {
  document.removeEventListener("click", onDocClick);
  document.removeEventListener("keydown", onKeydown);
});
</script>

<style scoped>
.global-search {
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
  width: 100%;
  max-width: 440px;
}

.search-field {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.45rem 0.75rem;
  background: var(--surface-sunken);
  border: 1px solid var(--border);
  border-radius: var(--radius-lg);
  transition:
    border-color var(--transition-base),
    box-shadow var(--transition-base),
    background var(--transition-base);
}

.search-field:focus-within {
  background: var(--surface);
  border-color: var(--accent);
  box-shadow: 0 0 0 var(--ring-width) var(--ring-color);
}

.search-field.open {
  border-bottom-left-radius: 0;
  border-bottom-right-radius: 0;
}

.search-icon {
  color: var(--text-subtle);
  flex-shrink: 0;
}

.search-input {
  flex: 1;
  border: none;
  background: none;
  outline: none;
  font-size: var(--text-md);
  color: var(--text);
  min-width: 0;
}

.search-input::placeholder {
  color: var(--text-subtle);
}

.search-kbd {
  font-size: var(--text-xs);
  color: var(--text-subtle);
  background: var(--surface-inset);
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  padding: 0.05rem 0.35rem;
  flex-shrink: 0;
}

.search-results {
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: var(--surface-raised);
  border: 1px solid var(--accent);
  border-top: none;
  border-bottom-left-radius: var(--radius-lg);
  border-bottom-right-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  overflow: hidden;
  z-index: var(--z-dropdown);
}

.search-result {
  display: flex;
  align-items: center;
  gap: 0.625rem;
  width: 100%;
  padding: 0.55rem 0.75rem;
  border: none;
  background: none;
  cursor: pointer;
  text-align: left;
  color: var(--text);
  font-size: var(--text-md);
}

.search-result.active {
  background: var(--accent-subtle);
}

.result-icon {
  color: var(--text-muted);
  flex-shrink: 0;
}

.result-label {
  flex: 1;
}

.result-group {
  font-size: var(--text-xs);
  color: var(--text-subtle);
}

@media (max-width: 900px) {
  .global-search {
    display: none;
  }
}
</style>
