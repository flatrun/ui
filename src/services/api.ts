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
  update: (name: string, data: any) =>
    apiClient.put(`/deployments/${name}`, data),
  updateMetadata: (name: string, metadata: ServiceMetadata) =>
    apiClient.put(`/deployments/${name}/metadata`, metadata),
  delete: (name: string) => apiClient.delete(`/deployments/${name}`),
  start: (name: string) => apiClient.post(`/deployments/${name}/start`),
  stop: (name: string) => apiClient.post(`/deployments/${name}/stop`),
  restart: (name: string) => apiClient.post(`/deployments/${name}/restart`),
  logs: (name: string) => apiClient.get(`/deployments/${name}/logs`),
  getComposeFile: (name: string) =>
    apiClient.get(`/deployments/${name}/compose`),
};

export const networksApi = {
  list: () => apiClient.get<{ networks: Network[] }>("/networks"),
  create: (data: {
    name: string;
    driver?: string;
    labels?: Record<string, string>;
  }) => apiClient.post("/networks", data),
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
  renew: () =>
    apiClient.post<{ message: string; result: any }>("/certificates/renew"),
  delete: (domain: string) => apiClient.delete(`/certificates/${domain}`),
};

export const proxyApi = {
  getStatus: (name: string) =>
    apiClient.get<{ status: ProxyStatus }>(`/proxy/status/${name}`),
  setup: (name: string) =>
    apiClient.post<{ message: string; result: ProxySetupResult }>(
      `/proxy/setup/${name}`,
    ),
  teardown: (name: string) => apiClient.delete(`/proxy/${name}`),
  listVirtualHosts: () =>
    apiClient.get<{ virtual_hosts: VirtualHost[] }>("/proxy/vhosts"),
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
  generateSubdomain: () =>
    apiClient.get<SubdomainResponse>("/subdomain/generate"),
};

export const pluginsApi = {
  list: () => apiClient.get("/plugins"),
  get: (name: string) => apiClient.get(`/plugins/${name}`),
  createDeployment: (pluginName: string, data: any) =>
    apiClient.post(`/plugins/${pluginName}/deployments`, data),
};

export const templatesApi = {
  list: () => apiClient.get<{ templates: any[] }>("/templates"),
};

export const containersApi = {
  list: () => apiClient.get<{ containers: any[] }>("/containers"),
  start: (id: string) => apiClient.post(`/containers/${id}/start`),
  stop: (id: string) => apiClient.post(`/containers/${id}/stop`),
  restart: (id: string) => apiClient.post(`/containers/${id}/restart`),
  remove: (id: string) => apiClient.delete(`/containers/${id}`),
  logs: (id: string) => apiClient.get(`/containers/${id}/logs`),
};

export const imagesApi = {
  list: () => apiClient.get<{ images: any[] }>("/images"),
  remove: (id: string) => apiClient.delete(`/images/${id}`),
  pull: (name: string) => apiClient.post("/images/pull", { name }),
};

export const volumesApi = {
  list: () => apiClient.get<{ volumes: any[] }>("/volumes"),
  create: (data: {
    name: string;
    driver?: string;
    labels?: Record<string, string>;
  }) => apiClient.post("/volumes", data),
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
  list: (deploymentName: string, path: string = "/", root: boolean = false) =>
    apiClient.get<{ files: FileInfo[]; root: boolean }>(
      `/deployments/${deploymentName}/files`,
      { params: { path, root: root ? "true" : undefined } },
    ),
  getInfo: (deploymentName: string) =>
    apiClient.get<FilesInfo>(`/deployments/${deploymentName}/files-info`),
  download: (deploymentName: string, path: string, root: boolean = false) =>
    apiClient.get(`/deployments/${deploymentName}/files${path}`, {
      responseType: "blob",
      params: { root: root ? "true" : undefined },
    }),
  upload: (deploymentName: string, path: string, file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post(
      `/deployments/${deploymentName}/files${path}`,
      formData,
      { headers: { "Content-Type": "multipart/form-data" } },
    );
  },
  createDir: (deploymentName: string, path: string) =>
    apiClient.post(`/deployments/${deploymentName}/mkdir${path}`),
  delete: (deploymentName: string, path: string) =>
    apiClient.delete(`/deployments/${deploymentName}/files${path}`),
};

export const portsApi = {
  list: () => apiClient.get<{ ports: any[] }>("/ports"),
  kill: (pid: number) => apiClient.post(`/ports/${pid}/kill`),
};

export const authApi = {
  status: () => apiClient.get("/auth/status"),
  login: (apiKey: string) => apiClient.post("/auth/login", { api_key: apiKey }),
  validate: () => apiClient.get("/auth/validate"),
};
