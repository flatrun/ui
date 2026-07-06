import { apiClient } from "./api";

// pluginApi builds calls to a plugin's own API, which the agent proxies at /plugin/<name>/.
export function pluginApi(name: string) {
  const base = `/plugin/${name}`;
  return {
    get: <T>(path: string, params?: Record<string, unknown>) => apiClient.get<T>(`${base}${path}`, { params }),
    put: <T>(path: string, body?: unknown) => apiClient.put<T>(`${base}${path}`, body),
    post: <T>(path: string, body?: unknown) => apiClient.post<T>(`${base}${path}`, body),
  };
}
