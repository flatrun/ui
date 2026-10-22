import { computed, ref } from "vue";
import { useAuthStore } from "@/stores/auth";
import { useTheme } from "@/composables/useTheme";
import { deploymentsApi, containersApi, imagesApi, volumesApi, networksApi } from "@/services/api";
import type { Permission } from "@/types";
import { visibleNavItems } from "./items";

export interface SearchItem {
  key: string;
  label: string;
  path: string;
  icon: string;
  group: string;
}

interface EntitySource {
  group: string;
  modernGroup?: string;
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
    modernGroup: "Project",
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

export function useSearchIndex() {
  const authStore = useAuthStore();
  const { current } = useTheme();
  const entities = ref<SearchItem[]>([]);
  const loaded = ref(false);
  const loading = ref(false);

  async function load() {
    if (loaded.value || loading.value) return;
    loading.value = true;
    const sources = ENTITY_SOURCES.filter((s) => authStore.hasPermission(s.perm));
    const lists = await Promise.all(
      sources.map(async (s): Promise<SearchItem[]> => {
        try {
          const labels = await s.fetch();
          const group = current.value.layout === "modern" ? (s.modernGroup ?? s.group) : s.group;
          return labels.map((label) => ({
            key: `${s.group}:${label}`,
            label,
            path: s.path(label),
            icon: s.icon,
            group,
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
    loaded.value = true;
    loading.value = false;
  }

  const pages = computed<SearchItem[]>(() =>
    visibleNavItems((p) => authStore.hasPermission(p), current.value.layout).map((item) => ({
      key: item.path,
      label: item.label,
      path: item.path,
      icon: item.icon,
      group: item.group,
    })),
  );

  function search(query: string, limit = 10): SearchItem[] {
    const q = query.trim().toLowerCase();
    if (!q) return pages.value.slice(0, 8);
    const ents = entities.value.filter((e) => e.label.toLowerCase().includes(q));
    const matches = pages.value.filter((d) => d.label.toLowerCase().includes(q));
    // Resources first: you're usually searching for a specific deployment/container/etc.
    return [...ents, ...matches].slice(0, limit);
  }

  return { entities, pages, load, search };
}
