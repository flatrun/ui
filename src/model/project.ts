import type { DeployPhase, DeployRecord, Deployment, Service, ServiceMount } from "@/types";
import { PRODUCTION, environmentOf } from "@/canvas/layout";

// The platform vocabulary the Modern views speak: a workspace holds projects,
// a project is one deployment plus its environments, and an environment runs
// the compose services of one deployment directory.

export interface ProjectService {
  name: string;
  image: string;
  status: string;
  health?: string;
  primary: boolean;
  replicas: number;
  running: number;
  domains: string[];
  mounts: ServiceMount[];
}

export interface ProjectEnvironment {
  name: string;
  deployment: string;
  status: Deployment["status"];
  sleeping: boolean;
  services: ProjectService[];
  branch?: string;
  revision?: string;
}

export interface Project {
  name: string;
  workspace?: string;
  environments: ProjectEnvironment[];
}

export interface Deploy {
  id: string;
  action: string;
  phase: DeployPhase;
  message: string;
  revision?: string;
  shortRevision?: string;
  branch?: string;
  trigger: DeployRecord["trigger"];
  error?: string;
  startedAt: string;
  finishedAt?: string;
  durationMs?: number;
}

export type VariableKind = "plain" | "reference" | "secret";

function serviceFrom(s: Service): ProjectService {
  return {
    name: s.name,
    image: s.image,
    status: s.status,
    health: s.health,
    primary: !!s.is_primary,
    replicas: s.replicas ?? 1,
    running: s.running_replicas ?? 0,
    domains: s.domains ?? [],
    mounts: s.mounts ?? [],
  };
}

function environmentFrom(d: Deployment): ProjectEnvironment {
  const source = d.metadata?.source;
  return {
    name: environmentOf(d),
    deployment: d.name,
    status: d.status,
    sleeping: !!d.metadata?.sleep?.sleeping,
    services: (d.services ?? [])
      .map(serviceFrom)
      .sort((a, b) => Number(b.primary) - Number(a.primary) || a.name.localeCompare(b.name)),
    branch: source?.branch,
    revision: source?.last_revision,
  };
}

// projectsFrom groups deployments into projects: an environment joins the
// project of the deployment it was made from. An environment whose base is
// not in the list still gets a project, named after the base.
export function projectsFrom(deployments: Deployment[], workspace?: string): Project[] {
  const scoped = workspace ? deployments.filter((d) => !d.workspace || d.workspace === workspace) : deployments;
  const projects = new Map<string, Project>();
  for (const d of scoped) {
    const name = d.metadata?.environment?.base || d.name;
    let project = projects.get(name);
    if (!project) {
      project = { name, workspace: d.workspace, environments: [] };
      projects.set(name, project);
    }
    project.environments.push(environmentFrom(d));
  }
  for (const project of projects.values()) {
    project.environments.sort((a, b) =>
      a.name === PRODUCTION ? -1 : b.name === PRODUCTION ? 1 : a.name.localeCompare(b.name),
    );
  }
  return [...projects.values()].sort((a, b) => a.name.localeCompare(b.name));
}

export function deploysFrom(records: DeployRecord[] | null | undefined): Deploy[] {
  return (records ?? []).map((r) => {
    const finished = r.finished_at ? Date.parse(r.finished_at) : undefined;
    return {
      id: r.id,
      action: r.action || "redeploy",
      phase: r.phase ?? (r.status === "failed" ? "failed" : r.status === "running" ? "queued" : "active"),
      message: r.message || r.error || "",
      revision: r.revision,
      shortRevision: r.revision?.slice(0, 7),
      branch: r.branch,
      trigger: r.trigger,
      error: r.error,
      startedAt: r.started_at,
      finishedAt: r.finished_at,
      durationMs: finished !== undefined ? finished - Date.parse(r.started_at) : undefined,
    };
  });
}

const secretRef = /\$\{\{\s*secret\.[A-Za-z_][A-Za-z0-9_]*\s*\}\}/;
const anyRef = /\$\{\{\s*[a-zA-Z0-9][a-zA-Z0-9_-]*\.[A-Za-z_][A-Za-z0-9_]*\s*\}\}/;

export function variableKind(value: string): VariableKind {
  if (secretRef.test(value)) return "secret";
  if (anyRef.test(value)) return "reference";
  return "plain";
}

export interface PhaseStart {
  phase: DeployPhase;
  from: number;
}

export interface DeployLog {
  build: string;
  deploy: string;
}

// splitLog divides a deploy's output into what ran before the deploying phase
// (fetching and building) and what ran from it on. Output without phase marks
// counts as deploy output.
export function splitLog(output: string, phases: PhaseStart[] | null | undefined): DeployLog {
  const lines = output.replace(/\n$/, "").split("\n");
  const deployFrom = phases?.find((p) => p.phase === "deploying")?.from;
  const hasBuild = phases?.some((p) => p.phase === "building");
  if (!output) return { build: "", deploy: "" };
  if (deployFrom === undefined) {
    return hasBuild ? { build: lines.join("\n"), deploy: "" } : { build: "", deploy: lines.join("\n") };
  }
  return { build: lines.slice(0, deployFrom).join("\n"), deploy: lines.slice(deployFrom).join("\n") };
}

export type StepState = "done" | "current" | "failed" | "pending";

export interface DeployStep {
  id: "queued" | "building" | "deploying" | "active";
  label: string;
  state: StepState;
}

const STEPS: { id: DeployStep["id"]; label: string }[] = [
  { id: "queued", label: "Initialize" },
  { id: "building", label: "Build" },
  { id: "deploying", label: "Deploy" },
  { id: "active", label: "Active" },
];

// deploySteps lays out the stepper for a deploy. A failed deploy marks the step
// it reached last as failed.
export function deploySteps(phase: DeployPhase | undefined, phases: PhaseStart[] | null | undefined): DeployStep[] {
  const reached = (phases ?? []).map((p) => p.phase).filter((p) => p !== "failed" && p !== "removed");
  const order = STEPS.map((s) => s.id) as string[];
  const effective = phase === "removed" ? "active" : phase;
  let last = effective && order.includes(effective) ? order.indexOf(effective) : -1;
  if (effective === "failed") {
    last = Math.max(0, ...reached.map((p) => order.indexOf(p)));
  }
  return STEPS.map((s, i) => {
    let state: StepState = "pending";
    if (i < last) state = "done";
    else if (i === last) {
      if (effective === "failed") state = "failed";
      else state = s.id === "active" ? "done" : "current";
    }
    return { ...s, state };
  });
}
