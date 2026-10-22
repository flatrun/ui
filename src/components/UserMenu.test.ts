import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import UserMenu from "./UserMenu.vue";
import { listStyles } from "@/themes/registry";

describe("UserMenu", () => {
  it("lists every style and appearance and emits the one picked", async () => {
    const wrapper = mount(UserMenu, {
      props: { username: "admin", role: "admin", styleId: "modern", styles: listStyles(), scheme: "system" },
    });

    await wrapper.get("summary").trigger("click");
    const styleOptions = wrapper.findAll("[aria-label=Style] [role=radio]");
    expect(styleOptions.map((o) => o.find(".style-copy").element.firstChild?.textContent?.trim())).toEqual([
      "Modern",
      "Classic",
    ]);
    expect(styleOptions[0].attributes("aria-checked")).toBe("true");

    const schemeOptions = wrapper.findAll("[aria-label=Appearance] [role=radio]");
    expect(schemeOptions.map((o) => o.text())).toEqual(["Light", "Dark", "Auto"]);
    expect(schemeOptions[2].attributes("aria-checked")).toBe("true");

    await styleOptions[1].trigger("click");
    await schemeOptions[1].trigger("click");

    expect(wrapper.emitted("select-style")).toEqual([["classic"]]);
    expect(wrapper.emitted("select-scheme")).toEqual([["dark"]]);
    expect(wrapper.text()).toContain("Sign out");
  });
});
