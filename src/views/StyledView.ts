import { defineAsyncComponent, defineComponent, h, type Component } from "vue";
import { useTheme } from "@/composables/useTheme";
import type { ShellLayout } from "@/themes/registry";

type Loader = () => Promise<Component | { default: Component }>;

// A route whose page differs by layout: Oak keeps its page, Birch gets its own.
export function styledView(pages: Record<ShellLayout, Loader>) {
  const oak = defineAsyncComponent(pages.oak);
  const birch = defineAsyncComponent(pages.birch);
  return defineComponent({
    name: "StyledView",
    setup() {
      const { current } = useTheme();
      return () => h(current.value.layout === "birch" ? birch : oak);
    },
  });
}
