import { ref } from "vue";
import { useNotificationsStore } from "@/stores/notifications";

// Tracks which individual actions are in progress (keyed by a caller-supplied
// string, e.g. `${id}:restart`) so per-row buttons can show a spinner and
// disable while the action runs, with a toast on success or failure.
export function useActionRunner() {
  const busy = ref<Set<string>>(new Set());
  const notifications = useNotificationsStore();

  const isBusy = (key: string) => busy.value.has(key);

  async function run(
    key: string,
    fn: () => Promise<unknown>,
    opts: { success?: string; error?: string } = {},
  ): Promise<void> {
    if (busy.value.has(key)) return;
    busy.value = new Set(busy.value).add(key);
    try {
      await fn();
      if (opts.success) notifications.success(opts.success);
    } catch (e) {
      const detail = e instanceof Error ? e.message : "";
      notifications.error(opts.error ?? "Action failed", detail);
    } finally {
      const next = new Set(busy.value);
      next.delete(key);
      busy.value = next;
    }
  }

  return { isBusy, run };
}
