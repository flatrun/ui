const KEY = "flatrun.workspace";

// The workspace the Birch shell is scoped to, sent to the agent as the
// X-Workspace header. Oak has no switcher, so it never sends one and keeps
// seeing everything the user can reach.
export function selectedWorkspace(): string {
  try {
    return localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

export function setSelectedWorkspace(slug: string) {
  try {
    if (slug) localStorage.setItem(KEY, slug);
    else localStorage.removeItem(KEY);
  } catch {
    /* storage unavailable; the choice lasts for this page only */
  }
}

export function workspaceHeader(): string {
  if (document.documentElement.getAttribute("data-layout") !== "birch") return "";
  return selectedWorkspace();
}
