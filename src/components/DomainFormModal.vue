<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="visible" class="modal-overlay" @click.self="!loading && emit('cancel')">
        <div class="domain-form-modal">
          <div class="modal-header">
            <h3>{{ domain ? "Edit Domain" : "Add Domain" }}</h3>
            <button class="close-btn" :disabled="loading" @click="emit('cancel')">
              <i class="pi pi-times" />
            </button>
          </div>

          <form class="modal-body" @submit.prevent="handleSubmit">
            <div class="form-group">
              <label>Domain <span class="required">*</span></label>
              <input v-model="form.domain" type="text" class="form-input" placeholder="api.example.com" required />
              <span class="hint">The primary domain name</span>
            </div>

            <div class="form-row">
              <div class="form-group">
                <label>Service</label>
                <select v-model="form.service" class="form-select">
                  <option value="">Default ({{ deploymentName }})</option>
                  <option v-for="service in services" :key="service.name" :value="service.name">
                    {{ service.name }}
                  </option>
                </select>
              </div>

              <div class="form-group">
                <label>Container Port</label>
                <input
                  v-model.number="form.container_port"
                  type="number"
                  class="form-input"
                  placeholder="80"
                  min="1"
                  max="65535"
                />
              </div>
            </div>

            <div class="form-group">
              <label>Path Prefix</label>
              <input v-model="form.path_prefix" type="text" class="form-input" placeholder="/api/v1" />
              <span class="hint">Optional path prefix (e.g., /api/*)</span>
            </div>

            <div v-if="form.path_prefix" class="form-group checkbox-group">
              <label class="checkbox-label">
                <input v-model="form.strip_prefix" type="checkbox" />
                <span>Strip prefix before proxying</span>
              </label>
              <span class="hint">If enabled, /api/users will be sent to the backend as /users</span>
            </div>

            <div class="form-section">
              <h4>SSL Configuration</h4>

              <div class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input v-model="form.ssl.enabled" type="checkbox" />
                  <span>Enable SSL (HTTPS)</span>
                </label>
              </div>

              <div v-if="form.ssl.enabled" class="form-group checkbox-group">
                <label class="checkbox-label">
                  <input v-model="form.ssl.auto_cert" type="checkbox" />
                  <span>Auto-request Let's Encrypt certificate</span>
                </label>
              </div>
            </div>

            <div class="form-group">
              <label>Domain Aliases</label>
              <div class="aliases-input">
                <div v-for="(alias, index) in form.aliases" :key="index" class="alias-item">
                  <input v-model="form.aliases[index]" type="text" class="form-input" placeholder="www.example.com" />
                  <button type="button" class="remove-btn" @click="removeAlias(index)">
                    <i class="pi pi-times" />
                  </button>
                </div>
                <button type="button" class="btn btn-sm btn-secondary" @click="addAlias">
                  <i class="pi pi-plus" />
                  Add Alias
                </button>
              </div>
              <span class="hint">Additional domain names that should also resolve here</span>
            </div>
          </form>

          <div class="modal-footer">
            <button type="button" class="btn btn-secondary" :disabled="loading" @click="emit('cancel')">Cancel</button>
            <button type="button" class="btn btn-primary" :disabled="loading || !isValid" @click="handleSubmit">
              <i v-if="loading" class="pi pi-spin pi-spinner" />
              {{ domain ? "Update" : "Add Domain" }}
            </button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed, watch } from "vue";
import type { DomainConfig, Service } from "@/types";

const props = defineProps<{
  visible: boolean;
  domain?: DomainConfig | null;
  services: Service[];
  deploymentName: string;
  loading?: boolean;
}>();

const emit = defineEmits<{
  save: [domain: DomainConfig];
  cancel: [];
}>();

const form = ref<{
  domain: string;
  service: string;
  container_port: number;
  path_prefix: string;
  strip_prefix: boolean;
  ssl: { enabled: boolean; auto_cert: boolean };
  aliases: string[];
}>({
  domain: "",
  service: "",
  container_port: 80,
  path_prefix: "",
  strip_prefix: false,
  ssl: { enabled: false, auto_cert: false },
  aliases: [],
});

watch(
  () => props.visible,
  (visible) => {
    if (visible) {
      if (props.domain) {
        form.value = {
          domain: props.domain.domain || "",
          service: props.domain.service || "",
          container_port: props.domain.container_port || 80,
          path_prefix: props.domain.path_prefix || "",
          strip_prefix: props.domain.strip_prefix || false,
          ssl: {
            enabled: props.domain.ssl?.enabled || false,
            auto_cert: props.domain.ssl?.auto_cert || false,
          },
          aliases: [...(props.domain.aliases || [])],
        };
      } else {
        form.value = {
          domain: "",
          service: "",
          container_port: 80,
          path_prefix: "",
          strip_prefix: false,
          ssl: { enabled: false, auto_cert: false },
          aliases: [],
        };
      }
    }
  },
  { immediate: true },
);

const isValid = computed(() => {
  return form.value.domain.trim() !== "";
});

function addAlias() {
  form.value.aliases.push("");
}

function removeAlias(index: number) {
  form.value.aliases.splice(index, 1);
}

function handleSubmit() {
  if (!isValid.value) return;

  const domainData: DomainConfig = {
    id: props.domain?.id || "",
    domain: form.value.domain.trim(),
    service: form.value.service,
    container_port: form.value.container_port || 80,
    path_prefix: form.value.path_prefix.trim() || undefined,
    strip_prefix: form.value.strip_prefix || undefined,
    ssl: form.value.ssl,
    aliases: form.value.aliases.filter((a) => a.trim() !== ""),
  };

  emit("save", domainData);
}
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.domain-form-modal {
  background: white;
  border-radius: var(--radius-md);
  box-shadow: var(--shadow-xl);
  width: 520px;
  max-width: 90vw;
  max-height: 90vh;
  display: flex;
  flex-direction: column;
  animation: slideIn 0.2s ease;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: var(--space-4) var(--space-5);
  border-bottom: 1px solid var(--color-gray-100);
}

.modal-header h3 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
  color: var(--color-gray-900);
}

.close-btn {
  width: 32px;
  height: 32px;
  border: none;
  background: transparent;
  color: var(--color-gray-500);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-btn:hover {
  background: var(--color-gray-100);
  color: var(--color-gray-700);
}

.modal-body {
  padding: var(--space-5);
  overflow-y: auto;
  flex: 1;
}

.form-group {
  margin-bottom: var(--space-4);
}

.form-group label {
  display: block;
  margin-bottom: var(--space-1);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  color: var(--color-gray-700);
}

.required {
  color: var(--color-danger-500);
}

.form-input,
.form-select {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-sm);
  font-size: var(--text-md);
  transition: border-color var(--transition-base);
}

.form-input:focus,
.form-select:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.hint {
  display: block;
  margin-top: var(--space-1);
  font-size: var(--text-xs);
  color: var(--color-gray-500);
}

.form-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: var(--space-4);
}

.form-section {
  margin-top: var(--space-4);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-gray-100);
}

.form-section h4 {
  margin: 0 0 var(--space-3);
  font-size: var(--text-sm);
  font-weight: var(--font-semibold);
  color: var(--color-gray-700);
}

.checkbox-group {
  margin-bottom: var(--space-2);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.checkbox-label input[type="checkbox"] {
  width: 18px;
  height: 18px;
  accent-color: var(--color-primary-500);
}

.checkbox-label span {
  font-weight: normal;
}

.aliases-input {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.alias-item {
  display: flex;
  gap: var(--space-2);
}

.alias-item .form-input {
  flex: 1;
}

.remove-btn {
  width: 36px;
  height: 36px;
  border: 1px solid var(--color-gray-300);
  background: white;
  color: var(--color-gray-500);
  cursor: pointer;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.remove-btn:hover {
  background: var(--color-danger-50);
  border-color: var(--color-danger-300);
  color: var(--color-danger-600);
}

.modal-footer {
  padding: var(--space-4) var(--space-5);
  border-top: 1px solid var(--color-gray-100);
  display: flex;
  justify-content: flex-end;
  gap: var(--space-3);
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-sm);
  font-weight: var(--font-medium);
  font-size: var(--text-md);
  cursor: pointer;
  transition: all var(--transition-base);
  border: none;
}

.btn-sm {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-sm);
}

.btn-secondary {
  background: var(--color-gray-100);
  color: var(--color-gray-700);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-gray-200);
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-600);
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.2s ease;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

@keyframes slideIn {
  from {
    opacity: 0;
    transform: scale(0.95) translateY(-10px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
}
</style>
