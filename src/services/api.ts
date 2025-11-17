import axios from 'axios'
import type { Deployment, Network, Certificate } from '@/types'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const deploymentsApi = {
  list: () => apiClient.get<{ deployments: Deployment[] }>('/deployments'),
  get: (name: string) => apiClient.get<Deployment>(`/deployments/${name}`),
  create: (data: any) => apiClient.post('/deployments', data),
  update: (name: string, data: any) => apiClient.put(`/deployments/${name}`, data),
  delete: (name: string) => apiClient.delete(`/deployments/${name}`),
  start: (name: string) => apiClient.post(`/deployments/${name}/start`),
  stop: (name: string) => apiClient.post(`/deployments/${name}/stop`),
  restart: (name: string) => apiClient.post(`/deployments/${name}/restart`),
  logs: (name: string) => apiClient.get(`/deployments/${name}/logs`)
}

export const networksApi = {
  list: () => apiClient.get<{ networks: Network[] }>('/networks'),
  create: (data: { name: string; driver?: string; labels?: Record<string, string> }) =>
    apiClient.post('/networks', data),
  delete: (name: string) => apiClient.delete(`/networks/${name}`),
  connect: (networkName: string, containerName: string) =>
    apiClient.post(`/networks/${networkName}/connect`, { container: containerName }),
  disconnect: (networkName: string, containerName: string) =>
    apiClient.post(`/networks/${networkName}/disconnect`, { container: containerName })
}

export const certificatesApi = {
  list: () => apiClient.get<{ certificates: Certificate[] }>('/certificates')
}

export const settingsApi = {
  get: () => apiClient.get('/settings'),
  update: (data: any) => apiClient.put('/settings', data)
}

export const pluginsApi = {
  list: () => apiClient.get('/plugins'),
  get: (name: string) => apiClient.get(`/plugins/${name}`),
  createDeployment: (pluginName: string, data: any) =>
    apiClient.post(`/plugins/${pluginName}/deployments`, data)
}

export const templatesApi = {
  list: () => apiClient.get<{ templates: any[] }>('/templates')
}

export const containersApi = {
  list: () => apiClient.get<{ containers: any[] }>('/containers'),
  start: (id: string) => apiClient.post(`/containers/${id}/start`),
  stop: (id: string) => apiClient.post(`/containers/${id}/stop`),
  restart: (id: string) => apiClient.post(`/containers/${id}/restart`),
  remove: (id: string) => apiClient.delete(`/containers/${id}`),
  logs: (id: string) => apiClient.get(`/containers/${id}/logs`)
}

export const imagesApi = {
  list: () => apiClient.get<{ images: any[] }>('/images'),
  remove: (id: string) => apiClient.delete(`/images/${id}`),
  pull: (name: string) => apiClient.post('/images/pull', { name })
}

export const volumesApi = {
  list: () => apiClient.get<{ volumes: any[] }>('/volumes'),
  create: (data: { name: string; driver?: string; labels?: Record<string, string> }) =>
    apiClient.post('/volumes', data),
  remove: (name: string) => apiClient.delete(`/volumes/${name}`),
  prune: () => apiClient.post('/volumes/prune')
}

export const healthApi = {
  check: () => apiClient.get('/health'),
  stats: () => apiClient.get('/stats')
}

export const authApi = {
  status: () => apiClient.get('/auth/status'),
  login: (apiKey: string) => apiClient.post('/auth/login', { api_key: apiKey }),
  validate: () => apiClient.get('/auth/validate')
}
