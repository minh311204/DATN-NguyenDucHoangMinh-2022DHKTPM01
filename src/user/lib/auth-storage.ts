/** Khóa localStorage — đồng bộ với login/register. */

/** Cùng tab không nhận `storage` event — dùng sự kiện này để đồng bộ header / account. */
export const AUTH_CHANGED_EVENT = "travela-auth-changed";

function emitAuthChanged() {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(AUTH_CHANGED_EVENT));
}

export const AUTH_KEYS = {
  accessToken: "accessToken",
  refreshToken: "refreshToken",
  userEmail: "userEmail",
} as const;

export function getStoredUserEmail(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_KEYS.userEmail);
}

export function setUserEmail(email: string) {
  localStorage.setItem(AUTH_KEYS.userEmail, email.trim());
}

export function clearAuthStorage() {
  localStorage.removeItem(AUTH_KEYS.accessToken);
  localStorage.removeItem(AUTH_KEYS.refreshToken);
  localStorage.removeItem(AUTH_KEYS.userEmail);
  emitAuthChanged();
}

export function hasAccessToken(): boolean {
  if (typeof window === "undefined") return false;
  return !!localStorage.getItem(AUTH_KEYS.accessToken);
}

export function getStoredRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(AUTH_KEYS.refreshToken);
}

/** Gọi sau khi cập nhật token trong cùng tab (vd. refresh) để UI đồng bộ. */
export function notifyAuthChanged() {
  emitAuthChanged();
}

/** Hai chữ cái hiển thị trên avatar (từ email hoặc tên). */
export function initialsFromEmail(email: string | null): string {
  if (!email) return "?";
  const local = email.split("@")[0] ?? email;
  const parts = local.replace(/[^a-zA-ZÀ-ỹ0-9]/g, " ").trim().split(/\s+/);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }
  return local.slice(0, 2).toUpperCase();
}
