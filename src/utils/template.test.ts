import { describe, it, expect } from "vitest";
import { getFilePlaceholders, hasCredentialPlaceholders } from "./template";

describe("getFilePlaceholders", () => {
  it("returns empty array for undefined content", () => {
    expect(getFilePlaceholders(undefined)).toEqual([]);
  });

  it("returns empty array for empty string", () => {
    expect(getFilePlaceholders("")).toEqual([]);
  });

  it("returns empty array for content without placeholders", () => {
    expect(getFilePlaceholders("Hello World")).toEqual([]);
  });

  it("extracts single placeholder", () => {
    expect(getFilePlaceholders("Hello ${NAME}")).toEqual(["NAME"]);
  });

  it("extracts multiple placeholders", () => {
    const content = "DB_HOST=${DB_HOST}\nDB_USER=${DB_USERNAME}";
    expect(getFilePlaceholders(content)).toEqual(["DB_HOST", "DB_USERNAME"]);
  });

  it("removes duplicate placeholders", () => {
    const content = "${NAME} is ${NAME}";
    expect(getFilePlaceholders(content)).toEqual(["NAME"]);
  });

  it("extracts all database credential placeholders", () => {
    const content = `
      DB_HOST=\${DB_HOST}
      DB_PORT=\${DB_PORT}
      DB_DATABASE=\${DB_DATABASE}
      DB_USERNAME=\${DB_USERNAME}
      DB_PASSWORD=\${DB_PASSWORD}
    `;
    const placeholders = getFilePlaceholders(content);
    expect(placeholders).toContain("DB_HOST");
    expect(placeholders).toContain("DB_PORT");
    expect(placeholders).toContain("DB_DATABASE");
    expect(placeholders).toContain("DB_USERNAME");
    expect(placeholders).toContain("DB_PASSWORD");
  });

  it("handles Laravel .env format", () => {
    const content = `
      APP_NAME=\${NAME}
      DB_CONNECTION=mysql
      DB_HOST=\${DB_HOST}
      DB_PORT=\${DB_PORT}
      DB_DATABASE=\${DB_DATABASE}
      DB_USERNAME=\${DB_USERNAME}
      DB_PASSWORD=\${DB_PASSWORD}
    `;
    const placeholders = getFilePlaceholders(content);
    expect(placeholders).toHaveLength(6);
    expect(placeholders).toContain("NAME");
  });

  it("handles WordPress wp-config.php format", () => {
    const content = `
      define('DB_NAME', '\${DB_DATABASE}');
      define('DB_USER', '\${DB_USERNAME}');
      define('DB_PASSWORD', '\${DB_PASSWORD}');
      define('DB_HOST', '\${DB_HOST}');
    `;
    const placeholders = getFilePlaceholders(content);
    expect(placeholders).toHaveLength(4);
  });
});

describe("hasCredentialPlaceholders", () => {
  it("returns false for undefined content", () => {
    expect(hasCredentialPlaceholders(undefined)).toBe(false);
  });

  it("returns false for content without DB placeholders", () => {
    expect(hasCredentialPlaceholders("Hello ${NAME}")).toBe(false);
  });

  it("returns true for content with DB_HOST", () => {
    expect(hasCredentialPlaceholders("${DB_HOST}")).toBe(true);
  });

  it("returns true for content with DATABASE_URL", () => {
    expect(hasCredentialPlaceholders("${DATABASE_URL}")).toBe(true);
  });

  it("returns true for content with any DB_ prefix", () => {
    expect(hasCredentialPlaceholders("${DB_CUSTOM_VAR}")).toBe(true);
  });
});
