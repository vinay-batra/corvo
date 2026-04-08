"use client";

const PERM_KEY = "corvo_notif_permission";

export function usePushNotifications() {
  function getPermission(): NotificationPermission | "unknown" {
    if (typeof window === "undefined" || !("Notification" in window)) return "unknown";
    return Notification.permission;
  }

  function isGranted() {
    return getPermission() === "granted";
  }

  async function requestPermission(): Promise<boolean> {
    if (typeof window === "undefined" || !("Notification" in window)) return false;
    try {
      const result = await Notification.requestPermission();
      if (typeof localStorage !== "undefined") {
        localStorage.setItem(PERM_KEY, result);
      }
      return result === "granted";
    } catch {
      return false;
    }
  }

  function notify(title: string, body: string, tag?: string) {
    if (!isGranted()) return;
    try {
      new Notification(title, {
        body,
        icon: "/corvo-logo.svg",
        tag: tag || title,
        silent: false,
      });
    } catch {}
  }

  return { requestPermission, isGranted, getPermission, notify };
}
