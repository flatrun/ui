import { defineStore } from "pinia";
import { ref } from "vue";

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info" | "progress";
  title: string;
  message: string;
  duration?: number;
  progress?: number;
}

export const useNotificationsStore = defineStore("notifications", () => {
  const notifications = ref<Notification[]>([]);
  const removalTimers = new Map<string, ReturnType<typeof setTimeout>>();

  function scheduleRemoval(notification: Notification) {
    const existingTimer = removalTimers.get(notification.id);
    if (existingTimer) clearTimeout(existingTimer);
    removalTimers.delete(notification.id);

    if (notification.type === "progress") return;

    const duration = notification.duration ?? (notification.type === "error" ? 8000 : 5000);
    const timer = setTimeout(() => remove(notification.id), duration);
    removalTimers.set(notification.id, timer);
  }

  function add(notification: Omit<Notification, "id">) {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    notifications.value.push(newNotification);
    scheduleRemoval(newNotification);
    return id;
  }

  function update(id: string, changes: Partial<Omit<Notification, "id">>) {
    const notification = notifications.value.find((item) => item.id === id);
    if (!notification) return;
    Object.assign(notification, changes);
    scheduleRemoval(notification);
  }

  function remove(id: string) {
    const timer = removalTimers.get(id);
    if (timer) clearTimeout(timer);
    removalTimers.delete(id);
    const index = notifications.value.findIndex((n) => n.id === id);
    if (index > -1) {
      notifications.value.splice(index, 1);
    }
  }

  function success(title: string, message: string = "") {
    add({ type: "success", title, message });
  }

  function error(title: string, message: string = "") {
    add({ type: "error", title, message, duration: 8000 });
  }

  function warning(title: string, message: string = "") {
    add({ type: "warning", title, message });
  }

  function info(title: string, message: string = "") {
    add({ type: "info", title, message });
  }

  function progress(title: string, message: string = "", value: number = 0) {
    return add({ type: "progress", title, message, progress: Math.min(100, Math.max(0, value)) });
  }

  return {
    notifications,
    add,
    update,
    remove,
    success,
    error,
    warning,
    info,
    progress,
  };
});
