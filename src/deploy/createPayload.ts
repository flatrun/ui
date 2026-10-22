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
  };
}

// The body POST /deployments expects, in the same shape the Classic wizard
// sends for a deployment without databases, extra domains or registry login.
export function buildCreatePayload(input: CreateDeploymentInput): Record<string, any> {
  const isGit = input.mode === "git";
  const payload: Record<string, any> = {
    name: input.name,
    compose_content: isGit ? "" : input.composeContent,
    template_id: input.templateId || undefined,
    env_vars: input.envVars.filter((e) => e.key),
    auto_start: input.autoStart,
    use_shared_database: false,
    existing_database_container: undefined,
  };

  if (isGit && input.git) {
    const source: Record<string, any> = {
      type: "git",
      ref: input.git.repoUrl.trim(),
      branch: input.git.branch.trim() || undefined,
      subpath: input.git.subpath.trim() || undefined,
      auto_deploy: input.git.autoDeploy,
    };
    if (input.git.token) {
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
