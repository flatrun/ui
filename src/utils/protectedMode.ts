export const matchTypeHints: Record<string, string> = {
  contains: "Blocks any command containing this text",
  equals: "Blocks commands that exactly match this text",
  prefix: "Blocks commands starting with this text",
  suffix: "Blocks commands ending with this text",
  matches: "Blocks commands matching this regular expression",
};

export interface DescribableRule {
  match?: string;
  pattern?: string;
  case_sensitive?: boolean;
}

export const describeBlockedRule = (rule: DescribableRule): string => {
  const pattern = rule.pattern || "...";
  const cs = rule.case_sensitive ? " (case sensitive)" : "";
  switch (rule.match) {
    case "contains":
      return `Blocks any command containing "${pattern}"${cs}`;
    case "equals":
      return `Blocks commands that exactly match "${pattern}"${cs}`;
    case "prefix":
      return `Blocks commands starting with "${pattern}"${cs}`;
    case "suffix":
      return `Blocks commands ending with "${pattern}"${cs}`;
    case "matches":
      return `Blocks commands matching regex /${pattern}/${rule.case_sensitive ? "" : "i"}`;
    default:
      return `Blocks "${pattern}"`;
  }
};
