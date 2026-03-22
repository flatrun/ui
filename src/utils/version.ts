export const MIN_AGENT_VERSION = "0.1.4";
export const MAX_AGENT_VERSION = "0.x.x";

function parseVersion(version: string): number[] {
  return version
    .replace(/^v/, "")
    .split(".")
    .map((p) => (p === "x" ? Infinity : parseInt(p, 10) || 0));
}

export function compareVersions(a: string, b: string): number {
  const pa = parseVersion(a);
  const pb = parseVersion(b);
  const len = Math.max(pa.length, pb.length);

  for (let i = 0; i < len; i++) {
    const na = pa[i] ?? 0;
    const nb = pb[i] ?? 0;
    if (na < nb) return -1;
    if (na > nb) return 1;
  }
  return 0;
}

export function isAgentCompatible(agentVersion: string): {
  compatible: boolean;
  dev?: boolean;
  message: string;
} {
  if (!agentVersion || agentVersion === "unknown") {
    return { compatible: true, message: "" };
  }

  const version = agentVersion.replace(/^v/, "");

  if (/^dev$|-(dev|alpha|beta|rc|snapshot|canary)/i.test(version)) {
    return {
      compatible: false,
      dev: true,
      message: `Agent ${version} is a development build. Some features may not work as expected.`,
    };
  }

  if (compareVersions(version, MIN_AGENT_VERSION) < 0) {
    return {
      compatible: false,
      message: `Agent ${version} is too old. This UI requires agent ${MIN_AGENT_VERSION} or newer.`,
    };
  }

  if (compareVersions(version, MAX_AGENT_VERSION) > 0) {
    return {
      compatible: false,
      message: `Agent ${version} is newer than supported. This UI supports up to agent ${MAX_AGENT_VERSION}.`,
    };
  }

  return { compatible: true, message: "" };
}
