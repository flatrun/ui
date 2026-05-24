import { describe, expect, it } from "vitest";
import { extractComposeMounts, extractComposeServiceNames, toComposeRelativePath } from "./compose";

describe("toComposeRelativePath", () => {
  it("converts deployment-root file paths into relative compose paths", () => {
    expect(toComposeRelativePath("/storage")).toBe("./storage");
    expect(toComposeRelativePath("config/app.php")).toBe("config/app.php");
  });
  it("keeps root as compose project root", () => {
    expect(toComposeRelativePath("/")).toBe(".");
  });
});

describe("extractComposeServiceNames", () => {
  it("extracts top-level compose service names", () => {
    const compose = `services:
  web:
    image: nginx
  app:
    image: node
networks:
  proxy:
    external: true
`;

    expect(extractComposeServiceNames(compose)).toEqual(["web", "app"]);
  });

  it("ignores nested keys inside service blocks", () => {
    const compose = `services:
  web:
    image: nginx
    environment:
      APP_ENV: production
`;

    expect(extractComposeServiceNames(compose)).toEqual(["web"]);
  });
});

describe("extractComposeMounts", () => {
  it("returns short-syntax bind mounts per service", () => {
    const compose = `services:
  app:
    image: nginx
    volumes:
      - ./storage:/var/www/storage
      - ./config:/etc/nginx:ro
`;

    expect(extractComposeMounts(compose)).toEqual([
      { service: "app", source: "./storage", target: "/var/www/storage", readOnly: false },
      { service: "app", source: "./config", target: "/etc/nginx", readOnly: true },
    ]);
  });

  it("parses SELinux relabel options", () => {
    const compose = `services:
  app:
    volumes:
      - ./data:/data:Z
      - ./shared:/shared:z
      - ./readonly:/ro:ro,Z
`;

    expect(extractComposeMounts(compose)).toEqual([
      { service: "app", source: "./data", target: "/data", readOnly: false, selinux: "Z" },
      { service: "app", source: "./shared", target: "/shared", readOnly: false, selinux: "z" },
      { service: "app", source: "./readonly", target: "/ro", readOnly: true, selinux: "Z" },
    ]);
  });

  it("collects mounts across multiple services", () => {
    const compose = `services:
  web:
    volumes:
      - ./a:/a
  worker:
    image: x
    volumes:
      - ./b:/b
`;

    expect(extractComposeMounts(compose)).toEqual([
      { service: "web", source: "./a", target: "/a", readOnly: false },
      { service: "worker", source: "./b", target: "/b", readOnly: false },
    ]);
  });

  it("returns empty for missing compose", () => {
    expect(extractComposeMounts("")).toEqual([]);
    expect(extractComposeMounts("not yaml")).toEqual([]);
  });
});
