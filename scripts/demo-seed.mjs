#!/usr/bin/env node
// Fills an agent with the demo: a demo user, the projects in scripts/demo (some
// referencing each other, some with sealed secrets), and a git project with
// several deploys and a staging environment. The workspace stays "Default";
// DEMO_BRAND=1 names it Trakli with its logo, for screenshots.
//
//   FLATRUN_URL=http://127.0.0.1:8080 FLATRUN_TOKEN=<api key> DEMO_PASSWORD=<password> node scripts/demo-seed.mjs
//
// It only talks to the agent's API and skips what already exists, so it can run
// again after a partial run. DEMO_NETWORK puts every project on one existing
// Docker network, for hosts that have no address pools left for new ones.
// The last line printed is the demo user as JSON, which pagebeam reads.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const API = `${(process.env.FLATRUN_URL || "http://127.0.0.1:8080").replace(/\/$/, "")}/api`;
const TOKEN = process.env.FLATRUN_TOKEN;
const DEMO_USER = process.env.DEMO_USER || "demo";
const DEMO_PASSWORD = process.env.DEMO_PASSWORD;
const NETWORK = process.env.DEMO_NETWORK || "";
const GIT_REPO = process.env.DEMO_GIT_REPO || "https://github.com/docker/awesome-compose.git";
const GIT_SUBPATH = process.env.DEMO_GIT_SUBPATH ?? "flask/app";
const BRAND = Boolean(process.env.DEMO_BRAND);

if (!TOKEN || !DEMO_PASSWORD) {
  console.error("Set FLATRUN_TOKEN (an admin API key) and DEMO_PASSWORD.");
  process.exit(2);
}

async function call(method, path, body, { form } = {}) {
  const headers = { Authorization: `Bearer ${TOKEN}` };
  if (body !== undefined && !form) headers["Content-Type"] = "application/json";
  const res = await fetch(API + path, {
    method,
    headers,
    body: form ?? (body === undefined ? undefined : JSON.stringify(body)),
  });
  const text = await res.text();
  let data = {};
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }
  return { status: res.status, data };
}

async function must(method, path, body, opts) {
  const res = await call(method, path, body, opts);
  if (res.status >= 400) throw new Error(`${method} ${path}: ${res.status} ${res.data.error ?? res.data.raw ?? ""}`);
  return res.data;
}

const log = (...parts) => console.log("-", ...parts);
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function withNetwork(compose) {
  if (!NETWORK) return compose;
  return `${compose.trimEnd()}\nnetworks:\n  default:\n    name: ${NETWORK}\n    external: true\n`;
}

// Each folder in scripts/demo is one project: its compose file, a project.json
// with variables, sealed secrets, domains, its logo and whether it starts, and any
// other files it mounts. Projects that reference another project's variables come
// after it.
const DEMO = path.join(path.dirname(fileURLToPath(import.meta.url)), "demo");
const FIRST = ["plausible", "shop", "trakli"];

async function readProjects() {
  const names = (await readdir(DEMO, { withFileTypes: true })).filter((e) => e.isDirectory()).map((e) => e.name);
  const rank = (n) => (FIRST.includes(n) ? FIRST.indexOf(n) : FIRST.length);
  names.sort((a, b) => rank(a) - rank(b) || a.localeCompare(b));
  return Promise.all(
    names.map(async (name) => {
      const dir = path.join(DEMO, name);
      const spec = JSON.parse(await readFile(path.join(dir, "project.json"), "utf8"));
      const files = (await readdir(dir, { recursive: true, withFileTypes: true }))
        .filter((e) => e.isFile())
        .map((e) => path.relative(dir, path.join(e.parentPath, e.name)))
        .filter((f) => f !== "docker-compose.yml" && f !== "project.json");
      return {
        name,
        dir,
        compose: await readFile(path.join(dir, "docker-compose.yml"), "utf8"),
        env: Object.entries(spec.env ?? {}).map(([key, value]) => ({ key, value })),
        secrets: spec.secrets ?? {},
        domains: spec.domains,
        logo: spec.logo ?? "",
        start: spec.start !== false,
        files,
      };
    }),
  );
}

function metadata(name, domains) {
  const [domain, , port] = domains[0];
  return {
    name,
    type: "web",
    networking: { expose: true, domain, container_port: port, protocol: "http" },
    ssl: { enabled: true, auto_cert: true },
    healthcheck: { path: "/", interval: "30s" },
    domains: domains.map(([d, service, containerPort], i) => ({
      id: `d${i}`,
      domain: d,
      service,
      container_port: containerPort,
      ssl: { enabled: true, auto_cert: true },
    })),
  };
}

const LOGO = path.join(path.dirname(fileURLToPath(import.meta.url)), "demo-logo.svg");

async function workspace() {
  if (!BRAND) {
    await must("PUT", "/workspaces/default", { name: "Default" });
    await call("DELETE", "/workspaces/default/logo");
    log("workspace Default");
    return;
  }
  await must("PUT", "/workspaces/default", { name: "Trakli" });
  const form = new FormData();
  form.append("file", new Blob([await readFile(LOGO)], { type: "image/svg+xml" }), "logo.svg");
  await must("PUT", "/workspaces/default/logo", undefined, { form });
  log("workspace Trakli with its logo");
}

async function demoUser() {
  const { users } = await must("GET", "/users");
  const list = users ?? [];
  const email = `${DEMO_USER}@trakli.test`;
  const user = list.find((u) => u.username === DEMO_USER);
  if (!user) {
    await must("POST", "/users", { username: DEMO_USER, email, password: DEMO_PASSWORD, role: "admin" });
    log(`user ${DEMO_USER}`);
  } else if (user.email !== email) {
    await must("PUT", `/users/${user.id}`, { email });
  }
  const members = await must("GET", "/workspaces/default/members");
  if (!(members.items ?? []).some((m) => m.username === DEMO_USER)) {
    await must("POST", "/workspaces/default/members", { username: DEMO_USER, role: "owner" });
  }
}

async function existing() {
  const { deployments } = await must("GET", "/projects");
  return new Set((deployments ?? []).map((d) => d.name));
}

// The agent names containers, reorders keys, and expands inline lists and anchors when it
// stores a compose file, so only a change to the words themselves counts as an update.
function fingerprint(compose) {
  return compose
    .split("\n")
    .filter((line) => !line.trimStart().startsWith("container_name:"))
    .join(" ")
    .split(/[\s,"'[\]{}]+|(?:^|\s)-\s/)
    .filter((word, i, words) => word && !/^[&*]/.test(word) && words.indexOf(word) === i)
    .sort()
    .join(" ");
}

async function projects(list, have) {
  for (const p of list) {
    const exists = have.has(p.name);
    if (exists) {
      const current = await must("GET", `/projects/${p.name}/compose`);
      if (fingerprint(current.content) !== fingerprint(withNetwork(p.compose))) {
        await must("PUT", `/projects/${p.name}`, { compose_content: withNetwork(p.compose) });
      }
    } else {
      await must("POST", "/projects", {
        name: p.name,
        compose_content: withNetwork(p.compose),
        auto_start: false,
        metadata: metadata(p.name, p.domains),
      });
    }
    for (const file of p.files) {
      const form = new FormData();
      form.append("file", new Blob([await readFile(path.join(p.dir, file))]), path.basename(file));
      await must("POST", `/projects/${p.name}/files/${file}`, undefined, { form });
    }
    const { items } = await must("GET", `/secrets?scope=deployment:${p.name}`);
    const sealed = new Set((items ?? []).map((s) => s.name));
    for (const [key, opts] of Object.entries(p.secrets)) {
      if (sealed.has(key)) continue;
      await must("PUT", `/secrets/${key}?scope=deployment:${p.name}`, { generate: opts });
    }
    if (p.env.length) await must("PUT", `/projects/${p.name}/env`, { env_vars: p.env });
    await must("PUT", `/projects/${p.name}/metadata`, { logo: p.logo });
    log(`${p.name} ${exists ? "updated" : "created"}`);
  }
}

async function workspaceSecret(have) {
  if (have.size) return;
  await must("PUT", "/secrets/SESSION_KEY?scope=workspace:default", { generate: { length: 48, charset: "hex" } });
  await must("PUT", "/secrets/SESSION_KEY/rotation?scope=workspace:default", {
    schedule: "0 3 1 * *",
    length: 48,
    charset: "hex",
  });
  log("workspace secret SESSION_KEY, rotated monthly");
}

async function staging(have) {
  if (have.has("insights-staging")) return;
  await must("POST", "/projects/insights/environments", { name: "staging", branch: "master" });
  log("insights staging environment");
}

async function waitForJob(project, id) {
  for (let i = 0; i < 300; i++) {
    const { data } = await call("GET", `/projects/${project}/jobs/${id}`);
    if (["succeeded", "failed"].includes(data.status)) return data.status;
    await sleep(2000);
  }
  return "timeout";
}

async function settle(project) {
  const { status, data } = await call("GET", `/projects/${project}/jobs/active`);
  if (status === 200 && data.id) await waitForJob(project, data.id);
}

async function gitProject(have) {
  if (!have.has("insights")) {
    const created = await must("POST", "/projects", {
      name: "insights",
      auto_start: true,
      source: { type: "git", ref: GIT_REPO, branch: "master", subpath: GIT_SUBPATH },
      metadata: metadata("insights", [["insights.trakli.test", "app", 8000]]),
    });
    const job = created.build_job_id ?? created.job_id;
    if (job) log(`insights first deploy ${await waitForJob("insights", job)}`);
  }
  await settle("insights");
  const { deployments } = await must("GET", "/projects/insights/deployments");
  for (let i = (deployments ?? []).length; i < 3; i++) {
    const job = await must("POST", "/projects/insights/redeploy", {});
    log(`insights redeploy ${await waitForJob("insights", job.job_id)}`);
  }
}

async function start(names) {
  for (const name of names) {
    const res = await call("POST", `/projects/${name}/start`);
    if (res.data.job_id) log(`${name} start ${await waitForJob(name, res.data.job_id)}`);
  }
}

const have = await existing();
const list = await readProjects();
await workspace();
await demoUser();
await workspaceSecret(have);
await projects(list, have);
await start(list.filter((p) => p.start).map((p) => p.name));
await gitProject(have);
await staging(have);
console.log(JSON.stringify({ username: DEMO_USER, password: DEMO_PASSWORD }));
