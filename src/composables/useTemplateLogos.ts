import { shallowRef } from "vue";
import { templatesApi } from "@/services/api";
import { noTemplateLogos, templateLogos, type TemplateLogos } from "@/lib/project-logo";

const logos = shallowRef<TemplateLogos>(noTemplateLogos);
let loading: Promise<void> | undefined;

// Loaded once per page. Without the templates permission or the agent, projects keep the icons
// of their images.
export function useTemplateLogos() {
  loading ??= Promise.resolve()
    .then(() => templatesApi.list())
    .then((res) => {
      logos.value = templateLogos(res.data.templates ?? []);
    })
    .catch(() => undefined);
  return logos;
}
