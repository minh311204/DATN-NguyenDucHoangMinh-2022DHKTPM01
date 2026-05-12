"use client";

import {
  AUTH_KEYS,
  clearAuthStorage,
  notifyAuthChanged,
  setUserEmail,
} from "./auth-storage";
import { API_BASE_URL } from "./env";

async function postJson<T>(path: string, payload: unknown) {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false as const, status: res.status, body };
    return { ok: true as const, data: body as T };
  } catch {
    return { ok: false as const, networkError: true as const };
  }
}

export async function postLogin(email: string, password: string) {
  return postJson<{ accessToken: string; refreshToken: string; jti: string }>(
    "/auth/login",
    { email, password },
  );
}

export type RegisterPayload = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  password: string;
  passwordConfirm: string;
};

export async function postRegister(payload: RegisterPayload) {
  return postJson<{ message: string; email: string }>(
    "/auth/register",
    payload,
  );
}

export async function postVerifyEmail(token: string) {
  return postJson<{ accessToken: string; refreshToken: string; jti: string }>(
    "/auth/verify-email",
    { token },
  );
}

export async function postForgotPassword(email: string) {
  return postJson<{ message: string }>("/auth/forgot-password", { email });
}

export async function postResetPassword(token: string, password: string) {
  return postJson<{ message: string }>("/auth/reset-password", {
    token,
    password,
  });
}

export async function postOAuthGoogle(idToken: string) {
  return postJson<{ accessToken: string; refreshToken: string; jti: string }>(
    "/auth/oauth/google",
    { idToken },
  );
}

export async function postOAuthFacebook(accessToken: string) {
  return postJson<{ accessToken: string; refreshToken: string; jti: string }>(
    "/auth/oauth/facebook",
    { accessToken },
  );
}

export async function getMe(accessToken: string) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/me`, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false as const, status: res.status, body };
    return {
      ok: true as const,
      data: body as {
        id: number;
        email: string;
        firstName: string | null;
        lastName: string | null;
        phone: string | null;
        status: string;
        role: string;
        hasPassword: boolean;
      },
    };
  } catch {
    return { ok: false as const, networkError: true as const };
  }
}

export async function postRefreshTokens(refreshToken: string) {
  return postJson<{ accessToken: string; jti: string }>("/auth/refresh", {
    refreshToken,
  });
}

async function reconcileSessionInner(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const access = localStorage.getItem(AUTH_KEYS.accessToken);
  const refresh = localStorage.getItem(AUTH_KEYS.refreshToken);
  if (!access && !refresh) return false;

  if (access) {
    const me = await getMe(access);
    if (me.ok) return true;
    if ("networkError" in me && me.networkError) return true;
    /** Chỉ coi Bearer hết hạn khi máy chủ trả 401 — không làm sau lỗi mạng/5xx. */
    if (me.status !== 401) return true;
  }

  if (!refresh) {
    clearAuthStorage();
    return false;
  }

  const refreshed = await postRefreshTokens(refresh);
  if ("networkError" in refreshed && refreshed.networkError) return true;
  if (!refreshed.ok) {
    if (refreshed.status === 401) clearAuthStorage();
    return refreshed.status !== 401;
  }

  localStorage.setItem(AUTH_KEYS.accessToken, refreshed.data.accessToken);
  const me2 = await getMe(refreshed.data.accessToken);
  if ("networkError" in me2 && me2.networkError) {
    notifyAuthChanged();
    return true;
  }
  if (me2.ok) {
    setUserEmail(me2.data.email);
  }
  notifyAuthChanged();
  return true;
}

/** Xác minh Bearer với `/auth/me`; nếu 401 và còn refresh token thì gọi `/auth/refresh`. */
let sessionGate: Promise<boolean> | null = null;

export async function ensureSessionFresh(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  if (!sessionGate) {
    sessionGate = reconcileSessionInner().finally(() => {
      sessionGate = null;
    });
  }
  return sessionGate;
}

/** Lưu token và email (sau đăng nhập / xác nhận email). */
export async function storeAuthSession(accessToken: string, refreshToken: string) {
  localStorage.setItem(AUTH_KEYS.accessToken, accessToken);
  localStorage.setItem(AUTH_KEYS.refreshToken, refreshToken);
  const me = await getMe(accessToken);
  if (me.ok) {
    setUserEmail(me.data.email);
  }
  notifyAuthChanged();
}

export async function postChangePassword(
  accessToken: string,
  payload: { currentPassword?: string; newPassword: string },
) {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/change-password`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify(payload),
    });
    const body = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false as const, status: res.status, body };
    return { ok: true as const, data: body as { message: string } };
  } catch {
    return { ok: false as const, networkError: true as const };
  }
}
