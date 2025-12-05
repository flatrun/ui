export function getFilePlaceholders(content: string | undefined): string[] {
  if (!content) return [];
  const matches = content.match(/\$\{([^}]+)\}/g) || [];
  return [...new Set(matches.map((m) => m.slice(2, -1)))];
}

export function hasCredentialPlaceholders(content: string | undefined): boolean {
  const placeholders = getFilePlaceholders(content);
  return placeholders.some((p) => p.startsWith("DB_") || p === "DATABASE_URL");
}
