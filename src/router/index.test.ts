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

  describe("under Birch", () => {
    beforeEach(() => useTheme().setStyle("birch"));

    it("serves deployments as projects", async () => {
      expect(await visit("/deployments")).toBe("/projects");
      expect(await visit("/deployments/shop?section=logs")).toBe("/projects/shop?section=logs");
      expect(router.currentRoute.value.name).toBe("deployment-detail");
    });

    it("has no separate canvas page", async () => {
      expect(await visit("/canvas")).toBe("/projects");
    });

    it("lands on the project list", async () => {
      await visit("/projects/shop");
      expect(await visit("/")).toBe("/projects");
    });

    it("names the pages in its own words", () => {
      const labels = visibleNavItems(() => true, "birch").map((i) => `${i.label} ${i.path}`);
      expect(labels).toContain("Projects /projects");
      expect(labels).toContain("Fleet /cluster");
      expect(labels.filter((l) => l.startsWith("Fleet"))).toHaveLength(1);
      expect(labels.some((l) => l.endsWith("/canvas"))).toBe(false);
    });
  });

  describe("under Oak", () => {
    beforeEach(() => useTheme().setStyle("oak"));

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
