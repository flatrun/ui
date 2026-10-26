import { shallowRef } from "vue";
import { templatesApi } from "@/services/api";
import { imageLogos, type ImageLogos } from "@/lib/project-logo";

const logos = shallowRef<ImageLogos>({});
let loading: Promise<void> | undefined;

// Loaded once per page. Without the templates permission or the agent, projects keep the icons
// of their images.
export function useTemplateLogos() {
  loading ??= Promise.resolve()
    .then(() => templatesApi.list())
    .then((res) => {
      logos.value = imageLogos(res.data.templates ?? []);
    })
    .catch(() => undefined);
  return logos;
}
