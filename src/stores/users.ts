import { defineStore } from "pinia";
import { ref } from "vue";
import type { User, APIKey, UserRole, UserDeploymentAccess } from "@/types";
import { usersApi, apiKeysApi } from "@/services/api";

export const useUsersStore = defineStore("users", () => {
  const users = ref<User[]>([]);
  const apiKeys = ref<APIKey[]>([]);
  const loading = ref(false);
  const error = ref("");

  const fetchUsers = async () => {
    loading.value = true;
    error.value = "";
    try {
      const response = await usersApi.list();
      users.value = response.data.users;
    } catch (e: any) {
      error.value = e.response?.data?.error || "Failed to fetch users";
    } finally {
      loading.value = false;
    }
  };

  const getUser = async (id: number) => {
    try {
      const response = await usersApi.get(id);
      return response.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.error || "Failed to get user");
    }
  };

  const createUser = async (data: {
    username: string;
    email?: string;
    password: string;
    role: UserRole;
    permissions?: string[];
  }) => {
    try {
      const response = await usersApi.create(data);
      users.value.push(response.data.user);
      return response.data.user;
    } catch (e: any) {
      throw new Error(e.response?.data?.error || "Failed to create user");
    }
  };

  const updateUser = async (
    id: number,
    data: { username?: string; email?: string; role?: UserRole; is_active?: boolean; permissions?: string[] },
  ) => {
    try {
      const response = await usersApi.update(id, data);
      const index = users.value.findIndex((u) => u.id === id);
      if (index !== -1) {
        users.value[index] = response.data.user;
      }
      return response.data.user;
    } catch (e: any) {
      throw new Error(e.response?.data?.error || "Failed to update user");
    }
  };

  const deleteUser = async (id: number) => {
    try {
      await usersApi.delete(id);
      users.value = users.value.filter((u) => u.id !== id);
    } catch (e: any) {
      throw new Error(e.response?.data?.error || "Failed to delete user");
    }
  };

  const getUserDeployments = async (userId: number) => {
    try {
      const response = await usersApi.getDeployments(userId);
      return response.data.deployments as UserDeploymentAccess[];
    } catch (e: any) {
      throw new Error(e.response?.data?.error || "Failed to get user deployments");
    }
  };

  const assignDeployment = async (userId: number, deploymentName: string, accessLevel: string) => {
    try {
      await usersApi.assignDeployment(userId, { deployment_name: deploymentName, access_level: accessLevel });
    } catch (e: any) {
      throw new Error(e.response?.data?.error || "Failed to assign deployment");
    }
  };

  const updateDeploymentAccess = async (userId: number, deploymentName: string, accessLevel: string) => {
    try {
      await usersApi.updateDeployment(userId, deploymentName, { access_level: accessLevel });
    } catch (e: any) {
      throw new Error(e.response?.data?.error || "Failed to update deployment access");
    }
  };

  const removeDeploymentAccess = async (userId: number, deploymentName: string) => {
    try {
      await usersApi.removeDeployment(userId, deploymentName);
    } catch (e: any) {
      throw new Error(e.response?.data?.error || "Failed to remove deployment access");
    }
  };

  const fetchAPIKeys = async () => {
    loading.value = true;
    error.value = "";
    try {
      const response = await apiKeysApi.list();
      apiKeys.value = response.data.api_keys;
    } catch (e: any) {
      error.value = e.response?.data?.error || "Failed to fetch API keys";
    } finally {
      loading.value = false;
    }
  };

  const createAPIKey = async (data: {
    name: string;
    description?: string;
    role?: UserRole;
    permissions?: string[];
    deployments?: string[];
    expires_in?: number;
    user_id?: number;
  }) => {
    try {
      const response = await apiKeysApi.create(data);
      apiKeys.value.push(response.data.api_key);
      return response.data;
    } catch (e: any) {
      throw new Error(e.response?.data?.error || "Failed to create API key");
    }
  };

  const deleteAPIKey = async (id: number) => {
    try {
      await apiKeysApi.delete(id);
      apiKeys.value = apiKeys.value.filter((k) => k.id !== id);
    } catch (e: any) {
      throw new Error(e.response?.data?.error || "Failed to delete API key");
    }
  };

  const revokeAPIKey = async (id: number) => {
    try {
      await apiKeysApi.revoke(id);
      const index = apiKeys.value.findIndex((k) => k.id === id);
      if (index !== -1) {
        apiKeys.value[index].is_active = false;
      }
    } catch (e: any) {
      throw new Error(e.response?.data?.error || "Failed to revoke API key");
    }
  };

  return {
    users,
    apiKeys,
    loading,
    error,
    fetchUsers,
    getUser,
    createUser,
    updateUser,
    deleteUser,
    getUserDeployments,
    assignDeployment,
    updateDeploymentAccess,
    removeDeploymentAccess,
    fetchAPIKeys,
    createAPIKey,
    deleteAPIKey,
    revokeAPIKey,
  };
});
