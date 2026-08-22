import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import UserMenu from "./UserMenu.vue";

describe("UserMenu", () => {
  it("moves theme and sign out actions into the account menu", async () => {
    const wrapper = mount(UserMenu, { props: { username: "admin", role: "admin", theme: "dark" } });

    await wrapper.get("summary").trigger("click");
    await wrapper.get(".user-menu-panel button").trigger("click");

    expect(wrapper.emitted("toggle-theme")).toHaveLength(1);
    expect(wrapper.get("details").attributes("open")).toBeUndefined();
    expect(wrapper.text()).toContain("Sign out");
  });
});
