<template>
  <Teleport to="body">
    <div class="modal-overlay" @click.self="emit('cancel')">
      <div class="modal-dialog">
        <div class="modal-header">
          <h3>{{ panel ? "Edit panel" : "Add panel" }}</h3>
          <button class="icon-btn" @click="emit('cancel')"><Icon name="x" :size="16" /></button>
        </div>

        <div class="modal-body">
          <div class="form-group">
            <label>Title</label>
            <input v-model="form.title" type="text" class="form-input" placeholder="CPU usage" />
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Source</label>
              <select v-model="form.source" class="form-input" @change="onSourceChange">
                <option value="container">Container metrics</option>
                <option value="serving">Serving (proxy)</option>
              </select>
            </div>
            <div class="form-group">
              <label>Metric</label>
              <select v-model="form.series" class="form-input">
                <option v-for="opt in seriesOptions" :key="opt.value" :value="opt.value">{{ opt.label }}</option>
              </select>
            </div>
          </div>

          <div class="form-group">
            <label>Deployment {{ form.source === "serving" ? "(required)" : "(optional, all if empty)" }}</label>
            <select v-model="form.deployment" class="form-input">
              <option value="">{{ form.source === "serving" ? "Select a deployment" : "All deployments" }}</option>
              <option v-for="d in deployments" :key="d" :value="d">{{ d }}</option>
            </select>
          </div>

          <div class="form-row">
            <div class="form-group">
              <label>Visualization</label>
              <select v-model="form.type" class="form-input">
                <option value="line">Line chart</option>
                <option value="stat">Single stat</option>
              </select>
            </div>
            <div class="form-group">
              <label>Width (of 12)</label>
              <input v-model.number="form.width" type="number" min="1" max="12" class="form-input" />
            </div>
          </div>

          <p v-if="validationError" class="form-error">{{ validationError }}</p>
        </div>

        <div class="modal-footer">
          <button class="btn btn-secondary" @click="emit('cancel')">Cancel</button>
          <button class="btn btn-primary" :disabled="!!validationError" @click="save">Save panel</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup lang="ts">
import { ref, computed } from "vue";
import Icon from "@/components/base/Icon.vue";
import type { DashboardPanel } from "@/services/api";

const props = defineProps<{
  panel?: DashboardPanel | null;
  deployments: string[];
}>();

const emit = defineEmits<{ save: [panel: DashboardPanel]; cancel: [] }>();

const containerSeries = [
  { value: "container.cpu.usage", label: "CPU usage" },
  { value: "container.memory.usage", label: "Memory usage" },
  { value: "container.memory.limit", label: "Memory limit" },
  { value: "container.network.io.rx", label: "Network in" },
  { value: "container.network.io.tx", label: "Network out" },
];
const servingSeries = [
  { value: "requests", label: "Requests" },
  { value: "errors", label: "Errors" },
  { value: "latency", label: "Latency" },
];

const form = ref<DashboardPanel>({
  id: props.panel?.id,
  title: props.panel?.title ?? "",
  source: props.panel?.source ?? "container",
  series: props.panel?.series ?? "container.cpu.usage",
  deployment: props.panel?.deployment ?? "",
  type: props.panel?.type ?? "line",
  width: props.panel?.width ?? 6,
});

const seriesOptions = computed(() => (form.value.source === "serving" ? servingSeries : containerSeries));

function onSourceChange() {
  // Keep series valid for the chosen source.
  form.value.series = seriesOptions.value[0].value;
}

const validationError = computed(() => {
  if (!form.value.title.trim()) return "A title is required.";
  if (form.value.source === "serving" && !form.value.deployment) return "A serving panel needs a deployment.";
  if (form.value.width < 1 || form.value.width > 12) return "Width must be between 1 and 12.";
  return "";
});

function save() {
  if (validationError.value) return;
  emit("save", { ...form.value, title: form.value.title.trim() });
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
  padding: 1rem;
}
.modal-dialog {
  background: var(--surface-raised);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  width: 100%;
  max-width: 520px;
}
.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid var(--border);
}
.modal-header h3 {
  margin: 0;
  font-size: 1rem;
}
.modal-body {
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 1rem;
}
.form-row {
  display: flex;
  gap: 1rem;
}
.form-row .form-group {
  flex: 1;
}
.form-group {
  display: flex;
  flex-direction: column;
  gap: 0.375rem;
}
.form-group label {
  font-size: 0.8rem;
  color: var(--text-muted);
}
.form-input {
  padding: 0.5rem 0.75rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  background: var(--surface-inset);
  color: var(--text);
  font-size: 0.875rem;
}
.form-error {
  margin: 0;
  color: var(--danger, #ef4444);
  font-size: 0.8rem;
}
.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1rem 1.25rem;
  border-top: 1px solid var(--border);
}
.icon-btn {
  display: inline-flex;
  padding: 0.25rem;
  border: none;
  background: transparent;
  color: var(--text-muted);
  cursor: pointer;
}
</style>
