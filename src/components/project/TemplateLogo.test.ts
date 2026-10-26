import { mount } from "@vue/test-utils";
import { describe, expect, it } from "vitest";
import TemplateLogo from "./TemplateLogo.vue";
import templatesFixture from "@/lib/fixtures/templates-with-logos.json";
import { apiAsset } from "@/lib/project-logo";

describe("TemplateLogo", () => {
  it("shows the file the agent serves, and a box when it fails to load", async () => {
    const logo = mount(TemplateLogo, { props: { logo: templatesFixture.templates[1].logo, alt: "WordPress" } });
    expect(logo.get("img").attributes("src")).toBe(apiAsset("/api/templates/wordpress/logo"));
    await logo.get("img").trigger("error");
    expect(logo.find("img").exists()).toBe(false);
  });

  it("shows an icon id as an icon and a missing logo as a box", () => {
    expect(
      mount(TemplateLogo, { props: { logo: "logos:redis" } })
        .find("img")
        .exists(),
    ).toBe(false);
    expect(mount(TemplateLogo).find("img").exists()).toBe(false);
  });
});
