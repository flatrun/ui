import type { Deployment } from "@/types";
import { leadService, projectIcon } from "./brand";

export type ProjectLogo = { icon: string } | { src: string } | { upload: string };

export interface TemplateLogos {
  byId: Record<string, string>;
  byImage: Record<string, string>;
}

export const noTemplateLogos: TemplateLogos = { byId: {}, byImage: {} };

const own = (map: Record<string, string>, key: string) =>
  Object.prototype.hasOwnProperty.call(map, key) ? map[key] : undefined;

const ICON_ID = /^[a-z0-9]+(-[a-z0-9]+)*:[a-z0-9]+(-[a-z0-9]+)*$/;

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

export function templateLogos(templates: { id: string; logo?: string; content?: string }[]): TemplateLogos {
  const logos: TemplateLogos = { byId: {}, byImage: {} };
  for (const t of templates) {
    if (!t.logo) continue;
    logos.byId[t.id] = t.logo;
    const image = appImage(t.content?.match(/^\s*image:\s*["']?([^\s"'#]+)/m)?.[1]);
    if (image && !logos.byImage[image]) logos.byImage[image] = t.logo;
  }
  return logos;
}

function fromTemplate(logo: string | undefined): ProjectLogo | undefined {
  if (!logo) return undefined;
  if (ICON_ID.test(logo)) return { icon: logo };
  return { src: apiAsset(logo) };
}

// A project shows, in order: the logo it was given, the logo of the template it came from, the
// logo of a template that runs the same app image, and an icon for the image itself.
export function projectLogo(
  deployment: Pick<Deployment, "services" | "metadata" | "logo_version">,
  templates: TemplateLogos = noTemplateLogos,
): ProjectLogo {
  const logo = deployment.metadata?.logo ?? "";
  if (logo === "upload" && deployment.logo_version) return { upload: deployment.logo_version };
  if (logo.startsWith("template:")) {
    const named = fromTemplate(own(templates.byId, logo.slice("template:".length)));
    if (named) return named;
  } else if (/^https?:\/\//.test(logo)) {
    return { src: logo };
  } else if (ICON_ID.test(logo)) {
    return { icon: logo };
  }

  const template = deployment.metadata?.template;
  return (
    (template ? fromTemplate(own(templates.byId, template)) : undefined) ??
    fromTemplate(own(templates.byImage, appImage(leadService(deployment)?.image))) ?? { icon: projectIcon(deployment) }
  );
}
