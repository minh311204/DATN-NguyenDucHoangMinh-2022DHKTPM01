"use client";

import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "./env";
import { AUTH_KEYS } from "./auth-storage";
import type { NotificationRealtimePayload } from "./api-types";
import type { BookingListItem } from "./client-booking";

/** Payload socket `booking_updated` — booking dạng list như GET /bookings/me */
export type BookingUpdatedRealtimePayload = {
  booking: BookingListItem;
};

const notificationListeners = new Set<
  (p: NotificationRealtimePayload) => void
>();
const bookingUpdatedListeners = new Set<
  (p: BookingUpdatedRealtimePayload) => void
>();

let sharedSocket: Socket | null = null;

function dispatchNotification(p: NotificationRealtimePayload) {
  notificationListeners.forEach((fn) => {
    try {
      fn(p);
    } catch {
      /* subscriber lỗi không làm hỏng hub */
    }
  });
}

function dispatchBookingUpdated(raw: unknown) {
  if (raw == null || typeof raw !== "object" || !("booking" in raw)) return;
  bookingUpdatedListeners.forEach((fn) => {
    try {
      fn(raw as BookingUpdatedRealtimePayload);
    } catch {
      /* ignore */
    }
  });
}

function teardownSharedSocketIfIdle() {
  if (
    notificationListeners.size !== 0 ||
    bookingUpdatedListeners.size !== 0 ||
    sharedSocket == null
  ) {
    return;
  }
  sharedSocket.off("notification", dispatchNotification);
  sharedSocket.off("booking_updated", dispatchBookingUpdated);
  sharedSocket.disconnect();
  sharedSocket = null;
}

function ensureSharedSocket(): Socket | null {
  if (typeof window === "undefined") return null;
  const token = localStorage.getItem(AUTH_KEYS.accessToken);
  if (!token) return null;

  if (sharedSocket != null) return sharedSocket;

  const socket: Socket = io(`${API_BASE_URL}/notifications`, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
  });

  socket.on("notification", dispatchNotification);
  socket.on("booking_updated", dispatchBookingUpdated);

  sharedSocket = socket;
  return sharedSocket;
}

/** Chuông thông báo — đăng ký listener `notification` trên socket dùng chung. */
export function subscribeToNotifications(
  onPayload: (p: NotificationRealtimePayload) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const sock = ensureSharedSocket();
  if (!sock) return () => {};

  notificationListeners.add(onPayload);

  return () => {
    notificationListeners.delete(onPayload);
    teardownSharedSocketIfIdle();
  };
}

/** Trang đặt chỗ — `booking_updated` trên cùng một kết nối với chuông (tránh mất sự kiện). */
export function subscribeToBookingUpdates(
  onBookingUpdated: (p: BookingUpdatedRealtimePayload) => void,
): () => void {
  if (typeof window === "undefined") return () => {};

  const sock = ensureSharedSocket();
  if (!sock) return () => {};

  bookingUpdatedListeners.add(onBookingUpdated);

  return () => {
    bookingUpdatedListeners.delete(onBookingUpdated);
    teardownSharedSocketIfIdle();
  };
}
