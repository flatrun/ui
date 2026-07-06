import { apiClient } from "./api";

// Metric names follow the OpenTelemetry container semantic conventions.
export const METRIC = {
  cpu: "container.cpu.usage",
  memUsage: "container.memory.usage",
  memLimit: "container.memory.limit",
  netRx: "container.network.io.rx",
  netTx: "container.network.io.tx",
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

export const observabilityApi = {
  latest: () => apiClient.get<DeploymentMetrics[]>(`${base}/metrics/latest`),
  timeseries: (deployment: string, sinceRange = "15m") =>
    apiClient.get<{ metrics: Record<string, MetricSeries> }>(`${base}/metrics/timeseries`, {
      params: { deployment, since: sinceRange },
    }),
  series: (deployment: string, container: string, metric: string, since = "15m") =>
    apiClient.get<{ samples: Sample[] }>(`${base}/metrics/series`, {
      params: { deployment, container, metric, since },
    }),
  health: () => apiClient.get<ContainerHealth[]>(`${base}/health`),
  recoveries: () => apiClient.get<RecoveryEvent[]>(`${base}/health/events`),
};
