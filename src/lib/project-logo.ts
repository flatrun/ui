import type { Deployment } from "@/types";
import { leadService, projectIcon } from "./brand";

export type ProjectLogo = { icon: string } | { src: string } | { file: string };

// Logos of catalog templates, keyed by the app image each one runs.
export type ImageLogos = Record<string, string>;

const own = (map: Record<string, string>, key: string) =>
  Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;

const ICON_ID = /^[a-z0-9]+(-[a-z0-9]+)*:[a-z0-9]+(-[a-z0-9]+)*$/;
const LINK = /^https?:\/\//;

function imageRepo(image: string | undefined): string {
  const repo = (image ?? "").toLowerCase().split("@")[0];
  const slash = repo.lastIndexOf("/");
  const colon = repo.lastIndexOf(":");
  return colon > slash ? repo.slice(0, colon) : repo;
}

// Images without a namespace are official ones (mysql, nginx) that many templates share, so
// they say nothing about which app a project is.
function appImage(image: string | undefined): string {
  const repo = imageRepo(image);
  return repo.includes("/") ? repo : "";
}

// Template logos served by the agent are paths under its API, which the dashboard may reach on
// another origin during development.
export function apiAsset(path: string): string {
  if (!path.startsWith("/api/")) return path;
  const base = (import.meta.env.VITE_API_URL || "/api").replace(/\/api\/?$/, "");
  return base + path;
}

// A template's logo as the agent lists it: an icon id, a link, or the path serving its file.
export function templateLogo(logo: string | undefined): ProjectLogo | undefined {
  if (!logo) return undefined;
  if (ICON_ID.test(logo)) return { icon: logo };
  if (LINK.test(logo) || logo.startsWith("/api/")) return { src: apiAsset(logo) };
  return undefined;
}

export function imageLogos(templates: { logo?: string; content?: string }[]): ImageLogos {
  const logos: ImageLogos = {};
  for (const t of templates) {
    const image = appImage(t.content?.match(/^\s*image:\s*["']?([^\s"'#]+)/m)?.[1]);
    if (t.logo && image && !own(logos, image)) logos[image] = t.logo;
  }
  return logos;
}

// A project shows, in order: the logo it was given, the logo of a template that runs the same
// app image, and an icon for the image itself. A logo naming a file is served by the agent,
// which reports a version for it only when the file exists.
export function projectLogo(
  deployment: Pick<Deployment, "services" | "metadata" | "logo_version">,
  images: ImageLogos = {},
): ProjectLogo {
  const logo = deployment.metadata?.logo ?? "";
  if (ICON_ID.test(logo)) return { icon: logo };
  if (LINK.test(logo)) return { src: logo };
  if (logo && deployment.logo_version) return { file: deployment.logo_version };
  return templateLogo(own(images, appImage(leadService(deployment)?.image))) ?? { icon: projectIcon(deployment) };
}
