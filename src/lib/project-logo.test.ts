import { afterEach, describe, expect, it, vi } from "vitest";
import projectsFixture from "./fixtures/projects-with-logos.json";
import templatesFixture from "./fixtures/templates-with-logos.json";
import { apiAsset, imageLogos, projectLogo, templateLogo } from "./project-logo";
import type { Deployment } from "@/types";

const images = imageLogos(templatesFixture.templates);
const project = (name: string) => projectsFixture.items.find((p) => p.name === name) as unknown as Deployment;

describe("projectLogo", () => {
  it("shows an icon id, a link or a file the project was given", () => {
    expect(projectLogo(project("plausible"), images)).toEqual({ icon: "simple-icons:plausibleanalytics" });
    expect(projectLogo(project("postiz"), images)).toEqual({ src: "https://cdn.simpleicons.org/postiz" });
    expect(projectLogo(project("shop"), images)).toEqual({ file: project("shop").logo_version });
  });

  it("shows the logo of a template running the same app image", () => {
    expect(projectLogo(project("trakli"), images)).toEqual({ src: apiAsset("/api/templates/trakli/logo") });
  });

  it("does not take a template's logo for an official image several templates share", () => {
    expect(projectLogo(project("blog"), images)).toEqual({ icon: "logos:wordpress-icon" });
  });

  it("falls back when the file a logo names is missing", () => {
    const shop = project("shop");
    expect(projectLogo({ ...shop, logo_version: undefined }, images)).toEqual({ icon: "logos:nodejs-icon" });
  });

  it("uses the image icon before the template list has loaded", () => {
    expect(projectLogo(project("trakli"))).toEqual({ icon: "box" });
  });
});

describe("templateLogo", () => {
  it("reads every form the agent lists", () => {
    expect(templateLogo("logos:redis")).toEqual({ icon: "logos:redis" });
    expect(templateLogo("https://example.com/a.svg")).toEqual({ src: "https://example.com/a.svg" });
    expect(templateLogo(templatesFixture.templates[0].logo)).toEqual({ src: apiAsset("/api/templates/static/logo") });
    expect(templateLogo("")).toBeUndefined();
    expect(templateLogo("javascript:alert(1)")).toBeUndefined();
  });
});

describe("apiAsset", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("serves agent paths from the API's origin and leaves links alone", () => {
    vi.stubEnv("VITE_API_URL", "http://localhost:8090/api");
    expect(apiAsset("/api/templates/trakli/logo")).toBe("http://localhost:8090/api/templates/trakli/logo");
    expect(apiAsset("https://cdn.simpleicons.org/n8n")).toBe("https://cdn.simpleicons.org/n8n");
  });

  it("keeps agent paths on the dashboard's origin when the API is served there", () => {
    vi.stubEnv("VITE_API_URL", "");
    expect(apiAsset("/api/templates/trakli/logo")).toBe("/api/templates/trakli/logo");
  });
});
