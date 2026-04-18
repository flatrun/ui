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
