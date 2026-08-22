import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import NotificationsView from "./NotificationsView.vue";

describe("NotificationsView", () => {
  it("keeps the notification guide with the page context", () => {
    const wrapper = mount(NotificationsView, {
      global: {
        stubs: {
          NotificationsSettings: true,
        },
      },
    });

    const guide = wrapper.get('a[href="https://flatrun.dev/docs/ui/notifications"]');
    expect(guide.text()).toContain("Guide");
    expect(guide.attributes("target")).toBe("_blank");
  });
});
