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

const LEVEL_WORDS = "TRACE|DEBUG|INFO(?:RMATION)?|NOTICE|WARN(?:ING)?|ERROR|ERR|FATAL|CRIT(?:ICAL)?|PANIC|EMERG(?:ENCY)?|ALERT";

// Detect a severity only where a log format puts one: the start of the line, a
// `channel.LEVEL` tag, or a `level=` field. This mirrors the agent parser so
// the level shown is the same whichever side produced the record, and it avoids
// tagging a stack frame like `App\ErrorHandler->handle()` as an error.
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

// A continuation line is part of the entry above it (a stack frame, an indented
// detail, a closing brace) rather than a new log entry. These markers are
// format-agnostic: indentation, numbered frames, `at`/`Caused by` frames, and
// trailing brackets show up across Java, PHP, Python, and Node stack traces.
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
  rec.level = detectTextLevel(rest) || undefined;
  return rec;
}

// LogEntry is one logical log entry: a header record plus any continuation
// lines (a stack trace, an indented dump) that belong under it. The structured
// view shows the header on one row and reveals the whole entry when expanded.
export interface LogEntry {
  record: LogRecord;
  lines: string[];
  key: number;
}

// groupLogRecords folds continuation lines into the entry above them, so a
// multi-line entry (an exception with its stack trace) reads as one expandable
// row instead of dozens of level-less lines. A line that does not look like a
// continuation always starts its own entry, so independent lines (an access
// log, a plain message stream) are never merged together.
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

// toRecord accepts whatever a log frame carried (a structured record or a bare
// line) and always returns a record, parsing the line when needed.
export function toRecord(input: LogRecord | string | undefined): LogRecord {
  if (input == null) return { message: "", raw: "" };
  if (typeof input === "string") return parseLogLine(input);
  if (!input.message && input.raw) return parseLogLine(input.raw);
  return input;
}
