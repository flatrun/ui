import { describe, expect, it } from "vitest";
import { getIcon } from "@iconify/vue";
import "@/lib/icons";
import { projectIcon, serviceIcon } from "./brand";
import type { Service } from "@/types";

describe("serviceIcon", () => {
  it.each([
    ["nginx:stable-alpine", "logos:nginx"],
    ["docker.io/library/postgres:16-alpine", "logos:postgresql"],
    ["mysql:8.0", "logos:mysql-icon"],
    ["bitnami/redis:7.2", "logos:redis"],
    ["ghcr.io/acme/api@sha256:abc", "box"],
    ["node:22-alpine", "logos:nodejs-icon"],
    ["wordpress:latest", "logos:wordpress-icon"],
    ["nextcloud:29", "box"],
    ["minio/minio:latest", "container"],
    ["mailhog/mailhog:latest", "mail"],
    ["busybox:latest", "terminal"],
    ["phpmyadmin/phpmyadmin:latest", "table"],
    ["php:8.3-fpm", "logos:php"],
    [undefined, "box"],
  ])("shows %s as %s", (image, icon) => {
    expect(serviceIcon(image)).toBe(icon);
  });

  it.each([
    ["ghcr.io/trakli/webservice:latest", "apps:trakli"],
    ["ghcr.io/gitroomhq/postiz-app:latest", "apps:postiz"],
    ["ghcr.io/sourceant/sourceant:latest", "apps:sourceant"],
    ["ghcr.io/acme/webservice:latest", "box"],
  ])("shows the app logo for %s", (image, icon) => {
    expect(serviceIcon(image)).toBe(icon);
    if (icon !== "box") expect(getIcon(icon)?.body, icon).toBeTruthy();
  });

  it("only names logos that are bundled", () => {
    const images = [
      "nginx",
      "httpd",
      "mariadb",
      "mongo",
      "valkey/valkey",
      "python:3.12",
      "golang:1.23",
      "grafana/grafana",
    ];
    for (const image of images) {
      const icon = serviceIcon(image);
      expect(icon.startsWith("logos:"), image).toBe(true);
      expect(getIcon(icon)?.body, icon).toBeTruthy();
    }
  });
});

describe("projectIcon", () => {
  const svc = (name: string, image: string, primary = false) => ({ name, image, is_primary: primary }) as Service;

  it("uses the primary service", () => {
    expect(projectIcon({ services: [svc("db", "postgres:16"), svc("web", "nginx", true)] })).toBe("logos:nginx");
  });

  it("prefers what the project serves over its database", () => {
    expect(projectIcon({ services: [svc("db", "mysql:8"), svc("site", "wordpress")] })).toBe("logos:wordpress-icon");
  });

  it("prefers the service its domain points at over a database tool", () => {
    const site = { ...svc("wordpress", "wordpress:latest"), domains: ["blog.example.com"] } as Service;
    expect(
      projectIcon({ services: [svc("mysql", "mysql:8.0"), svc("phpmyadmin", "phpmyadmin/phpmyadmin"), site] }),
    ).toBe("logos:wordpress-icon");
  });

  it("falls back to a database when that is all it runs", () => {
    expect(projectIcon({ services: [svc("db", "postgres:16")] })).toBe("logos:postgresql");
    expect(projectIcon({ services: [] })).toBe("box");
  });
});
