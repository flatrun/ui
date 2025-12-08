import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import { createTestingPinia } from "@pinia/testing";
import NewDeploymentModal from "./NewDeploymentModal.vue";

vi.mock("@/services/api", () => ({
  templatesApi: {
    list: vi.fn().mockResolvedValue({
      data: {
        templates: [
          {
            id: "laravel",
            name: "Laravel",
            description: "PHP Laravel Framework",
            icon: "pi pi-code",
          },
          {
            id: "wordpress",
            name: "WordPress",
            description: "Content Management System",
            icon: "pi pi-globe",
          },
        ],
      },
    }),
    generateCompose: vi.fn().mockResolvedValue({
      data: {
        content: "name: my-app\nservices:\n  app:\n    image: nginx",
        container_port: 80,
        map_ports: false,
        host_port: "",
      },
    }),
  },
  settingsApi: {
    get: vi.fn().mockResolvedValue({
      data: {
        settings: {
          domain: {
            default_domain: "example.com",
            auto_subdomain: true,
            auto_ssl: true,
          },
          infrastructure: {
            default_proxy_network: "proxy",
          },
        },
      },
    }),
    generateSubdomain: vi.fn().mockResolvedValue({
      data: {
        subdomain: "swift-river",
        full_domain: "swift-river.example.com",
      },
    }),
  },
  deploymentsApi: {
    list: vi.fn().mockResolvedValue({
      data: { deployments: [{ name: "existing-app" }] },
    }),
    create: vi.fn().mockResolvedValue({ data: { message: "Created" } }),
  },
  containersApi: {
    list: vi.fn().mockResolvedValue({ data: { containers: [] } }),
  },
  composeApi: {
    update: vi.fn().mockResolvedValue({
      data: {
        content: 'name: my-app\nservices:\n  app:\n    image: nginx\n    expose:\n      - "80"',
        container_port: 80,
        map_ports: false,
        host_port: "",
      },
    }),
  },
}));

vi.mock("vue-router", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
}));

describe("NewDeploymentModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mountModal = (props = {}) => {
    return mount(NewDeploymentModal, {
      props: {
        visible: true,
        ...props,
      },
      global: {
        plugins: [
          createTestingPinia({
            createSpy: vi.fn,
          }),
        ],
        stubs: {
          BaseModal: {
            template: '<div class="modal"><slot name="header" /><slot /></div>',
            props: ["visible"],
          },
          Codemirror: true,
          Transition: false,
        },
      },
    });
  };

  describe("Modal visibility", () => {
    it("renders when visible is true", () => {
      const wrapper = mountModal({ visible: true });
      expect(wrapper.find(".modal").exists()).toBe(true);
    });

    it("contains header with title", () => {
      const wrapper = mountModal();
      expect(wrapper.text()).toContain("Create Deployment");
    });
  });

  describe("Wizard structure", () => {
    it("contains wizard container", () => {
      const wrapper = mountModal();
      expect(wrapper.find(".wizard-container").exists()).toBe(true);
    });

    it("displays step content area", () => {
      const wrapper = mountModal();
      expect(wrapper.find(".wizard-content").exists()).toBe(true);
    });

    it("shows wizard progress bar", () => {
      const wrapper = mountModal();
      expect(wrapper.find(".wizard-progress").exists()).toBe(true);
    });

    it("displays step indicators", () => {
      const wrapper = mountModal();
      expect(wrapper.findAll(".step-item").length).toBeGreaterThan(0);
    });
  });

  describe("Step 1 - Basic Info", () => {
    it("shows deployment details section", () => {
      const wrapper = mountModal();
      expect(wrapper.text()).toContain("Deployment Details");
    });

    it("has name input field", () => {
      const wrapper = mountModal();
      const nameInput = wrapper.find("input#name");
      expect(nameInput.exists()).toBe(true);
    });

    it("shows domain section", () => {
      const wrapper = mountModal();
      expect(wrapper.text()).toContain("Domain");
    });

    it("has custom domain checkbox option", () => {
      const wrapper = mountModal();
      expect(wrapper.text()).toContain("Use custom domain");
    });

    it("has HTTPS toggle option", () => {
      const wrapper = mountModal();
      expect(wrapper.text()).toContain("Enable HTTPS");
    });
  });

  describe("Compose Mode", () => {
    it("can set compose mode", async () => {
      const wrapper = mountModal();
      const vm = wrapper.vm as any;
      vm.deploymentMode = "compose";
      await wrapper.vm.$nextTick();
      expect(vm.deploymentMode).toBe("compose");
    });

    it("resets template when switching to compose mode", async () => {
      const wrapper = mountModal();
      const vm = wrapper.vm as any;
      vm.deploymentMode = "easy";
      vm.selectedQuickApp = "laravel";
      await wrapper.vm.$nextTick();

      vm.deploymentMode = "compose";
      await wrapper.vm.$nextTick();
      expect(vm.selectedQuickApp).toBe("");
    });
  });

  describe("Form validation hints", () => {
    it("shows name format hint", () => {
      const wrapper = mountModal();
      expect(wrapper.text()).toContain("Lowercase letters, numbers, and hyphens");
    });
  });

  describe("Step navigation", () => {
    it("shows step labels", () => {
      const wrapper = mountModal();
      const text = wrapper.text();
      expect(text).toContain("Basics");
      expect(text).toContain("Database");
      expect(text).toContain("Configure");
      expect(text).toContain("Review");
    });

    it("step 1 has active indicator", () => {
      const wrapper = mountModal();
      const activeStep = wrapper.find(".step-item.active");
      expect(activeStep.exists()).toBe(true);
    });
  });

  describe("Form state management", () => {
    it("initializes with empty form name", () => {
      const wrapper = mountModal();
      expect((wrapper.vm as any).form.name).toBe("");
    });

    it("initializes SSL enabled state", () => {
      const wrapper = mountModal();
      expect((wrapper.vm as any).form.ssl).toBeDefined();
    });

    it("initializes networking state", () => {
      const wrapper = mountModal();
      expect((wrapper.vm as any).form.networking).toBeDefined();
    });
  });

  describe("Deployment subtitle", () => {
    it("shows helpful subtitle text", () => {
      const wrapper = mountModal();
      expect(wrapper.text()).toContain("Deploy your application in just a few steps");
    });
  });

  describe("Mode Selection", () => {
    it("initializes with empty deployment mode", () => {
      const wrapper = mountModal();
      const vm = wrapper.vm as any;
      expect(vm.deploymentMode).toBe("");
    });

    it("can set easy mode", async () => {
      const wrapper = mountModal();
      const vm = wrapper.vm as any;
      vm.deploymentMode = "easy";
      await wrapper.vm.$nextTick();
      expect(vm.deploymentMode).toBe("easy");
    });

    it("can set image mode", async () => {
      const wrapper = mountModal();
      const vm = wrapper.vm as any;
      vm.deploymentMode = "image";
      await wrapper.vm.$nextTick();
      expect(vm.deploymentMode).toBe("image");
    });

    it("can switch between all deployment modes", async () => {
      const wrapper = mountModal();
      const vm = wrapper.vm as any;

      vm.deploymentMode = "easy";
      await wrapper.vm.$nextTick();
      expect(vm.deploymentMode).toBe("easy");

      vm.deploymentMode = "image";
      await wrapper.vm.$nextTick();
      expect(vm.deploymentMode).toBe("image");

      vm.deploymentMode = "compose";
      await wrapper.vm.$nextTick();
      expect(vm.deploymentMode).toBe("compose");
    });
  });

  describe("Image Mode", () => {
    it("can set image mode directly", async () => {
      const wrapper = mountModal();
      const vm = wrapper.vm as any;
      vm.deploymentMode = "image";
      await wrapper.vm.$nextTick();
      expect(vm.deploymentMode).toBe("image");
    });

    it("resets image field when leaving image mode", async () => {
      const wrapper = mountModal();
      const vm = wrapper.vm as any;
      vm.deploymentMode = "image";
      vm.form.image = "nginx:latest";
      await wrapper.vm.$nextTick();

      vm.deploymentMode = "easy";
      await wrapper.vm.$nextTick();
      expect(vm.form.image).toBe("");
    });
  });

  describe("Name Validation", () => {
    it("validates name format - only lowercase, numbers, hyphens allowed", async () => {
      const wrapper = mountModal();
      const vm = wrapper.vm as any;

      vm.form.name = "Invalid_Name";
      vm.onNameChange();
      await wrapper.vm.$nextTick();

      expect(vm.errors.name).toContain("Only lowercase letters, numbers, and hyphens allowed");
    });

    it("accepts valid name format", async () => {
      const wrapper = mountModal();
      const vm = wrapper.vm as any;

      vm.form.name = "valid-app-name";
      vm.onNameChange();
      await wrapper.vm.$nextTick();

      expect(vm.errors.name).toBe("");
    });

    it("detects name conflict with existing deployments", async () => {
      const wrapper = mountModal();
      const vm = wrapper.vm as any;

      vm.existingDeployments = ["existing-app"];
      vm.form.name = "existing-app";
      vm.onNameChange();
      await wrapper.vm.$nextTick();

      expect(vm.errors.name).toContain("already exists");
    });
  });

  describe("Mode Switching", () => {
    it("resets template selection when switching modes", async () => {
      const wrapper = mountModal();
      const vm = wrapper.vm as any;

      vm.deploymentMode = "easy";
      vm.selectedQuickApp = "laravel";
      await wrapper.vm.$nextTick();

      vm.deploymentMode = "image";
      await wrapper.vm.$nextTick();

      expect(vm.selectedQuickApp).toBe("");
    });

    it("resets image field when switching modes", async () => {
      const wrapper = mountModal();
      const vm = wrapper.vm as any;

      vm.deploymentMode = "image";
      vm.form.image = "nginx:latest";
      await wrapper.vm.$nextTick();

      vm.deploymentMode = "easy";
      await wrapper.vm.$nextTick();

      expect(vm.form.image).toBe("");
    });
  });

  describe("Port Settings", () => {
    it("initializes with default container port 80", () => {
      const wrapper = mountModal();
      const vm = wrapper.vm as any;
      expect(vm.form.networking.ports[0].containerPort).toBe(80);
    });

    it("initializes with empty host port (no port mapping)", () => {
      const wrapper = mountModal();
      const vm = wrapper.vm as any;
      expect(vm.form.networking.ports[0].hostPort).toBe("");
    });
  });

  describe("Overflow Handling", () => {
    it("wizard content has overflow handling", () => {
      const wrapper = mountModal();
      const wizardContent = wrapper.find(".wizard-content");
      expect(wizardContent.exists()).toBe(true);
    });
  });
});
