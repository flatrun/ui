import { describe, it, expect, vi, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
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
      data: { content: "version: '3'\nservices:\n  app:\n    image: nginx" },
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
    create: vi.fn().mockResolvedValue({ data: { message: "Created" } }),
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

  describe("Compose Mode Info", () => {
    it("displays Compose Mode information", () => {
      const wrapper = mountModal();
      expect(wrapper.text()).toContain("Compose Mode");
    });

    it("shows Full Control feature", () => {
      const wrapper = mountModal();
      expect(wrapper.text()).toContain("Full Control");
    });

    it("shows Multi-Service Support feature", () => {
      const wrapper = mountModal();
      expect(wrapper.text()).toContain("Multi-Service Support");
    });

    it("shows Advanced Options feature", () => {
      const wrapper = mountModal();
      expect(wrapper.text()).toContain("Advanced Options");
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
});
