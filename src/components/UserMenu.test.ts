import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import UserMenu from "./UserMenu.vue";
import { listThemes } from "@/themes/registry";

describe("UserMenu", () => {
  it("lists every registered theme and emits the one picked", async () => {
    const wrapper = mount(UserMenu, {
      props: { username: "admin", role: "admin", theme: "flatrun", themes: listThemes() },
    });

    await wrapper.get("summary").trigger("click");
    const options = wrapper.findAll("[role=radio]");
    expect(options.map((o) => o.text())).toEqual(["FlatRun", "Light", "Dark"]);
    expect(options[0].attributes("aria-checked")).toBe("true");

    await options[1].trigger("click");

    expect(wrapper.emitted("select-theme")).toEqual([["light"]]);
    expect(wrapper.get("details").attributes("open")).toBeUndefined();
    expect(wrapper.text()).toContain("Sign out");
  });
});
