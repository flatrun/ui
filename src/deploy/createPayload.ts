export type CreateMode = "git" | "image" | "easy" | "compose";

export interface CreateDeploymentInput {
  mode: CreateMode;
  name: string;
  composeContent: string;
  templateId?: string;
  envVars: { key: string; value: string }[];
  autoStart: boolean;
  containerPort: number;
  domain: string;
  ssl: boolean;
  git?: {
    repoUrl: string;
    branch: string;
    subpath: string;
    autoDeploy: boolean;
    username?: string;
    token?: string;
    credentialId?: string;
  };
  extraDomains?: ExtraDomain[];
  database?: DatabaseChoice;
  registry?: RegistryLogin;
}

export interface ExtraDomain {
  domain: string;
  service: string;
  containerPort: number;
  pathPrefix?: string;
}

export type DatabaseChoice =
  | { mode: "none" }
  | { mode: "shared" }
  | {
      mode: "existing";
      type: string;
      container: string;
      dbName?: string;
      dbUser?: string;
      dbPassword?: string;
    };

export type RegistryLogin =
  | { credentialId: string }
  | { username: string; password: string; save: boolean; credentialName?: string };

// The body POST /deployments expects, in the same shape the Oak wizard sends.
export function buildCreatePayload(input: CreateDeploymentInput): Record<string, any> {
  const isGit = input.mode === "git";
  const payload: Record<string, any> = {
    name: input.name,
    compose_content: isGit ? "" : input.composeContent,
    template_id: input.templateId || undefined,
    env_vars: input.envVars.filter((e) => e.key),
    auto_start: input.autoStart,
    use_shared_database: input.database?.mode === "shared",
    existing_database_container: input.database?.mode === "existing" ? input.database.container : undefined,
  };

  if (input.database?.mode === "existing" && input.database.container) {
    payload.databases = [
      {
        alias: "primary",
        type: input.database.type,
        mode: "existing",
        existing_container: input.database.container,
        database_name: input.database.dbName || undefined,
        username: input.database.dbUser || undefined,
        password: input.database.dbPassword || undefined,
        env_prefix: "primary",
      },
    ];
  }

  if (input.registry) {
    payload.registry_credential =
      "credentialId" in input.registry
        ? { credential_id: input.registry.credentialId }
        : {
            username: input.registry.username,
            password: input.registry.password,
            save_credential: input.registry.save,
            credential_name: input.registry.credentialName || `${input.name}-registry`,
          };
  }

  if (isGit && input.git) {
    const source: Record<string, any> = {
      type: "git",
      ref: input.git.repoUrl.trim(),
      branch: input.git.branch.trim() || undefined,
      subpath: input.git.subpath.trim() || undefined,
      auto_deploy: input.git.autoDeploy,
    };
    if (input.git.credentialId) {
      source.credential_id = input.git.credentialId;
    } else if (input.git.token) {
      source.username = input.git.username?.trim() || undefined;
      source.token = input.git.token;
    }
    payload.source = source;
  }

  payload.metadata = {
    name: input.name,
    type: "web",
    networking: {
      expose: Boolean(input.domain),
      domain: input.domain || "",
      container_port: input.containerPort,
      protocol: "http",
    },
    ssl: { enabled: input.ssl, auto_cert: input.ssl },
    healthcheck: { path: "/health", interval: "30s" },
    domains: undefined,
  };

  const extra = (input.extraDomains ?? []).filter((d) => d.domain.trim());
  if (input.domain && extra.length) {
    const ssl = { enabled: input.ssl, auto_cert: input.ssl };
    payload.metadata.domains = [
      { id: "primary", domain: input.domain, service: input.name, container_port: input.containerPort, ssl },
      ...extra.map((d, i) => ({
        id: `domain-${i + 1}`,
        domain: d.domain.trim(),
        service: d.service || input.name,
        container_port: Number(d.containerPort) || 80,
        path_prefix: d.pathPrefix || undefined,
        ssl,
      })),
    ];
  }

  return payload;
}

export function composeFromImage(name: string, image: string, containerPort: number, network: string): string {
  return `name: ${name}
services:
  app:
    image: ${image}
    expose:
      - "${containerPort}"
    networks:
      - ${network}
    restart: unless-stopped

networks:
  ${network}:
    external: true
`;
}

// A deployment name from whatever the user pasted: the repository or image
// name, lowercased, with anything outside [a-z0-9-] turned into a hyphen.
export function suggestName(source: string): string {
  const last = source.trim().split("/").filter(Boolean).pop() ?? "";
  return last
    .replace(/\.git$/, "")
    .replace(/[:@].*$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export const NAME_PATTERN = /^[a-z0-9-]+$/;
