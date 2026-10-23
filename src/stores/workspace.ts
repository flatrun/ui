import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { Workspace } from "@/types";
import { workspacesApi } from "@/services/api";
import { hasChosenWorkspace, selectedWorkspace, setSelectedWorkspace } from "@/services/workspaceScope";

export const useWorkspaceStore = defineStore("workspace", () => {
  const workspaces = ref<Workspace[]>([]);
  const slug = ref(selectedWorkspace());
  const loaded = ref(false);

  const current = computed(() => workspaces.value.find((w) => w.slug === slug.value));

  async function load() {
    try {
      workspaces.value = (await workspacesApi.list()).data.items ?? [];
    } catch {
      workspaces.value = [];
    }
    loaded.value = true;
    if (!hasChosenWorkspace() || (slug.value && !current.value)) selectDefault();
  }

  function selectDefault() {
    const fallback = workspaces.value.find((w) => w.slug === "default") ?? workspaces.value[0];
    if (fallback) select(fallback.slug);
    else slug.value = "";
  }

  function select(next: string) {
    slug.value = next;
    setSelectedWorkspace(next);
  }

  async function create(name: string) {
    const ws = (await workspacesApi.create(name)).data;
    workspaces.value = [...workspaces.value, ws];
    select(ws.slug);
    return ws;
  }

  function update(ws: Workspace) {
    workspaces.value = workspaces.value.map((w) => (w.slug === ws.slug ? { ...w, ...ws, logo: ws.logo } : w));
  }

  return { workspaces, slug, current, loaded, load, select, create, update };
});
