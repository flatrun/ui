export function extractComposeServiceNames(content: string): string[] {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  let inServices = false;
  let childIndent = -1;
  const names: string[] = [];

  for (const raw of lines) {
    if (/^\s*#/.test(raw) || raw.trim() === "") continue;

    const indent = raw.match(/^\s*/)?.[0].length ?? 0;

    if (!inServices) {
      if (/^services\s*:\s*$/.test(raw)) {
        inServices = true;
        childIndent = -1;
      }
      continue;
    }

    if (indent === 0) {
      inServices = false;
      continue;
    }

    if (childIndent === -1) {
      childIndent = indent;
    }

    if (indent !== childIndent) continue;

    const match = raw.match(/^\s*([A-Za-z0-9_.-]+)\s*:\s*$/);
    if (match) names.push(match[1]);
  }

  return names;
}

export function toComposeRelativePath(path: string): string {
  if (!path || path === "/") return ".";
  return path.startsWith("/") ? `.${path}` : path;
}

export interface ComposeMount {
  service: string;
  source: string;
  target: string;
  readOnly: boolean;
  selinux?: "z" | "Z";
}

export function extractComposeMounts(content: string): ComposeMount[] {
  if (!content) return [];
  const lines = content.split(/\r?\n/);
  const mounts: ComposeMount[] = [];

  let inServices = false;
  let serviceIndent = -1;
  let currentService = "";
  let inVolumes = false;
  let volumesKeyIndent = -1;
  let volumesItemIndent = -1;

  for (const raw of lines) {
    if (/^\s*#/.test(raw) || raw.trim() === "") continue;
    const indent = raw.match(/^\s*/)?.[0].length ?? 0;

    if (!inServices) {
      if (/^services\s*:\s*$/.test(raw)) inServices = true;
      continue;
    }

    if (indent === 0) {
      inServices = false;
      currentService = "";
      inVolumes = false;
      serviceIndent = -1;
      volumesKeyIndent = -1;
      volumesItemIndent = -1;
      continue;
    }

    if (serviceIndent === -1) serviceIndent = indent;

    if (indent === serviceIndent) {
      const match = raw.match(/^\s*([A-Za-z0-9_.-]+)\s*:\s*$/);
      if (match) {
        currentService = match[1];
        inVolumes = false;
        volumesKeyIndent = -1;
        volumesItemIndent = -1;
      }
      continue;
    }

    if (!currentService) continue;

    if (inVolumes && indent <= volumesKeyIndent) {
      inVolumes = false;
      volumesKeyIndent = -1;
      volumesItemIndent = -1;
    }

    if (!inVolumes) {
      if (/^\s*volumes\s*:\s*$/.test(raw)) {
        inVolumes = true;
        volumesKeyIndent = indent;
      }
      continue;
    }

    const listMatch = raw.match(/^(\s*)-\s+(.+?)\s*$/);
    if (!listMatch) continue;
    if (volumesItemIndent === -1) volumesItemIndent = listMatch[1].length;
    if (listMatch[1].length !== volumesItemIndent) continue;

    const parsed = parseShortMount(stripQuotes(listMatch[2].trim()));
    if (parsed) {
      mounts.push({ service: currentService, ...parsed });
    }
  }

  return mounts;
}

function stripQuotes(value: string): string {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function parseShortMount(value: string): Omit<ComposeMount, "service"> | null {
  const parts = value.split(":");
  if (parts.length < 2 || parts.length > 3) return null;
  const source = parts[0];
  const target = parts[1];
  if (!source || !target) return null;
  const opts = parts[2] ? parts[2].split(",") : [];
  const readOnly = opts.includes("ro");
  let selinux: "z" | "Z" | undefined;
  if (opts.includes("Z")) selinux = "Z";
  else if (opts.includes("z")) selinux = "z";
  return { source, target, readOnly, selinux };
}
