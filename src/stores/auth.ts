import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
})

export const useAuthStore = defineStore('auth', () => {
  const token = ref<string | null>(localStorage.getItem('auth_token'))
  const authEnabled = ref<boolean | null>(null)
  const loading = ref(false)
  const error = ref('')

  const isAuthenticated = computed(() => !!token.value)

  const checkAuthStatus = async () => {
    try {
      const response = await apiClient.get('/auth/status')
      authEnabled.value = response.data.enabled
      return response.data.enabled
    } catch {
      authEnabled.value = false
      return false
    }
  }

  const login = async (apiKey: string) => {
    loading.value = true
    error.value = ''

    try {
      const response = await apiClient.post('/auth/login', { api_key: apiKey })
      token.value = response.data.token
      localStorage.setItem('auth_token', response.data.token)
      return true
    } catch (e: any) {
      error.value = e.response?.data?.error || 'Invalid API key'
      return false
    } finally {
      loading.value = false
    }
  }

  const logout = () => {
    token.value = null
    localStorage.removeItem('auth_token')
  }

  const getAuthHeader = () => {
    if (token.value) {
      return { Authorization: `Bearer ${token.value}` }
    }
    return {}
  }

  return {
    token,
    authEnabled,
    loading,
    error,
    isAuthenticated,
    checkAuthStatus,
    login,
    logout,
    getAuthHeader
  }
})
