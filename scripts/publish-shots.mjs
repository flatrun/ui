#!/usr/bin/env node
// Copies the screenshots `pagebeam shoot` took into the places that show them,
// under fixed names, so a README, a docs page or the website updates by running
// the tour again. A shot from a `-dark` journey is saved as `<name>-dark.png`,
// any other as `<name>-light.png`.
//
//   node scripts/publish-shots.mjs [--target local]
//
// AGENT_DIR and WEBSITE_DIR point at those checkouts; they default to the
// directories beside this one, and a missing one is skipped.

import { copyFile, mkdir, readdir, readFile, stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ui = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const target = args.includes("--target") ? args[args.indexOf("--target") + 1] : "local";
const shots = path.join(ui, ".pagebeam", "shots", target);
const agent = process.env.AGENT_DIR || path.join(ui, "..", "agent");
const website = process.env.WEBSITE_DIR || path.join(ui, "..", "website");

// Destination folder, and for each shot the file name it is saved under there.
// A shot a destination does not list is not copied to it.
const DESTINATIONS = [
  { dir: path.join(ui, "docs", "screenshots"), names: "all" },
  {
    dir: path.join(agent, "docs", "screenshots"),
    names: {
      "projects-canvas": "projects-canvas",
      "projects-cards": "projects-cards",
      "project-architecture": "project-architecture",
      "project-variables": "project-variables",
      "controls-upload-limit": "domain-upload-limit",
      "controls-upload-rejections": "upload-rejections",
      "controls-upload-default": "upload-limit-default",
      "controls-responses": "domain-responses",
      "controls-visitor-access": "domain-visitor-access",
      "controls-service-settings": "service-settings",
      "controls-service-sleep": "service-sleep",
      "controls-canvas-asleep": "service-asleep",
    },
  },
  {
    dir: path.join(website, "src", "assets", "screenshots"),
    names: {
      "projects-canvas": "canvas",
      "projects-cards": "deployments",
      "project-deployments": "deploys",
      "project-files": "files",
      "project-logs": "logs",
      "new-project": "new",
      "project-terminal": "terminal",
      "projects-table": "table",
      "project-architecture": "architecture",
      "postiz-architecture": "services",
      "project-variables": "variables",
      "project-metrics": "metrics",
      "new-project-github": "new-github",
      workspace: "workspace",
      search: "search",
      "ops-cron-jobs": "cron-jobs",
      "ops-dns": "dns",
      "ops-security": "security",
      "ops-alerts": "alerts",
      "ops-notifications": "notifications",
      "ops-users": "users",
      "ops-plugins": "plugins",
      "ops-cluster": "cluster",
      "ops-object-stores": "object-stores",
    },
  },
];

async function exists(dir) {
  try {
    return (await stat(dir)).isDirectory();
  } catch {
    return false;
  }
}

if (!(await exists(shots))) {
  console.error(`No screenshots in ${shots}. Run: npx --yes pagebeam@0.1.5 shoot --target ${target}`);
  process.exit(1);
}

let copied = 0;
for (const journey of await readdir(shots)) {
  const manifestPath = path.join(shots, journey, "manifest.json");
  let manifest;
  try {
    manifest = JSON.parse(await readFile(manifestPath, "utf8"));
  } catch {
    continue;
  }
  const scheme = journey.endsWith("-dark") ? "dark" : "light";
  for (const shot of manifest.shots) {
    for (const dest of DESTINATIONS) {
      const base = dest.names === "all" ? shot.name : dest.names[shot.name];
      if (!base || !(await exists(path.dirname(dest.dir)))) continue;
      await mkdir(dest.dir, { recursive: true });
      await copyFile(path.join(shots, journey, shot.file), path.join(dest.dir, `${base}-${scheme}.png`));
      copied++;
    }
  }
}
console.log(`Copied ${copied} screenshots.`);
