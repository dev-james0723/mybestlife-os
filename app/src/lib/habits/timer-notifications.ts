const SW_PATH = "/sw.js";

export async function prepareTimerNotifications(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window) || !("serviceWorker" in navigator)) return false;
  try {
    await navigator.serviceWorker.register(SW_PATH);
    const permission = Notification.permission as NotificationPermission;
    if (permission === "granted") return true;
    if (permission === "default") {
      const permission = await Notification.requestPermission();
      return permission === "granted";
    }
  } catch {
    return false;
  }
  return (Notification.permission as NotificationPermission) === "granted";
}

export async function notifyTimerComplete(title: string, body: string): Promise<void> {
  if (typeof window === "undefined") return;
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  try {
    if ("serviceWorker" in navigator) {
      const registration = await navigator.serviceWorker.getRegistration(SW_PATH);
      await registration?.showNotification(title, {
        body,
        tag: "mylifeos-habit-timer",
      });
      return;
    }
    new Notification(title, { body, tag: "mylifeos-habit-timer" });
  } catch {
    // Notifications are best-effort only; timestamp persistence is the source of truth.
  }
}
