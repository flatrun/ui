<template>
  <div class="setup-page">
    <div class="setup-left">
      <div class="brand">
        <Logo variant="full" size="lg" />
        <p>Containerized apps and server management</p>
      </div>

      <div class="features">
        <div class="feature">
          <i class="pi pi-check-circle" />
          <span>One-click Docker deployments</span>
        </div>
        <div class="feature">
          <i class="pi pi-check-circle" />
          <span>Automatic SSL with Let's Encrypt</span>
        </div>
        <div class="feature">
          <i class="pi pi-check-circle" />
          <span>Built-in reverse proxy & domains</span>
        </div>
        <div class="feature">
          <i class="pi pi-check-circle" />
          <span>Real-time container monitoring</span>
        </div>
      </div>
    </div>

    <div class="setup-right">
      <div class="setup-card">
        <!-- Step indicator -->
        <div v-if="currentStep !== 'loading' && currentStep !== 'error'" class="step-indicator">
          <div
            v-for="(step, index) in steps"
            :key="step"
            class="step-dot"
            :class="{ active: index === currentStepIndex, completed: index < currentStepIndex }"
          />
        </div>

        <!-- Loading -->
        <div v-if="currentStep === 'loading'" class="step-content center-state">
          <i class="pi pi-spin pi-spinner" style="font-size: 2rem; color: var(--color-primary-500)" />
          <p>Connecting to FlatRun Agent...</p>
        </div>

        <!-- Error -->
        <div v-else-if="currentStep === 'error'" class="step-content center-state">
          <i class="pi pi-exclamation-triangle" style="font-size: 2rem; color: var(--color-danger-500)" />
          <h2>Connection Error</h2>
          <p>{{ errorMessage }}</p>
          <button class="btn btn-primary" @click="retry">Retry</button>
        </div>

        <!-- Step 1: Welcome -->
        <div v-else-if="currentStep === 'welcome'" class="step-content">
          <div class="card-header">
            <h2>Initial Setup</h2>
            <p>Let's get your server configured. This will only take a minute.</p>
          </div>

          <div class="info-cards">
            <div class="info-card">
              <span class="info-label">Server IP</span>
              <span v-if="setup.instanceIp" class="info-value">{{ setup.instanceIp }}</span>
              <span v-else class="info-skeleton" />
            </div>
            <div class="info-card">
              <span class="info-label">Agent Version</span>
              <span v-if="setup.agentVersion" class="info-value">{{ setup.agentVersion }}</span>
              <span v-else class="info-skeleton" />
            </div>
          </div>

          <button class="btn btn-primary btn-full" :disabled="!setup.infoLoaded" @click="startSetup">
            <i v-if="!setup.infoLoaded" class="pi pi-spin pi-spinner" />
            <span v-else>Begin Setup</span>
          </button>
        </div>

        <!-- Step 2: System Check -->
        <div v-else-if="currentStep === 'validation'" class="step-content">
          <div class="card-header">
            <h2>System Check</h2>
            <p>Verifying your server meets the requirements.</p>
          </div>

          <div v-if="validationLoading" class="center-state">
            <i class="pi pi-spin pi-spinner" style="font-size: 1.5rem; color: var(--color-primary-500)" />
            <p>Running checks...</p>
          </div>

          <div v-else class="checks-list">
            <div v-for="check in validationChecks" :key="check.name" class="check-item">
              <i
                :class="{
                  'pi pi-check-circle': check.status === 'pass',
                  'pi pi-exclamation-triangle': check.status === 'warn',
                  'pi pi-times-circle': check.status === 'fail',
                }"
                :style="{
                  color:
                    check.status === 'pass'
                      ? 'var(--color-success-500)'
                      : check.status === 'warn'
                        ? 'var(--color-warning-500)'
                        : 'var(--color-danger-500)',
                }"
              />
              <div class="check-info">
                <span class="check-name">{{ check.name }}</span>
                <span class="check-message">{{ check.message }}</span>
              </div>
            </div>
          </div>

          <div class="step-actions">
            <button class="btn btn-secondary" @click="currentStep = 'welcome'">Back</button>
            <button class="btn btn-primary" :disabled="!validationPassed" @click="currentStep = 'domain'">
              Continue
            </button>
          </div>
        </div>

        <!-- Step 3: Domain & SSL -->
        <div v-else-if="currentStep === 'domain'" class="step-content">
          <div class="card-header">
            <h2>Domain & SSL</h2>
            <p>Configure your domain name (optional). You can set this later.</p>
          </div>

          <div class="form-group">
            <label for="domain">Domain Name</label>
            <div class="input-wrapper">
              <i class="pi pi-globe" />
              <input id="domain" v-model="domain" type="text" placeholder="e.g. deploy.example.com" />
            </div>
          </div>

          <div v-if="domain" class="form-group">
            <label class="checkbox-label">
              <input v-model="autoSSL" type="checkbox" />
              <span>Enable automatic SSL (Let's Encrypt)</span>
            </label>
          </div>

          <div v-if="domain" class="form-group">
            <button class="btn btn-secondary btn-sm" :disabled="dnsChecking" @click="checkDNS">
              <i v-if="dnsChecking" class="pi pi-spin pi-spinner" />
              <span v-else>Verify DNS</span>
            </button>
            <div v-if="dnsResult" class="dns-result" :class="{ valid: dnsResult.valid, invalid: !dnsResult.valid }">
              <i :class="dnsResult.valid ? 'pi pi-check-circle' : 'pi pi-info-circle'" />
              <span v-if="dnsResult.valid">DNS is correctly pointing to {{ dnsResult.expected }}</span>
              <span v-else>
                DNS not pointing to this server ({{ dnsResult.expected }}).
                <template v-if="dnsResult.actual?.length"> Resolves to: {{ dnsResult.actual.join(", ") }}</template>
                You can continue and configure DNS later.
              </span>
            </div>
          </div>

          <div class="step-actions">
            <button class="btn btn-secondary" @click="currentStep = 'validation'">Back</button>
            <button class="btn btn-primary" @click="saveDomainSettings">
              {{ domain ? "Continue" : "Skip" }}
            </button>
          </div>
        </div>

        <!-- Step 4: Authentication -->
        <div v-else-if="currentStep === 'authentication'" class="step-content">
          <div class="card-header">
            <h2>Authentication</h2>
            <p>Set up how you'll access the dashboard.</p>
          </div>

          <div class="auth-methods">
            <label class="auth-method" :class="{ selected: authMethod === 'both' }">
              <input v-model="authMethod" type="radio" value="both" />
              <div class="method-content">
                <strong>Password + API Key</strong>
                <span>Recommended for full access</span>
              </div>
            </label>
            <label class="auth-method" :class="{ selected: authMethod === 'password' }">
              <input v-model="authMethod" type="radio" value="password" />
              <div class="method-content">
                <strong>Password Only</strong>
                <span>Dashboard login with credentials</span>
              </div>
            </label>
            <label class="auth-method" :class="{ selected: authMethod === 'apikey' }">
              <input v-model="authMethod" type="radio" value="apikey" />
              <div class="method-content">
                <strong>API Key Only</strong>
                <span>Headless / API-only access</span>
              </div>
            </label>
          </div>

          <div v-if="authMethod !== 'apikey'" class="auth-form">
            <div class="form-group">
              <label for="username">Username</label>
              <div class="input-wrapper">
                <i class="pi pi-user" />
                <input id="username" v-model="user.username" type="text" placeholder="admin" required />
              </div>
            </div>
            <div class="form-group">
              <label for="email">Email (optional)</label>
              <div class="input-wrapper">
                <i class="pi pi-envelope" />
                <input id="email" v-model="user.email" type="email" placeholder="you@example.com" />
              </div>
            </div>
            <div class="form-group">
              <label for="password">Password</label>
              <div class="input-wrapper">
                <i class="pi pi-lock" />
                <input
                  id="password"
                  v-model="user.password"
                  :type="showPassword ? 'text' : 'password'"
                  placeholder="Min 8 characters"
                  autocomplete="new-password"
                />
                <button type="button" class="toggle-password" @click="showPassword = !showPassword">
                  <i :class="showPassword ? 'pi pi-eye-slash' : 'pi pi-eye'" />
                </button>
              </div>
            </div>
            <div class="form-group">
              <label for="passwordConfirm">Confirm Password</label>
              <div class="input-wrapper">
                <i class="pi pi-lock" />
                <input
                  id="passwordConfirm"
                  v-model="user.passwordConfirm"
                  :type="showPasswordConfirm ? 'text' : 'password'"
                  placeholder="Repeat password"
                  autocomplete="new-password"
                />
                <button type="button" class="toggle-password" @click="showPasswordConfirm = !showPasswordConfirm">
                  <i :class="showPasswordConfirm ? 'pi pi-eye-slash' : 'pi pi-eye'" />
                </button>
              </div>
            </div>
          </div>

          <div v-if="authError" class="error-message">
            <i class="pi pi-exclamation-circle" />
            {{ authError }}
          </div>

          <div class="step-actions">
            <button class="btn btn-secondary" @click="currentStep = 'domain'">Back</button>
            <button class="btn btn-primary" :disabled="configuringAuth" @click="handleConfigureAuth">
              <i v-if="configuringAuth" class="pi pi-spin pi-spinner" />
              <span v-else>Complete Setup</span>
            </button>
          </div>
        </div>

        <!-- Step 5: Complete -->
        <div v-else-if="currentStep === 'complete'" class="step-content">
          <div class="center-state">
            <i class="pi pi-check-circle" style="font-size: 3rem; color: var(--color-success-500)" />
            <h2>Setup Complete</h2>
            <p>Your FlatRun instance is ready to use.</p>

            <div v-if="authResultData.username" class="credential-card">
              <div class="credential-row">
                <span class="credential-label">Username</span>
                <span class="credential-value">{{ authResultData.username }}</span>
              </div>
            </div>

            <div v-if="authResultData.api_key" class="credential-card">
              <div class="credential-row">
                <span class="credential-label">API Key</span>
                <code class="credential-value api-key">{{ authResultData.api_key }}</code>
                <button class="btn btn-sm btn-secondary" @click="copyText(authResultData.api_key)">
                  {{ copyLabel }}
                </button>
              </div>
              <p class="credential-warning">
                <i class="pi pi-exclamation-triangle" />
                Save this API key now. It won't be shown again.
              </p>
            </div>

            <button class="btn btn-primary btn-full" @click="$router.push('/login')">Go to Dashboard</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from "vue";
import { useSetupStore } from "@/stores/setup";
import type { SetupCheck, DNSResult, AuthResult } from "@/stores/setup";
import Logo from "@/components/base/Logo.vue";

const setup = useSetupStore();

const currentStep = ref("loading");
const errorMessage = ref("");
const copyLabel = ref("Copy");

const validationLoading = ref(false);
const validationChecks = ref<SetupCheck[]>([]);
const validationPassed = computed(() => {
  if (validationChecks.value.length === 0) return false;
  return !validationChecks.value.some((c) => c.required && c.status === "fail");
});

const domain = ref("");
const autoSSL = ref(true);
const dnsChecking = ref(false);
const dnsResult = ref<DNSResult | null>(null);

const authMethod = ref("both");
const showPassword = ref(false);
const showPasswordConfirm = ref(false);
const user = reactive({ username: "", email: "", password: "", passwordConfirm: "" });
const authError = ref("");
const configuringAuth = ref(false);
const authResultData = reactive<Partial<AuthResult>>({});

const steps = ["welcome", "validation", "domain", "authentication", "complete"];
const currentStepIndex = computed(() => steps.indexOf(currentStep.value));

function retry() {
  setup.initialized = null;
  setup.error = "";
  init();
}

async function init() {
  currentStep.value = "loading";
  await setup.checkSetupStatus();

  if (setup.error) {
    errorMessage.value = setup.error;
    currentStep.value = "error";
  } else if (setup.initialized) {
    currentStep.value = "complete";
  } else {
    currentStep.value = "welcome";
    setup.fetchSetupInfo();
  }
}

async function startSetup() {
  currentStep.value = "validation";
  validationLoading.value = true;
  validationChecks.value = [];
  try {
    const checks = await setup.runValidation();
    if (checks.length === 0 && setup.error) {
      validationChecks.value = [{ name: "Validation Failed", status: "fail", message: setup.error, required: true }];
    } else {
      validationChecks.value = checks;
    }
  } catch {
    validationChecks.value = [
      { name: "Validation Failed", status: "fail", message: "Could not run validation", required: true },
    ];
  } finally {
    validationLoading.value = false;
  }
}

async function checkDNS() {
  dnsChecking.value = true;
  dnsResult.value = null;
  const result = await setup.verifyDNS(domain.value);
  if (result) {
    dnsResult.value = result;
  }
  dnsChecking.value = false;
}

async function saveDomainSettings() {
  if (domain.value) {
    await setup.saveSettings({
      domain: domain.value,
      auto_ssl: autoSSL.value,
    });
  }
  currentStep.value = "authentication";
}

async function handleConfigureAuth() {
  authError.value = "";

  if (authMethod.value !== "apikey") {
    if (!user.username) {
      authError.value = "Please enter a username.";
      return;
    }
    if (!user.password) {
      authError.value = "Please enter a password.";
      return;
    }
    if (user.password.length < 8) {
      authError.value = "Password must be at least 8 characters.";
      return;
    }
    if (user.password !== user.passwordConfirm) {
      authError.value = "Passwords do not match.";
      return;
    }
  }

  configuringAuth.value = true;

  try {
    const payload: { auth_method: string; username?: string; password?: string; email?: string } = {
      auth_method: authMethod.value,
    };
    if (authMethod.value !== "apikey") {
      payload.username = user.username;
      payload.password = user.password;
      if (user.email) payload.email = user.email;
    }

    const result = await setup.configureAuth(payload);
    if (!result) {
      authError.value = setup.error || "Failed to configure authentication";
      return;
    }

    Object.assign(authResultData, result);

    const completeResult = await setup.completeSetup();
    if (!completeResult) {
      authError.value = setup.error || "Failed to complete setup";
      return;
    }

    currentStep.value = "complete";
  } catch (e: any) {
    authError.value = e.message || "An error occurred";
  } finally {
    configuringAuth.value = false;
  }
}

function copyText(text: string) {
  const onCopied = () => {
    copyLabel.value = "Copied!";
    setTimeout(() => {
      copyLabel.value = "Copy";
    }, 1500);
  };

  if (navigator.clipboard) {
    navigator.clipboard.writeText(text).then(onCopied);
    return;
  }

  const textArea = document.createElement("textarea");
  textArea.value = text;
  textArea.style.position = "fixed";
  textArea.style.opacity = "0";
  document.body.appendChild(textArea);
  textArea.select();
  try {
    document.execCommand("copy");
    onCopied();
  } catch {
    // copy failed silently
  }
  document.body.removeChild(textArea);
}

onMounted(init);
</script>

<style scoped>
.setup-page {
  min-height: 100vh;
  display: flex;
}

.setup-left {
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

.brand p {
  font-size: 1.125rem;
  color: #94a3b8;
  margin-top: 0.75rem;
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

.setup-right {
  flex: 0 0 70%;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f8fafc;
  padding: 2rem;
}

.setup-card {
  width: 100%;
  max-width: 520px;
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-lg);
  padding: 2.5rem;
}

.step-indicator {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  margin-bottom: 2rem;
}

.step-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: var(--color-gray-200);
  transition: all 0.2s;
}

.step-dot.active {
  background: var(--color-primary-500);
  transform: scale(1.25);
}

.step-dot.completed {
  background: var(--color-success-500);
}

.card-header {
  margin-bottom: 1.5rem;
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
  line-height: 1.5;
}

.center-state {
  text-align: center;
  padding: 2rem 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.center-state h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--color-gray-900);
}

.center-state p {
  color: var(--color-gray-500);
  line-height: 1.5;
}

.info-cards {
  display: flex;
  gap: 1rem;
  margin-bottom: 2rem;
}

.info-card {
  flex: 1;
  padding: 1rem;
  background: var(--color-gray-50);
  border-radius: var(--radius-sm);
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.info-label {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.info-value {
  font-weight: 600;
  color: var(--color-gray-900);
}

.info-skeleton {
  display: inline-block;
  width: 70%;
  height: 1.125rem;
  background: linear-gradient(90deg, var(--color-gray-200) 25%, var(--color-gray-100) 50%, var(--color-gray-200) 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

@keyframes shimmer {
  0% {
    background-position: 200% 0;
  }
  100% {
    background-position: -200% 0;
  }
}

.checks-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.check-item {
  display: flex;
  align-items: flex-start;
  gap: 0.75rem;
  padding: 0.75rem;
  background: var(--color-gray-50);
  border-radius: var(--radius-sm);
}

.check-item i {
  font-size: 1.125rem;
  margin-top: 0.125rem;
}

.check-info {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.check-name {
  font-weight: 600;
  font-size: var(--text-sm);
  color: var(--color-gray-900);
}

.check-message {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group label {
  display: block;
  font-size: var(--text-base);
  font-weight: 600;
  color: var(--color-gray-700);
  margin-bottom: 0.375rem;
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
  padding: 0.75rem 0.875rem 0.75rem 2.5rem;
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-sm);
  font-size: var(--text-md);
  transition: all 0.2s;
}

.input-wrapper input:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 var(--ring-width) var(--ring-color);
}

.toggle-password {
  position: absolute;
  right: 0.75rem;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem;
  color: var(--color-gray-400);
  transition: color 0.2s;
}

.toggle-password:hover {
  color: var(--color-gray-600);
}

.checkbox-label {
  display: flex !important;
  align-items: center;
  gap: 0.5rem;
  font-weight: 500 !important;
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  accent-color: var(--color-primary-500);
}

.dns-result {
  margin-top: 0.75rem;
  padding: 0.75rem;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
}

.dns-result.valid {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.dns-result.invalid {
  background: var(--color-warning-50);
  color: var(--color-warning-700);
}

.auth-methods {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.auth-method {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s;
}

.auth-method:hover {
  border-color: var(--color-primary-300);
}

.auth-method.selected {
  border-color: var(--color-primary-500);
  background: var(--color-primary-50);
}

.auth-method input[type="radio"] {
  accent-color: var(--color-primary-500);
}

.method-content {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.method-content strong {
  font-size: var(--text-sm);
  color: var(--color-gray-900);
}

.method-content span {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.auth-form {
  margin-bottom: 1rem;
}

.error-message {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: var(--color-danger-50);
  color: var(--color-danger-700);
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  margin-bottom: 1rem;
}

.step-actions {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  margin-top: 1.5rem;
}

.credential-card {
  width: 100%;
  background: var(--color-gray-50);
  border-radius: var(--radius-sm);
  padding: 1rem;
  margin-bottom: 1rem;
}

.credential-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.credential-label {
  font-size: var(--text-sm);
  font-weight: 600;
  color: var(--color-gray-500);
  min-width: 80px;
}

.credential-value {
  font-weight: 600;
  color: var(--color-gray-900);
}

.credential-value.api-key {
  font-size: var(--text-sm);
  word-break: break-all;
  flex: 1;
}

.credential-warning {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  font-size: var(--text-sm);
  color: var(--color-warning-600);
  margin-top: 0.75rem;
}

.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border: none;
  border-radius: var(--radius-sm);
  font-size: var(--text-sm);
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s;
}

.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-600);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--color-gray-100);
  color: var(--color-gray-700);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-gray-200);
}

.btn-full {
  width: 100%;
  padding: 0.875rem;
  font-size: var(--text-md);
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: var(--text-sm);
}

@media (max-width: 1024px) {
  .setup-left {
    display: none;
  }

  .setup-right {
    flex: 1;
  }
}
</style>
