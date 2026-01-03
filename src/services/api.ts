import axios from "axios";
import type {
  Deployment,
  Network,
  Certificate,
  ProxyStatus,
  ProxySetupResult,
  VirtualHost,
  RegistryType,
  RegistryCredential,
  SecurityEvent,
  SecurityStats,
  BlockedIP,
  ProtectedRoute,
  DeploymentSecurityConfig,
} from "@/types";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem("auth_token");
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("auth_token");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

export interface ServiceMetadata {
  name: string;
  type: string;
  networking: {
    expose: boolean;
    domain: string;
    container_port: number;
    protocol: string;
    proxy_type: string;
  };
  ssl: {
    enabled: boolean;
    auto_cert: boolean;
  };
  healthcheck: {
    path: string;
    interval: string;
  };
}

export interface EnvVar {
  key: string;
  value: string;
}

export const deploymentsApi = {
  list: () => apiClient.get<{ deployments: Deployment[] }>("/deployments"),
  get: (name: string) => apiClient.get<Deployment>(`/deployments/${name}`),
  create: (data: any) => apiClient.post("/deployments", data),
  update: (name: string, data: any) => apiClient.put(`/deployments/${name}`, data),
  updateMetadata: (name: string, metadata: ServiceMetadata) => apiClient.put(`/deployments/${name}/metadata`, metadata),
  delete: (name: string, options?: { deleteSSL?: boolean; deleteDatabase?: boolean; deleteVhost?: boolean }) => {
    const params = new URLSearchParams();
    if (options?.deleteSSL !== undefined) params.set("delete_ssl", String(options.deleteSSL));
    if (options?.deleteDatabase !== undefined) params.set("delete_database", String(options.deleteDatabase));
    if (options?.deleteVhost !== undefined) params.set("delete_vhost", String(options.deleteVhost));
    const queryString = params.toString();
    return apiClient.delete(`/deployments/${name}${queryString ? `?${queryString}` : ""}`);
  },
  start: (name: string) => apiClient.post(`/deployments/${name}/start`),
  stop: (name: string) => apiClient.post(`/deployments/${name}/stop`),
  restart: (name: string) => apiClient.post(`/deployments/${name}/restart`),
  rebuild: (name: string) => apiClient.post(`/deployments/${name}/rebuild`),
  pullImage: (name: string, onlyLatest: boolean = false) =>
    apiClient.post<{ message: string; name: string; output: string }>(`/deployments/${name}/pull`, {
      only_latest: onlyLatest,
    }),
  getImages: (name: string) =>
    apiClient.get<{
      images: Array<{
        service: string;
        image: string;
        is_latest: boolean;
        is_build: boolean;
      }>;
    }>(`/deployments/${name}/images`),
  executeQuickAction: (name: string, actionId: string) =>
    apiClient.post<{ message: string; action_id: string; output: string }>(`/deployments/${name}/actions/${actionId}`),
  logs: (name: string) => apiClient.get(`/deployments/${name}/logs`),
  getComposeFile: (name: string) => apiClient.get(`/deployments/${name}/compose`),
  getStats: (name: string) =>
    apiClient.get<{
      deployment: string;
      services: Array<{
        container_id: string;
        name: string;
        cpu_percent: number;
        memory_usage: number;
        memory_limit: number;
        memory_percent: number;
        network_rx: number;
        network_tx: number;
        pids: number;
      }>;
      summary: {
        cpu_percent: number;
        memory_percent: number;
        memory_usage: number;
        memory_limit: number;
      };
    }>(`/deployments/${name}/stats`),
  getEnvVars: (name: string) => apiClient.get<{ env_vars: EnvVar[] }>(`/deployments/${name}/env`),
  updateEnvVars: (name: string, envVars: EnvVar[]) => apiClient.put(`/deployments/${name}/env`, { env_vars: envVars }),
  disableSSL: (name: string) => apiClient.post<{ message: string; name: string }>(`/deployments/${name}/ssl/disable`),
};

export const networksApi = {
  list: () => apiClient.get<{ networks: Network[] }>("/networks"),
  create: (data: { name: string; driver?: string; labels?: Record<string, string> }) =>
    apiClient.post("/networks", data),
  delete: (name: string) => apiClient.delete(`/networks/${name}`),
  connect: (networkName: string, containerName: string) =>
    apiClient.post(`/networks/${networkName}/connect`, {
      container: containerName,
    }),
  disconnect: (networkName: string, containerName: string) =>
    apiClient.post(`/networks/${networkName}/disconnect`, {
      container: containerName,
    }),
};

export const certificatesApi = {
  list: () => apiClient.get<{ certificates: Certificate[] }>("/certificates"),
  request: (domain: string) =>
    apiClient.post<{ message: string; result: any }>("/certificates", {
      domain,
    }),
  renew: () => apiClient.post<{ message: string; result: any }>("/certificates/renew"),
  delete: (domain: string) => apiClient.delete(`/certificates/${domain}`),
};

export const proxyApi = {
  getStatus: (name: string) => apiClient.get<{ status: ProxyStatus }>(`/proxy/status/${name}`),
  setup: (name: string) => apiClient.post<{ message: string; result: ProxySetupResult }>(`/proxy/setup/${name}`),
  teardown: (name: string) => apiClient.delete(`/proxy/${name}`),
  listVirtualHosts: () => apiClient.get<{ virtual_hosts: VirtualHost[] }>("/proxy/vhosts"),
};

export interface DomainSettings {
  default_domain: string;
  auto_subdomain: boolean;
  auto_ssl: boolean;
  subdomain_style: string;
}

export interface SubdomainResponse {
  subdomain: string;
  full_domain: string;
  default_domain: string;
  auto_ssl: boolean;
}

export const settingsApi = {
  get: () => apiClient.get("/settings"),
  update: (data: any) => apiClient.put("/settings", data),
  updateSecurity: (data: any) => apiClient.put("/settings/security", data),
  generateSubdomain: () => apiClient.get<SubdomainResponse>("/subdomain/generate"),
};

export const pluginsApi = {
  list: () => apiClient.get("/plugins"),
  get: (name: string) => apiClient.get(`/plugins/${name}`),
  createDeployment: (pluginName: string, data: any) => apiClient.post(`/plugins/${pluginName}/deployments`, data),
};

export interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  priority: number;
}

export interface TemplateMount {
  id: string;
  name: string;
  container_path: string;
  description: string;
  type: "file" | "volume";
  required: boolean;
}

export interface MountSelection {
  id: string;
  enabled: boolean;
  type: "file" | "volume";
}

export interface ComposeGenerateOptions {
  name: string;
  container_port?: number;
  map_ports?: boolean;
  host_port?: string;
  mounts?: MountSelection[];
}

export const templatesApi = {
  list: () => apiClient.get<{ templates: any[] }>("/templates"),
  categories: () => apiClient.get<{ categories: TemplateCategory[] }>("/templates/categories"),
  refresh: () => apiClient.post<{ message: string; count: number }>("/templates/refresh"),
  getCompose: (templateId: string, name: string) =>
    apiClient.get<{ template_id: string; name: string; content: string }>(`/templates/${templateId}/compose`, {
      params: { name },
    }),
  generateCompose: (templateId: string, options: ComposeGenerateOptions) =>
    apiClient.post<{
      template_id: string;
      name: string;
      content: string;
      container_port: number;
      map_ports: boolean;
      host_port: string;
    }>(`/templates/${templateId}/generate`, options),
};

export interface PortConfig {
  container_port: number;
  host_port?: string;
}

export interface ComposeUpdateOptions {
  content: string;
  ports?: PortConfig[];
  mounts?: MountSelection[];
  database?: {
    type: string;
    mode: string;
    name: string;
    user: string;
    password: string;
    root_password?: string;
    existing_container?: string;
    external_host?: string;
    external_port?: string;
  };
}

export const composeApi = {
  update: (options: ComposeUpdateOptions) =>
    apiClient.post<{ content: string; container_port: number; map_ports: boolean; host_port: string }>(
      "/compose/update",
      options,
    ),
};

export const containersApi = {
  list: () => apiClient.get<{ containers: any[] }>("/containers"),
  start: (id: string) => apiClient.post(`/containers/${id}/start`),
  stop: (id: string) => apiClient.post(`/containers/${id}/stop`),
  restart: (id: string) => apiClient.post(`/containers/${id}/restart`),
  remove: (id: string) => apiClient.delete(`/containers/${id}`),
  logs: (id: string) => apiClient.get(`/containers/${id}/logs`),
  getAllStats: () =>
    apiClient.get<{
      stats: Array<{
        container_id: string;
        name: string;
        cpu_percent: number;
        memory_usage: number;
        memory_limit: number;
        memory_percent: number;
        network_rx: number;
        network_tx: number;
        pids: number;
      }>;
    }>("/containers/stats"),
};

export const imagesApi = {
  list: () => apiClient.get<{ images: any[] }>("/images"),
  remove: (id: string) => apiClient.delete(`/images/${id}`),
  pull: (name: string, credentialId?: string) =>
    apiClient.post<{ message: string; name: string; used_credential: boolean }>("/images/pull", {
      name,
      credential_id: credentialId,
    }),
};

export const volumesApi = {
  list: () => apiClient.get<{ volumes: any[] }>("/volumes"),
  create: (data: { name: string; driver?: string; labels?: Record<string, string> }) =>
    apiClient.post("/volumes", data),
  remove: (name: string) => apiClient.delete(`/volumes/${name}`),
  prune: () => apiClient.post("/volumes/prune"),
};

export const healthApi = {
  check: () => apiClient.get("/health"),
  stats: () => apiClient.get("/stats"),
};

export interface FileInfo {
  name: string;
  path: string;
  size: number;
  is_dir: boolean;
  mod_time: string;
  permissions: string;
  child_count?: number;
}

export interface FilesInfo {
  total_size: number;
  file_count: number;
}

export const filesApi = {
  list: (deploymentName: string, path: string = "/") =>
    apiClient.get<{ files: FileInfo[] }>(`/deployments/${deploymentName}/files`, {
      params: { path },
    }),
  getInfo: (deploymentName: string) => apiClient.get<FilesInfo>(`/deployments/${deploymentName}/files-info`),
  download: (deploymentName: string, path: string) =>
    apiClient.get(`/deployments/${deploymentName}/files${path}`, {
      responseType: "blob",
    }),
  upload: (deploymentName: string, path: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post(`/deployments/${deploymentName}/files${path}`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },
  createDir: (deploymentName: string, path: string) => apiClient.post(`/deployments/${deploymentName}/mkdir${path}`),
  delete: (deploymentName: string, path: string) => apiClient.delete(`/deployments/${deploymentName}/files${path}`),
  getContent: (deploymentName: string, path: string) =>
    apiClient.get<string>(`/deployments/${deploymentName}/files${path}`, {
      responseType: "text",
    }),
};

export const portsApi = {
  list: () => apiClient.get<{ ports: any[] }>("/ports"),
  kill: (pid: number) => apiClient.post(`/ports/${pid}/kill`),
};

export const systemServicesApi = {
  list: () => apiClient.get<{ services: any[] }>("/system/services"),
  start: (name: string) => apiClient.post(`/system/services/${name}/start`),
  stop: (name: string) => apiClient.post(`/system/services/${name}/stop`),
  restart: (name: string) => apiClient.post(`/system/services/${name}/restart`),
};

export const authApi = {
  status: () => apiClient.get("/auth/status"),
  login: (apiKey: string) => apiClient.post("/auth/login", { api_key: apiKey }),
  validate: () => apiClient.get("/auth/validate"),
};

export interface DatabaseConnectionConfig {
  type: string;
  host: string;
  port: number;
  username: string;
  password: string;
  database?: string;
  container?: string;
}

export interface DatabaseInfo {
  name: string;
  size?: string;
  tables?: number;
}

export interface TableInfo {
  name: string;
  rows?: number;
  size?: string;
  engine?: string;
}

export interface UserInfo {
  name: string;
  host?: string;
}

export const databasesApi = {
  testConnection: (config: DatabaseConnectionConfig) =>
    apiClient.post<{ success: boolean; message?: string; error?: string }>("/databases/test", config),
  listDatabases: (config: DatabaseConnectionConfig) =>
    apiClient.post<{ databases: DatabaseInfo[] }>("/databases/list", config),
  listTables: (config: DatabaseConnectionConfig, database: string) =>
    apiClient.post<{ tables: TableInfo[] }>("/databases/tables", {
      ...config,
      database,
    }),
  listUsers: (config: DatabaseConnectionConfig) => apiClient.post<{ users: UserInfo[] }>("/databases/users", config),
  listUsersByDatabase: (config: DatabaseConnectionConfig, database: string) =>
    apiClient.post<{ users: UserInfo[] }>("/databases/users/by-database", {
      ...config,
      database,
    }),
  createDatabase: (config: DatabaseConnectionConfig, dbName: string) =>
    apiClient.post("/databases/create", { ...config, db_name: dbName }),
  createUser: (config: DatabaseConnectionConfig, username: string, password: string, host?: string) =>
    apiClient.post("/databases/users/create", {
      ...config,
      target_username: username,
      target_password: password,
      target_host: host,
    }),
  grantPrivileges: (config: DatabaseConnectionConfig, username: string, database: string, host?: string) =>
    apiClient.post("/databases/privileges/grant", {
      ...config,
      target_username: username,
      target_database: database,
      target_host: host,
    }),
  deleteDatabase: (config: DatabaseConnectionConfig, dbName: string) =>
    apiClient.post("/databases/delete", { ...config, db_name: dbName }),
  deleteUser: (config: DatabaseConnectionConfig, username: string, host?: string) =>
    apiClient.post("/databases/users/delete", {
      ...config,
      target_username: username,
      target_host: host,
    }),
  queryTableData: (
    config: DatabaseConnectionConfig,
    database: string,
    table: string,
    limit?: number,
    offset?: number,
  ) =>
    apiClient.post<QueryResult>("/databases/tables/data", {
      ...config,
      database,
      table,
      limit: limit || 100,
      offset: offset || 0,
    }),
  executeQuery: (config: DatabaseConnectionConfig, database: string, query: string) =>
    apiClient.post<QueryResult>("/databases/query", {
      ...config,
      database,
      query,
    }),
  describeTable: (config: DatabaseConnectionConfig, database: string, table: string) =>
    apiClient.post<TableSchema>("/databases/tables/schema", {
      ...config,
      database,
      table,
    }),
};

export interface QueryResult {
  columns: string[];
  rows: any[][];
  count: number;
}

export interface ColumnSchema {
  name: string;
  type: string;
  nullable: boolean;
  default: any;
  key: string;
  extra: string;
}

export interface IndexSchema {
  name: string;
  columns: string[];
  unique: boolean;
  primary: boolean;
}

export interface TableSchema {
  columns: ColumnSchema[];
  indexes: IndexSchema[];
}

export interface InfraService {
  name: string;
  type: string;
  status: string;
  managed: boolean;
  external: boolean;
  container_id?: string;
  image?: string;
  health?: string;
  created_at?: string;
  config?: Record<string, any>;
}

export interface InfraStats {
  total_services: number;
  running: number;
  stopped: number;
  external: number;
}

export const infrastructureApi = {
  list: () => apiClient.get<{ services: InfraService[] }>("/infrastructure"),
  get: (name: string) => apiClient.get<{ service: InfraService }>(`/infrastructure/${name}`),
  start: (name: string) => apiClient.post(`/infrastructure/${name}/start`),
  stop: (name: string) => apiClient.post(`/infrastructure/${name}/stop`),
  restart: (name: string) => apiClient.post(`/infrastructure/${name}/restart`),
  logs: (name: string, tail?: number) =>
    apiClient.get<{ name: string; logs: string }>(`/infrastructure/${name}/logs`, {
      params: tail ? { tail } : undefined,
    }),
  stats: () => apiClient.get<{ stats: InfraStats }>("/infrastructure/stats"),
  migrate: (name: string) => apiClient.post<{ message: string; name: string }>(`/infrastructure/migrate/${name}`),
};

export const registriesApi = {
  list: () => apiClient.get<{ registry_types: RegistryType[] }>("/registries"),
  get: (slug: string) => apiClient.get<{ registry_type: RegistryType }>(`/registries/${slug}`),
  create: (data: { name: string; url_patterns: string[]; auth_type?: string; login_url?: string; docs_url?: string }) =>
    apiClient.post<{ message: string; registry_type: RegistryType }>("/registries", data),
  update: (
    slug: string,
    data: {
      name?: string;
      url_patterns?: string[];
      auth_type?: string;
      login_url?: string;
      docs_url?: string;
    },
  ) => apiClient.put<{ message: string; registry_type: RegistryType }>(`/registries/${slug}`, data),
  delete: (slug: string) => apiClient.delete(`/registries/${slug}`),
};

export const credentialsApi = {
  list: () => apiClient.get<{ credentials: RegistryCredential[] }>("/credentials"),
  get: (id: string) => apiClient.get<{ credential: RegistryCredential }>(`/credentials/${id}`),
  create: (data: {
    name: string;
    registry_type_slug: string;
    username: string;
    password: string;
    email?: string;
    is_default?: boolean;
  }) => apiClient.post<{ message: string; credential: RegistryCredential }>("/credentials", data),
  update: (
    id: string,
    data: {
      name?: string;
      username?: string;
      password?: string;
      email?: string;
      is_default?: boolean;
    },
  ) => apiClient.put<{ message: string; credential: RegistryCredential }>(`/credentials/${id}`, data),
  delete: (id: string) => apiClient.delete(`/credentials/${id}`),
  test: (id: string) => apiClient.post<{ message: string; success: boolean }>(`/credentials/${id}/test`),
};

export interface SecurityEventFilter {
  event_type?: string;
  severity?: string;
  source_ip?: string;
  deployment?: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
  offset?: number;
}

export const securityApi = {
  getStats: () => apiClient.get<{ stats: SecurityStats }>("/security/stats"),
  getEvents: (params?: SecurityEventFilter) =>
    apiClient.get<{ events: SecurityEvent[]; total: number; limit: number; offset: number }>("/security/events", {
      params,
    }),
  getEvent: (id: number) => apiClient.get<{ event: SecurityEvent }>(`/security/events/${id}`),
  getEventsByIP: (ip: string) => apiClient.get<{ events: SecurityEvent[]; ip: string }>(`/security/ips/${ip}/events`),
  cleanup: (days?: number) =>
    apiClient.post<{ events_deleted: number; blocks_deleted: number }>("/security/cleanup", { days }),

  getBlockedIPs: () => apiClient.get<{ blocked_ips: BlockedIP[] }>("/security/blocked-ips"),
  blockIP: (ip: string, reason?: string, duration?: number) =>
    apiClient.post<{ id: number; message: string }>("/security/blocked-ips", { ip, reason, duration }),
  unblockIP: (ip: string) => apiClient.delete<{ message: string }>(`/security/blocked-ips/${ip}`),

  getProtectedRoutes: () => apiClient.get<{ protected_routes: ProtectedRoute[] }>("/security/protected-routes"),
  addProtectedRoute: (route: Partial<ProtectedRoute>) =>
    apiClient.post<{ route: ProtectedRoute }>("/security/protected-routes", route),
  updateProtectedRoute: (id: number, route: Partial<ProtectedRoute>) =>
    apiClient.put<{ route: ProtectedRoute }>(`/security/protected-routes/${id}`, route),
  deleteProtectedRoute: (id: number) => apiClient.delete<{ message: string }>(`/security/protected-routes/${id}`),

  getDeploymentSecurity: (name: string) =>
    apiClient.get<{ security: DeploymentSecurityConfig }>(`/deployments/${name}/security`),
  updateDeploymentSecurity: (name: string, config: DeploymentSecurityConfig) =>
    apiClient.put<{
      security: DeploymentSecurityConfig;
      hook_status?: {
        has_hook: boolean;
        hook_in_locations: boolean;
        vhost_regenerated: boolean;
      };
    }>(`/deployments/${name}/security`, config),
  getDeploymentEvents: (name: string, limit?: number) =>
    apiClient.get<{ events: SecurityEvent[]; total: number; deployment: string }>(
      `/deployments/${name}/security/events`,
      {
        params: limit ? { limit } : undefined,
      },
    ),

  getRealtimeCaptureStatus: () =>
    apiClient.get<{ enabled: boolean; realtime_capture: boolean }>("/security/realtime-capture"),
  setRealtimeCaptureStatus: (enabled: boolean) =>
    apiClient.put<{ realtime_capture: boolean; message: string }>("/security/realtime-capture", { enabled }),

  getHealth: () => apiClient.get<SecurityHealthCheck>("/security/health"),

  refreshScripts: () => apiClient.post<SecurityRefreshResponse>("/security/refresh"),
};

export interface SecurityRefreshResponse {
  success: boolean;
  agent_ip: string;
  vhosts_updated: string[];
  nginx_reloaded: boolean;
  error?: string;
}

export interface SecurityHealthCheck {
  status: "healthy" | "degraded" | "broken" | "disabled";
  error?: string;
  checks: Record<string, boolean>;
  issues: string[];
  recommendations: string[];
  details?: Record<string, any>;
}

export interface TrafficLog {
  id: number;
  deployment_name: string;
  request_path: string;
  request_method: string;
  status_code: number;
  source_ip: string;
  response_time_ms: number;
  bytes_sent: number;
  request_length: number;
  upstream_time_ms?: number;
  created_at: string;
}

export interface TrafficFilter {
  deployment?: string;
  method?: string;
  status_code?: number;
  status_group?: string;
  source_ip?: string;
  path?: string;
  start_time?: string;
  end_time?: string;
  limit?: number;
  offset?: number;
}

export interface PathStats {
  path: string;
  deployment: string;
  request_count: number;
  avg_time_ms: number;
  error_count: number;
}

export interface IPTrafficStats {
  ip: string;
  request_count: number;
  bytes_sent: number;
  last_seen: string;
}

export interface HourlyStats {
  hour: string;
  request_count: number;
}

export interface DeploymentTrafficStats {
  name: string;
  total_requests: number;
  avg_response_time: number;
  status_2xx: number;
  status_3xx: number;
  status_4xx: number;
  status_5xx: number;
  error_rate: number;
}

export interface TrafficStats {
  total_requests: number;
  total_bytes: number;
  avg_response_time_ms: number;
  by_status_group: Record<string, number>;
  by_deployment: Record<string, number>;
  by_method: Record<string, number>;
  top_paths: PathStats[];
  top_ips: IPTrafficStats[];
  requests_per_hour: HourlyStats[];
  deployment_stats: DeploymentTrafficStats[];
}

export interface UnknownDomainEntry {
  domain: string;
  request_count: number;
  last_seen: string;
}

export interface UnknownDomainIPEntry {
  ip: string;
  request_count: number;
  domains: string[];
  last_seen: string;
}

export interface UnknownDomainStats {
  total_requests: number;
  top_domains: UnknownDomainEntry[];
  top_ips: UnknownDomainIPEntry[];
  recent_logs: TrafficLog[];
}

export const trafficApi = {
  getLogs: (params?: TrafficFilter) =>
    apiClient.get<{ logs: TrafficLog[]; total: number; limit: number; offset: number }>("/traffic/logs", { params }),

  getStats: (params?: { deployment?: string; since?: string }) =>
    apiClient.get<{ stats: TrafficStats }>("/traffic/stats", { params }),

  getUnknownDomainStats: (since?: string) =>
    apiClient.get<{ stats: UnknownDomainStats }>("/traffic/unknown-domains", {
      params: since ? { since } : undefined,
    }),

  cleanup: (days?: number) => apiClient.post<{ deleted: number }>("/traffic/cleanup", { days }),

  getDeploymentStats: (name: string, since?: string) =>
    apiClient.get<{ deployment: string; stats: TrafficStats }>(`/deployments/${name}/traffic/stats`, {
      params: since ? { since } : undefined,
    }),
};

// Backup Types
export interface Backup {
  readonly id: string;
  readonly deployment_name: string;
  readonly status: "pending" | "in_progress" | "completed" | "failed";
  readonly size: number;
  readonly path: string;
  readonly components: readonly string[];
  readonly error?: string;
  readonly created_at: string;
  readonly completed_at?: string;
  readonly expires_at?: string;
}

export interface BackupSpec {
  readonly container_paths?: readonly ContainerBackupPath[];
  readonly databases?: readonly DatabaseBackupSpec[];
  readonly pre_hooks?: readonly BackupHookSpec[];
  readonly post_hooks?: readonly BackupHookSpec[];
  readonly exclude_patterns?: readonly string[];
}

export interface ContainerBackupPath {
  readonly service: string;
  readonly container_path: string;
  readonly description?: string;
  readonly required: boolean;
}

export interface DatabaseBackupSpec {
  readonly service: string;
  readonly type: string;
  readonly host_env?: string;
  readonly port_env?: string;
  readonly user_env?: string;
  readonly password_env?: string;
  readonly database_env?: string;
  readonly host?: string;
  readonly port?: number;
  readonly user?: string;
  readonly database?: string;
}

export interface BackupHookSpec {
  readonly service: string;
  readonly command: string;
  readonly timeout?: number;
}

export type BackupJobType = "backup" | "restore";
export type BackupJobStatus = "pending" | "running" | "completed" | "failed";

export interface BackupJob {
  readonly id: string;
  readonly type: BackupJobType;
  readonly status: BackupJobStatus;
  readonly deployment_name: string;
  readonly backup_id?: string;
  readonly progress?: string;
  readonly error?: string;
  readonly started_at: string;
  readonly completed_at?: string;
}

export const backupsApi = {
  list: (deployment?: string, limit?: number) =>
    apiClient.get<{ backups: Backup[] }>("/backups", {
      params: { deployment, limit },
    }),

  get: (id: string) => apiClient.get<{ backup: Backup }>(`/backups/${id}`),

  create: (deploymentName: string) =>
    apiClient.post<{ job_id: string; message: string }>("/backups", { deployment_name: deploymentName }),

  delete: (id: string) => apiClient.delete<{ message: string }>(`/backups/${id}`),

  restore: (id: string, options?: { restore_data?: boolean; restore_db?: boolean; stop_first?: boolean }) =>
    apiClient.post<{ job_id: string; message: string }>(`/backups/${id}/restore`, options),

  download: (id: string) => `${apiClient.defaults.baseURL}/backups/${id}/download`,

  getDeploymentBackups: (name: string, limit?: number) =>
    apiClient.get<{ backups: Backup[] }>(`/deployments/${name}/backups`, {
      params: limit ? { limit } : undefined,
    }),

  createDeploymentBackup: (name: string) =>
    apiClient.post<{ job_id: string; message: string }>(`/deployments/${name}/backups`),

  getDeploymentBackupConfig: (name: string) =>
    apiClient.get<{ backup_config: BackupSpec | null }>(`/deployments/${name}/backup-config`),

  updateDeploymentBackupConfig: (name: string, config: BackupSpec) =>
    apiClient.put<{ backup_config: BackupSpec }>(`/deployments/${name}/backup-config`, config),

  getJob: (jobId: string) => apiClient.get<{ job: BackupJob }>(`/backups/jobs/${jobId}`),

  listJobs: (deployment?: string, limit?: number) =>
    apiClient.get<{ jobs: BackupJob[] }>("/backups/jobs", {
      params: { deployment, limit },
    }),
};

// Scheduler Types
export type TaskType = "backup" | "command";
export type TaskStatus = "pending" | "running" | "completed" | "failed";

export interface ScheduledTask {
  readonly id: number;
  readonly name: string;
  readonly type: TaskType;
  readonly deployment_name: string;
  readonly cron_expr: string;
  readonly enabled: boolean;
  readonly config: TaskConfig;
  readonly last_run?: string;
  readonly next_run?: string;
  readonly created_at: string;
  readonly updated_at: string;
}

export interface TaskConfig {
  readonly backup_config?: BackupTaskConfig;
  readonly command_config?: CommandTaskConfig;
}

export interface BackupTaskConfig {
  readonly retention_count: number;
  readonly storage_path?: string;
}

export interface CommandTaskConfig {
  readonly service: string;
  readonly command: string;
  readonly timeout: number;
}

export interface TaskExecution {
  readonly id: number;
  readonly task_id: number;
  readonly status: TaskStatus;
  readonly output?: string;
  readonly error?: string;
  readonly started_at: string;
  readonly ended_at?: string;
  readonly duration_ms?: number;
}

export interface CreateTaskRequest {
  name: string;
  type: TaskType;
  deployment_name: string;
  cron_expr: string;
  enabled: boolean;
  config: TaskConfig;
}

export interface UpdateTaskRequest {
  name?: string;
  cron_expr?: string;
  enabled?: boolean;
  config?: TaskConfig;
}

export const schedulerApi = {
  listTasks: (deployment?: string) =>
    apiClient.get<{ tasks: ScheduledTask[] }>("/scheduler/tasks", {
      params: deployment ? { deployment } : undefined,
    }),

  getTask: (id: number) => apiClient.get<{ task: ScheduledTask }>(`/scheduler/tasks/${id}`),

  createTask: (data: CreateTaskRequest) => apiClient.post<{ task: ScheduledTask }>("/scheduler/tasks", data),

  updateTask: (id: number, data: UpdateTaskRequest) =>
    apiClient.put<{ task: ScheduledTask }>(`/scheduler/tasks/${id}`, data),

  deleteTask: (id: number) => apiClient.delete<{ message: string }>(`/scheduler/tasks/${id}`),

  runTaskNow: (id: number) => apiClient.post<{ message: string }>(`/scheduler/tasks/${id}/run`),

  getTaskExecutions: (taskId: number, limit?: number) =>
    apiClient.get<{ executions: TaskExecution[] }>(`/scheduler/tasks/${taskId}/executions`, {
      params: limit ? { limit } : undefined,
    }),

  getRecentExecutions: (limit?: number) =>
    apiClient.get<{ executions: TaskExecution[] }>("/scheduler/executions", {
      params: limit ? { limit } : undefined,
    }),
};
