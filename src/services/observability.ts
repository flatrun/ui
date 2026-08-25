import { apiClient } from "./api";

// Metric names follow the OpenTelemetry container semantic conventions.
export const METRIC = {
  cpu: "container.cpu.usage",
  memUsage: "container.memory.usage",
  memLimit: "container.memory.limit",
  memUtilization: "container.memory.utilization",
  netRx: "container.network.io.rx",
  netTx: "container.network.io.tx",
  hostCpu: "system.cpu.utilization",
  hostMemUtil: "system.memory.utilization",
  hostMemUsage: "system.memory.usage",
  hostMemLimit: "system.memory.limit",
  hostDisk: "system.disk.utilization",
} as const;

export interface ContainerMetrics {
  container: string;
  metrics: Record<string, number>;
  updated: string;
}

export interface DeploymentMetrics {
  deployment: string;
  containers: ContainerMetrics[];
}

export interface Sample {
  time: string;
  value: number;
}

export interface ContainerHealth {
  container: string;
  deployment: string;
  status: "healthy" | "unhealthy" | "starting" | "none";
}

export interface RecoveryEvent {
  container: string;
  deployment: string;
  at: string;
}

// Served by the observability plugin, reached through the agent's plugin proxy.
const base = "/plugin/observability";

export interface MetricSeries {
  containers: string[];
  timestamps: number[];
  values: (number | null)[][];
}

export interface AlertRule {
  id?: string;
  name: string;
  deployment?: string;
  metric: string;
  comparison: "above" | "below";
  threshold: number;
  for_seconds: number;
  enabled: boolean;
  targets?: string[];
  action?: "" | "restart";
}

export interface Consumer {
  deployment: string;
  container: string;
  value: number;
}

export interface AlertEvent {
  rule_id: string;
  rule_name: string;
  deployment: string;
  container: string;
  metric: string;
  value: number;
  threshold: number;
  comparison: "above" | "below";
  state: "ok" | "pending" | "firing";
  at: string;
  snapshot?: Consumer[];
}

export interface LogRule {
  id?: string;
  name: string;
  enabled: boolean;
  deployment: string;
  service?: string;
  source?: string;
  min_level?: string;
  pattern?: string;
  min_count?: number;
  window_seconds?: number;
  cooldown_seconds?: number;
  triage?: boolean;
  responders?: string[];
  targets?: string[];
}

export interface IncidentTriage {
  summary?: string;
  cause?: string;
  next_step?: string;
  severity?: string;
  confidence?: string;
  skipped?: string;
  at?: string;
}

export interface ResponderResult {
  responder: string;
  detail?: string;
  error?: string;
  at: string;
}

export interface Incident {
  id: string;
  rule_id: string;
  rule_name: string;
  deployment: string;
  service?: string;
  source?: string;
  level: string;
  fingerprint: string;
  sample: string;
  context?: string[];
  count: number;
  first_seen: string;
  last_seen: string;
  triage?: IncidentTriage;
  responses?: ResponderResult[];
}

export const observabilityApi = {
  latest: () => apiClient.get<DeploymentMetrics[]>(`${base}/metrics/latest`),
  alertRules: () => apiClient.get<AlertRule[]>(`${base}/alerts/rules`),
  saveAlertRules: (rules: AlertRule[]) => apiClient.put<AlertRule[]>(`${base}/alerts/rules`, rules),
  // Rules currently breached, which is what needs attention now rather than what happened.
  firingAlerts: () => apiClient.get<AlertEvent[]>(`${base}/alerts/firing`),
  alertEvents: () => apiClient.get<AlertEvent[]>(`${base}/alerts/events`),
  timeseries: (deployment: string, sinceRange = "15m") =>
    apiClient.get<{ metrics: Record<string, MetricSeries> }>(`${base}/metrics/timeseries`, {
      params: { deployment, since: sinceRange },
    }),
  hostTimeseries: (sinceRange = "6h") =>
    apiClient.get<{ metrics: Record<string, MetricSeries> }>(`${base}/metrics/host`, {
      params: { since: sinceRange },
    }),
  series: (deployment: string, container: string, metric: string, since = "15m") =>
    apiClient.get<{ samples: Sample[] }>(`${base}/metrics/series`, {
      params: { deployment, container, metric, since },
    }),
  health: () => apiClient.get<ContainerHealth[]>(`${base}/health`),
  recoveries: () => apiClient.get<RecoveryEvent[]>(`${base}/health/events`),
  logRules: () => apiClient.get<LogRule[]>(`${base}/alerts/log-rules`),
  saveLogRules: (rules: LogRule[]) => apiClient.put<LogRule[]>(`${base}/alerts/log-rules`, rules),
  incidents: (deployment?: string) =>
    apiClient.get<Incident[]>(`${base}/alerts/incidents`, { params: deployment ? { deployment } : undefined }),
  responders: () => apiClient.get<string[]>(`${base}/alerts/responders`),
};
