const KEY = "flatrun.workspace";

// The workspace the Modern shell is scoped to, sent to the agent as the
// X-Workspace header. Classic has no switcher, so it never sends one and keeps
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
  if (document.documentElement.getAttribute("data-style") !== "modern") return "";
  return selectedWorkspace();
}
