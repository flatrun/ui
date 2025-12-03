import axios from "axios";
import type {
  Deployment,
  Network,
  Certificate,
  ProxyStatus,
  ProxySetupResult,
  VirtualHost,
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

export const deploymentsApi = {
  list: () => apiClient.get<{ deployments: Deployment[] }>("/deployments"),
  get: (name: string) => apiClient.get<Deployment>(`/deployments/${name}`),
  create: (data: any) => apiClient.post("/deployments", data),
  update: (name: string, data: any) => apiClient.put(`/deployments/${name}`, data),
  updateMetadata: (name: string, metadata: ServiceMetadata) =>
    apiClient.put(`/deployments/${name}/metadata`, metadata),
  delete: (name: string) => apiClient.delete(`/deployments/${name}`),
  start: (name: string) => apiClient.post(`/deployments/${name}/start`),
  stop: (name: string) => apiClient.post(`/deployments/${name}/stop`),
  restart: (name: string) => apiClient.post(`/deployments/${name}/restart`),
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
  setup: (name: string) =>
    apiClient.post<{ message: string; result: ProxySetupResult }>(`/proxy/setup/${name}`),
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
  generateSubdomain: () => apiClient.get<SubdomainResponse>("/subdomain/generate"),
};

export const pluginsApi = {
  list: () => apiClient.get("/plugins"),
  get: (name: string) => apiClient.get(`/plugins/${name}`),
  createDeployment: (pluginName: string, data: any) =>
    apiClient.post(`/plugins/${pluginName}/deployments`, data),
};

export interface TemplateCategory {
  id: string;
  name: string;
  icon: string;
  priority: number;
}

export const templatesApi = {
  list: () => apiClient.get<{ templates: any[] }>("/templates"),
  categories: () => apiClient.get<{ categories: TemplateCategory[] }>("/templates/categories"),
  refresh: () => apiClient.post<{ message: string; count: number }>("/templates/refresh"),
  getCompose: (templateId: string, name: string) =>
    apiClient.get<{ template_id: string; name: string; content: string }>(
      `/templates/${templateId}/compose`,
      { params: { name } },
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
  pull: (name: string) => apiClient.post("/images/pull", { name }),
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
  getInfo: (deploymentName: string) =>
    apiClient.get<FilesInfo>(`/deployments/${deploymentName}/files-info`),
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
  createDir: (deploymentName: string, path: string) =>
    apiClient.post(`/deployments/${deploymentName}/mkdir${path}`),
  delete: (deploymentName: string, path: string) =>
    apiClient.delete(`/deployments/${deploymentName}/files${path}`),
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
    apiClient.post<{ success: boolean; message?: string; error?: string }>(
      "/databases/test",
      config,
    ),
  listDatabases: (config: DatabaseConnectionConfig) =>
    apiClient.post<{ databases: DatabaseInfo[] }>("/databases/list", config),
  listTables: (config: DatabaseConnectionConfig, database: string) =>
    apiClient.post<{ tables: TableInfo[] }>("/databases/tables", {
      ...config,
      database,
    }),
  listUsers: (config: DatabaseConnectionConfig) =>
    apiClient.post<{ users: UserInfo[] }>("/databases/users", config),
  createDatabase: (config: DatabaseConnectionConfig, dbName: string) =>
    apiClient.post("/databases/create", { ...config, db_name: dbName }),
  createUser: (
    config: DatabaseConnectionConfig,
    username: string,
    password: string,
    host?: string,
  ) =>
    apiClient.post("/databases/users/create", {
      ...config,
      username,
      user_password: password,
      user_host: host,
    }),
  grantPrivileges: (
    config: DatabaseConnectionConfig,
    username: string,
    database: string,
    host?: string,
  ) =>
    apiClient.post("/databases/privileges/grant", {
      ...config,
      username,
      database,
      user_host: host,
    }),
};

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
  migrate: (name: string) =>
    apiClient.post<{ message: string; name: string }>(`/infrastructure/migrate/${name}`),
};
