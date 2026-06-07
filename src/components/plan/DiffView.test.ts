import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import DiffView from "./DiffView.vue";

describe("DiffView", () => {
  it("marks removed and added lines", () => {
    const wrapper = mount(DiffView, {
      props: { before: "keep\nold\n", after: "keep\nnew\n" },
    });

    const removed = wrapper.findAll(".diff-line.removed");
    const added = wrapper.findAll(".diff-line.added");
    expect(removed).toHaveLength(1);
    expect(removed[0].text()).toContain("old");
    expect(added).toHaveLength(1);
    expect(added[0].text()).toContain("new");
  });

  it("keeps unchanged lines without diff classes", () => {
    const wrapper = mount(DiffView, {
      props: { before: "keep\nold\n", after: "keep\nnew\n" },
    });

    const context = wrapper.findAll(".diff-line:not(.added):not(.removed)");
    expect(context).toHaveLength(1);
    expect(context[0].text()).toContain("keep");
  });

  it("renders a pure create when before is null", () => {
    const wrapper = mount(DiffView, {
      props: { before: null, after: "line one\nline two\n" },
    });

    expect(wrapper.findAll(".diff-line.added")).toHaveLength(2);
    expect(wrapper.findAll(".diff-line.removed")).toHaveLength(0);
  });

  it("renders a pure delete when after is null", () => {
    const wrapper = mount(DiffView, {
      props: { before: "line one\nline two\n", after: null },
    });

    expect(wrapper.findAll(".diff-line.removed")).toHaveLength(2);
    expect(wrapper.findAll(".diff-line.added")).toHaveLength(0);
  });
});
