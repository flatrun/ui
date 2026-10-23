import { describe, expect, it } from "vitest";
import { buildCreatePayload, type CreateDeploymentInput } from "./createPayload";

const base: CreateDeploymentInput = {
  mode: "image",
  name: "shop",
  composeContent: "services: {}",
  envVars: [],
  autoStart: true,
  containerPort: 3000,
  domain: "shop.example.com",
  ssl: true,
};

describe("buildCreatePayload", () => {
  it("adds extra domains after the primary one", () => {
    const payload = buildCreatePayload({
      ...base,
      extraDomains: [
        { domain: "admin.example.com", service: "admin", containerPort: 8080, pathPrefix: "/admin" },
        { domain: " ", service: "", containerPort: 80 },
      ],
    });
    expect(payload.metadata.domains).toEqual([
      {
        id: "primary",
        domain: "shop.example.com",
        service: "shop",
        container_port: 3000,
        ssl: { enabled: true, auto_cert: true },
      },
      {
        id: "domain-1",
        domain: "admin.example.com",
        service: "admin",
        container_port: 8080,
        path_prefix: "/admin",
        ssl: { enabled: true, auto_cert: true },
      },
    ]);
  });

  it("connects an existing database container", () => {
    const payload = buildCreatePayload({
      ...base,
      database: { mode: "existing", type: "postgres", container: "infra-postgres-1", dbName: "shop" },
    });
    expect(payload.existing_database_container).toBe("infra-postgres-1");
    expect(payload.use_shared_database).toBe(false);
    expect(payload.databases).toEqual([
      expect.objectContaining({ alias: "primary", type: "postgres", mode: "existing", database_name: "shop" }),
    ]);
  });

  it("uses the shared database server", () => {
    const payload = buildCreatePayload({ ...base, database: { mode: "shared" } });
    expect(payload.use_shared_database).toBe(true);
    expect(payload.databases).toBeUndefined();
  });

  it("logs in to a registry with a saved or new credential", () => {
    expect(buildCreatePayload({ ...base, registry: { credentialId: "4ab0d1c38614d900" } }).registry_credential).toEqual(
      {
        credential_id: "4ab0d1c38614d900",
      },
    );
    expect(
      buildCreatePayload({ ...base, registry: { username: "acme-ci", password: "pw", save: true } })
        .registry_credential,
    ).toEqual({ username: "acme-ci", password: "pw", save_credential: true, credential_name: "shop-registry" });
  });

  it("clones a private repository with a saved credential", () => {
    const payload = buildCreatePayload({
      ...base,
      mode: "git",
      git: {
        repoUrl: "https://github.com/acme/shop.git",
        branch: "",
        subpath: "",
        autoDeploy: true,
        credentialId: "c1",
      },
    });
    expect(payload.source).toEqual(expect.objectContaining({ credential_id: "c1" }));
    expect(payload.source.token).toBeUndefined();
  });
});
