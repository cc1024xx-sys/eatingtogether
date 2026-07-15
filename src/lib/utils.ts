import { addDays, differenceInDays, format, parseISO } from "date-fns";
import { zhCN } from "date-fns/locale";
import type { ExpiryStatus } from "./types";

export function getExpiryStatus(expiryDate: string | Date): ExpiryStatus {
  const expiry = typeof expiryDate === "string" ? parseISO(expiryDate) : expiryDate;
  const days = differenceInDays(expiry, new Date());

  if (days < 0) return "expired";
  if (days <= 3) return "urgent";
  if (days <= 7) return "warning";
  return "fresh";
}

export function getExpiryLabel(status: ExpiryStatus): string {
  switch (status) {
    case "urgent":
      return "临期";
    case "warning":
      return "尽快食用";
    case "expired":
      return "已过期";
    default:
      return "新鲜";
  }
}

export function getExpiryColor(status: ExpiryStatus): string {
  switch (status) {
    case "urgent":
      return "bg-[#E98B75] text-white";
    case "warning":
      return "bg-[#F7D070] text-[#4A3E3D]";
    case "expired":
      return "bg-[#C4A8A0] text-white";
    default:
      return "bg-[#E8DFD4] text-[#4A3E3D]";
  }
}

export function formatDate(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "M月d日", { locale: zhCN });
}

export function formatDateTime(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "M月d日 HH:mm", { locale: zhCN });
}

export function todayString(): string {
  return format(new Date(), "yyyy-MM-dd");
}

export function offsetDateString(days: number): string {
  return format(addDays(new Date(), days), "yyyy-MM-dd");
}

export function getMealPlanDayLabel(dateStr: string): string {
  if (dateStr === todayString()) return "今天";
  if (dateStr === offsetDateString(1)) return "明天";
  return formatDate(dateStr);
}

export function formatDateInput(date: string | Date): string {
  const d = typeof date === "string" ? parseISO(date) : date;
  return format(d, "yyyy-MM-dd");
}

export function defaultExpiryDateInput(days = 7): string {
  return format(addDays(new Date(), days), "yyyy-MM-dd");
}

export function parseDateInput(value: string): Date {
  return parseISO(value);
}

export async function bumpSyncVersion() {
  await fetch("/api/sync", { method: "POST" });
}
