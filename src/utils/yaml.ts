import { parse } from "yaml";

export type ComposeYamlValidation =
  | { valid: true }
  | { valid: false; error: string };

/**
 * This function validates that a string is valid YAML. It is used before sending compose content
 * to the API (e.g.during a deployment update or create).
 */
export function validateComposeYaml(content: string): ComposeYamlValidation {
  const trimmed = content.trim();
  if (!trimmed) {
    return { valid: false, error: "Compose content is empty" };
  }
  try {
    parse(trimmed);
    return { valid: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Invalid YAML syntax";
    return { valid: false, error: message };
  }
}
