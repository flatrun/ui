<template>
  <div class="backups-tab">
    <div class="backups-header">
      <h3>Backups</h3>
      <div class="backups-actions">
        <button
          class="btn btn-primary"
          :disabled="creatingBackup"
          @click="createBackup"
        >
          <i :class="creatingBackup ? 'pi pi-spin pi-spinner' : 'pi pi-plus'" />
          {{ creatingBackup ? "Creating..." : "Create Backup" }}
        </button>
        <button class="btn btn-secondary" @click="showScheduleModal = true">
          <i class="pi pi-clock" />
          Schedule Backup
        </button>
      </div>
    </div>

    <div v-if="loadingBackups" class="loading-state">
      <i class="pi pi-spin pi-spinner" />
      Loading backups...
    </div>

    <div v-else-if="backups.length === 0" class="empty-state">
      <i class="pi pi-history" />
      <h4>No backups yet</h4>
      <p>Create your first backup to protect your deployment data.</p>
    </div>

    <div v-else class="backups-list">
      <div v-for="backup in backups" :key="backup.id" class="backup-item">
        <div class="backup-info">
          <div class="backup-name">
            <i class="pi pi-file-export" />
            {{ backup.id }}
          </div>
          <div class="backup-meta">
            <span class="backup-size">{{ formatBytes(backup.size) }}</span>
            <span class="backup-date">{{ formatDate(backup.created_at) }}</span>
            <span class="backup-status" :class="backup.status">{{ backup.status }}</span>
          </div>
          <div v-if="backup.components?.length" class="backup-components">
            <span v-for="comp in backup.components" :key="comp" class="component-badge">
              {{ comp }}
            </span>
          </div>
        </div>
        <div class="backup-actions">
          <button
            class="btn btn-sm btn-secondary"
            :disabled="restoringBackup === backup.id"
            @click="confirmRestore(backup)"
          >
            <i :class="restoringBackup === backup.id ? 'pi pi-spin pi-spinner' : 'pi pi-replay'" />
            Restore
          </button>
          <a
            :href="getDownloadUrl(backup.id)"
            class="btn btn-sm btn-secondary"
            download
          >
            <i class="pi pi-download" />
            Download
          </a>
          <button class="btn btn-sm btn-danger" @click="confirmDeleteBackup(backup.id)">
            <i class="pi pi-trash" />
          </button>
        </div>
      </div>
    </div>

    <div v-if="scheduledTasks.length > 0" class="scheduled-backups-section">
      <h4>Scheduled Backups</h4>
      <div class="scheduled-tasks-list">
        <div v-for="task in scheduledTasks" :key="task.id" class="scheduled-task-item">
          <div class="task-info">
            <span class="task-name">{{ task.name }}</span>
            <span class="task-schedule">{{ task.cron_expr }}</span>
            <span v-if="task.next_run" class="task-next">
              Next: {{ formatDate(task.next_run) }}
            </span>
          </div>
          <div class="task-actions">
            <label class="toggle-switch small">
              <input
                type="checkbox"
                :checked="task.enabled"
                @change="toggleTask(task)"
              />
              <span class="toggle-slider" />
            </label>
            <button class="btn btn-sm btn-secondary" @click="runTaskNow(task.id)">
              <i class="pi pi-play" />
            </button>
            <button class="btn btn-sm btn-danger" @click="confirmDeleteTask(task.id)">
              <i class="pi pi-trash" />
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Schedule Backup Modal -->
    <Teleport to="body">
      <div v-if="showScheduleModal" class="modal-overlay" @click.self="showScheduleModal = false">
        <div class="modal-container schedule-modal">
          <div class="modal-header">
            <h3>
              <i class="pi pi-clock" />
              Schedule Automatic Backup
            </h3>
            <button class="close-btn" @click="showScheduleModal = false">
              <i class="pi pi-times" />
            </button>
          </div>
          <div class="modal-body">
            <div class="form-group">
              <label>Schedule Name</label>
              <input
                v-model="scheduleForm.name"
                type="text"
                placeholder="e.g., Daily backup"
                class="form-control"
              />
            </div>
            <div class="form-group">
              <label>Schedule (Cron Expression)</label>
              <input
                v-model="scheduleForm.cronExpr"
                type="text"
                placeholder="0 2 * * *"
                class="form-control"
              />
              <span class="form-hint">
                Examples: <code>0 2 * * *</code> (daily at 2am), <code>0 */6 * * *</code> (every 6 hours)
              </span>
            </div>
            <div class="form-group">
              <label>Retention Count</label>
              <input
                v-model.number="scheduleForm.retentionCount"
                type="number"
                min="1"
                max="100"
                class="form-control"
              />
              <span class="form-hint">Number of backups to keep (older backups will be deleted)</span>
            </div>
            <div class="form-group">
              <label class="checkbox-label">
                <input v-model="scheduleForm.enabled" type="checkbox" />
                Enable schedule immediately
              </label>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn btn-secondary" @click="showScheduleModal = false">Cancel</button>
            <button
              class="btn btn-primary"
              :disabled="savingSchedule || !scheduleForm.name || !scheduleForm.cronExpr"
              @click="createScheduledTask"
            >
              <i v-if="savingSchedule" class="pi pi-spin pi-spinner" />
              {{ savingSchedule ? "Creating..." : "Create Schedule" }}
            </button>
          </div>
        </div>
      </div>
    </Teleport>

    <!-- Delete Backup Confirm Modal -->
    <ConfirmModal
      :visible="showDeleteBackupModal"
      title="Delete Backup"
      message="Are you sure you want to delete this backup? This action cannot be undone."
      variant="warning"
      confirm-text="Delete"
      @confirm="deleteBackup"
      @cancel="showDeleteBackupModal = false"
    />

    <!-- Delete Task Confirm Modal -->
    <ConfirmModal
      :visible="showDeleteTaskModal"
      title="Delete Scheduled Task"
      message="Are you sure you want to delete this scheduled task?"
      variant="warning"
      confirm-text="Delete"
      @confirm="deleteTask"
      @cancel="showDeleteTaskModal = false"
    />

    <!-- Restore Confirm Modal -->
    <ConfirmModal
      :visible="showRestoreModal"
      title="Restore Backup"
      :message="restoreMessage"
      variant="warning"
      confirm-text="Restore"
      @confirm="restoreBackup"
      @cancel="showRestoreModal = false"
    />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from "vue";
import { backupsApi, schedulerApi } from "@/services/api";
import type { Backup, ScheduledTask, BackupJob } from "@/services/api";
import { useNotificationsStore } from "@/stores/notifications";
import ConfirmModal from "@/components/ConfirmModal.vue";

const props = defineProps<{
  deploymentName: string;
}>();

const notifications = useNotificationsStore();

const backups = ref<Backup[]>([]);
const loadingBackups = ref(false);
const creatingBackup = ref(false);
const restoringBackup = ref<string | null>(null);
const activeJobs = ref<BackupJob[]>([]);
let jobPollingInterval: number | null = null;

const scheduledTasks = ref<ScheduledTask[]>([]);
const showScheduleModal = ref(false);
const savingSchedule = ref(false);
const scheduleForm = ref({
  name: "",
  cronExpr: "0 2 * * *",
  retentionCount: 7,
  enabled: true,
});

const showDeleteBackupModal = ref(false);
const backupToDelete = ref<string | null>(null);

const showDeleteTaskModal = ref(false);
const taskToDelete = ref<number | null>(null);

const showRestoreModal = ref(false);
const backupToRestore = ref<Backup | null>(null);
const restoreMessage = ref("");

const fetchBackups = async () => {
  loadingBackups.value = true;
  try {
    const response = await backupsApi.getDeploymentBackups(props.deploymentName);
    backups.value = response.data.backups || [];
  } catch (err: any) {
    notifications.error("Error", err.response?.data?.error || "Failed to load backups");
  } finally {
    loadingBackups.value = false;
  }
};

const fetchScheduledTasks = async () => {
  try {
    const response = await schedulerApi.listTasks(props.deploymentName);
    scheduledTasks.value = (response.data.tasks || []).filter(
      (t) => t.type === "backup" && t.deployment_name === props.deploymentName
    );
  } catch {
    scheduledTasks.value = [];
  }
};

const startJobPolling = () => {
  if (jobPollingInterval) return;
  jobPollingInterval = window.setInterval(pollActiveJobs, 2000);
};

const stopJobPolling = () => {
  if (jobPollingInterval) {
    clearInterval(jobPollingInterval);
    jobPollingInterval = null;
  }
};

const pollActiveJobs = async () => {
  if (activeJobs.value.length === 0) {
    stopJobPolling();
    return;
  }

  const updatedJobs: BackupJob[] = [];
  for (const job of activeJobs.value) {
    try {
      const response = await backupsApi.getJob(job.id);
      const updatedJob = response.data.job;

      if (updatedJob.status === "completed") {
        if (updatedJob.type === "backup") {
          notifications.success("Backup Complete", "Backup has been created successfully");
          creatingBackup.value = false;
        } else {
          notifications.success("Restore Complete", "Backup has been restored successfully");
          restoringBackup.value = null;
        }
        await fetchBackups();
      } else if (updatedJob.status === "failed") {
        if (updatedJob.type === "backup") {
          notifications.error("Backup Failed", updatedJob.error || "Backup creation failed");
          creatingBackup.value = false;
        } else {
          notifications.error("Restore Failed", updatedJob.error || "Backup restore failed");
          restoringBackup.value = null;
        }
      } else {
        updatedJobs.push(updatedJob);
      }
    } catch {
      updatedJobs.push(job);
    }
  }
  activeJobs.value = updatedJobs;

  if (updatedJobs.length === 0) {
    stopJobPolling();
  }
};

const createBackup = async () => {
  creatingBackup.value = true;
  try {
    const response = await backupsApi.createDeploymentBackup(props.deploymentName);
    const jobId = response.data.job_id;
    activeJobs.value.push({
      id: jobId,
      type: "backup",
      status: "running",
      deployment_name: props.deploymentName,
      started_at: new Date().toISOString(),
    });
    notifications.success("Backup Started", "Backup creation has been initiated");
    startJobPolling();
  } catch (err: any) {
    notifications.error("Backup Failed", err.response?.data?.error || "Failed to start backup");
    creatingBackup.value = false;
  }
};

const confirmDeleteBackup = (backupId: string) => {
  backupToDelete.value = backupId;
  showDeleteBackupModal.value = true;
};

const deleteBackup = async () => {
  if (!backupToDelete.value) return;
  try {
    await backupsApi.delete(backupToDelete.value);
    notifications.success("Deleted", "Backup has been deleted");
    await fetchBackups();
  } catch (err: any) {
    notifications.error("Delete Failed", err.response?.data?.error || "Failed to delete backup");
  } finally {
    showDeleteBackupModal.value = false;
    backupToDelete.value = null;
  }
};

const confirmRestore = (backup: Backup) => {
  backupToRestore.value = backup;
  restoreMessage.value = `Are you sure you want to restore from backup "${backup.id}"? This will stop the deployment, restore data, and restart it.`;
  showRestoreModal.value = true;
};

const restoreBackup = async () => {
  if (!backupToRestore.value) return;
  const backupId = backupToRestore.value.id;
  restoringBackup.value = backupId;
  showRestoreModal.value = false;
  try {
    const response = await backupsApi.restore(backupId, {
      restore_data: true,
      restore_db: true,
      stop_first: true,
    });
    const jobId = response.data.job_id;
    activeJobs.value.push({
      id: jobId,
      type: "restore",
      status: "running",
      deployment_name: props.deploymentName,
      backup_id: backupId,
      started_at: new Date().toISOString(),
    });
    notifications.success("Restore Started", "Backup restore has been initiated");
    startJobPolling();
  } catch (err: any) {
    notifications.error("Restore Failed", err.response?.data?.error || "Failed to start restore");
    restoringBackup.value = null;
  } finally {
    backupToRestore.value = null;
  }
};

const getDownloadUrl = (backupId: string) => {
  return backupsApi.download(backupId);
};

const createScheduledTask = async () => {
  savingSchedule.value = true;
  try {
    await schedulerApi.createTask({
      name: scheduleForm.value.name,
      type: "backup",
      deployment_name: props.deploymentName,
      cron_expr: scheduleForm.value.cronExpr,
      enabled: scheduleForm.value.enabled,
      config: {
        backup_config: {
          retention_count: scheduleForm.value.retentionCount,
        },
      },
    });
    notifications.success("Schedule Created", "Backup schedule has been created");
    showScheduleModal.value = false;
    scheduleForm.value = { name: "", cronExpr: "0 2 * * *", retentionCount: 7, enabled: true };
    await fetchScheduledTasks();
  } catch (err: any) {
    notifications.error("Error", err.response?.data?.error || "Failed to create schedule");
  } finally {
    savingSchedule.value = false;
  }
};

const toggleTask = async (task: ScheduledTask) => {
  try {
    await schedulerApi.updateTask(task.id, { enabled: !task.enabled });
    await fetchScheduledTasks();
  } catch (err: any) {
    notifications.error("Error", err.response?.data?.error || "Failed to update task");
  }
};

const runTaskNow = async (taskId: number) => {
  try {
    await schedulerApi.runTaskNow(taskId);
    notifications.success("Task Started", "Backup task execution has been initiated");
  } catch (err: any) {
    notifications.error("Error", err.response?.data?.error || "Failed to run task");
  }
};

const confirmDeleteTask = (taskId: number) => {
  taskToDelete.value = taskId;
  showDeleteTaskModal.value = true;
};

const deleteTask = async () => {
  if (!taskToDelete.value) return;
  try {
    await schedulerApi.deleteTask(taskToDelete.value);
    notifications.success("Deleted", "Scheduled task has been deleted");
    await fetchScheduledTasks();
  } catch (err: any) {
    notifications.error("Delete Failed", err.response?.data?.error || "Failed to delete task");
  } finally {
    showDeleteTaskModal.value = false;
    taskToDelete.value = null;
  }
};

const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const k = 1024;
  const sizes = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleString();
};

onMounted(() => {
  fetchBackups();
  fetchScheduledTasks();
});

onUnmounted(() => {
  stopJobPolling();
});
</script>

<style scoped>
.backups-tab {
  padding: var(--space-4);
}

.backups-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: var(--space-4);
}

.backups-header h3 {
  margin: 0;
  font-size: var(--text-lg);
  font-weight: var(--font-semibold);
}

.backups-actions {
  display: flex;
  gap: var(--space-2);
}

.loading-state,
.empty-state {
  text-align: center;
  padding: var(--space-8);
  color: var(--color-gray-500);
}

.empty-state i {
  font-size: 3rem;
  margin-bottom: var(--space-3);
  color: var(--color-gray-300);
}

.empty-state h4 {
  margin: 0 0 var(--space-2);
  color: var(--color-gray-700);
}

.empty-state p {
  margin: 0;
}

.backups-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-3);
}

.backup-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3) var(--space-4);
  background: var(--color-gray-50);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-gray-200);
}

.backup-info {
  display: flex;
  flex-direction: column;
  gap: var(--space-1);
}

.backup-name {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-weight: var(--font-medium);
  color: var(--color-gray-900);
}

.backup-meta {
  display: flex;
  gap: var(--space-3);
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.backup-status {
  padding: 2px 8px;
  border-radius: var(--radius-full);
  font-size: var(--text-xs);
  text-transform: capitalize;
}

.backup-status.completed {
  background: var(--color-success-100);
  color: var(--color-success-700);
}

.backup-status.pending,
.backup-status.in_progress {
  background: var(--color-warning-100);
  color: var(--color-warning-700);
}

.backup-status.failed {
  background: var(--color-danger-100);
  color: var(--color-danger-700);
}

.backup-components {
  display: flex;
  gap: var(--space-1);
  margin-top: var(--space-1);
}

.component-badge {
  padding: 2px 6px;
  background: var(--color-primary-100);
  color: var(--color-primary-700);
  border-radius: var(--radius-sm);
  font-size: var(--text-xs);
}

.backup-actions {
  display: flex;
  gap: var(--space-2);
}

.scheduled-backups-section {
  margin-top: var(--space-6);
  padding-top: var(--space-4);
  border-top: 1px solid var(--color-gray-200);
}

.scheduled-backups-section h4 {
  margin: 0 0 var(--space-3);
  font-size: var(--text-md);
  font-weight: var(--font-semibold);
}

.scheduled-tasks-list {
  display: flex;
  flex-direction: column;
  gap: var(--space-2);
}

.scheduled-task-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-3);
  background: var(--color-gray-50);
  border-radius: var(--radius-md);
  border: 1px solid var(--color-gray-200);
}

.task-info {
  display: flex;
  align-items: center;
  gap: var(--space-3);
}

.task-name {
  font-weight: var(--font-medium);
}

.task-schedule {
  font-family: monospace;
  font-size: var(--text-sm);
  color: var(--color-gray-600);
  background: var(--color-gray-100);
  padding: 2px 6px;
  border-radius: var(--radius-sm);
}

.task-next {
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.task-actions {
  display: flex;
  align-items: center;
  gap: var(--space-2);
}

.toggle-switch.small {
  transform: scale(0.8);
}

/* Modal styles */
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.modal-container {
  background: white;
  border-radius: var(--radius-lg);
  box-shadow: var(--shadow-xl);
  width: 480px;
  max-width: 90vw;
  max-height: 90vh;
  overflow: auto;
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: var(--space-4);
  border-bottom: 1px solid var(--color-gray-200);
}

.modal-header h3 {
  margin: 0;
  display: flex;
  align-items: center;
  gap: var(--space-2);
  font-size: var(--text-lg);
}

.close-btn {
  background: none;
  border: none;
  padding: var(--space-2);
  cursor: pointer;
  color: var(--color-gray-500);
  border-radius: var(--radius-sm);
}

.close-btn:hover {
  background: var(--color-gray-100);
}

.modal-body {
  padding: var(--space-4);
}

.modal-footer {
  display: flex;
  justify-content: flex-end;
  gap: var(--space-2);
  padding: var(--space-4);
  border-top: 1px solid var(--color-gray-200);
}

.form-group {
  margin-bottom: var(--space-4);
}

.form-group label {
  display: block;
  margin-bottom: var(--space-1);
  font-weight: var(--font-medium);
  color: var(--color-gray-700);
}

.form-control {
  width: 100%;
  padding: var(--space-2) var(--space-3);
  border: 1px solid var(--color-gray-300);
  border-radius: var(--radius-md);
  font-size: var(--text-md);
}

.form-control:focus {
  outline: none;
  border-color: var(--color-primary-500);
  box-shadow: 0 0 0 3px var(--color-primary-100);
}

.form-hint {
  display: block;
  margin-top: var(--space-1);
  font-size: var(--text-sm);
  color: var(--color-gray-500);
}

.form-hint code {
  background: var(--color-gray-100);
  padding: 1px 4px;
  border-radius: var(--radius-sm);
}

.checkbox-label {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  cursor: pointer;
}

.checkbox-label input {
  width: 16px;
  height: 16px;
}

/* Button styles */
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-2);
  padding: var(--space-2) var(--space-3);
  border: none;
  border-radius: var(--radius-md);
  font-weight: var(--font-medium);
  font-size: var(--text-sm);
  cursor: pointer;
  transition: all var(--transition-base);
  text-decoration: none;
}

.btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.btn-primary {
  background: var(--color-primary-500);
  color: white;
}

.btn-primary:hover:not(:disabled) {
  background: var(--color-primary-600);
}

.btn-secondary {
  background: var(--color-gray-100);
  color: var(--color-gray-700);
}

.btn-secondary:hover:not(:disabled) {
  background: var(--color-gray-200);
}

.btn-danger {
  background: var(--color-danger-500);
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: var(--color-danger-600);
}

.btn-sm {
  padding: var(--space-1) var(--space-2);
  font-size: var(--text-xs);
}

/* Toggle switch */
.toggle-switch {
  position: relative;
  display: inline-block;
  width: 44px;
  height: 24px;
}

.toggle-switch input {
  opacity: 0;
  width: 0;
  height: 0;
}

.toggle-slider {
  position: absolute;
  cursor: pointer;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background-color: var(--color-gray-300);
  transition: 0.3s;
  border-radius: 24px;
}

.toggle-slider::before {
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

input:checked + .toggle-slider {
  background-color: var(--color-primary-500);
}

input:checked + .toggle-slider::before {
  transform: translateX(20px);
}
</style>
