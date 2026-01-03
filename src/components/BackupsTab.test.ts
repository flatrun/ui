import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import BackupsTab from "./BackupsTab.vue";
import { backupsApi, schedulerApi } from "@/services/api";

vi.mock("@/services/api", () => ({
  backupsApi: {
    getDeploymentBackups: vi.fn().mockResolvedValue({ data: { backups: [] } }),
    createDeploymentBackup: vi.fn().mockResolvedValue({ data: { job_id: "job-123" } }),
    delete: vi.fn().mockResolvedValue({ data: { success: true } }),
    restore: vi.fn().mockResolvedValue({ data: { job_id: "restore-job-123" } }),
    download: vi.fn().mockReturnValue("/api/backups/test-backup/download"),
    getJob: vi.fn().mockResolvedValue({
      data: { job: { id: "job-123", status: "completed", type: "backup" } },
    }),
  },
  schedulerApi: {
    listTasks: vi.fn().mockResolvedValue({ data: { tasks: [] } }),
    createTask: vi.fn().mockResolvedValue({ data: { task: { id: 1 } } }),
    updateTask: vi.fn().mockResolvedValue({ data: { success: true } }),
    deleteTask: vi.fn().mockResolvedValue({ data: { success: true } }),
    runTaskNow: vi.fn().mockResolvedValue({ data: { success: true } }),
  },
}));

const mockGetDeploymentBackups = backupsApi.getDeploymentBackups as ReturnType<typeof vi.fn>;
const mockCreateDeploymentBackup = backupsApi.createDeploymentBackup as ReturnType<typeof vi.fn>;
const mockDeleteBackup = backupsApi.delete as ReturnType<typeof vi.fn>;
const mockRestoreBackup = backupsApi.restore as ReturnType<typeof vi.fn>;
const mockListTasks = schedulerApi.listTasks as ReturnType<typeof vi.fn>;
const mockCreateTask = schedulerApi.createTask as ReturnType<typeof vi.fn>;

const mockBackups = [
  {
    id: "my-app_20250101_120000",
    deployment_name: "my-app",
    status: "completed",
    size: 1048576,
    components: ["compose", "env"],
    created_at: "2025-01-01T12:00:00Z",
    path: "/backups/my-app/my-app_20250101_120000.tar.gz",
  },
  {
    id: "my-app_20250102_120000",
    deployment_name: "my-app",
    status: "completed",
    size: 2097152,
    components: ["compose", "env", "data"],
    created_at: "2025-01-02T12:00:00Z",
    path: "/backups/my-app/my-app_20250102_120000.tar.gz",
  },
];

const mockScheduledTasks = [
  {
    id: 1,
    name: "Daily backup",
    type: "backup",
    deployment_name: "my-app",
    cron_expr: "0 2 * * *",
    enabled: true,
    next_run: "2025-01-03T02:00:00Z",
  },
];

describe("BackupsTab", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetDeploymentBackups.mockResolvedValue({ data: { backups: [] } });
    mockListTasks.mockResolvedValue({ data: { tasks: [] } });
  });

  const mountBackupsTab = (options: { backups?: typeof mockBackups; tasks?: typeof mockScheduledTasks } = {}) => {
    if (options.backups) {
      mockGetDeploymentBackups.mockResolvedValue({ data: { backups: options.backups } });
    }
    if (options.tasks) {
      mockListTasks.mockResolvedValue({ data: { tasks: options.tasks } });
    }

    return mount(BackupsTab, {
      props: {
        deploymentName: "my-app",
      },
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
          }),
        ],
        stubs: {
          Teleport: true,
          ConfirmModal: true,
        },
      },
    });
  };

  describe("Component structure", () => {
    it("renders the backups tab container", () => {
      const wrapper = mountBackupsTab();
      expect(wrapper.find(".backups-tab").exists()).toBe(true);
    });

    it("renders the header with title", () => {
      const wrapper = mountBackupsTab();
      expect(wrapper.find(".backups-header").exists()).toBe(true);
      expect(wrapper.find(".backups-header h3").text()).toBe("Backups");
    });

    it("renders Create Backup button", () => {
      const wrapper = mountBackupsTab();
      expect(wrapper.find(".btn-primary").exists()).toBe(true);
      expect(wrapper.text()).toContain("Create Backup");
    });

    it("renders Schedule Backup button", () => {
      const wrapper = mountBackupsTab();
      const scheduleBtn = wrapper.findAll(".btn-secondary").find((btn) => btn.text().includes("Schedule"));
      expect(scheduleBtn).toBeDefined();
    });
  });

  describe("Empty state", () => {
    it("shows empty state when no backups", async () => {
      const wrapper = mountBackupsTab();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".empty-state").exists()).toBe(true);
      expect(wrapper.text()).toContain("No backups yet");
    });

    it("shows helpful message in empty state", async () => {
      const wrapper = mountBackupsTab();
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("Create your first backup");
    });
  });

  describe("Loading state", () => {
    it("shows loading state when loadingBackups is true", async () => {
      const wrapper = mount(BackupsTab, {
        props: {
          deploymentName: "my-app",
        },
        global: {
          plugins: [
            createTestingPinia({
              createSpy: vi.fn,
            }),
          ],
          stubs: {
            Teleport: true,
            ConfirmModal: true,
          },
        },
      });

      const vm = wrapper.vm as any;
      vm.loadingBackups = true;
      vm.backups = [];
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".loading-state").exists()).toBe(true);
      expect(wrapper.text()).toContain("Loading backups");
    });
  });

  describe("Backups list", () => {
    it("renders backup items when backups exist", async () => {
      const wrapper = mountBackupsTab({ backups: mockBackups });
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      const backupItems = wrapper.findAll(".backup-item");
      expect(backupItems.length).toBe(2);
    });

    it("displays backup ID", async () => {
      const wrapper = mountBackupsTab({ backups: mockBackups });
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("my-app_20250101_120000");
    });

    it("displays backup status", async () => {
      const wrapper = mountBackupsTab({ backups: mockBackups });
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      const statusBadge = wrapper.find(".backup-status");
      expect(statusBadge.exists()).toBe(true);
      expect(statusBadge.text()).toBe("completed");
    });

    it("displays component badges", async () => {
      const wrapper = mountBackupsTab({ backups: mockBackups });
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      const componentBadges = wrapper.findAll(".component-badge");
      expect(componentBadges.length).toBeGreaterThan(0);
    });

    it("has Restore button for each backup", async () => {
      const wrapper = mountBackupsTab({ backups: mockBackups });
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      const restoreButtons = wrapper
        .findAll(".backup-actions .btn-secondary")
        .filter((btn) => btn.text().includes("Restore"));
      expect(restoreButtons.length).toBe(2);
    });

    it("has Download link for each backup", async () => {
      const wrapper = mountBackupsTab({ backups: mockBackups });
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      const downloadLinks = wrapper.findAll(".backup-actions a[download]");
      expect(downloadLinks.length).toBe(2);
    });

    it("has Delete button for each backup", async () => {
      const wrapper = mountBackupsTab({ backups: mockBackups });
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      const deleteButtons = wrapper.findAll(".backup-actions .btn-danger");
      expect(deleteButtons.length).toBe(2);
    });
  });

  describe("Create backup", () => {
    it("calls API when Create Backup button is clicked", async () => {
      const wrapper = mountBackupsTab();
      await wrapper.vm.$nextTick();

      const createBtn = wrapper.find(".btn-primary");
      await createBtn.trigger("click");

      expect(mockCreateDeploymentBackup).toHaveBeenCalledWith("my-app");
    });

    it("disables button while creating backup", async () => {
      const wrapper = mountBackupsTab();
      await wrapper.vm.$nextTick();

      const createBtn = wrapper.find(".btn-primary");
      await createBtn.trigger("click");

      expect(createBtn.attributes("disabled")).toBeDefined();
    });
  });

  describe("Delete backup", () => {
    it("opens confirm modal when delete is clicked", async () => {
      const wrapper = mountBackupsTab({ backups: mockBackups });
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      const deleteBtn = wrapper.find(".backup-actions .btn-danger");
      await deleteBtn.trigger("click");

      const vm = wrapper.vm as any;
      expect(vm.showDeleteBackupModal).toBe(true);
      expect(vm.backupToDelete).toBe("my-app_20250101_120000");
    });

    it("calls delete API on confirm", async () => {
      const wrapper = mountBackupsTab({ backups: mockBackups });
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      const vm = wrapper.vm as any;
      vm.backupToDelete = "my-app_20250101_120000";
      vm.showDeleteBackupModal = true;

      await vm.deleteBackup();

      expect(mockDeleteBackup).toHaveBeenCalledWith("my-app_20250101_120000");
    });
  });

  describe("Restore backup", () => {
    it("opens confirm modal when restore is clicked", async () => {
      const wrapper = mountBackupsTab({ backups: mockBackups });
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      const restoreBtn = wrapper
        .findAll(".backup-actions .btn-secondary")
        .find((btn) => btn.text().includes("Restore"));
      await restoreBtn?.trigger("click");

      const vm = wrapper.vm as any;
      expect(vm.showRestoreModal).toBe(true);
      expect(vm.backupToRestore).toEqual(mockBackups[0]);
    });

    it("calls restore API on confirm", async () => {
      const wrapper = mountBackupsTab({ backups: mockBackups });
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      const vm = wrapper.vm as any;
      vm.backupToRestore = mockBackups[0];
      vm.showRestoreModal = true;

      await vm.restoreBackup();

      expect(mockRestoreBackup).toHaveBeenCalledWith("my-app_20250101_120000", {
        restore_data: true,
        restore_db: true,
        stop_first: true,
      });
    });
  });

  describe("Schedule modal", () => {
    it("opens schedule modal when button is clicked", async () => {
      const wrapper = mountBackupsTab();
      await wrapper.vm.$nextTick();

      const scheduleBtn = wrapper.findAll(".btn-secondary").find((btn) => btn.text().includes("Schedule"));
      await scheduleBtn?.trigger("click");

      const vm = wrapper.vm as any;
      expect(vm.showScheduleModal).toBe(true);
    });

    it("has default form values", async () => {
      const wrapper = mountBackupsTab();
      const vm = wrapper.vm as any;

      expect(vm.scheduleForm.cronExpr).toBe("0 2 * * *");
      expect(vm.scheduleForm.retentionCount).toBe(7);
      expect(vm.scheduleForm.enabled).toBe(true);
    });

    it("calls API to create scheduled task", async () => {
      const wrapper = mountBackupsTab();
      const vm = wrapper.vm as any;

      vm.scheduleForm = {
        name: "Daily backup",
        cronExpr: "0 3 * * *",
        retentionCount: 5,
        enabled: true,
      };

      await vm.createScheduledTask();

      expect(mockCreateTask).toHaveBeenCalledWith({
        name: "Daily backup",
        type: "backup",
        deployment_name: "my-app",
        cron_expr: "0 3 * * *",
        enabled: true,
        config: {
          backup_config: {
            retention_count: 5,
          },
        },
      });
    });
  });

  describe("Scheduled tasks list", () => {
    it("shows scheduled tasks section when tasks exist", async () => {
      const wrapper = mountBackupsTab({ tasks: mockScheduledTasks });
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      expect(wrapper.find(".scheduled-backups-section").exists()).toBe(true);
      expect(wrapper.text()).toContain("Scheduled Backups");
    });

    it("displays task name and cron expression", async () => {
      const wrapper = mountBackupsTab({ tasks: mockScheduledTasks });
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      expect(wrapper.text()).toContain("Daily backup");
      expect(wrapper.text()).toContain("0 2 * * *");
    });

    it("has toggle switch for enabling/disabling task", async () => {
      const wrapper = mountBackupsTab({ tasks: mockScheduledTasks });
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      const toggleSwitch = wrapper.find(".toggle-switch input[type='checkbox']");
      expect(toggleSwitch.exists()).toBe(true);
    });

    it("has run now button for each task", async () => {
      const wrapper = mountBackupsTab({ tasks: mockScheduledTasks });
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      const runButtons = wrapper.findAll(".task-actions .btn-secondary");
      expect(runButtons.length).toBeGreaterThan(0);
    });

    it("has delete button for each task", async () => {
      const wrapper = mountBackupsTab({ tasks: mockScheduledTasks });
      await wrapper.vm.$nextTick();
      await new Promise((r) => setTimeout(r, 10));
      await wrapper.vm.$nextTick();

      const deleteBtn = wrapper.find(".task-actions .btn-danger");
      expect(deleteBtn.exists()).toBe(true);
    });
  });

  describe("Utility functions", () => {
    it("formatBytes formats bytes correctly", () => {
      const wrapper = mountBackupsTab({ backups: mockBackups });
      const vm = wrapper.vm as any;

      expect(vm.formatBytes(0)).toBe("0 B");
      expect(vm.formatBytes(1024)).toBe("1 KB");
      expect(vm.formatBytes(1048576)).toBe("1 MB");
      expect(vm.formatBytes(1073741824)).toBe("1 GB");
    });

    it("formatDate formats date correctly", () => {
      const wrapper = mountBackupsTab();
      const vm = wrapper.vm as any;

      const result = vm.formatDate("2025-01-01T12:00:00Z");
      expect(result).toBeTruthy();
    });

    it("getDownloadUrl returns correct URL", () => {
      const wrapper = mountBackupsTab();
      const vm = wrapper.vm as any;

      vm.getDownloadUrl("test-backup-id");
      expect(backupsApi.download).toHaveBeenCalledWith("test-backup-id");
    });
  });

  describe("Job polling", () => {
    it("starts polling when backup job is created", async () => {
      const wrapper = mountBackupsTab();
      await wrapper.vm.$nextTick();

      const vm = wrapper.vm as any;
      const createBtn = wrapper.find(".btn-primary");
      await createBtn.trigger("click");
      await wrapper.vm.$nextTick();

      expect(vm.activeJobs.length).toBe(1);
      expect(vm.activeJobs[0].id).toBe("job-123");
    });

    it("stops polling when no active jobs", async () => {
      const wrapper = mountBackupsTab();
      const vm = wrapper.vm as any;

      vm.activeJobs = [];
      await vm.pollActiveJobs();

      expect(vm.activeJobs.length).toBe(0);
    });
  });
});
