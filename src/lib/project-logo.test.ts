import { describe, expect, it } from "vitest";
import projectsFixture from "./fixtures/projects-with-logos.json";
import templatesFixture from "./fixtures/templates-with-logos.json";
import { apiAsset, projectLogo, templateLogos } from "./project-logo";
import type { Deployment } from "@/types";

const templates = templateLogos(templatesFixture.templates);
const project = (name: string) => projectsFixture.items.find((p) => p.name === name) as unknown as Deployment;

describe("projectLogo", () => {
  it("shows an icon id, a link or an uploaded file the project was given", () => {
    expect(projectLogo(project("plausible"), templates)).toEqual({ icon: "simple-icons:plausibleanalytics" });
    expect(projectLogo(project("postiz"), templates)).toEqual({ src: "https://cdn.simpleicons.org/postiz" });
    expect(projectLogo(project("shop"), templates)).toEqual({ upload: project("shop").logo_version });
  });

  it("shows the logo of a template running the same app image", () => {
    expect(projectLogo(project("trakli"), templates)).toEqual({ src: apiAsset("/api/templates/trakli/logo") });
  });

  it("does not take a template's logo for an official image several templates share", () => {
    expect(projectLogo(project("blog"), templates)).toEqual({ icon: "logos:wordpress-icon" });
  });

  it("shows the logo of the template the project came from, or one it names", () => {
    const blog = project("blog");
    expect(projectLogo({ ...blog, metadata: { ...blog.metadata!, template: "sourceant" } }, templates)).toEqual({
      src: apiAsset("/api/templates/sourceant/logo"),
    });
    expect(projectLogo({ ...blog, metadata: { ...blog.metadata!, logo: "template:wordpress" } }, templates)).toEqual({
      src: "https://cdn.simpleicons.org/wordpress",
    });
  });

  it("falls back when an uploaded logo or a named template is missing", () => {
    const shop = project("shop");
    expect(projectLogo({ ...shop, logo_version: undefined }, templates)).toEqual({ icon: "logos:nodejs-icon" });
    expect(
      projectLogo(
        { ...shop, logo_version: undefined, metadata: { ...shop.metadata!, logo: "template:gone" } },
        templates,
      ),
    ).toEqual({ icon: "logos:nodejs-icon" });
  });

  it("uses the image icon before the template list has loaded", () => {
    expect(projectLogo(project("trakli"))).toEqual({ icon: "box" });
  });
});

describe("apiAsset", () => {
  it("serves agent paths from the API's origin and leaves links alone", () => {
    expect(import.meta.env.VITE_API_URL).toBe("http://localhost:8090/api");
    expect(apiAsset("/api/templates/trakli/logo")).toBe("http://localhost:8090/api/templates/trakli/logo");
    expect(apiAsset("https://cdn.simpleicons.org/n8n")).toBe("https://cdn.simpleicons.org/n8n");
  });
});
