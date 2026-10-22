import { defineStore } from "pinia";
import { computed, ref } from "vue";
import type { Workspace } from "@/types";
import { workspacesApi } from "@/services/api";
import { selectedWorkspace, setSelectedWorkspace } from "@/services/workspaceScope";

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
    if (slug.value && !current.value) select("");
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

  return { workspaces, slug, current, loaded, load, select, create };
});
