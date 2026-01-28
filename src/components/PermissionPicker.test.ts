import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import PermissionPicker from "./PermissionPicker.vue";

describe("PermissionPicker", () => {
  const mountPicker = (props: { modelValue: string[]; readonly?: boolean }) => {
    return mount(PermissionPicker, { props });
  };

  describe("Rendering", () => {
    it("renders all permission groups", () => {
      const wrapper = mountPicker({ modelValue: [] });
      const groups = wrapper.findAll(".permission-group");
      expect(groups.length).toBe(20);
    });

    it("displays group labels", () => {
      const wrapper = mountPicker({ modelValue: [] });
      const text = wrapper.text();
      expect(text).toContain("Deployments");
      expect(text).toContain("Containers");
      expect(text).toContain("Databases");
      expect(text).toContain("Infrastructure");
      expect(text).toContain("DNS");
      expect(text).toContain("Audit");
    });

    it("displays read/write/delete labels within groups", () => {
      const wrapper = mountPicker({ modelValue: [] });
      const text = wrapper.text();
      expect(text).toContain("Read");
      expect(text).toContain("Write");
      expect(text).toContain("Delete");
    });
  });

  describe("Selection state", () => {
    it("checks selected permissions", () => {
      const wrapper = mountPicker({
        modelValue: ["deployments:read", "containers:write"],
      });
      const checkboxes = wrapper.findAll("input[type='checkbox']");
      const checked = checkboxes.filter((cb) => (cb.element as HTMLInputElement).checked);
      // 2 individual + their group toggles may or may not be checked
      expect(checked.length).toBeGreaterThanOrEqual(2);
    });

    it("shows group as fully selected when all permissions are selected", () => {
      const wrapper = mountPicker({
        modelValue: ["deployments:read", "deployments:write", "deployments:delete"],
      });
      // First group toggle checkbox should be checked
      const groupToggle = wrapper.find(".group-toggle input[type='checkbox']");
      expect((groupToggle.element as HTMLInputElement).checked).toBe(true);
    });

    it("shows group as indeterminate when partially selected", () => {
      const wrapper = mountPicker({
        modelValue: ["deployments:read"],
      });
      const groupToggle = wrapper.find(".group-toggle input[type='checkbox']");
      expect((groupToggle.element as HTMLInputElement).indeterminate).toBe(true);
    });

    it("shows group toggle unchecked when no permissions selected", () => {
      const wrapper = mountPicker({ modelValue: [] });
      const groupToggle = wrapper.find(".group-toggle input[type='checkbox']");
      expect((groupToggle.element as HTMLInputElement).checked).toBe(false);
      expect((groupToggle.element as HTMLInputElement).indeterminate).toBe(false);
    });
  });

  describe("Toggling permissions", () => {
    it("emits update when toggling a permission on", async () => {
      const wrapper = mountPicker({ modelValue: [] });
      const permCheckboxes = wrapper.findAll(".permission-item input[type='checkbox']");
      await permCheckboxes[0].trigger("change");
      const emitted = wrapper.emitted("update:modelValue");
      expect(emitted).toBeTruthy();
      expect(emitted![0][0]).toContain("deployments:read");
    });

    it("emits update when toggling a permission off", async () => {
      const wrapper = mountPicker({
        modelValue: ["deployments:read", "deployments:write"],
      });
      const permCheckboxes = wrapper.findAll(".permission-item input[type='checkbox']");
      await permCheckboxes[0].trigger("change");
      const emitted = wrapper.emitted("update:modelValue");
      expect(emitted).toBeTruthy();
      expect(emitted![0][0]).not.toContain("deployments:read");
      expect(emitted![0][0]).toContain("deployments:write");
    });

    it("selects all group permissions when toggling group on", async () => {
      const wrapper = mountPicker({ modelValue: [] });
      const groupToggle = wrapper.find(".group-toggle input[type='checkbox']");
      await groupToggle.trigger("change");
      const emitted = wrapper.emitted("update:modelValue");
      expect(emitted).toBeTruthy();
      const value = emitted![0][0] as string[];
      expect(value).toContain("deployments:read");
      expect(value).toContain("deployments:write");
      expect(value).toContain("deployments:delete");
    });

    it("deselects all group permissions when toggling fully selected group off", async () => {
      const wrapper = mountPicker({
        modelValue: ["deployments:read", "deployments:write", "deployments:delete"],
      });
      const groupToggle = wrapper.find(".group-toggle input[type='checkbox']");
      await groupToggle.trigger("change");
      const emitted = wrapper.emitted("update:modelValue");
      expect(emitted).toBeTruthy();
      const value = emitted![0][0] as string[];
      expect(value).not.toContain("deployments:read");
      expect(value).not.toContain("deployments:write");
      expect(value).not.toContain("deployments:delete");
    });

    it("preserves other groups when toggling one group", async () => {
      const wrapper = mountPicker({
        modelValue: ["containers:read"],
      });
      const groupToggle = wrapper.find(".group-toggle input[type='checkbox']");
      await groupToggle.trigger("change");
      const emitted = wrapper.emitted("update:modelValue");
      const value = emitted![0][0] as string[];
      expect(value).toContain("containers:read");
      expect(value).toContain("deployments:read");
    });
  });

  describe("Readonly mode", () => {
    it("hides checkboxes in readonly mode", () => {
      const wrapper = mountPicker({
        modelValue: ["deployments:read"],
        readonly: true,
      });
      expect(wrapper.findAll("input[type='checkbox']").length).toBe(0);
    });

    it("shows granted/denied indicators in readonly mode", () => {
      const wrapper = mountPicker({
        modelValue: ["deployments:read"],
        readonly: true,
      });
      expect(wrapper.findAll(".readonly-indicator.granted").length).toBeGreaterThan(0);
      expect(wrapper.findAll(".readonly-indicator.denied").length).toBeGreaterThan(0);
    });

    it("hides group toggle checkboxes in readonly mode", () => {
      const wrapper = mountPicker({
        modelValue: [],
        readonly: true,
      });
      expect(wrapper.findAll(".group-toggle").length).toBe(0);
    });

    it("still renders group labels in readonly mode", () => {
      const wrapper = mountPicker({
        modelValue: [],
        readonly: true,
      });
      expect(wrapper.text()).toContain("Deployments");
      expect(wrapper.text()).toContain("Containers");
    });
  });
});
