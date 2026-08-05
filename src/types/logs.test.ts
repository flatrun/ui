import { describe, it, expect } from "vitest";
import { parseLogLine, groupLogRecords } from "./logs";

describe("parseLogLine level detection", () => {
  it("reads a monolog channel.LEVEL header", () => {
    expect(parseLogLine("[2024-01-15 10:30:00] local.ERROR: boom").level).toBe("error");
    expect(parseLogLine("[2024-01-15 10:30:00] production.WARNING: slow").level).toBe("warn");
  });

  it("reads a bracketed or leading level", () => {
    expect(parseLogLine("[INFO] starting up").level).toBe("info");
    expect(parseLogLine("WARN: disk almost full").level).toBe("warn");
  });

  it("does not tag a level word buried mid-line", () => {
    expect(parseLogLine("#5 /app/src/App/ErrorHandler.php(10): handle()").level).toBeUndefined();
    expect(parseLogLine("GET /api/errors 200").level).toBeUndefined();
  });
});

describe("groupLogRecords", () => {
  it("folds a stack trace into the entry above it", () => {
    const lines = [
      "[2024-01-15 10:30:00] local.ERROR: Something failed",
      "[stacktrace]",
      "#0 /var/www/html/app/Handler.php(52): report()",
      "#1 /var/www/html/vendor/framework/Kernel.php(145): handle()",
      "#2 {main}",
    ];
    const entries = groupLogRecords(lines.map(parseLogLine));

    // The error header, then [stacktrace] carrying its frames.
    expect(entries.length).toBe(2);
    expect(entries[0].record.level).toBe("error");
    expect(entries[1].lines.length).toBe(4); // [stacktrace] + 3 frames
  });

  it("never merges independent lines that are not continuations", () => {
    const lines = [
      '1.2.3.4 - - [15/Jan/2024:10:00:00] "GET / HTTP/1.1" 200',
      '1.2.3.5 - - [15/Jan/2024:10:00:01] "GET /a HTTP/1.1" 404',
      '1.2.3.6 - - [15/Jan/2024:10:00:02] "POST /b HTTP/1.1" 500',
    ];
    const entries = groupLogRecords(lines.map(parseLogLine));
    expect(entries.length).toBe(3);
  });

  it("folds indented continuation lines (java/python style)", () => {
    const lines = [
      "ERROR: unhandled exception",
      "  at com.example.Service.run(Service.java:42)",
      "  at com.example.Main.main(Main.java:10)",
    ];
    const entries = groupLogRecords(lines.map(parseLogLine));
    expect(entries.length).toBe(1);
    expect(entries[0].lines.length).toBe(3);
  });
});
