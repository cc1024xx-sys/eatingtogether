import { format } from "date-fns";

export const DAILY_PUSH_HOUR = 7;
export const LAST_PUSH_KEY = "flavor-expiry-push-date";

export interface ExpiryAlertItem {
  id: string;
  name: string;
  daysLeft: number;
  status: "urgent" | "expired";
}

export function isPastDailyPushTime(now = new Date()): boolean {
  return now.getHours() >= DAILY_PUSH_HOUR;
}

export function getTodayKey(now = new Date()): string {
  return format(now, "yyyy-MM-dd");
}

export function wasPushedToday(): boolean {
  if (typeof window === "undefined") return true;
  return localStorage.getItem(LAST_PUSH_KEY) === getTodayKey();
}

export function markPushedToday(): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(LAST_PUSH_KEY, getTodayKey());
}

export function formatExpiryAlertItem(item: ExpiryAlertItem): string {
  if (item.status === "expired" || item.daysLeft < 0) {
    return `${item.name}(已过期)`;
  }
  if (item.daysLeft === 0) {
    return `${item.name}(今天到期)`;
  }
  return `${item.name}(还剩${item.daysLeft}天)`;
}

export function buildExpiryAlertMessage(items: ExpiryAlertItem[]): string {
  return items.map(formatExpiryAlertItem).join("、");
}

export async function sendExpiryPushNotification(items: ExpiryAlertItem[]) {
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted" || items.length === 0) return;

  const body = buildExpiryAlertMessage(items);
  new Notification("BC厨房 · 今日临期提醒", {
    body,
    icon: "/icons/icon-192.png",
    tag: `expiry-${getTodayKey()}`,
  });
}

export async function requestExpiryNotificationPermission(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) {
    return false;
  }
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const result = await Notification.requestPermission();
  return result === "granted";
}
