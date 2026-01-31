import { describe, it, expect } from "vitest";
import type { DatabaseConfig, DomainConfig, ServiceMetadata } from "@/types";

describe("DatabaseConfig type", () => {
  it("should have all required fields", () => {
    const db: DatabaseConfig = {
      id: "test-db",
      alias: "primary",
      type: "mysql",
      mode: "shared",
    };

    expect(db.id).toBe("test-db");
    expect(db.alias).toBe("primary");
    expect(db.type).toBe("mysql");
    expect(db.mode).toBe("shared");
  });

  it("should support all database types", () => {
    const types: DatabaseConfig["type"][] = ["mysql", "postgres", "mariadb", "mongodb", "redis"];

    types.forEach((type) => {
      const db: DatabaseConfig = {
        id: `test-${type}`,
        alias: "test",
        type,
        mode: "shared",
      };
      expect(db.type).toBe(type);
    });
  });

  it("should support all connection modes", () => {
    const modes: DatabaseConfig["mode"][] = ["shared", "create", "existing", "external"];

    modes.forEach((mode) => {
      const db: DatabaseConfig = {
        id: `test-${mode}`,
        alias: "test",
        type: "mysql",
        mode,
      };
      expect(db.mode).toBe(mode);
    });
  });

  it("should support optional fields", () => {
    const db: DatabaseConfig = {
      id: "full-config",
      alias: "analytics",
      type: "postgres",
      mode: "external",
      service: "backend",
      host: "db.example.com",
      port: 5432,
      container: "postgres-container",
      database_name: "analytics_db",
      username: "analyst",
      env_prefix: "ANALYTICS",
      is_shared: false,
    };

    expect(db.service).toBe("backend");
    expect(db.host).toBe("db.example.com");
    expect(db.port).toBe(5432);
    expect(db.database_name).toBe("analytics_db");
    expect(db.env_prefix).toBe("ANALYTICS");
    expect(db.is_shared).toBe(false);
  });
});

describe("DomainConfig type", () => {
  it("should have all required fields", () => {
    const domain: DomainConfig = {
      id: "test-domain",
      service: "frontend",
      container_port: 80,
      domain: "example.com",
      ssl: {
        enabled: true,
        auto_cert: true,
      },
    };

    expect(domain.id).toBe("test-domain");
    expect(domain.service).toBe("frontend");
    expect(domain.container_port).toBe(80);
    expect(domain.domain).toBe("example.com");
    expect(domain.ssl.enabled).toBe(true);
  });

  it("should support optional fields", () => {
    const domain: DomainConfig = {
      id: "api-domain",
      service: "api",
      container_port: 8080,
      domain: "api.example.com",
      path_prefix: "/v1",
      strip_prefix: true,
      ssl: {
        enabled: true,
        auto_cert: true,
      },
      aliases: ["api-v1.example.com"],
    };

    expect(domain.path_prefix).toBe("/v1");
    expect(domain.strip_prefix).toBe(true);
    expect(domain.aliases).toContain("api-v1.example.com");
  });
});

describe("ServiceMetadata with databases", () => {
  it("should support empty databases array", () => {
    const metadata: ServiceMetadata = {
      name: "test-app",
      type: "web",
      networking: {
        expose: true,
        domain: "test.example.com",
        container_port: 80,
        protocol: "http",
      },
      ssl: {
        enabled: true,
        auto_cert: true,
      },
      healthcheck: {
        path: "/health",
        interval: "30s",
      },
    };

    expect(metadata.databases).toBeUndefined();
  });

  it("should support single database", () => {
    const metadata: ServiceMetadata = {
      name: "test-app",
      type: "web",
      networking: {
        expose: true,
        domain: "test.example.com",
        container_port: 80,
        protocol: "http",
      },
      ssl: {
        enabled: true,
        auto_cert: true,
      },
      healthcheck: {
        path: "/health",
        interval: "30s",
      },
      databases: [
        {
          id: "primary",
          alias: "primary",
          type: "mysql",
          mode: "shared",
          is_shared: true,
        },
      ],
    };

    expect(metadata.databases).toHaveLength(1);
    expect(metadata.databases![0].alias).toBe("primary");
  });

  it("should support multiple databases", () => {
    const metadata: ServiceMetadata = {
      name: "complex-app",
      type: "web",
      networking: {
        expose: true,
        domain: "app.example.com",
        container_port: 80,
        protocol: "http",
      },
      ssl: {
        enabled: true,
        auto_cert: true,
      },
      healthcheck: {
        path: "/health",
        interval: "30s",
      },
      databases: [
        {
          id: "primary",
          alias: "primary",
          type: "mysql",
          mode: "shared",
          is_shared: true,
        },
        {
          id: "cache",
          alias: "cache",
          type: "redis",
          mode: "existing",
          container: "redis-server",
        },
        {
          id: "analytics",
          alias: "analytics",
          type: "postgres",
          mode: "external",
          host: "analytics.db.example.com",
          port: 5432,
        },
      ],
    };

    expect(metadata.databases).toHaveLength(3);
    expect(metadata.databases![0].type).toBe("mysql");
    expect(metadata.databases![1].type).toBe("redis");
    expect(metadata.databases![2].type).toBe("postgres");
  });
});

describe("ServiceMetadata with domains", () => {
  it("should support multiple domains", () => {
    const metadata: ServiceMetadata = {
      name: "multi-domain-app",
      type: "web",
      networking: {
        expose: true,
        domain: "app.example.com",
        container_port: 80,
        protocol: "http",
      },
      ssl: {
        enabled: true,
        auto_cert: true,
      },
      healthcheck: {
        path: "/health",
        interval: "30s",
      },
      domains: [
        {
          id: "primary",
          service: "frontend",
          container_port: 80,
          domain: "app.example.com",
          ssl: { enabled: true, auto_cert: true },
        },
        {
          id: "api",
          service: "api",
          container_port: 8080,
          domain: "api.example.com",
          path_prefix: "/v1",
          ssl: { enabled: true, auto_cert: true },
        },
        {
          id: "admin",
          service: "admin",
          container_port: 3000,
          domain: "admin.example.com",
          ssl: { enabled: true, auto_cert: true },
        },
      ],
    };

    expect(metadata.domains).toHaveLength(3);
    expect(metadata.domains![0].domain).toBe("app.example.com");
    expect(metadata.domains![1].domain).toBe("api.example.com");
    expect(metadata.domains![2].domain).toBe("admin.example.com");
  });
});
