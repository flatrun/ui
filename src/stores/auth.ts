import { defineStore } from "pinia";
import { ref, computed } from "vue";
import axios from "axios";
import type { User, Permission, UserDeploymentAccess } from "@/types";

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || "/api",
  headers: {
    "Content-Type": "application/json",
  },
});

export const useAuthStore = defineStore("auth", () => {
  const token = ref<string | null>(localStorage.getItem("auth_token"));
  const authEnabled = ref<boolean | null>(null);
  const loading = ref(false);
  const error = ref("");
  const currentUser = ref<User | null>(null);
  const permissions = ref<Permission[]>([]);
  const deploymentAccess = ref<UserDeploymentAccess[]>([]);
  const userLoaded = ref(false);

  const isAuthenticated = computed(() => !!token.value);
  const isAdmin = computed(() => currentUser.value?.role === "admin");
  const isOperator = computed(() => currentUser.value?.role === "operator");
  const isViewer = computed(() => currentUser.value?.role === "viewer");

  const hasPermission = (permission: Permission): boolean => {
    if (currentUser.value?.role === "admin") {
      return true;
    }
    if (token.value && !currentUser.value) {
      return true;
    }
    return permissions.value.includes(permission);
  };

  const canAccessDeployment = (deploymentName: string, level: "read" | "write" | "admin"): boolean => {
    if (currentUser.value?.role === "admin") {
      return true;
    }

    const access = deploymentAccess.value.find((d) => d.deployment_name === deploymentName);
    if (!access) {
      return false;
    }

    const levels = { read: 1, write: 2, admin: 3 };
    return levels[access.access_level] >= levels[level];
  };

  const checkAuthStatus = async () => {
    try {
      const response = await apiClient.get("/auth/status");
      authEnabled.value = response.data.enabled;
      return response.data.enabled;
    } catch {
      authEnabled.value = false;
      return false;
    }
  };

  const login = async (apiKey: string) => {
    loading.value = true;
    error.value = "";

    try {
      const response = await apiClient.post("/auth/login", { api_key: apiKey });
      token.value = response.data.token;
      localStorage.setItem("auth_token", response.data.token);

      if (response.data.user) {
        currentUser.value = response.data.user;
      }
      if (response.data.permissions) {
        permissions.value = response.data.permissions;
      }
      if (response.data.deployments) {
        deploymentAccess.value = response.data.deployments;
      }
      userLoaded.value = true;

      return true;
    } catch (e: any) {
      error.value = e.response?.data?.error || "Invalid API key";
      return false;
    } finally {
      loading.value = false;
    }
  };

  const loginWithCredentials = async (username: string, password: string) => {
    loading.value = true;
    error.value = "";

    try {
      const response = await apiClient.post("/auth/login", { username, password });
      token.value = response.data.token;
      localStorage.setItem("auth_token", response.data.token);

      if (response.data.user) {
        currentUser.value = response.data.user;
      }
      if (response.data.permissions) {
        permissions.value = response.data.permissions;
      }
      if (response.data.deployments) {
        deploymentAccess.value = response.data.deployments;
      }
      userLoaded.value = true;

      return true;
    } catch (e: any) {
      error.value = e.response?.data?.error || "Invalid username or password";
      return false;
    } finally {
      loading.value = false;
    }
  };

  const fetchCurrentUser = async () => {
    if (!token.value) return;

    try {
      const authClient = axios.create({
        baseURL: import.meta.env.VITE_API_URL || "/api",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token.value}`,
        },
      });

      const response = await authClient.get("/users/me");
      currentUser.value = response.data.user;
      permissions.value = response.data.permissions || [];
      deploymentAccess.value = response.data.deployments || [];
    } catch {
      // User endpoint may not exist if using legacy auth
    } finally {
      userLoaded.value = true;
    }
  };

  const logout = () => {
    token.value = null;
    currentUser.value = null;
    permissions.value = [];
    deploymentAccess.value = [];
    userLoaded.value = false;
    localStorage.removeItem("auth_token");
  };

  const getAuthHeader = () => {
    if (token.value) {
      return { Authorization: `Bearer ${token.value}` };
    }
    return {};
  };

  return {
    token,
    authEnabled,
    loading,
    error,
    currentUser,
    permissions,
    deploymentAccess,
    userLoaded,
    isAuthenticated,
    isAdmin,
    isOperator,
    isViewer,
    hasPermission,
    canAccessDeployment,
    checkAuthStatus,
    login,
    loginWithCredentials,
    fetchCurrentUser,
    logout,
    getAuthHeader,
  };
});
