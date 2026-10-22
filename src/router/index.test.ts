import { beforeEach, describe, expect, it } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import router from "@/router";
import { useAuthStore } from "@/stores/auth";
import { useTheme } from "@/composables/useTheme";
import { visibleNavItems } from "@/navigation/items";

async function visit(path: string) {
  await router.push(path);
  return router.currentRoute.value.fullPath;
}

describe("router", () => {
  beforeEach(async () => {
    localStorage.clear();
    localStorage.setItem("auth_token", "session");
    setActivePinia(createPinia());
    useAuthStore().permissions = ["deployments:read", "cluster:read"];
    await router.push("/login").catch(() => {});
  });

  describe("under Modern", () => {
    beforeEach(() => useTheme().setStyle("modern"));

    it("serves deployments as projects", async () => {
      expect(await visit("/deployments")).toBe("/projects");
      expect(await visit("/deployments/shop?section=logs")).toBe("/projects/shop?section=logs");
      expect(router.currentRoute.value.name).toBe("deployment-detail");
    });

    it("has no separate canvas page", async () => {
      expect(await visit("/canvas")).toBe("/projects");
    });

    it("lands on the last project opened, or the project list", async () => {
      expect(await visit("/")).toBe("/projects");
      await visit("/projects/shop");
      await visit("/settings").catch(() => {});
      expect(await visit("/")).toBe("/projects/shop");
    });

    it("names the pages in its own words", () => {
      const labels = visibleNavItems(() => true, "modern").map((i) => `${i.label} ${i.path}`);
      expect(labels).toContain("Projects /projects");
      expect(labels).toContain("Fleet /cluster");
      expect(labels.filter((l) => l.startsWith("Fleet"))).toHaveLength(1);
      expect(labels.some((l) => l.endsWith("/canvas"))).toBe(false);
    });
  });

  describe("under Classic", () => {
    beforeEach(() => useTheme().setStyle("classic"));

    it("keeps deployments and the canvas where they were", async () => {
      expect(await visit("/projects/shop")).toBe("/deployments/shop");
      expect(await visit("/canvas")).toBe("/canvas");
    });

    it("keeps its page names", () => {
      const labels = visibleNavItems(() => true).map((i) => `${i.label} ${i.path}`);
      expect(labels).toContain("Canvas /canvas");
      expect(labels).toContain("Deployments /deployments");
    });
  });
});
