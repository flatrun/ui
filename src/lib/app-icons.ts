import type { IconifyJSON } from "@iconify/vue";

// Logos of apps no published icon set carries, kept as plain SVG files in src/assets/app-icons.
const files = import.meta.glob<string>("../assets/app-icons/*.svg", { query: "?raw", import: "default", eager: true });

function toIcon(svg: string) {
  const [left, top, width, height] = (svg.match(/viewBox="([^"]+)"/)?.[1] ?? "0 0 24 24").split(/[\s,]+/).map(Number);
  const body = svg.replace(/^[\s\S]*?<svg[^>]*>/, "").replace(/<\/svg>\s*$/, "");
  return { body, left, top, width, height };
}

export const appsCollection: IconifyJSON = {
  prefix: "apps",
  icons: Object.fromEntries(
    Object.entries(files).map(([file, svg]) => [
      file
        .split("/")
        .pop()!
        .replace(/\.svg$/, ""),
      toIcon(svg),
    ]),
  ),
};
