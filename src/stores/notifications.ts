import { defineStore } from "pinia";
import { ref } from "vue";

export interface Notification {
  id: string;
  type: "success" | "error" | "warning" | "info";
  title: string;
  message: string;
  duration?: number;
}

export const useNotificationsStore = defineStore("notifications", () => {
  const notifications = ref<Notification[]>([]);

  function add(notification: Omit<Notification, "id">) {
    const id = Date.now().toString() + Math.random().toString(36).substr(2, 9);
    const newNotification = { ...notification, id };
    notifications.value.push(newNotification);

    const duration = notification.duration || 5000;
    setTimeout(() => {
      remove(id);
    }, duration);
  }

  function remove(id: string) {
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

  return {
    notifications,
    add,
    remove,
    success,
    error,
    warning,
    info,
  };
});
