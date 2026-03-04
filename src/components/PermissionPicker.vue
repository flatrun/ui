<template>
  <div class="permission-picker">
    <div v-for="group in permissionGroups" :key="group.key" class="permission-group">
      <div class="group-header">
        <label v-if="!readonly" class="checkbox-label group-toggle">
          <input
            type="checkbox"
            :checked="isGroupFullySelected(group)"
            :indeterminate="isGroupPartiallySelected(group)"
            :disabled="readonly"
            @change="toggleGroup(group)"
          />
          <span class="group-name">{{ group.label }}</span>
        </label>
        <span v-else class="group-name">{{ group.label }}</span>
      </div>
      <div class="group-permissions">
        <label
          v-for="perm in group.permissions"
          :key="perm.value"
          class="checkbox-label permission-item"
          :class="{ selected: isSelected(perm.value), readonly }"
        >
          <input
            v-if="!readonly"
            type="checkbox"
            :checked="isSelected(perm.value)"
            @change="togglePermission(perm.value)"
          />
          <span v-else class="readonly-indicator" :class="isSelected(perm.value) ? 'granted' : 'denied'">
            <i :class="isSelected(perm.value) ? 'pi pi-check' : 'pi pi-minus'" />
          </span>
          <span class="perm-label" :class="perm.level">{{ perm.label }}</span>
        </label>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from "vue";
import { useI18n } from "vue-i18n";

interface PermissionEntry {
  value: string;
  label: string;
  level: "read" | "write" | "delete";
}

interface PermissionGroup {
  key: string;
  label: string;
  permissions: PermissionEntry[];
}

const props = defineProps<{
  modelValue: string[];
  readonly?: boolean;
}>();

const emit = defineEmits<{
  "update:modelValue": [value: string[]];
}>();

const { t } = useI18n();

const permissionGroups = computed<PermissionGroup[]>(() => {
  const readLabel = t("permissions.level.read");
  const writeLabel = t("permissions.level.write");
  const deleteLabel = t("permissions.level.delete");

  const rw = (prefix: string): PermissionEntry[] => [
    { value: `${prefix}:read`, label: readLabel, level: "read" },
    { value: `${prefix}:write`, label: writeLabel, level: "write" },
  ];

  const rwd = (prefix: string): PermissionEntry[] => [
    ...rw(prefix),
    { value: `${prefix}:delete`, label: deleteLabel, level: "delete" },
  ];

  return [
    { key: "deployments", label: t("permissions.groups.deployments"), permissions: rwd("deployments") },
    { key: "containers", label: t("permissions.groups.containers"), permissions: rwd("containers") },
    { key: "images", label: t("permissions.groups.images"), permissions: rwd("images") },
    { key: "volumes", label: t("permissions.groups.volumes"), permissions: rwd("volumes") },
    { key: "databases", label: t("permissions.groups.databases"), permissions: rwd("databases") },
    { key: "infrastructure", label: t("permissions.groups.infrastructure"), permissions: rw("infrastructure") },
    { key: "scheduler", label: t("permissions.groups.scheduler"), permissions: rwd("scheduler") },
    { key: "system", label: t("permissions.groups.system"), permissions: rw("system") },
    { key: "dns", label: t("permissions.groups.dns"), permissions: rw("dns") },
    { key: "registries", label: t("permissions.groups.registries"), permissions: rwd("registries") },
    { key: "templates", label: t("permissions.groups.templates"), permissions: rw("templates") },
    { key: "traffic", label: t("permissions.groups.traffic"), permissions: rw("traffic") },
    { key: "networks", label: t("permissions.groups.networks"), permissions: rwd("networks") },
    { key: "certificates", label: t("permissions.groups.certificates"), permissions: rwd("certificates") },
    { key: "security", label: t("permissions.groups.security"), permissions: rw("security") },
    { key: "backups", label: t("permissions.groups.backups"), permissions: rwd("backups") },
    { key: "users", label: t("permissions.groups.users"), permissions: rwd("users") },
    { key: "apikeys", label: t("permissions.groups.apiKeys"), permissions: rwd("apikeys") },
    { key: "settings", label: t("permissions.groups.settings"), permissions: rw("settings") },
    {
      key: "audit",
      label: t("permissions.groups.audit"),
      permissions: [{ value: "audit:read", label: readLabel, level: "read" }],
    },
  ];
});

const selected = computed(() => new Set(props.modelValue));

const isSelected = (perm: string): boolean => selected.value.has(perm);

const isGroupFullySelected = (group: PermissionGroup): boolean => {
  return group.permissions.every((p) => selected.value.has(p.value));
};

const isGroupPartiallySelected = (group: PermissionGroup): boolean => {
  const some = group.permissions.some((p) => selected.value.has(p.value));
  const all = group.permissions.every((p) => selected.value.has(p.value));
  return some && !all;
};

const togglePermission = (perm: string) => {
  const current = [...props.modelValue];
  const idx = current.indexOf(perm);
  if (idx >= 0) {
    current.splice(idx, 1);
  } else {
    current.push(perm);
  }
  emit("update:modelValue", current);
};

const toggleGroup = (group: PermissionGroup) => {
  const current = new Set(props.modelValue);
  const allSelected = group.permissions.every((p) => current.has(p.value));

  if (allSelected) {
    group.permissions.forEach((p) => current.delete(p.value));
  } else {
    group.permissions.forEach((p) => current.add(p.value));
  }
  emit("update:modelValue", [...current]);
};
</script>

<style scoped>
.permission-picker {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.75rem;
}

.permission-group {
  background: var(--surface-ground, #f8fafc);
  border: 1px solid var(--surface-border, #e2e8f0);
  border-radius: 6px;
  padding: 0.625rem 0.75rem;
}

.group-header {
  margin-bottom: 0.375rem;
  padding-bottom: 0.375rem;
  border-bottom: 1px solid var(--surface-border, #e2e8f0);
}

.group-name {
  font-weight: 600;
  font-size: 0.8125rem;
  color: var(--text-primary, #0f172a);
}

.group-permissions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.375rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  cursor: pointer;
  font-size: 0.8125rem;
}

.checkbox-label.readonly {
  cursor: default;
}

.checkbox-label input[type="checkbox"] {
  width: 14px;
  height: 14px;
  cursor: pointer;
  accent-color: var(--primary, #3b82f6);
}

.permission-item {
  padding: 0.125rem 0.375rem;
  border-radius: 4px;
}

.perm-label {
  font-size: 0.75rem;
  font-weight: 500;
}

.perm-label.read {
  color: var(--info, #3b82f6);
}

.perm-label.write {
  color: var(--warning, #f59e0b);
}

.perm-label.delete {
  color: var(--danger, #ef4444);
}

.readonly-indicator {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 16px;
  height: 16px;
  border-radius: 3px;
  font-size: 0.625rem;
}

.readonly-indicator.granted {
  background: rgba(34, 197, 94, 0.15);
  color: #16a34a;
}

.readonly-indicator.denied {
  background: rgba(148, 163, 184, 0.15);
  color: #94a3b8;
}
</style>
