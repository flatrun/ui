import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import CronJobsView from "./CronJobsView.vue";
import { useAuthStore } from "@/stores/auth";

vi.mock("@/services/api", () => ({
  schedulerApi: {
    listTasks: vi.fn().mockResolvedValue({
      data: {
        tasks: [
          {
            id: 1,
            name: "Daily backup",
            type: "backup",
            deployment_name: "wordpress",
            cron_expr: "0 2 * * *",
            enabled: true,
            config: { backup_config: { retention_count: 7 } },
            last_run: "2024-01-15T02:00:00Z",
            next_run: "2024-01-16T02:00:00Z",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-15T02:00:00Z",
          },
          {
            id: 2,
            name: "Cache cleanup",
            type: "command",
            deployment_name: "laravel-app",
            cron_expr: "0 * * * *",
            enabled: true,
            config: {
              command_config: { service: "app", command: "php artisan cache:clear", timeout: 300 },
            },
            last_run: "2024-01-15T10:00:00Z",
            next_run: "2024-01-15T11:00:00Z",
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-15T10:00:00Z",
          },
          {
            id: 3,
            name: "Disabled task",
            type: "command",
            deployment_name: "wordpress",
            cron_expr: "0 0 * * 0",
            enabled: false,
            config: { command_config: { service: "", command: "echo hello", timeout: 60 } },
            created_at: "2024-01-01T00:00:00Z",
            updated_at: "2024-01-01T00:00:00Z",
          },
        ],
      },
    }),
    getTask: vi.fn().mockResolvedValue({
      data: { task: { id: 1, name: "Daily backup" } },
    }),
    createTask: vi.fn().mockResolvedValue({
      data: { task: { id: 4, name: "New task" } },
    }),
    updateTask: vi.fn().mockResolvedValue({
      data: { task: { id: 1, name: "Daily backup" } },
    }),
    deleteTask: vi.fn().mockResolvedValue({
      data: { message: "Task deleted" },
    }),
    runTaskNow: vi.fn().mockResolvedValue({
      data: { message: "Task started" },
    }),
    getTaskExecutions: vi.fn().mockResolvedValue({
      data: {
        executions: [
          {
            id: 1,
            task_id: 1,
            status: "completed",
            output: "Backup completed successfully",
            started_at: "2024-01-15T02:00:00Z",
            ended_at: "2024-01-15T02:05:00Z",
            duration_ms: 300000,
          },
        ],
      },
    }),
    getRecentExecutions: vi.fn().mockResolvedValue({
      data: {
        executions: [
          {
            id: 1,
            task_id: 1,
            status: "completed",
            output: "Backup completed",
            started_at: "2024-01-15T02:00:00Z",
            ended_at: "2024-01-15T02:05:00Z",
            duration_ms: 300000,
          },
          {
            id: 2,
            task_id: 2,
            status: "failed",
            error: "Connection timeout",
            started_at: "2024-01-15T10:00:00Z",
            ended_at: "2024-01-15T10:00:30Z",
            duration_ms: 30000,
          },
        ],
      },
    }),
  },
  deploymentsApi: {
    list: vi.fn().mockResolvedValue({
      data: {
        deployments: [
          { name: "wordpress", status: "running" },
          { name: "laravel-app", status: "running" },
        ],
      },
    }),
  },
}));

const mockTasks = [
  {
    id: 1,
    name: "Daily backup",
    type: "backup",
    deployment_name: "wordpress",
    cron_expr: "0 2 * * *",
    enabled: true,
    config: { backup_config: { retention_count: 7 } },
  },
  {
    id: 2,
    name: "Cache cleanup",
    type: "command",
    deployment_name: "laravel-app",
    cron_expr: "0 * * * *",
    enabled: true,
    config: { command_config: { service: "app", command: "php artisan cache:clear", timeout: 300 } },
  },
];

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("CronJobsView", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountView = () => {
    const pinia = createTestingPinia({ createSpy: vi.fn });
    const authStore = useAuthStore(pinia);
    (authStore.hasPermission as ReturnType<typeof vi.fn>).mockReturnValue(true);
    return mount(CronJobsView, {
      global: {
        plugins: [pinia],
        stubs: {
          ConfirmModal: true,
          Teleport: true,
        },
      },
    });
  };

  describe("View structure", () => {
    it("renders the cron jobs view container", () => {
      const wrapper = mountView();
      expect(wrapper.find(".cron-jobs-view").exists()).toBe(true);
    });

    it("displays the header with title", () => {
      const wrapper = mountView();
      expect(wrapper.find("h2").text()).toBe("Scheduled Tasks");
    });

    it("contains New Cron Job button", () => {
      const wrapper = mountView();
      expect(wrapper.text()).toContain("New Cron Job");
    });

    it("contains Refresh button", () => {
      const wrapper = mountView();
      const refreshBtn = wrapper.find("button.btn-icon");
      expect(refreshBtn.exists()).toBe(true);
    });
  });

  describe("Data loading", () => {
    it("fetches tasks on mount", async () => {
      const { schedulerApi } = await import("@/services/api");
      mountView();
      await flushPromises();
      expect(schedulerApi.listTasks).toHaveBeenCalled();
    });

    it("fetches recent executions on mount", async () => {
      const { schedulerApi } = await import("@/services/api");
      mountView();
      await flushPromises();
      expect(schedulerApi.getRecentExecutions).toHaveBeenCalledWith(10);
    });

    it("fetches deployments on mount", async () => {
      const { deploymentsApi } = await import("@/services/api");
      mountView();
      await flushPromises();
      expect(deploymentsApi.list).toHaveBeenCalled();
    });
  });

  describe("Task display", () => {
    it("displays task cards after loading", async () => {
      const wrapper = mountView();
      await flushPromises();
      const taskCards = wrapper.findAll(".task-card");
      expect(taskCards.length).toBe(3);
    });

    it("shows task name in card", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.text()).toContain("Daily backup");
      expect(wrapper.text()).toContain("Cache cleanup");
    });

    it("shows deployment name for each task", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.text()).toContain("wordpress");
      expect(wrapper.text()).toContain("laravel-app");
    });

    it("shows cron expression for each task", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.text()).toContain("0 2 * * *");
      expect(wrapper.text()).toContain("0 * * * *");
    });

    it("shows command for command-type tasks", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.text()).toContain("php artisan cache:clear");
    });

    it("applies disabled class to disabled tasks", async () => {
      const wrapper = mountView();
      await flushPromises();
      const disabledCards = wrapper.findAll(".task-card.disabled");
      expect(disabledCards.length).toBe(1);
    });
  });

  describe("Filtering", () => {
    it("shows filters bar when tasks exist", async () => {
      const wrapper = mountView();
      await flushPromises();
      expect(wrapper.find(".filters-bar").exists()).toBe(true);
    });

    it("filters tasks by search query", async () => {
      const wrapper = mountView();
      await flushPromises();

      const searchInput = wrapper.find(".search-box input");
      await searchInput.setValue("backup");

      const filteredTasks = (wrapper.vm as any).filteredTasks;
      expect(filteredTasks.length).toBe(1);
      expect(filteredTasks[0].name).toBe("Daily backup");
    });

    it("filters tasks by deployment", async () => {
      const wrapper = mountView();
      await flushPromises();

      const select = wrapper.findAll(".filter-select")[0];
      await select.setValue("wordpress");

      const filteredTasks = (wrapper.vm as any).filteredTasks;
      expect(filteredTasks.length).toBe(2);
      expect(filteredTasks.every((t: any) => t.deployment_name === "wordpress")).toBe(true);
    });

    it("filters tasks by type", async () => {
      const wrapper = mountView();
      await flushPromises();

      const select = wrapper.findAll(".filter-select")[1];
      await select.setValue("command");

      const filteredTasks = (wrapper.vm as any).filteredTasks;
      expect(filteredTasks.length).toBe(2);
      expect(filteredTasks.every((t: any) => t.type === "command")).toBe(true);
    });

    it("resets page to 1 when filter changes", async () => {
      const wrapper = mountView();
      await flushPromises();

      (wrapper.vm as any).currentPage = 2;
      const searchInput = wrapper.find(".search-box input");
      await searchInput.setValue("test");

      expect((wrapper.vm as any).currentPage).toBe(1);
    });
  });

  describe("Pagination", () => {
    it("computes total pages correctly", async () => {
      const wrapper = mountView();
      await flushPromises();

      expect((wrapper.vm as any).totalPages).toBe(1);
    });

    it("paginates tasks correctly", async () => {
      const wrapper = mountView();
      await flushPromises();

      const paginatedTasks = (wrapper.vm as any).paginatedTasks;
      expect(paginatedTasks.length).toBe(3);
    });
  });

  describe("Modal interactions", () => {
    it("opens create modal when New Cron Job button clicked", async () => {
      const wrapper = mountView();
      await flushPromises();

      const newBtn = wrapper.find("button.btn-primary");
      await newBtn.trigger("click");

      expect((wrapper.vm as any).showModal).toBe(true);
      expect((wrapper.vm as any).editingTask).toBe(null);
    });

    it("opens edit modal with task data", async () => {
      const wrapper = mountView();
      await flushPromises();

      (wrapper.vm as any).openEditModal(mockTasks[1]);

      expect((wrapper.vm as any).showModal).toBe(true);
      expect((wrapper.vm as any).editingTask).toEqual(mockTasks[1]);
      expect((wrapper.vm as any).form.name).toBe("Cache cleanup");
    });

    it("closes modal and resets form", async () => {
      const wrapper = mountView();
      await flushPromises();

      (wrapper.vm as any).showModal = true;
      (wrapper.vm as any).form.name = "Test";

      (wrapper.vm as any).closeModal();

      expect((wrapper.vm as any).showModal).toBe(false);
      expect((wrapper.vm as any).form.name).toBe("");
    });
  });

  describe("Task actions", () => {
    it("toggles task enabled state", async () => {
      const { schedulerApi } = await import("@/services/api");
      const wrapper = mountView();
      await flushPromises();

      await (wrapper.vm as any).toggleTask(mockTasks[0]);

      expect(schedulerApi.updateTask).toHaveBeenCalledWith(1, { enabled: false });
    });

    it("runs task immediately", async () => {
      const { schedulerApi } = await import("@/services/api");
      const wrapper = mountView();
      await flushPromises();

      await (wrapper.vm as any).runTaskNow(mockTasks[0]);

      expect(schedulerApi.runTaskNow).toHaveBeenCalledWith(1);
    });

    it("opens delete confirmation modal", async () => {
      const wrapper = mountView();
      await flushPromises();

      (wrapper.vm as any).confirmDelete(mockTasks[0]);

      expect((wrapper.vm as any).showDeleteModal).toBe(true);
      expect((wrapper.vm as any).taskToDelete).toEqual(mockTasks[0]);
    });

    it("deletes task after confirmation", async () => {
      const { schedulerApi } = await import("@/services/api");
      const wrapper = mountView();
      await flushPromises();

      (wrapper.vm as any).taskToDelete = mockTasks[0];
      await (wrapper.vm as any).deleteTask();

      expect(schedulerApi.deleteTask).toHaveBeenCalledWith(1);
    });
  });

  describe("Execution history", () => {
    it("fetches task executions when viewing history", async () => {
      const { schedulerApi } = await import("@/services/api");
      const wrapper = mountView();
      await flushPromises();

      await (wrapper.vm as any).viewExecutions(mockTasks[0]);

      expect(schedulerApi.getTaskExecutions).toHaveBeenCalledWith(1, 50);
      expect((wrapper.vm as any).showHistoryModal).toBe(true);
    });

    it("displays recent executions section", async () => {
      const wrapper = mountView();
      await flushPromises();

      expect(wrapper.find(".recent-executions").exists()).toBe(true);
      expect(wrapper.text()).toContain("Recent Executions");
    });
  });

  describe("Helper functions", () => {
    it("cronToHuman converts daily schedule correctly", () => {
      const wrapper = mountView();
      expect((wrapper.vm as any).cronToHuman("0 2 * * *")).toBe("Daily at 02:00");
    });

    it("cronToHuman converts hourly schedule correctly", () => {
      const wrapper = mountView();
      expect((wrapper.vm as any).cronToHuman("0 * * * *")).toBe("Every hour");
    });

    it("cronToHuman returns human readable for minute intervals", () => {
      const wrapper = mountView();
      expect((wrapper.vm as any).cronToHuman("*/5 * * * *")).toContain("minute");
    });

    it("getTaskName returns task name by id", async () => {
      const wrapper = mountView();
      await flushPromises();

      expect((wrapper.vm as any).getTaskName(1)).toBe("Daily backup");
      expect((wrapper.vm as any).getTaskName(999)).toBe("Task #999");
    });

    it("statusIcon returns correct icon for each status", () => {
      const wrapper = mountView();
      expect((wrapper.vm as any).statusIcon("completed")).toBe("pi pi-check-circle");
      expect((wrapper.vm as any).statusIcon("failed")).toBe("pi pi-times-circle");
      expect((wrapper.vm as any).statusIcon("running")).toBe("pi pi-spin pi-spinner");
      expect((wrapper.vm as any).statusIcon("pending")).toBe("pi pi-clock");
    });
  });

  describe("Form validation", () => {
    it("form is invalid when required fields are empty", () => {
      const wrapper = mountView();
      expect((wrapper.vm as any).isFormValid).toBe(false);
    });

    it("form is valid when all required fields are filled", async () => {
      const wrapper = mountView();
      await flushPromises();

      (wrapper.vm as any).form.name = "Test task";
      (wrapper.vm as any).form.deployment_name = "wordpress";
      (wrapper.vm as any).form.cron_expr = "0 * * * *";
      (wrapper.vm as any).form.command = "echo test";

      expect((wrapper.vm as any).isFormValid).toBe(true);
    });
  });

  describe("Task creation", () => {
    it("creates new task with correct data", async () => {
      const { schedulerApi } = await import("@/services/api");
      const wrapper = mountView();
      await flushPromises();

      (wrapper.vm as any).form = {
        name: "New task",
        deployment_name: "wordpress",
        cron_expr: "0 3 * * *",
        service: "app",
        command: "php artisan schedule:run",
        timeout: 300,
        enabled: true,
      };

      await (wrapper.vm as any).saveTask();

      expect(schedulerApi.createTask).toHaveBeenCalledWith({
        name: "New task",
        type: "command",
        deployment_name: "wordpress",
        cron_expr: "0 3 * * *",
        enabled: true,
        config: {
          command_config: {
            service: "app",
            command: "php artisan schedule:run",
            timeout: 300,
          },
        },
      });
    });
  });

  describe("Empty state", () => {
    it("shows empty state when no tasks", async () => {
      const { schedulerApi } = await import("@/services/api");
      (schedulerApi.listTasks as any).mockResolvedValueOnce({
        data: { tasks: [] },
      });

      const wrapper = mountView();
      await flushPromises();

      expect(wrapper.find(".empty-state").exists()).toBe(true);
      expect(wrapper.text()).toContain("No Scheduled Tasks");
    });

    it("shows no matching tasks message when filters return empty", async () => {
      const wrapper = mountView();
      await flushPromises();

      const searchInput = wrapper.find(".search-box input");
      await searchInput.setValue("nonexistent-task-xyz");

      expect(wrapper.text()).toContain("No Matching Tasks");
    });
  });

  describe("Permission gates", () => {
    const mountViewDenied = () => {
      const pinia = createTestingPinia({ createSpy: vi.fn });
      return mount(CronJobsView, {
        global: {
          plugins: [pinia],
          stubs: {
            ConfirmModal: true,
            Teleport: true,
          },
        },
      });
    };

    it("hides New Cron Job button without scheduler:write", () => {
      const wrapper = mountViewDenied();
      expect(wrapper.find("button.btn-primary").exists()).toBe(false);
    });

    it("hides run/edit buttons but keeps history without scheduler:write", async () => {
      const wrapper = mountViewDenied();
      await flushPromises();
      const secondaryBtns = wrapper.findAll("button.btn-sm.btn-secondary");
      // Only history buttons remain (one per task), no run/edit buttons
      for (const btn of secondaryBtns) {
        expect(btn.text()).toContain("History");
      }
    });

    it("hides delete button without scheduler:delete", async () => {
      const wrapper = mountViewDenied();
      await flushPromises();
      expect(wrapper.findAll("button.btn-sm.btn-danger").length).toBe(0);
    });

    it("still renders task list without write permissions", async () => {
      const wrapper = mountViewDenied();
      await flushPromises();
      expect(wrapper.text()).toContain("Scheduled Tasks");
    });
  });
});
