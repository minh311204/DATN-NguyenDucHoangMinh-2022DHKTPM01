"use client";

import { io, type Socket } from "socket.io-client";
import { API_BASE_URL } from "./env";
import { AUTH_KEYS } from "./auth-storage";
import type { NotificationRealtimePayload } from "./api-types";

/** Kết nối namespace `/notifications`, JWT qua `auth.token`. */
export function subscribeToNotifications(
  onPayload: (p: NotificationRealtimePayload) => void,
): () => void {
  if (typeof window === "undefined") return () => {};
  const token = localStorage.getItem(AUTH_KEYS.accessToken);
  if (!token) return () => {};

  const socket: Socket = io(`${API_BASE_URL}/notifications`, {
    auth: { token },
    transports: ["websocket", "polling"],
    reconnectionAttempts: 8,
    reconnectionDelay: 1000,
  });

  socket.on("notification", onPayload);

  return () => {
    socket.off("notification", onPayload);
    socket.disconnect();
  };
}
