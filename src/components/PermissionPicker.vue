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

const permissionGroups: PermissionGroup[] = [
  {
    key: "deployments",
    label: "Deployments",
    permissions: [
      { value: "deployments:read", label: "Read", level: "read" },
      { value: "deployments:write", label: "Write", level: "write" },
      { value: "deployments:delete", label: "Delete", level: "delete" },
    ],
  },
  {
    key: "containers",
    label: "Containers",
    permissions: [
      { value: "containers:read", label: "Read", level: "read" },
      { value: "containers:write", label: "Write", level: "write" },
      { value: "containers:delete", label: "Delete", level: "delete" },
    ],
  },
  {
    key: "images",
    label: "Images",
    permissions: [
      { value: "images:read", label: "Read", level: "read" },
      { value: "images:write", label: "Write", level: "write" },
      { value: "images:delete", label: "Delete", level: "delete" },
    ],
  },
  {
    key: "volumes",
    label: "Volumes",
    permissions: [
      { value: "volumes:read", label: "Read", level: "read" },
      { value: "volumes:write", label: "Write", level: "write" },
      { value: "volumes:delete", label: "Delete", level: "delete" },
    ],
  },
  {
    key: "databases",
    label: "Databases",
    permissions: [
      { value: "databases:read", label: "Read", level: "read" },
      { value: "databases:write", label: "Write", level: "write" },
      { value: "databases:delete", label: "Delete", level: "delete" },
    ],
  },
  {
    key: "infrastructure",
    label: "Infrastructure",
    permissions: [
      { value: "infrastructure:read", label: "Read", level: "read" },
      { value: "infrastructure:write", label: "Write", level: "write" },
    ],
  },
  {
    key: "scheduler",
    label: "Scheduler",
    permissions: [
      { value: "scheduler:read", label: "Read", level: "read" },
      { value: "scheduler:write", label: "Write", level: "write" },
      { value: "scheduler:delete", label: "Delete", level: "delete" },
    ],
  },
  {
    key: "system",
    label: "System",
    permissions: [
      { value: "system:read", label: "Read", level: "read" },
      { value: "system:write", label: "Write", level: "write" },
    ],
  },
  {
    key: "dns",
    label: "DNS",
    permissions: [
      { value: "dns:read", label: "Read", level: "read" },
      { value: "dns:write", label: "Write", level: "write" },
    ],
  },
  {
    key: "registries",
    label: "Registries",
    permissions: [
      { value: "registries:read", label: "Read", level: "read" },
      { value: "registries:write", label: "Write", level: "write" },
      { value: "registries:delete", label: "Delete", level: "delete" },
    ],
  },
  {
    key: "templates",
    label: "Templates",
    permissions: [
      { value: "templates:read", label: "Read", level: "read" },
      { value: "templates:write", label: "Write", level: "write" },
    ],
  },
  {
    key: "traffic",
    label: "Traffic",
    permissions: [
      { value: "traffic:read", label: "Read", level: "read" },
      { value: "traffic:write", label: "Write", level: "write" },
    ],
  },
  {
    key: "networks",
    label: "Networks",
    permissions: [
      { value: "networks:read", label: "Read", level: "read" },
      { value: "networks:write", label: "Write", level: "write" },
      { value: "networks:delete", label: "Delete", level: "delete" },
    ],
  },
  {
    key: "certificates",
    label: "Certificates",
    permissions: [
      { value: "certificates:read", label: "Read", level: "read" },
      { value: "certificates:write", label: "Write", level: "write" },
      { value: "certificates:delete", label: "Delete", level: "delete" },
    ],
  },
  {
    key: "security",
    label: "Security",
    permissions: [
      { value: "security:read", label: "Read", level: "read" },
      { value: "security:write", label: "Write", level: "write" },
    ],
  },
  {
    key: "backups",
    label: "Backups",
    permissions: [
      { value: "backups:read", label: "Read", level: "read" },
      { value: "backups:write", label: "Write", level: "write" },
      { value: "backups:delete", label: "Delete", level: "delete" },
    ],
  },
  {
    key: "users",
    label: "Users",
    permissions: [
      { value: "users:read", label: "Read", level: "read" },
      { value: "users:write", label: "Write", level: "write" },
      { value: "users:delete", label: "Delete", level: "delete" },
    ],
  },
  {
    key: "apikeys",
    label: "API Keys",
    permissions: [
      { value: "apikeys:read", label: "Read", level: "read" },
      { value: "apikeys:write", label: "Write", level: "write" },
      { value: "apikeys:delete", label: "Delete", level: "delete" },
    ],
  },
  {
    key: "settings",
    label: "Settings",
    permissions: [
      { value: "settings:read", label: "Read", level: "read" },
      { value: "settings:write", label: "Write", level: "write" },
    ],
  },
  {
    key: "audit",
    label: "Audit",
    permissions: [{ value: "audit:read", label: "Read", level: "read" }],
  },
];

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
