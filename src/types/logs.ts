// LogRecord is one log line broken into the parts the structured viewer renders
// as a row. The agent produces these; this file mirrors that shape and can
// rebuild one from a raw line when only text is available (a static snapshot, or
// an older agent that only sent `line`).

export interface LogRecord {
  timestamp?: string;
  service?: string;
  level?: string;
  message: string;
  fields?: Record<string, string>;
  raw: string;
}

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

// LogSource is a place a deployment's logs can be read from: the container
// output ("stdout") or a file the app writes under its own directory ("file").
export interface LogSource {
  id: string;
  name: string;
  type: "stdout" | "file";
  service?: string;
  path?: string;
  format?: string;
  builtin?: boolean;
}

const COMPOSE_PREFIX = /^([A-Za-z0-9][A-Za-z0-9._-]*)\s*\|\s?/;
const LEADING_TIMESTAMP =
  /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))\s+/;
const TEXT_LEVEL =
  /\b(TRACE|DEBUG|INFO(?:RMATION)?|NOTICE|WARN(?:ING)?|ERROR|ERR|FATAL|CRIT(?:ICAL)?|PANIC|EMERG(?:ENCY)?|ALERT)\b/i;

export function canonicalLevel(raw: string | undefined): LogLevel | "" {
  if (!raw) return "";
  switch (raw.trim().toLowerCase()) {
    case "trace":
      return "trace";
    case "debug":
      return "debug";
    case "info":
    case "information":
    case "informational":
    case "notice":
      return "info";
    case "warn":
    case "warning":
      return "warn";
    case "err":
    case "error":
      return "error";
    case "fatal":
    case "crit":
    case "critical":
    case "panic":
    case "emerg":
    case "emergency":
    case "alert":
      return "fatal";
    default:
      return "";
  }
}

// parseLogLine rebuilds a record from a raw compose line. It mirrors the agent's
// parser so a viewer looks the same whether the record came down structured or
// had to be reconstructed from text.
export function parseLogLine(raw: string): LogRecord {
  const rec: LogRecord = { message: raw, raw };
  let rest = raw;

  const prefix = COMPOSE_PREFIX.exec(rest);
  if (prefix) {
    rec.service = prefix[1].trim();
    rest = rest.slice(prefix[0].length);
  }

  const ts = LEADING_TIMESTAMP.exec(rest);
  if (ts) {
    rec.timestamp = ts[1];
    rest = rest.slice(ts[0].length);
  }

  rest = rest.replace(/\r$/, "");

  const trimmed = rest.trim();
  if (trimmed.length >= 2 && trimmed[0] === "{" && trimmed[trimmed.length - 1] === "}") {
    try {
      const obj = JSON.parse(trimmed) as Record<string, unknown>;
      const fields: Record<string, string> = {};
      let level = "";
      let message = "";
      for (const [k, v] of Object.entries(obj)) {
        const key = k.toLowerCase();
        const val = typeof v === "string" ? v : JSON.stringify(v);
        if (["level", "severity", "lvl", "loglevel", "log.level"].includes(key)) {
          if (!level) level = canonicalLevel(val) || val;
        } else if (["message", "msg", "log", "text"].includes(key)) {
          if (!message) message = val;
        } else {
          fields[k] = val;
        }
      }
      rec.level = level;
      rec.message = message || trimmed;
      if (Object.keys(fields).length) rec.fields = fields;
      return rec;
    } catch {
      // Not valid JSON after all; fall through to plain-text handling.
    }
  }

  rec.message = rest;
  const lvl = TEXT_LEVEL.exec(rest);
  if (lvl) rec.level = canonicalLevel(lvl[1]);
  return rec;
}

// toRecord accepts whatever a log frame carried (a structured record or a bare
// line) and always returns a record, parsing the line when needed.
export function toRecord(input: LogRecord | string | undefined): LogRecord {
  if (input == null) return { message: "", raw: "" };
  if (typeof input === "string") return parseLogLine(input);
  if (!input.message && input.raw) return parseLogLine(input.raw);
  return input;
}
