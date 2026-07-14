"use client";

import { useEffect, useRef } from "react";
import {
  isPastDailyPushTime,
  markPushedToday,
  sendExpiryPushNotification,
  wasPushedToday,
  type ExpiryAlertItem,
} from "@/lib/expiryReminder";

export function useDailyExpiryPush() {
  const checkingRef = useRef(false);

  useEffect(() => {
    const checkAndPush = async () => {
      if (checkingRef.current) return;
      if (!isPastDailyPushTime() || wasPushedToday()) return;
      if (typeof window === "undefined" || !("Notification" in window)) return;
      if (Notification.permission !== "granted") return;

      checkingRef.current = true;
      try {
        const res = await fetch("/api/expiry-alert");
        const data = await res.json();
        const items = (data.expiring || []) as ExpiryAlertItem[];

        markPushedToday();

        if (items.length > 0) {
          await sendExpiryPushNotification(items);
        }
      } finally {
        checkingRef.current = false;
      }
    };

    checkAndPush();
    const id = setInterval(checkAndPush, 60_000);
    return () => clearInterval(id);
  }, []);
}
