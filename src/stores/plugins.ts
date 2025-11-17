import { defineStore } from 'pinia'
import { ref } from 'vue'
import { pluginsApi } from '@/services/api'

export interface Plugin {
  name: string
  version: string
  display_name: string
  description: string
  author: string
  type: string
  category: string
  enabled: boolean
  capabilities?: string[]
  widget?: {
    enabled: boolean
    position: string
    size: string
    refresh_interval: number
    actions?: Array<{
      name: string
      label: string
      icon: string
    }>
  }
  dashboard_extensions?: Array<{
    location: string
    component: string
  }>
  api?: Array<{
    path: string
    method: string
    handler: string
  }>
}

export const usePluginsStore = defineStore('plugins', () => {
  const plugins = ref<Plugin[]>([])
  const loading = ref(false)
  const error = ref('')

  const fetchPlugins = async () => {
    loading.value = true
    error.value = ''

    try {
      const response = await pluginsApi.list()
      plugins.value = response.data.plugins || []
    } catch (e: any) {
      error.value = e.message || 'Failed to load plugins'
    } finally {
      loading.value = false
    }
  }

  const getPluginsByLocation = (location: string) => {
    return plugins.value.filter(p =>
      p.dashboard_extensions?.some(ext => ext.location === location)
    )
  }

  const getPluginsByCapability = (capability: string) => {
    return plugins.value.filter(p =>
      p.capabilities?.includes(capability)
    )
  }

  const getWidgetPlugins = () => {
    return plugins.value.filter(p => p.widget?.enabled)
  }

  return {
    plugins,
    loading,
    error,
    fetchPlugins,
    getPluginsByLocation,
    getPluginsByCapability,
    getWidgetPlugins
  }
})
