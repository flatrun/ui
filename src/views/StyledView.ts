import { defineAsyncComponent, defineComponent, h, type Component } from "vue";
import { useTheme } from "@/composables/useTheme";
import type { ShellLayout } from "@/themes/registry";

type Loader = () => Promise<Component | { default: Component }>;

// A route whose page differs by style: Classic keeps its page, Modern gets its own.
export function styledView(pages: Record<ShellLayout, Loader>) {
  const classic = defineAsyncComponent(pages.classic);
  const modern = defineAsyncComponent(pages.modern);
  return defineComponent({
    name: "StyledView",
    setup() {
      const { current } = useTheme();
      return () => h(current.value.layout === "modern" ? modern : classic);
    },
  });
}
