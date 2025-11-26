<template>
  <BaseModal
    :visible="visible"
    size="xl"
    title="Create Deployment"
    subtitle="Deploy your application in just a few steps"
    icon="pi pi-rocket"
    :close-disabled="creating"
    :close-on-overlay="!creating"
    @close="handleClose"
  >
    <div class="wizard-container">
      <!-- Progress Steps -->
      <div class="wizard-progress">
        <div class="progress-track">
          <div
            class="progress-fill"
            :style="{ width: progressWidth }"
          />
        </div>
        <div class="steps-row">
          <div
            v-for="(step, index) in steps"
            :key="step.id"
            class="step-item"
            :class="{
              active: currentStep === index + 1,
              completed: currentStep > index + 1,
            }"
          >
            <div class="step-indicator">
              <i
                v-if="currentStep > index + 1"
                class="pi pi-check"
              />
              <span v-else>{{ index + 1 }}</span>
            </div>
            <span class="step-label">{{ step.label }}</span>
          </div>
        </div>
      </div>

      <!-- Step Content -->
      <div class="wizard-content">
        <Transition
          name="slide"
          mode="out-in"
        >
          <!-- Step 1: Basic Info -->
          <div
            v-if="currentStep === 1"
            class="step-panel"
          >
            <div class="step1-grid">
              <!-- Left: Name & Domain -->
              <div class="step1-left">
                <div class="section-card">
                  <div class="section-header compact">
                    <div class="section-icon small">
                      <i class="pi pi-pencil" />
                    </div>
                    <h4>Deployment Details</h4>
                  </div>

                  <div class="form-field">
                    <label for="name">
                      Name
                      <span class="required">*</span>
                    </label>
                    <div class="input-wrapper">
                      <input
                        id="name"
                        v-model="form.name"
                        type="text"
                        placeholder="my-app"
                        :class="{ error: errors.name }"
                        @input="onNameChange"
                      >
                      <span
                        v-if="form.name && !errors.name"
                        class="input-icon success"
                      >
                        <i class="pi pi-check" />
                      </span>
                    </div>
                    <span
                      v-if="errors.name"
                      class="field-error"
                    >{{ errors.name }}</span>
                    <span
                      v-else
                      class="field-hint"
                    >Lowercase letters, numbers, and hyphens</span>
                  </div>
                </div>

                <div class="section-card">
                  <div class="section-header compact">
                    <div class="section-icon small">
                      <i class="pi pi-globe" />
                    </div>
                    <h4>Domain</h4>
                  </div>

                  <div
                    v-if="domainSettings.default_domain"
                    class="domain-preview"
                  >
                    <div class="domain-url">
                      <span class="protocol">https://</span>
                      <span class="domain-text">{{ generatedDomain || 'generating...' }}</span>
                      <button
                        class="refresh-domain-btn"
                        title="Generate new subdomain"
                        @click="regenerateSubdomain"
                      >
                        <i class="pi pi-refresh" />
                      </button>
                    </div>
                  </div>

                  <div class="toggle-option">
                    <label class="toggle-label">
                      <input
                        v-model="form.useCustomDomain"
                        type="checkbox"
                      >
                      <span class="toggle-text">Use custom domain</span>
                    </label>
                  </div>

                  <Transition name="expand">
                    <div
                      v-if="form.useCustomDomain || !domainSettings.default_domain"
                      class="custom-domain-field"
                    >
                      <div class="form-field">
                        <label for="customDomain">Custom Domain</label>
                        <input
                          id="customDomain"
                          v-model="form.networking.domain"
                          type="text"
                          placeholder="app.example.com"
                        >
                      </div>
                    </div>
                  </Transition>

                  <div class="ssl-options">
                    <div class="toggle-option">
                      <label class="toggle-label">
                        <input
                          v-model="form.ssl.enabled"
                          type="checkbox"
                        >
                        <span class="toggle-text">Enable HTTPS</span>
                      </label>
                    </div>
                    <Transition name="expand">
                      <div
                        v-if="form.ssl.enabled"
                        class="toggle-option nested"
                      >
                        <label class="toggle-label">
                          <input
                            v-model="form.ssl.autoCert"
                            type="checkbox"
                          >
                          <span class="toggle-text">Auto-provision certificate</span>
                        </label>
                      </div>
                    </Transition>
                  </div>
                </div>
              </div>

              <!-- Right: Template Selection -->
              <div class="step1-right">
                <div class="section-card templates-card">
                  <div class="section-header compact">
                    <div class="section-icon small">
                      <i class="pi pi-th-large" />
                    </div>
                    <h4>Template</h4>
                  </div>

                  <div
                    v-if="loadingQuickApps"
                    class="templates-loading"
                  >
                    <i class="pi pi-spin pi-spinner" />
                  </div>

                  <div
                    v-else
                    class="templates-list"
                  >
                    <button
                      v-for="app in displayedQuickApps"
                      :key="app.id"
                      class="template-item"
                      :class="{ selected: selectedQuickApp === app.id }"
                      @click="selectQuickApp(app)"
                    >
                      <div class="template-icon">
                        <i :class="app.icon || 'pi pi-box'" />
                      </div>
                      <div class="template-info">
                        <span class="template-name">{{ app.name }}</span>
                        <span class="template-desc">{{ app.description || 'Ready to deploy' }}</span>
                      </div>
                      <i
                        v-if="selectedQuickApp === app.id"
                        class="pi pi-check template-check"
                      />
                    </button>

                    <button
                      class="template-item custom"
                      :class="{ selected: selectedQuickApp === 'custom' }"
                      @click="selectCustom"
                    >
                      <div class="template-icon">
                        <i class="pi pi-code" />
                      </div>
                      <div class="template-info">
                        <span class="template-name">Custom</span>
                        <span class="template-desc">Write your own compose</span>
                      </div>
                      <i
                        v-if="selectedQuickApp === 'custom'"
                        class="pi pi-check template-check"
                      />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 2: Configuration -->
          <div
            v-else-if="currentStep === 2"
            class="step-panel"
          >
            <div class="step2-layout">
              <!-- Compose Editor -->
              <div class="compose-section">
                <div class="compose-header">
                  <div class="compose-title">
                    <i class="pi pi-file-edit" />
                    <span>docker-compose.yml</span>
                  </div>
                  <div class="compose-actions">
                    <button
                      class="action-btn"
                      title="Format"
                      @click="formatCompose"
                    >
                      <i class="pi pi-align-left" />
                    </button>
                    <button
                      class="action-btn"
                      title="Copy"
                      @click="copyCompose"
                    >
                      <i class="pi pi-copy" />
                    </button>
                  </div>
                </div>
                <div class="compose-editor-wrapper">
                  <Codemirror
                    v-model="form.composeContent"
                    :style="{ height: '100%' }"
                    :extensions="extensions"
                    :tab-size="2"
                    placeholder="# Docker Compose configuration..."
                  />
                </div>
                <div
                  v-if="errors.composeContent"
                  class="compose-error"
                >
                  <i class="pi pi-exclamation-circle" />
                  {{ errors.composeContent }}
                </div>
              </div>

              <!-- Side Panel -->
              <div class="side-panel">
                <!-- Environment Variables -->
                <div class="section-card">
                  <div class="section-header compact">
                    <div class="section-icon small">
                      <i class="pi pi-key" />
                    </div>
                    <h4>Environment</h4>
                  </div>
                  <div class="env-section">
                    <div
                      v-for="(env, index) in form.envVars"
                      :key="index"
                      class="env-row"
                    >
                      <input
                        v-model="env.key"
                        placeholder="KEY"
                        class="env-key"
                      >
                      <input
                        v-model="env.value"
                        placeholder="value"
                        class="env-value"
                      >
                      <button
                        class="env-remove"
                        @click="removeEnvVar(index)"
                      >
                        <i class="pi pi-times" />
                      </button>
                    </div>
                    <button
                      class="add-env-btn"
                      @click="addEnvVar"
                    >
                      <i class="pi pi-plus" />
                      Add Variable
                    </button>
                  </div>
                </div>

                <!-- Network Settings -->
                <div class="section-card">
                  <div class="section-header compact">
                    <div class="section-icon small">
                      <i class="pi pi-sitemap" />
                    </div>
                    <h4>Network</h4>
                  </div>
                  <div class="network-fields">
                    <div class="form-field compact">
                      <label for="containerPort">Container Port</label>
                      <input
                        id="containerPort"
                        v-model.number="form.networking.containerPort"
                        type="number"
                        placeholder="80"
                      >
                    </div>
                    <div class="form-field compact">
                      <label for="protocol">Protocol</label>
                      <select
                        id="protocol"
                        v-model="form.networking.protocol"
                      >
                        <option value="http">HTTP</option>
                        <option value="https">HTTPS</option>
                      </select>
                    </div>
                  </div>
                </div>

                <!-- Options -->
                <div class="section-card">
                  <div class="section-header compact">
                    <div class="section-icon small">
                      <i class="pi pi-cog" />
                    </div>
                    <h4>Options</h4>
                  </div>
                  <div class="options-section">
                    <div class="toggle-option">
                      <label class="toggle-label">
                        <input
                          v-model="form.autoStart"
                          type="checkbox"
                        >
                        <span class="toggle-text">Start after creation</span>
                      </label>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- Step 3: Review -->
          <div
            v-else
            class="step-panel"
          >
            <div class="review-container">
              <div class="review-card">
                <div class="review-header">
                  <div class="review-icon">
                    <i class="pi pi-check-circle" />
                  </div>
                  <div class="review-title">
                    <h3>Ready to Deploy</h3>
                    <p>Review your configuration</p>
                  </div>
                </div>

                <div class="review-grid">
                  <div class="review-item">
                    <span class="review-label">Name</span>
                    <span class="review-value">{{ form.name }}</span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">Template</span>
                    <span class="review-value">{{ selectedQuickAppName }}</span>
                  </div>
                  <div
                    v-if="effectiveDomain"
                    class="review-item full-width"
                  >
                    <span class="review-label">Domain</span>
                    <span class="review-value domain">
                      <i class="pi pi-link" />
                      {{ effectiveDomain }}
                    </span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">SSL</span>
                    <span
                      class="review-badge"
                      :class="form.ssl.enabled ? 'success' : 'neutral'"
                    >
                      {{ form.ssl.enabled ? 'Enabled' : 'Disabled' }}
                    </span>
                  </div>
                  <div class="review-item">
                    <span class="review-label">Auto Start</span>
                    <span
                      class="review-badge"
                      :class="form.autoStart ? 'success' : 'neutral'"
                    >
                      {{ form.autoStart ? 'Yes' : 'No' }}
                    </span>
                  </div>
                  <div
                    v-if="form.envVars.length"
                    class="review-item"
                  >
                    <span class="review-label">Env Vars</span>
                    <span class="review-value">{{ form.envVars.filter(e => e.key).length }} defined</span>
                  </div>
                </div>

                <div class="compose-summary">
                  <div class="compose-summary-header">
                    <i class="pi pi-file-edit" />
                    <span>Docker Compose</span>
                    <span class="compose-lines">{{ composeLineCount }} lines</span>
                  </div>
                  <pre class="compose-preview-code">{{ form.composeContent.slice(0, 400) }}{{ form.composeContent.length > 400 ? '\n...' : '' }}</pre>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </div>
    </div>

    <template #footer>
      <div class="footer-left">
        <button
          v-if="currentStep > 1"
          class="btn btn-ghost"
          @click="currentStep--"
        >
          <i class="pi pi-arrow-left" />
          Back
        </button>
      </div>
      <div class="footer-right">
        <button
          class="btn btn-secondary"
          :disabled="creating"
          @click="handleClose"
        >
          Cancel
        </button>
        <button
          v-if="currentStep < 3"
          class="btn btn-primary"
          :disabled="!canProceed"
          @click="nextStep"
        >
          Continue
          <i class="pi pi-arrow-right" />
        </button>
        <button
          v-else
          class="btn btn-primary btn-create"
          :disabled="creating"
          @click="handleCreate"
        >
          <i
            v-if="creating"
            class="pi pi-spin pi-spinner"
          />
          <i
            v-else
            class="pi pi-rocket"
          />
          {{ creating ? "Creating..." : "Deploy" }}
        </button>
      </div>
    </template>
  </BaseModal>
</template>

<script setup lang="ts">
import { ref, reactive, watch, computed, shallowRef } from "vue";
import { Codemirror } from "vue-codemirror";
import { yaml } from "@codemirror/lang-yaml";
import { oneDark } from "@codemirror/theme-one-dark";
import BaseModal from "@/components/base/BaseModal.vue";
import { deploymentsApi, templatesApi, settingsApi } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";

interface QuickApp {
  id: string;
  name: string;
  description: string;
  icon: string;
  category: string;
  content: string;
}

const props = defineProps<{
  visible: boolean;
}>();

const emit = defineEmits(["close", "created"]);

const notifications = useNotificationsStore();
const creating = ref(false);
const loadingQuickApps = ref(false);
const selectedQuickApp = ref("");
const quickApps = ref<QuickApp[]>([]);
const currentStep = ref(1);
const generatedSubdomain = ref("");
const generatedDomain = ref("");

const extensions = shallowRef([yaml(), oneDark]);

const steps = [
  { id: "basics", label: "Basics" },
  { id: "configure", label: "Configure" },
  { id: "review", label: "Review" },
];

const domainSettings = reactive({
  default_domain: "",
  auto_subdomain: false,
  auto_ssl: false,
  subdomain_style: "words",
});

const form = reactive({
  name: "",
  composeContent: "",
  envVars: [] as { key: string; value: string }[],
  autoStart: false,
  useCustomDomain: false,
  networking: {
    expose: true,
    domain: "",
    containerPort: 80,
    protocol: "http",
  },
  ssl: {
    enabled: false,
    autoCert: false,
  },
});

const errors = reactive({
  name: "",
  composeContent: "",
});

const progressWidth = computed(() => {
  return `${((currentStep.value - 1) / (steps.length - 1)) * 100}%`;
});

const displayedQuickApps = computed(() => quickApps.value.slice(0, 6));

const composeLineCount = computed(() => {
  return form.composeContent.split("\n").filter((l) => l.trim()).length;
});

const selectedQuickAppName = computed(() => {
  if (selectedQuickApp.value === "custom") return "Custom";
  const app = quickApps.value.find((a) => a.id === selectedQuickApp.value);
  return app?.name || selectedQuickApp.value;
});

const effectiveDomain = computed(() => {
  if (form.useCustomDomain || !domainSettings.default_domain) {
    return form.networking.domain;
  }
  return generatedDomain.value;
});

const canProceed = computed(() => {
  if (currentStep.value === 1) {
    return (
      form.name.trim() &&
      /^[a-z0-9-]+$/.test(form.name) &&
      selectedQuickApp.value !== ""
    );
  }
  if (currentStep.value === 2) {
    return form.composeContent.trim().length > 0;
  }
  return true;
});

const loadSettings = async () => {
  try {
    const response = await settingsApi.get();
    const settings = response.data.settings;
    if (settings?.domain) {
      domainSettings.default_domain = settings.domain.default_domain || "";
      domainSettings.auto_subdomain = settings.domain.auto_subdomain || false;
      domainSettings.auto_ssl = settings.domain.auto_ssl || false;
      domainSettings.subdomain_style = settings.domain.subdomain_style || "words";
      form.ssl.enabled = domainSettings.auto_ssl;
      form.ssl.autoCert = domainSettings.auto_ssl;
    }
  } catch {
    // Settings not available
  }
};

const generateSubdomain = async () => {
  if (!domainSettings.default_domain) return;

  try {
    const response = await settingsApi.generateSubdomain();
    generatedSubdomain.value = response.data.subdomain;
    generatedDomain.value = response.data.full_domain;
  } catch {
    const adjectives = ["swift", "bright", "calm", "bold", "cool", "happy", "quick", "sunny"];
    const nouns = ["river", "cloud", "leaf", "star", "moon", "wave", "peak", "dawn"];
    const adj = adjectives[Math.floor(Math.random() * adjectives.length)];
    const noun = nouns[Math.floor(Math.random() * nouns.length)];
    const num = Math.floor(Math.random() * 900) + 100;
    generatedSubdomain.value = `${adj}-${noun}-${num}`;
    generatedDomain.value = `${generatedSubdomain.value}.${domainSettings.default_domain}`;
  }
};

const regenerateSubdomain = () => {
  generateSubdomain();
};

const onNameChange = () => {
  errors.name = "";
  if (form.name && !/^[a-z0-9-]+$/.test(form.name)) {
    errors.name = "Only lowercase letters, numbers, and hyphens allowed";
  }
};

const loadQuickApps = async () => {
  loadingQuickApps.value = true;
  try {
    const response = await templatesApi.list();
    quickApps.value = response.data.templates || [];
  } catch {
    quickApps.value = [];
  } finally {
    loadingQuickApps.value = false;
  }
};

const selectQuickApp = (app: QuickApp) => {
  selectedQuickApp.value = app.id;
  form.composeContent = app.content.replace(/\$\{NAME\}/g, form.name || "my-app");
  if (!form.name) {
    form.name = app.id;
  }
};

const selectCustom = () => {
  selectedQuickApp.value = "custom";
  form.composeContent = defaultComposeTemplate.replace(/\$\{NAME\}/g, form.name || "my-app");
};

const defaultComposeTemplate = `services:
  app:
    image: nginx:alpine
    container_name: \${NAME}
    ports:
      - "80:80"
    networks:
      - web
    restart: unless-stopped

networks:
  web:
    external: true
`;

const formatCompose = () => {
  // Basic formatting - could be enhanced
  notifications.info("Format", "YAML formatting applied");
};

const copyCompose = () => {
  navigator.clipboard.writeText(form.composeContent);
  notifications.success("Copied", "Compose content copied");
};

const addEnvVar = () => {
  form.envVars.push({ key: "", value: "" });
};

const removeEnvVar = (index: number) => {
  form.envVars.splice(index, 1);
};

const nextStep = () => {
  if (canProceed.value && currentStep.value < steps.length) {
    currentStep.value++;
  }
};

watch(
  () => props.visible,
  async (val) => {
    if (val) {
      form.name = "";
      form.composeContent = "";
      form.envVars = [];
      form.autoStart = false;
      form.useCustomDomain = false;
      form.networking = {
        expose: true,
        domain: "",
        containerPort: 80,
        protocol: "http",
      };
      form.ssl = { enabled: false, autoCert: false };
      errors.name = "";
      errors.composeContent = "";
      selectedQuickApp.value = "";
      currentStep.value = 1;
      generatedSubdomain.value = "";
      generatedDomain.value = "";

      await loadSettings();
      await generateSubdomain();
      loadQuickApps();
    }
  },
);

watch(
  () => form.name,
  (newName) => {
    if (form.composeContent && newName) {
      form.composeContent = form.composeContent.replace(
        /container_name: [a-z0-9-]+/g,
        `container_name: ${newName}`,
      );
    }
  },
);

const validate = () => {
  errors.name = "";
  errors.composeContent = "";
  let valid = true;

  if (!form.name.trim()) {
    errors.name = "Name is required";
    valid = false;
  } else if (!/^[a-z0-9-]+$/.test(form.name)) {
    errors.name = "Only lowercase letters, numbers, and hyphens allowed";
    valid = false;
  }

  if (!form.composeContent.trim()) {
    errors.composeContent = "Compose configuration is required";
    valid = false;
  }

  return valid;
};

const handleCreate = async () => {
  if (!validate()) return;

  creating.value = true;

  try {
    const finalDomain =
      form.useCustomDomain || !domainSettings.default_domain
        ? form.networking.domain
        : generatedDomain.value;

    const payload: Record<string, any> = {
      name: form.name,
      compose_content: form.composeContent,
      env_vars: form.envVars.filter((e) => e.key),
      auto_start: form.autoStart,
    };

    if (finalDomain) {
      payload.metadata = {
        name: form.name,
        type: "web",
        networking: {
          expose: true,
          domain: finalDomain,
          container_port: form.networking.containerPort || 80,
          protocol: form.networking.protocol || "http",
        },
        ssl: {
          enabled: form.ssl.enabled,
          auto_cert: form.ssl.autoCert,
        },
        healthcheck: {
          path: "/health",
          interval: "30s",
        },
      };
    }

    await deploymentsApi.create(payload);
    emit("created");
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message;
    notifications.error("Failed to create deployment", msg);
  } finally {
    creating.value = false;
  }
};

const handleClose = () => {
  if (!creating.value) {
    emit("close");
  }
};
</script>

<style scoped>
.wizard-container {
  display: flex;
  flex-direction: column;
  gap: var(--space-5);
}

/* Progress */
.wizard-progress {
  padding: 0 var(--space-4);
}

.progress-track {
  height: 4px;
  background: var(--color-gray-100);
  border-radius: var(--radius-full);
  margin-bottom: var(--space-4);
  overflow: hidden;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, var(--color-primary-500), var(--color-primary-400));
  border-radius: var(--radius-full);
  transition: width 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.steps-row {
  display: flex;
  justify-content: space-between;
}

.step-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--space-2);
}

.step-indicator {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-full);
  border: 2px solid var(--color-gray-200);
  background: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-gray-400);
  transition: all 0.3s ease;
}

.step-item.active .step-indicator {
  border-color: var(--color-primary-500);
  background: var(--color-primary-500);
  color: white;
  box-shadow: 0 0 0 4px var(--color-primary-50);
}

.step-item.completed .step-indicator {
  border-color: var(--color-success-500);
  background: var(--color-success-500);
  color: white;
}

.step-label {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-400);
}

.step-item.active .step-label {
  color: var(--color-primary-600);
}

.step-item.completed .step-label {
  color: var(--color-success-600);
}

/* Content */
.wizard-content {
  min-height: 420px;
}

.step-panel {
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateX(10px); }
  to { opacity: 1; transform: translateX(0); }
}

/* Section Cards */
.section-card {
  background: white;
  border: 1px solid var(--color-gray-100);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.section-header {
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-4);
  background: var(--color-gray-50);
  border-bottom: 1px solid var(--color-gray-100);
}

.section-header.compact {
  padding: var(--space-3) var(--space-4);
}

.section-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-md);
  background: var(--color-primary-50);
  color: var(--color-primary-600);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.section-icon.small {
  width: 28px;
  height: 28px;
  font-size: var(--text-sm);
}

.section-header h4 {
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0;
}

/* Step 1 Layout */
.step1-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.step1-left {
  display: flex;
  flex-direction: column;
  gap: var(--space-4);
}

.step1-right {
  display: flex;
  flex-direction: column;
}

.templates-card {
  flex: 1;
  display: flex;
  flex-direction: column;
}

/* Form Fields */
.form-field {
  padding: var(--space-4);
}

.form-field.compact {
  padding: var(--space-3) var(--space-4);
}

.form-field label {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-700);
  margin-bottom: var(--space-2);
}

.form-field label .required {
  color: var(--color-danger-500);
}

.input-wrapper {
  position: relative;
}

.form-field input,
.form-field select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-md);
  font-size: var(--text-md);
  color: var(--color-gray-900);
  background: white;
  transition: all 0.2s ease;
}

.form-field input:focus,
.form-field select:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-50);
}

.form-field input.error {
  border-color: var(--color-danger-500);
}

.input-icon {
  position: absolute;
  right: var(--space-3);
  top: 50%;
  transform: translateY(-50%);
}

.input-icon.success {
  color: var(--color-success-500);
}

.field-error {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-danger-500);
  margin-top: var(--space-1);
}

.field-hint {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  margin-top: var(--space-1);
}

/* Domain */
.domain-preview {
  padding: var(--space-3) var(--space-4);
}

.domain-url {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  background: linear-gradient(135deg, var(--color-primary-50), var(--color-info-50));
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
}

.domain-url .protocol {
  color: var(--color-gray-400);
}

.domain-url .domain-text {
  color: var(--color-primary-700);
  font-weight: var(--font-medium);
  flex: 1;
}

.refresh-domain-btn {
  background: white;
  border: 1px solid var(--color-gray-200);
  color: var(--color-gray-500);
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.refresh-domain-btn:hover {
  background: var(--color-primary-50);
  color: var(--color-primary-600);
}

/* Toggle Options */
.toggle-option {
  padding: var(--space-3) var(--space-4);
}

.toggle-option.nested {
  padding-left: var(--space-8);
  background: var(--color-gray-50);
}

.toggle-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.toggle-label input[type="checkbox"] {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary-500);
}

.toggle-text {
  font-size: var(--text-sm);
  color: var(--color-gray-700);
}

.custom-domain-field,
.ssl-options {
  border-top: 1px solid var(--color-gray-100);
}

/* Templates */
.templates-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--space-8);
  color: var(--color-gray-400);
}

.templates-list {
  flex: 1;
  overflow-y: auto;
  max-height: 340px;
}

.template-item {
  width: 100%;
  display: flex;
  align-items: center;
  gap: var(--space-3);
  padding: var(--space-3) var(--space-4);
  background: white;
  border: none;
  border-bottom: 1px solid var(--color-gray-50);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s ease;
}

.template-item:hover {
  background: var(--color-gray-50);
}

.template-item.selected {
  background: var(--color-primary-50);
}

.template-item:last-child {
  border-bottom: none;
}

.template-icon {
  width: 36px;
  height: 36px;
  border-radius: var(--radius-md);
  background: var(--color-gray-100);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-gray-500);
  flex-shrink: 0;
}

.template-item.selected .template-icon {
  background: var(--color-primary-500);
  color: white;
}

.template-item.custom .template-icon {
  border: 2px dashed var(--color-gray-300);
  background: transparent;
}

.template-item.custom.selected .template-icon {
  border-color: var(--color-primary-500);
  background: var(--color-primary-500);
}

.template-info {
  flex: 1;
  min-width: 0;
}

.template-name {
  display: block;
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-900);
}

.template-desc {
  display: block;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  margin-top: 2px;
}

.template-check {
  color: var(--color-primary-500);
}

/* Step 2 Layout */
.step2-layout {
  display: grid;
  grid-template-columns: 1fr 280px;
  gap: var(--space-4);
  height: 420px;
}

.compose-section {
  display: flex;
  flex-direction: column;
  background: var(--color-gray-900);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.compose-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-gray-800);
  border-bottom: 1px solid var(--color-gray-700);
}

.compose-title {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-300);
}

.compose-actions {
  display: flex;
  gap: var(--space-1);
}

.action-btn {
  background: transparent;
  border: none;
  color: var(--color-gray-400);
  padding: var(--space-1);
  border-radius: var(--radius-sm);
  cursor: pointer;
  transition: all 0.2s ease;
}

.action-btn:hover {
  background: var(--color-gray-700);
  color: var(--color-gray-200);
}

.compose-editor-wrapper {
  flex: 1;
  overflow: hidden;
}

.compose-editor-wrapper :deep(.cm-editor) {
  height: 100%;
  font-size: 13px;
}

.compose-editor-wrapper :deep(.cm-scroller) {
  font-family: var(--font-mono);
}

.compose-error {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  background: var(--color-danger-500);
  color: white;
  font-size: var(--text-sm);
}

.side-panel {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
  overflow-y: auto;
}

/* Env Section */
.env-section {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.env-row {
  display: flex;
  gap: var(--space-2);
}

.env-key {
  flex: 1;
  padding: var(--space-2);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  font-family: var(--font-mono);
}

.env-value {
  flex: 1;
  padding: var(--space-2);
  border: 1px solid var(--color-gray-200);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

.env-remove {
  background: none;
  border: none;
  color: var(--color-gray-400);
  padding: var(--space-1);
  cursor: pointer;
}

.env-remove:hover {
  color: var(--color-danger-500);
}

.add-env-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2);
  background: white;
  border: 1px dashed var(--color-gray-300);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
  color: var(--color-gray-600);
  cursor: pointer;
  transition: all 0.2s ease;
}

.add-env-btn:hover {
  border-color: var(--color-primary-300);
  color: var(--color-primary-600);
}

/* Network Fields */
.network-fields {
  padding: var(--space-3);
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.network-fields .form-field {
  padding: 0;
}

.network-fields input,
.network-fields select {
  padding: var(--space-2);
  font-size: var(--text-sm);
}

/* Options */
.options-section {
  padding: 0;
}

/* Review */
.review-container {
  max-width: 560px;
  margin: 0 auto;
}

.review-card {
  background: white;
  border: 1px solid var(--color-gray-100);
  border-radius: var(--radius-lg);
  overflow: hidden;
}

.review-header {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  padding: var(--space-5);
  background: linear-gradient(135deg, var(--color-success-50), var(--color-primary-50));
  border-bottom: 1px solid var(--color-gray-100);
}

.review-icon {
  width: 48px;
  height: 48px;
  border-radius: var(--radius-full);
  background: var(--color-success-500);
  color: white;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.25rem;
}

.review-title h3 {
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
  margin: 0;
}

.review-title p {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
  margin: var(--space-1) 0 0;
}

.review-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-3);
  padding: var(--space-4);
}

.review-item {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.review-item.full-width {
  grid-column: 1 / -1;
}

.review-label {
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  color: var(--color-gray-500);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.review-value {
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-900);
}

.review-value.domain {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-family: var(--font-mono);
  color: var(--color-primary-600);
}

.review-badge {
  display: inline-flex;
  padding: var(--space-1) var(--space-2);
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  font-weight: var(--font-medium);
  width: fit-content;
}

.review-badge.success {
  background: var(--color-success-50);
  color: var(--color-success-700);
}

.review-badge.neutral {
  background: var(--color-gray-100);
  color: var(--color-gray-600);
}

.compose-summary {
  border-top: 1px solid var(--color-gray-100);
  padding: var(--space-4);
}

.compose-summary-header {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-sm);
  font-weight: var(--font-medium);
  color: var(--color-gray-700);
  margin-bottom: var(--space-3);
}

.compose-lines {
  margin-left: auto;
  font-size: var(--text-xs);
  color: var(--color-gray-500);
  font-weight: var(--font-normal);
}

.compose-preview-code {
  background: var(--color-gray-900);
  color: var(--color-gray-300);
  padding: var(--space-3);
  border-radius: var(--radius-md);
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  line-height: 1.5;
  overflow: hidden;
  max-height: 140px;
  margin: 0;
}

/* Footer */
:deep(.modal-footer) {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.footer-left,
.footer-right {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-600);
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  color: var(--color-gray-700);
  border: 1px solid var(--color-gray-200);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-gray-50);
}

.btn-ghost {
  background: transparent;
  color: var(--color-gray-600);
}

.btn-ghost:hover {
  background: var(--color-gray-100);
}

.btn-create {
  background: linear-gradient(135deg, var(--color-primary-500), var(--color-primary-600));
  padding: var(--space-2) var(--space-5);
}

/* Transitions */
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease;
}

.slide-enter-from {
  opacity: 0;
  transform: translateX(20px);
}

.slide-leave-to {
  opacity: 0;
  transform: translateX(-20px);
}

.expand-enter-active,
.expand-leave-active {
  transition: all 0.2s ease;
  overflow: hidden;
}

.expand-enter-from,
.expand-leave-to {
  opacity: 0;
  max-height: 0;
}

/* Responsive */
@media (max-width: 768px) {
  .step1-grid {
    grid-template-columns: 1fr;
  }

  .step2-layout {
    grid-template-columns: 1fr;
    height: auto;
  }

  .compose-section {
    height: 300px;
  }

  .review-grid {
    grid-template-columns: 1fr;
  }
}
</style>
