// Mirrors the agent's reference syntax: ${{ deployment.KEY }}.
const source = String.raw`\$\{\{\s*([a-zA-Z0-9][a-zA-Z0-9_-]*)\.([A-Za-z_][A-Za-z0-9_]*)\s*\}\}`;

export const HOST_KEY = "FLATRUN_HOST";

export interface EnvReference {
  deployment: string;
  key: string;
}

export function hasReference(value: string): boolean {
  return new RegExp(source).test(value);
}

export function parseReferences(value: string): EnvReference[] {
  return [...value.matchAll(new RegExp(source, "g"))].map((m) => ({ deployment: m[1], key: m[2] }));
}

export function formatReference(deployment: string, key: string): string {
  return `\${{ ${deployment}.${key} }}`;
}
