export interface LogRecord {
  timestamp?: string;
  service?: string;
  level?: string;
  message: string;
  fields?: Record<string, string>;
  raw: string;
}

export type LogLevel = "trace" | "debug" | "info" | "warn" | "error" | "fatal";

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
const LEADING_TIMESTAMP = /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2}))\s+/;

const LEVEL_WORDS =
  "TRACE|DEBUG|INFO(?:RMATION)?|NOTICE|WARN(?:ING)?|ERROR|ERR|FATAL|CRIT(?:ICAL)?|PANIC|EMERG(?:ENCY)?|ALERT";

const LEVEL_PATTERNS = [
  new RegExp(`^\\s*\\[?\\s*(${LEVEL_WORDS})\\s*\\]?\\s*[:\\-\\s]`, "i"),
  new RegExp(`\\b[a-z][a-z0-9_-]*\\.(${LEVEL_WORDS})\\b`, "i"),
  new RegExp(`\\blevel\\s*[=:]\\s*"?(${LEVEL_WORDS})\\b`, "i"),
];

function detectTextLevel(s: string): LogLevel | "" {
  for (const re of LEVEL_PATTERNS) {
    const m = re.exec(s);
    if (m) return canonicalLevel(m[1]);
  }
  return "";
}

const CONTINUATION_LINE = /^(\s+|#\d+\b|at\s|Caused by:|\.\.\.|"?[}\]])/i;

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
  const json =
    trimmed.length >= 2 && trimmed[0] === "{" && trimmed[trimmed.length - 1] === "}" ? parseJsonObject(trimmed) : null;
  if (json) {
    rec.level = json.level || undefined;
    rec.message = json.message || trimmed;
    if (json.fields) rec.fields = json.fields;
    return rec;
  }

  rec.message = rest;
  rec.level = detectTextLevel(rest) || undefined;
  return rec;
}

function parseJsonObject(s: string): { level: string; message: string; fields?: Record<string, string> } | null {
  let obj: Record<string, unknown>;
  try {
    obj = JSON.parse(s) as Record<string, unknown>;
  } catch {
    return null;
  }
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
  return { level, message, fields: Object.keys(fields).length ? fields : undefined };
}

export interface LogEntry {
  record: LogRecord;
  lines: string[];
  key: number;
}

export function groupLogRecords(records: LogRecord[]): LogEntry[] {
  const entries: LogEntry[] = [];
  for (let i = 0; i < records.length; i++) {
    const rec = records[i];
    const isContinuation = entries.length > 0 && !rec.level && CONTINUATION_LINE.test(rec.message);
    if (isContinuation) {
      entries[entries.length - 1].lines.push(rec.raw);
    } else {
      entries.push({ record: rec, lines: [rec.raw], key: i });
    }
  }
  return entries;
}

export function toRecord(input: LogRecord | string | undefined): LogRecord {
  if (input == null) return { message: "", raw: "" };
  if (typeof input === "string") return parseLogLine(input);
  if (!input.message && input.raw) return parseLogLine(input.raw);
  return input;
}
