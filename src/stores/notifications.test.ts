import { beforeEach, describe, expect, it, vi } from "vitest";
import { createPinia, setActivePinia } from "pinia";
import { useNotificationsStore } from "./notifications";

describe("notifications store", () => {
  beforeEach(() => {
    setActivePinia(createPinia());
    vi.useFakeTimers();
  });

  it("keeps one progress notification and dismisses it after completion", () => {
    const store = useNotificationsStore();
    const id = store.progress("Uploading folder", "0 of 4 files processed");

    vi.advanceTimersByTime(60_000);
    expect(store.notifications).toHaveLength(1);

    store.update(id, { message: "2 of 4 files processed", progress: 50 });
    expect(store.notifications).toHaveLength(1);
    expect(store.notifications[0]).toMatchObject({ type: "progress", progress: 50 });

    store.update(id, { type: "success", title: "Folder uploaded", message: "4 files uploaded", progress: 100 });
    vi.advanceTimersByTime(4_999);
    expect(store.notifications).toHaveLength(1);

    vi.advanceTimersByTime(1);
    expect(store.notifications).toHaveLength(0);
    vi.useRealTimers();
  });
});
