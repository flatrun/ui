<template>
  <div class="login-page">
    <div class="login-left">
      <div class="brand">
        <h1>FlatRun</h1>
        <p>Docker Deployment Manager</p>
      </div>

      <div class="features">
        <div class="feature">
          <i class="pi pi-check-circle" />
          <span>Manage Docker deployments</span>
        </div>
        <div class="feature">
          <i class="pi pi-check-circle" />
          <span>Monitor containers & resources</span>
        </div>
        <div class="feature">
          <i class="pi pi-check-circle" />
          <span>Quick app deployment templates</span>
        </div>
      </div>
    </div>

    <div class="login-right">
      <div class="login-card">
        <div class="card-header">
          <h2>Sign In</h2>
          <p>Enter your API key to access the dashboard</p>
        </div>

        <form
          class="login-form"
          @submit.prevent="handleLogin"
        >
          <div class="form-group">
            <label for="apiKey">API Key</label>
            <div class="input-wrapper">
              <i class="pi pi-key" />
              <input
                id="apiKey"
                v-model="apiKey"
                :type="showKey ? 'text' : 'password'"
                placeholder="Enter your API key"
                :class="{ error: auth.error }"
                autocomplete="current-password"
              >
              <button
                type="button"
                class="toggle-visibility"
                @click="showKey = !showKey"
              >
                <i :class="showKey ? 'pi pi-eye-slash' : 'pi pi-eye'" />
              </button>
            </div>
            <span
              v-if="auth.error"
              class="error-text"
            >
              <i class="pi pi-exclamation-circle" />
              {{ auth.error }}
            </span>
          </div>

          <button
            type="submit"
            class="login-btn"
            :disabled="auth.loading || !apiKey"
          >
            <i
              v-if="auth.loading"
              class="pi pi-spin pi-spinner"
            />
            <span v-else>Sign In</span>
          </button>
        </form>

        <div class="help-text">
          <i class="pi pi-info-circle" />
          <span>API keys are configured in the agent's config file</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = useRouter();
const auth = useAuthStore();
const apiKey = ref("");
const showKey = ref(false);

const handleLogin = async () => {
  const success = await auth.login(apiKey.value);
  if (success) {
    router.push("/");
  }
};
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  display: flex;
}

.login-left {
  flex: 0 0 30%;
  background: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 3rem;
  color: white;
}

.brand {
  margin-bottom: 3rem;
}

.brand h1 {
  font-size: 2.5rem;
  font-weight: 700;
  margin-bottom: 0.5rem;
}

.brand p {
  font-size: 1.125rem;
  color: #94a3b8;
}

.features {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.feature {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-size: 1rem;
  color: #cbd5e1;
}

.feature i {
  color: #22c55e;
  font-size: 1.125rem;
}

.login-right {
  flex: 0 0 70%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  padding: 2rem;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-lg);
  padding: 2.5rem;
}

.card-header {
  margin-bottom: 2rem;
}

.card-header h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-gray-900);
  margin-bottom: 0.5rem;
}

.card-header p {
  color: var(--color-gray-500);
  font-size: var(--text-base);
}

.login-form {
  margin-bottom: 1.5rem;
}

.form-group {
  margin-bottom: 1.5rem;
}

.form-group label {
  display: block;
  font-size: var(--text-base);
  font-weight: var(--font-semibold);
  color: var(--color-gray-700);
  margin-bottom: 0.5rem;
}

.input-wrapper {
  position: relative;
  display: flex;
  align-items: center;
}

.input-wrapper > i:first-child {
  position: absolute;
  left: 0.875rem;
  color: var(--color-gray-400);
  pointer-events: none;
}

.input-wrapper input {
  width: 100%;
  padding: 0.75rem 2.75rem 0.75rem 2.5rem;
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-md);
  transition: all var(--transition-base);
}

.input-wrapper input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 var(--ring-width) var(--ring-color);
}

.input-wrapper input.error {
  border-color: var(--color-danger-500);
}

.toggle-visibility {
  position: absolute;
  right: 0.5rem;
  background: none;
  border: none;
  color: var(--color-gray-400);
  cursor: pointer;
  padding: 0.375rem;
  border-radius: var(--radius-sm);
  transition: all var(--transition-base);
}

.toggle-visibility:hover {
  color: var(--color-gray-600);
  background: var(--color-gray-100);
}

.error-text {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--text-sm);
  color: var(--color-danger-500);
  margin-top: 0.5rem;
}

.error-text i {
  font-size: 0.875rem;
}

.login-btn {
  width: 100%;
  padding: 0.875rem;
  background: var(--color-primary-500);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  cursor: pointer;
  transition: all var(--transition-base);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.login-btn:hover:not(:disabled) {
  background: var(--color-primary-600);
  transform: translateY(-1px);
}

.login-btn:active:not(:disabled) {
  transform: translateY(0);
}

.login-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.help-text {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  padding-top: 1rem;
  border-top: 1px solid var(--color-gray-100);
}

.help-text i {
  color: var(--color-gray-400);
}

@media (max-width: 1024px) {
  .login-left {
    display: none;
  }

  .login-right {
    flex: 1;
  }
}
</style>
