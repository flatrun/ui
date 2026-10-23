const KEY = "flatrun.workspace";
// Stored for "All workspaces" so that choice is told apart from no choice yet.
const ALL = "*";

function stored(): string | null {
  try {
    return localStorage.getItem(KEY);
  } catch {
    return null;
  }
}

// The workspace the Birch shell is scoped to, sent to the agent as the
// X-Workspace header. Oak has no switcher, so it never sends one and keeps
// seeing everything the user can reach.
export function selectedWorkspace(): string {
  const value = stored();
  return value === null || value === ALL ? "" : value;
}

export function hasChosenWorkspace(): boolean {
  return stored() !== null;
}

export function setSelectedWorkspace(slug: string) {
  try {
    localStorage.setItem(KEY, slug || ALL);
  } catch {
    /* storage unavailable; the choice lasts for this page only */
  }
}

export function workspaceHeader(): string {
  if (document.documentElement.getAttribute("data-layout") !== "birch") return "";
  return selectedWorkspace();
}
