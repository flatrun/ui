<template>
  <div class="cron-jobs-view">
    <div class="view-header">
      <div class="header-left">
        <h2>{{ t("cronJobs.title") }}</h2>
        <p class="subtitle">{{ t("cronJobs.subtitle") }}</p>
      </div>
      <div class="header-actions">
        <button v-if="canWrite" class="btn btn-primary" @click="openCreateModal">
          <i class="pi pi-plus" />
          {{ t("cronJobs.actions.newCronJob") }}
        </button>
        <button class="btn btn-icon" :disabled="loading" @click="fetchTasks">
          <i class="pi pi-refresh" :class="{ 'pi-spin': loading }" />
        </button>
      </div>
    </div>

    <div v-if="tasks.length > 0 || searchQuery || filterDeployment || filterType" class="filters-bar">
      <div class="search-box">
        <i class="pi pi-search" />
        <input v-model="searchQuery" type="text" :placeholder="t('cronJobs.filters.searchPlaceholder')" />
      </div>
      <select v-model="filterDeployment" class="filter-select">
        <option value="">{{ t("cronJobs.filters.allDeployments") }}</option>
        <option v-for="dep in uniqueDeployments" :key="dep" :value="dep">
          {{ dep }}
        </option>
      </select>
      <select v-model="filterType" class="filter-select">
        <option value="">{{ t("cronJobs.filters.allTypes") }}</option>
        <option value="command">{{ t("cronJobs.type.command") }}</option>
        <option value="backup">{{ t("cronJobs.type.backup") }}</option>
      </select>
      <div class="filter-summary">
        <template v-if="filteredTasks.length !== tasks.length">
          {{ t("cronJobs.filters.matchingOfTotal", { matching: filteredTasks.length, total: tasks.length }) }}
        </template>
        <template v-else> {{ t("cronJobs.filters.totalTasks", { count: tasks.length }) }} </template>
      </div>
    </div>

    <div v-if="loading && tasks.length === 0" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      <span>{{ t("cronJobs.loading") }}</span>
    </div>

    <div v-else-if="tasks.length === 0" class="empty-state">
      <i class="pi pi-clock" />
      <h3>{{ t("cronJobs.empty.title") }}</h3>
      <p>{{ t("cronJobs.empty.text") }}</p>
      <button v-if="canWrite" class="btn btn-primary" @click="openCreateModal">
        <i class="pi pi-plus" />
        {{ t("cronJobs.empty.createFirst") }}
      </button>
    </div>

    <div v-else-if="filteredTasks.length === 0 && (searchQuery || filterDeployment || filterType)" class="empty-state">
      <i class="pi pi-filter-slash" />
      <h3>{{ t("cronJobs.empty.noMatchingTitle") }}</h3>
      <p>{{ t("cronJobs.empty.noMatchingText") }}</p>
      <button class="btn btn-secondary" @click="clearFilters">{{ t("cronJobs.actions.clearFilters") }}</button>
    </div>

    <div v-else class="tasks-grid">
      <div v-for="task in paginatedTasks" :key="task.id" class="task-card" :class="{ disabled: !task.enabled }">
        <div class="task-header">
          <div class="task-type" :class="task.type">
            <i :class="task.type === 'backup' ? 'pi pi-database' : 'pi pi-code'" />
            {{ formatTaskType(task.type) }}
          </div>
          <div class="task-toggle">
            <label class="switch">
              <input
                type="checkbox"
                :checked="task.enabled"
                :disabled="!canWrite || togglingTask === task.id"
                @change="toggleTask(task)"
              />
              <span class="slider" />
            </label>
          </div>
        </div>

        <div class="task-body">
          <h3 class="task-name">{{ task.name }}</h3>
          <div class="task-deployment">
            <i class="pi pi-box" />
            {{ task.deployment_name }}
          </div>

          <div class="task-schedule">
            <i class="pi pi-clock" />
            <code>{{ task.cron_expr }}</code>
            <span class="cron-human">{{ cronToHuman(task.cron_expr) }}</span>
          </div>

          <div v-if="task.type === 'command' && task.config.command_config" class="task-command">
            <div class="command-label">{{ t("cronJobs.field.command") }}:</div>
            <code class="command-value">{{ task.config.command_config.command }}</code>
            <div v-if="task.config.command_config.service" class="command-service">
              {{ t("cronJobs.field.service") }}: {{ task.config.command_config.service }}
            </div>
          </div>

          <div class="task-timing">
            <div v-if="task.last_run" class="timing-item">
              <span class="timing-label">{{ t("cronJobs.field.lastRun") }}:</span>
              <span class="timing-value">{{ formatDate(task.last_run) }}</span>
            </div>
            <div v-if="task.next_run && task.enabled" class="timing-item">
              <span class="timing-label">{{ t("cronJobs.field.nextRun") }}:</span>
              <span class="timing-value">{{ formatDate(task.next_run) }}</span>
            </div>
          </div>
        </div>

        <div class="task-footer">
          <button
            v-if="canWrite"
            class="btn btn-sm btn-secondary"
            :disabled="runningTask === task.id"
            @click="runTaskNow(task)"
          >
            <i :class="runningTask === task.id ? 'pi pi-spin pi-spinner' : 'pi pi-play'" />
            {{ t("cronJobs.actions.runNow") }}
          </button>
          <button class="btn btn-sm btn-secondary" @click="viewExecutions(task)">
            <i class="pi pi-history" />
            {{ t("cronJobs.actions.history") }}
          </button>
          <button v-if="canWrite" class="btn btn-sm btn-secondary" @click="openEditModal(task)">
            <i class="pi pi-pencil" />
          </button>
          <button v-if="canDelete" class="btn btn-sm btn-danger" @click="confirmDelete(task)">
            <i class="pi pi-trash" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="totalPages > 1" class="pagination">
      <button class="pagination-btn" :disabled="currentPage === 1" @click="goToPage(1)">
        <i class="pi pi-angle-double-left" />
      </button>
      <button class="pagination-btn" :disabled="currentPage === 1" @click="goToPage(currentPage - 1)">
        <i class="pi pi-angle-left" />
      </button>

      <template v-for="page in visiblePages" :key="page">
        <span v-if="page === '...'" class="pagination-ellipsis">...</span>
        <button
          v-else
          class="pagination-btn"
          :class="{ active: currentPage === page }"
          @click="goToPage(page as number)"
        >
          {{ page }}
        </button>
      </template>

      <button class="pagination-btn" :disabled="currentPage === totalPages" @click="goToPage(currentPage + 1)">
        <i class="pi pi-angle-right" />
      </button>
      <button class="pagination-btn" :disabled="currentPage === totalPages" @click="goToPage(totalPages)">
        <i class="pi pi-angle-double-right" />
      </button>

      <span class="pagination-info">
        {{ t("cronJobs.pagination.pageOf", { page: currentPage, total: totalPages }) }}
      </span>
    </div>

    <div v-if="recentExecutions.length > 0" class="recent-executions">
      <h3>{{ t("cronJobs.recentExecutions.title") }}</h3>
      <div class="executions-list">
        <div v-for="exec in recentExecutions" :key="exec.id" class="execution-item" :class="exec.status">
          <div class="exec-status">
            <i :class="statusIcon(exec.status)" />
          </div>
          <div class="exec-info">
            <span class="exec-task">{{ getTaskName(exec.task_id) }}</span>
            <span class="exec-time">{{ formatDate(exec.started_at) }}</span>
          </div>
          <div class="exec-duration">
            {{ exec.duration_ms ? `${(exec.duration_ms / 1000).toFixed(1)}s` : "-" }}
          </div>
          <button class="btn btn-sm btn-icon" @click="viewExecutionOutput(exec)">
            <i class="pi pi-eye" />
          </button>
        </div>
      </div>
    </div>

    <!-- Create/Edit Modal -->
    <Teleport to="body">
      <div v-if="showModal" class="modal-overlay" @click.self="closeModal">
        <div class="modal-container">
          <div class="modal-header">
            <h3>
              <i class="pi pi-clock" />
              {{ editingTask ? t("cronJobs.modal.form.editTitle") : t("cronJobs.modal.form.createTitle") }}
            </h3>
            <button class="close-btn" @click="closeModal">
              <i class="pi pi-times" />
            </button>
          </div>

          <div class="modal-body">
            <div class="form-group">
              <label for="name">{{ t("cronJobs.modal.form.name") }}</label>
              <input
                id="name"
                v-model="form.name"
                type="text"
                :placeholder="t('cronJobs.modal.form.namePlaceholder')"
                :disabled="saving"
              />
            </div>

            <div class="form-group">
              <label for="deployment">{{ t("cronJobs.modal.form.deployment") }}</label>
              <select id="deployment" v-model="form.deployment_name" :disabled="saving || !!editingTask">
                <option value="">{{ t("cronJobs.modal.form.selectDeployment") }}</option>
                <option v-for="dep in deployments" :key="dep.name" :value="dep.name">
                  {{ dep.name }}
                </option>
              </select>
            </div>

            <div class="form-group">
              <label for="cron">{{ t("cronJobs.modal.form.schedule") }}</label>
              <input
                id="cron"
                v-model="form.cron_expr"
                type="text"
                :placeholder="t('cronJobs.modal.form.cronPlaceholder')"
                :disabled="saving"
              />
              <span class="hint">
                {{ form.cron_expr ? cronToHuman(form.cron_expr) : t("cronJobs.modal.form.cronHintExample") }}
              </span>
            </div>

            <div class="form-group">
              <label for="service">{{ t("cronJobs.modal.form.serviceOptional") }}</label>
              <input
                id="service"
                v-model="form.service"
                type="text"
                :placeholder="t('cronJobs.modal.form.servicePlaceholder')"
                :disabled="saving"
              />
              <span class="hint">{{ t("cronJobs.modal.form.serviceHint") }}</span>
            </div>

            <div class="form-group">
              <label for="command">{{ t("cronJobs.modal.form.command") }}</label>
              <textarea
                id="command"
                v-model="form.command"
                rows="3"
                :placeholder="t('cronJobs.modal.form.commandPlaceholder')"
                :disabled="saving"
              />
            </div>

            <div class="form-group">
              <label for="timeout">{{ t("cronJobs.modal.form.timeoutSeconds") }}</label>
              <input id="timeout" v-model.number="form.timeout" type="number" min="1" max="3600" :disabled="saving" />
            </div>

            <div class="form-group checkbox-group">
              <label class="checkbox-label">
                <input v-model="form.enabled" type="checkbox" :disabled="saving" />
                <span>{{ t("cronJobs.modal.form.enableTask") }}</span>
              </label>
            </div>
          </div>

          <div class="modal-footer">
            <button class="btn btn-secondary" :disabled="saving" @click="closeModal">
              {{ t("cronJobs.actions.cancel") }}
            </button>
            <button class="btn btn-primary" :disabled="saving || !isFormValid" @click="saveTask">
              <i v-if="saving" class="pi pi-spin pi-spinner" />
              {{
                saving
                  ? t("cronJobs.actions.saving")
                  : editingTask
                    ? t("cronJobs.actions.update")
                    : t("cronJobs.actions.create")
              }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Execution Output Modal -->
    <Teleport to="body">
      <div v-if="showOutputModal" class="modal-overlay" @click.self="showOutputModal = false">
        <div class="modal-container modal-wide">
          <div class="modal-header">
            <h3>
              <i class="pi pi-file-export" />
              {{ t("cronJobs.modal.output.title") }}
            </h3>
            <button class="close-btn" @click="showOutputModal = false">
              <i class="pi pi-times" />
            </button>
          </div>

          <div class="modal-body">
            <div v-if="selectedExecution" class="execution-details">
              <div class="exec-meta">
                <span class="exec-status-badge" :class="selectedExecution.status">
                  {{ formatExecutionStatus(selectedExecution.status) }}
                </span>
                <span>{{ t("cronJobs.modal.output.started") }}: {{ formatDate(selectedExecution.started_at) }}</span>
                <span v-if="selectedExecution.ended_at">
                  {{ t("cronJobs.modal.output.ended") }}: {{ formatDate(selectedExecution.ended_at) }}
                </span>
                <span v-if="selectedExecution.duration_ms">
                  {{ t("cronJobs.modal.output.duration") }}: {{ (selectedExecution.duration_ms / 1000).toFixed(2) }}s
                </span>
              </div>
              <div v-if="selectedExecution.output" class="output-block">
                <h4>{{ t("cronJobs.modal.output.output") }}</h4>
                <pre>{{ selectedExecution.output }}</pre>
              </div>
              <div v-if="selectedExecution.error" class="error-block">
                <h4>{{ t("cronJobs.modal.output.error") }}</h4>
                <pre>{{ selectedExecution.error }}</pre>
              </div>
              <div v-if="!selectedExecution.output && !selectedExecution.error" class="no-output">
                {{ t("cronJobs.modal.output.noOutput") }}
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Execution History Modal -->
    <Teleport to="body">
      <div v-if="showHistoryModal" class="modal-overlay" @click.self="showHistoryModal = false">
        <div class="modal-container modal-wide">
          <div class="modal-header">
            <h3>
              <i class="pi pi-history" />
              {{ t("cronJobs.modal.history.title") }}: {{ selectedTask?.name }}
            </h3>
            <button class="close-btn" @click="showHistoryModal = false">
              <i class="pi pi-times" />
            </button>
          </div>

          <div class="modal-body">
            <div v-if="taskExecutions.length === 0" class="no-history">{{ t("cronJobs.modal.history.noHistory") }}</div>
            <div v-else class="history-list">
              <div v-for="exec in taskExecutions" :key="exec.id" class="history-item" :class="exec.status">
                <div class="history-status">
                  <i :class="statusIcon(exec.status)" />
                  <span>{{ formatExecutionStatus(exec.status) }}</span>
                </div>
                <div class="history-time">
                  {{ formatDate(exec.started_at) }}
                </div>
                <div class="history-duration">
                  {{ exec.duration_ms ? `${(exec.duration_ms / 1000).toFixed(1)}s` : "-" }}
                </div>
                <button class="btn btn-sm btn-icon" @click="viewExecutionOutput(exec)">
                  <i class="pi pi-eye" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Teleport>

    <ConfirmModal
      :visible="showDeleteModal"
      :title="t('cronJobs.modal.delete.title')"
      :message="t('cronJobs.modal.delete.message', { name: taskToDelete?.name || '' })"
      :warning="t('cronJobs.modal.delete.warning')"
      variant="danger"
      :confirm-text="t('cronJobs.modal.delete.confirm')"
      :loading="deleting"
      @confirm="deleteTask"
      @cancel="showDeleteModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from "vue";
import { useI18n } from "vue-i18n";
import { schedulerApi, deploymentsApi } from "@/services/api";
import type { ScheduledTask, TaskExecution } from "@/services/api";
import type { Deployment, Service } from "@/types";
import { useNotificationsStore } from "@/stores/notifications";
import { useAuthStore } from "@/stores/auth";
import ConfirmModal from "@/components/ConfirmModal.vue";

const PAGE_SIZE = 12;
const RECENT_EXECUTIONS_LIMIT = 10;
const TASK_HISTORY_LIMIT = 50;

const authStore = useAuthStore();
const canWrite = authStore.hasPermission("scheduler:write");
const canDelete = authStore.hasPermission("scheduler:delete");
const notifications = useNotificationsStore();
const { t, te, locale } = useI18n();

const tasks = ref<ScheduledTask[]>([]);
const deployments = ref<Deployment[]>([]);
const recentExecutions = ref<TaskExecution[]>([]);
const taskExecutions = ref<TaskExecution[]>([]);
const loading = ref(false);

const searchQuery = ref("");
const filterDeployment = ref("");
const filterType = ref("");
const currentPage = ref(1);
const pageSize = ref(PAGE_SIZE);

const uniqueDeployments = computed(() => {
  const deps = new Set(tasks.value.map((t) => t.deployment_name));
  return Array.from(deps).sort();
});

const filteredTasks = computed(() => {
  let result = tasks.value;

  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase();
    result = result.filter(
      (t) =>
        t.name.toLowerCase().includes(query) ||
        t.deployment_name.toLowerCase().includes(query) ||
        t.cron_expr.includes(query) ||
        (t.config.command_config?.command || "").toLowerCase().includes(query),
    );
  }

  if (filterDeployment.value) {
    result = result.filter((t) => t.deployment_name === filterDeployment.value);
  }

  if (filterType.value) {
    result = result.filter((t) => t.type === filterType.value);
  }

  return result;
});

const totalPages = computed(() => Math.ceil(filteredTasks.value.length / pageSize.value));

const paginatedTasks = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredTasks.value.slice(start, start + pageSize.value);
});

const visiblePages = computed(() => {
  const pages: (number | string)[] = [];
  const total = totalPages.value;
  const current = currentPage.value;

  if (total <= 7) {
    for (let i = 1; i <= total; i++) pages.push(i);
  } else {
    pages.push(1);
    if (current > 3) pages.push("...");

    const start = Math.max(2, current - 1);
    const end = Math.min(total - 1, current + 1);

    for (let i = start; i <= end; i++) pages.push(i);

    if (current < total - 2) pages.push("...");
    pages.push(total);
  }

  return pages;
});

watch([searchQuery, filterDeployment, filterType], () => {
  currentPage.value = 1;
});

const clearFilters = () => {
  searchQuery.value = "";
  filterDeployment.value = "";
  filterType.value = "";
  currentPage.value = 1;
};

const goToPage = (page: number) => {
  if (page >= 1 && page <= totalPages.value) {
    currentPage.value = page;
  }
};
const saving = ref(false);
const deleting = ref(false);
const runningTask = ref<number | null>(null);
const togglingTask = ref<number | null>(null);

const showModal = ref(false);
const showDeleteModal = ref(false);
const showOutputModal = ref(false);
const showHistoryModal = ref(false);

const editingTask = ref<ScheduledTask | null>(null);
const taskToDelete = ref<ScheduledTask | null>(null);
const selectedExecution = ref<TaskExecution | null>(null);
const selectedTask = ref<ScheduledTask | null>(null);

interface CronJobForm {
  name: string;
  deployment_name: string;
  cron_expr: string;
  service: string;
  command: string;
  timeout: number;
  enabled: boolean;
}

const defaultForm = (): CronJobForm => ({
  name: "",
  deployment_name: "",
  cron_expr: "",
  service: "",
  command: "",
  timeout: 300,
  enabled: true,
});

const form = ref<CronJobForm>(defaultForm());
const deploymentServices = ref<Service[]>([]);
const loadingServices = ref(false);

const fetchDeploymentServices = async (deploymentName: string) => {
  if (!deploymentName) {
    deploymentServices.value = [];
    return;
  }
  loadingServices.value = true;
  try {
    const response = await deploymentsApi.getServices(deploymentName);
    deploymentServices.value = response.data.services || [];
  } catch {
    deploymentServices.value = [];
  } finally {
    loadingServices.value = false;
  }
};

watch(
  () => form.value.deployment_name,
  (name, oldName) => {
    if (oldName) {
      form.value.service = "";
    }
    fetchDeploymentServices(name);
  },
);

const isFormValid = computed(() => {
  return Boolean(
    form.value.name.trim() && form.value.deployment_name && form.value.cron_expr.trim() && form.value.command.trim(),
  );
});

const fetchTasks = async () => {
  loading.value = true;
  try {
    const [tasksRes, execsRes] = await Promise.all([
      schedulerApi.listTasks(),
      schedulerApi.getRecentExecutions(RECENT_EXECUTIONS_LIMIT),
    ]);
    tasks.value = tasksRes.data.tasks || [];
    recentExecutions.value = execsRes.data.executions || [];
  } catch (e: any) {
    notifications.error(t("common.error"), t("cronJobs.notifications.loadFailed"));
  } finally {
    loading.value = false;
  }
};

const fetchDeployments = async () => {
  try {
    const response = await deploymentsApi.list();
    deployments.value = response.data.deployments || [];
  } catch {
    deployments.value = [];
  }
};

const openCreateModal = () => {
  editingTask.value = null;
  form.value = defaultForm();
  showModal.value = true;
};

const openEditModal = (task: ScheduledTask) => {
  editingTask.value = task;
  form.value = {
    name: task.name,
    deployment_name: task.deployment_name,
    cron_expr: task.cron_expr,
    service: task.config.command_config?.service || "",
    command: task.config.command_config?.command || "",
    timeout: task.config.command_config?.timeout || 300,
    enabled: task.enabled,
  };
  showModal.value = true;
};

const closeModal = () => {
  showModal.value = false;
  editingTask.value = null;
  form.value = defaultForm();
};

const saveTask = async () => {
  if (!isFormValid.value) return;

  saving.value = true;
  try {
    const data = {
      name: form.value.name,
      type: "command" as const,
      deployment_name: form.value.deployment_name,
      cron_expr: form.value.cron_expr,
      enabled: form.value.enabled,
      config: {
        command_config: {
          service: form.value.service || "",
          command: form.value.command,
          timeout: form.value.timeout,
        },
      },
    };

    if (editingTask.value) {
      await schedulerApi.updateTask(editingTask.value.id, {
        name: data.name,
        cron_expr: data.cron_expr,
        enabled: data.enabled,
        config: data.config,
      });
      notifications.success(
        t("cronJobs.notifications.taskUpdatedTitle"),
        t("cronJobs.notifications.taskUpdatedDesc", { name: data.name }),
      );
    } else {
      await schedulerApi.createTask(data);
      notifications.success(
        t("cronJobs.notifications.taskCreatedTitle"),
        t("cronJobs.notifications.taskCreatedDesc", { name: data.name }),
      );
    }

    closeModal();
    await fetchTasks();
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message;
    notifications.error(t("common.error"), msg);
  } finally {
    saving.value = false;
  }
};

const toggleTask = async (task: ScheduledTask) => {
  togglingTask.value = task.id;
  try {
    await schedulerApi.updateTask(task.id, { enabled: !task.enabled });
    await fetchTasks();
  } catch (e: any) {
    notifications.error(t("common.error"), t("cronJobs.notifications.toggleFailed"));
  } finally {
    togglingTask.value = null;
  }
};

const runTaskNow = async (task: ScheduledTask) => {
  runningTask.value = task.id;
  try {
    await schedulerApi.runTaskNow(task.id);
    notifications.success(
      t("cronJobs.notifications.taskStartedTitle"),
      t("cronJobs.notifications.taskStartedDesc", { name: task.name }),
    );
    setTimeout(() => fetchTasks(), 2000);
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message;
    notifications.error(t("common.error"), msg);
  } finally {
    runningTask.value = null;
  }
};

const confirmDelete = (task: ScheduledTask) => {
  taskToDelete.value = task;
  showDeleteModal.value = true;
};

const deleteTask = async () => {
  if (!taskToDelete.value) return;

  deleting.value = true;
  try {
    await schedulerApi.deleteTask(taskToDelete.value.id);
    notifications.success(
      t("cronJobs.notifications.taskDeletedTitle"),
      t("cronJobs.notifications.taskDeletedDesc", { name: taskToDelete.value.name }),
    );
    showDeleteModal.value = false;
    taskToDelete.value = null;
    await fetchTasks();
  } catch (e: any) {
    const msg = e.response?.data?.error || e.message;
    notifications.error(t("common.error"), msg);
  } finally {
    deleting.value = false;
  }
};

const viewExecutions = async (task: ScheduledTask) => {
  selectedTask.value = task;
  showHistoryModal.value = true;
  try {
    const response = await schedulerApi.getTaskExecutions(task.id, TASK_HISTORY_LIMIT);
    taskExecutions.value = response.data.executions || [];
  } catch {
    taskExecutions.value = [];
  }
};

const viewExecutionOutput = (exec: TaskExecution) => {
  selectedExecution.value = exec;
  showOutputModal.value = true;
};

const getTaskName = (taskId: number): string => {
  const task = tasks.value.find((t) => t.id === taskId);
  return task?.name || t("cronJobs.value.taskNumber", { id: taskId });
};

const normalizeToken = (value?: string) =>
  (value || "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");

const formatTaskType = (type?: string) => {
  const normalized = normalizeToken(type);
  const key = `cronJobs.type.${normalized}`;
  if (te(key)) return t(key);
  return type || t("common.na");
};

const formatExecutionStatus = (status?: string) => {
  const normalized = normalizeToken(status);
  const key = `cronJobs.execution.status.${normalized}`;
  if (te(key)) return t(key);
  return status || t("common.na");
};

const statusIcon = (status: string) => {
  switch (status) {
    case "completed":
      return "pi pi-check-circle";
    case "failed":
      return "pi pi-times-circle";
    case "running":
      return "pi pi-spin pi-spinner";
    default:
      return "pi pi-clock";
  }
};

const cronToHuman = (expr: string): string => {
  const parts = expr.split(" ");
  if (parts.length !== 5) return t("cronJobs.cron.invalid");

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts;

  if (minute === "0" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return t("cronJobs.cron.everyHour");
  }
  if (minute === "*" && hour === "*" && dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    return t("cronJobs.cron.everyMinute");
  }
  if (dayOfMonth === "*" && month === "*" && dayOfWeek === "*") {
    if (minute !== "*" && hour !== "*") {
      return t("cronJobs.cron.dailyAt", { time: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}` });
    }
    if (minute !== "*" && hour === "*") {
      return t("cronJobs.cron.hourlyAtMinute", { minute });
    }
  }
  if (dayOfWeek === "0" && dayOfMonth === "*" && month === "*") {
    return t("cronJobs.cron.weeklyOnSundayAt", { time: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}` });
  }
  if (dayOfMonth === "1" && month === "*" && dayOfWeek === "*") {
    return t("cronJobs.cron.monthlyOnFirstAt", { time: `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}` });
  }

  return expr;
};

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleString(locale.value, {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
};

onMounted(() => {
  fetchTasks();
  fetchDeployments();
});
</script>

<style scoped>
.cron-jobs-view {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.view-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.header-left h2 {
  font-size: 1.5rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0;
}

.subtitle {
  font-size: 0.875rem;
  color: #6b7280;
  margin: 0.25rem 0 0;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
}

.filters-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  padding: 1rem;
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
}

.search-box {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem 0.75rem;
  background: #f9fafb;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-sm);
  flex: 1;
  min-width: 200px;
  max-width: 300px;
}

.search-box i {
  color: #9ca3af;
}

.search-box input {
  border: none;
  background: none;
  outline: none;
  flex: 1;
  font-size: 0.875rem;
}

.filter-select {
  padding: 0.5rem 0.75rem;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  background: white;
  min-width: 150px;
}

.filter-select:focus {
  outline: none;
  border-color: #6366f1;
}

.filter-summary {
  margin-left: auto;
  font-size: 0.875rem;
  color: #6b7280;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.25rem;
  padding: 1rem;
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
}

.pagination-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 36px;
  height: 36px;
  padding: 0 0.5rem;
  border: 1px solid #e5e7eb;
  border-radius: var(--radius-sm);
  background: white;
  color: #374151;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
}

.pagination-btn:hover:not(:disabled) {
  background: #f3f4f6;
  border-color: #d1d5db;
}

.pagination-btn:disabled {
  opacity: 0.4;
  cursor: not-allowed;
}

.pagination-btn.active {
  background: #6366f1;
  border-color: #6366f1;
  color: white;
}

.pagination-ellipsis {
  padding: 0 0.5rem;
  color: #6b7280;
}

.pagination-info {
  margin-left: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.btn {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.625rem 1.25rem;
  border-radius: var(--radius-sm);
  font-weight: 500;
  font-size: 0.875rem;
  cursor: pointer;
  transition: all 0.2s;
  border: none;
}

.btn-sm {
  padding: 0.375rem 0.75rem;
  font-size: 0.8125rem;
}

.btn-icon {
  padding: 0.625rem;
  background: white;
  border: 1px solid #e5e7eb;
  color: #6b7280;
}

.btn-icon:hover:not(:disabled) {
  background: #f9fafb;
  color: #374151;
}

.btn-primary {
  background: #6366f1;
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: #4f46e5;
}

.btn-primary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-secondary {
  background: white;
  border: 1px solid #e5e7eb;
  color: #374151;
}

.btn-secondary:hover:not(:disabled) {
  background: #f9fafb;
}

.btn-secondary:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn-danger {
  background: #fee2e2;
  color: #dc2626;
}

.btn-danger:hover:not(:disabled) {
  background: #fecaca;
}

.loading-state,
.empty-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 4rem 2rem;
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
  text-align: center;
}

.loading-state i,
.empty-state i {
  font-size: 3rem;
  color: #9ca3af;
  margin-bottom: 1rem;
}

.empty-state h3 {
  font-size: 1.25rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.5rem;
}

.empty-state p {
  color: #6b7280;
  margin: 0 0 1.5rem;
}

.tasks-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(380px, 1fr));
  gap: 1.25rem;
}

.task-card {
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
  overflow: hidden;
  transition: all 0.2s;
}

.task-card:hover {
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
}

.task-card.disabled {
  opacity: 0.6;
}

.task-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.25rem;
  border-bottom: 1px solid #f3f4f6;
}

.task-type {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.task-type.command {
  background: #dbeafe;
  color: #1d4ed8;
}

.task-type.backup {
  background: #dcfce7;
  color: #166534;
}

.switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: #d1d5db;
  transition: 0.3s;
  border-radius: 24px;
}

.slider:before {
  position: absolute;
  content: "";
  height: 18px;
  width: 18px;
  left: 3px;
  bottom: 3px;
  background-color: white;
  transition: 0.3s;
  border-radius: 50%;
}

input:checked + .slider {
  background-color: #22c55e;
}

input:checked + .slider:before {
  transform: translateX(20px);
}

.task-body {
  padding: 1.25rem;
}

.task-name {
  font-size: 1.125rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 0.75rem;
}

.task-deployment {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #6b7280;
  margin-bottom: 0.75rem;
}

.task-schedule {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.875rem;
  color: #374151;
  margin-bottom: 1rem;
}

.task-schedule code {
  background: #f3f4f6;
  padding: 0.25rem 0.5rem;
  border-radius: var(--radius-xs);
  font-family: monospace;
  font-size: 0.8125rem;
}

.cron-human {
  color: #6b7280;
  font-size: 0.8125rem;
}

.task-command {
  background: #f9fafb;
  border-radius: var(--radius-xs);
  padding: 0.75rem;
  margin-bottom: 1rem;
}

.command-label {
  font-size: 0.75rem;
  font-weight: 600;
  color: #6b7280;
  margin-bottom: 0.25rem;
}

.command-value {
  display: block;
  font-family: monospace;
  font-size: 0.8125rem;
  color: #1f2937;
  word-break: break-all;
}

.command-service {
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.5rem;
}

.task-timing {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.timing-item {
  font-size: 0.8125rem;
}

.timing-label {
  color: #6b7280;
}

.timing-value {
  color: #374151;
  margin-left: 0.25rem;
}

.task-footer {
  display: flex;
  gap: 0.5rem;
  padding: 1rem 1.25rem;
  background: #f9fafb;
  border-top: 1px solid #f3f4f6;
}

.recent-executions {
  background: white;
  border-radius: var(--radius-sm);
  border: 1px solid #e5e7eb;
  padding: 1.25rem;
}

.recent-executions h3 {
  font-size: 1rem;
  font-weight: 600;
  color: #1f2937;
  margin: 0 0 1rem;
}

.executions-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.execution-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem;
  background: #f9fafb;
  border-radius: var(--radius-xs);
}

.execution-item.completed .exec-status i {
  color: #22c55e;
}

.execution-item.failed .exec-status i {
  color: #ef4444;
}

.execution-item.running .exec-status i {
  color: #3b82f6;
}

.exec-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
}

.exec-task {
  font-weight: 500;
  color: #1f2937;
}

.exec-time {
  font-size: 0.75rem;
  color: #6b7280;
}

.exec-duration {
  font-size: 0.875rem;
  color: #6b7280;
  font-family: monospace;
}

.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: white;
  border-radius: var(--radius-sm);
  width: 100%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
}

.modal-container.modal-wide {
  max-width: 700px;
}

.modal-header {
  padding: 1.25rem 1.5rem;
  border-bottom: 1px solid #e5e7eb;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h3 {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 1.125rem;
  font-weight: 600;
  color: #111827;
  margin: 0;
}

.modal-header h3 i {
  color: #6366f1;
}

.close-btn {
  background: none;
  border: none;
  color: #9ca3af;
  cursor: pointer;
  padding: 0.5rem;
  border-radius: var(--radius-sm);
  transition: all 0.2s;
}

.close-btn:hover {
  background: #f3f4f6;
  color: #6b7280;
}

.modal-body {
  padding: 1.5rem;
}

.form-group {
  margin-bottom: 1.25rem;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-group label {
  display: block;
  font-size: 0.875rem;
  font-weight: 600;
  color: #374151;
  margin-bottom: 0.5rem;
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.75rem 1rem;
  border: 1px solid #d1d5db;
  border-radius: var(--radius-sm);
  font-size: 0.875rem;
  transition: all 0.2s;
  font-family: inherit;
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: #6366f1;
  box-shadow: 0 0 0 3px rgba(99, 102, 241, 0.1);
}

.form-group textarea {
  resize: vertical;
  font-family: monospace;
}

.hint {
  display: block;
  font-size: 0.75rem;
  color: #6b7280;
  margin-top: 0.375rem;
}

.checkbox-group {
  margin-top: 0.5rem;
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  cursor: pointer;
}

.checkbox-label input {
  width: auto;
}

.modal-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e5e7eb;
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}

.execution-details {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.exec-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.875rem;
  color: #6b7280;
}

.exec-status-badge {
  padding: 0.25rem 0.75rem;
  border-radius: 9999px;
  font-size: 0.75rem;
  font-weight: 600;
  text-transform: uppercase;
}

.exec-status-badge.completed {
  background: #dcfce7;
  color: #166534;
}

.exec-status-badge.failed {
  background: #fee2e2;
  color: #991b1b;
}

.exec-status-badge.running {
  background: #dbeafe;
  color: #1d4ed8;
}

.output-block,
.error-block {
  border-radius: var(--radius-sm);
  overflow: hidden;
}

.output-block h4,
.error-block h4 {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  color: #374151;
}

.output-block pre,
.error-block pre {
  background: #1f2937;
  color: #e5e7eb;
  padding: 1rem;
  border-radius: var(--radius-sm);
  font-family: monospace;
  font-size: 0.8125rem;
  overflow-x: auto;
  white-space: pre-wrap;
  word-break: break-all;
  margin: 0;
}

.error-block pre {
  background: #7f1d1d;
  color: #fecaca;
}

.no-output,
.no-history {
  text-align: center;
  padding: 2rem;
  color: #6b7280;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.history-item {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 0.75rem 1rem;
  background: #f9fafb;
  border-radius: var(--radius-sm);
}

.history-status {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  min-width: 100px;
}

.history-item.completed .history-status i {
  color: #22c55e;
}

.history-item.failed .history-status i {
  color: #ef4444;
}

.history-time {
  flex: 1;
  font-size: 0.875rem;
  color: #6b7280;
}

.history-duration {
  font-family: monospace;
  font-size: 0.875rem;
  color: #6b7280;
}

@media (max-width: 768px) {
  .view-header {
    flex-direction: column;
    align-items: stretch;
  }

  .header-actions {
    justify-content: flex-end;
  }

  .tasks-grid {
    grid-template-columns: 1fr;
  }
}
</style>
