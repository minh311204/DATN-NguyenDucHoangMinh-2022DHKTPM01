"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, X } from "lucide-react";
import type { TourListItem } from "@/lib/api-types";
import { postAiMessage } from "@/lib/client-ai";
import { formatVnd } from "@/lib/format";
import { stripChatMarkdown } from "@/lib/strip-chat-markdown";
import {
  AUTH_CHANGED_EVENT,
  getStoredUserEmail,
  hasAccessToken,
} from "@/lib/auth-storage";

type ChatRole = "user" | "assistant";
type ChatItem =
  | { type: "message"; role: ChatRole; content: string }
  | { type: "tours"; tours: TourListItem[] };

/** Mở/đóng panel chat — không gắn user (thiết bị). */
const KEY_MINIMIZED = "aiChat.minimized";

/** Flat keys cũ (trước khi nhánh theo user) — migrate một lần khi có user + bucket trống. */
const LEGACY = {
  sessionId: "aiChat.sessionId",
  sessionKey: "aiChat.sessionKey",
  messages: "aiChat.messages",
} as const;

function userScopedPrefix(emailNorm: string): string {
  return `aiChat:user:${encodeURIComponent(emailNorm)}:`;
}

/** Prefix localStorage phiên AI cho user đang đăng nhập; null khi khách hoặc chưa có email trong storage. */
function getPersistedAiPrefix(): string | null {
  if (!hasAccessToken()) return null;
  const raw = getStoredUserEmail()?.trim().toLowerCase();
  return raw ? userScopedPrefix(raw) : null;
}

const WELCOME: ChatItem = {
  type: "message",
  role: "assistant",
  content:
    "Chào bạn! Bạn muốn đi đâu, đi mấy ngày và ngân sách khoảng bao nhiêu? Mình có thể gợi ý tour phù hợp.",
};

function safeJson<T>(raw: string | null, fallback: T): T {
  if (!raw) return fallback;
  try {
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function readStoredNumberForFullKey(fullKey: string): number | undefined {
  if (typeof window === "undefined") return undefined;
  const v = localStorage.getItem(fullKey);
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
}

function migrateLegacyToUserScoped(prefix: string) {
  if (typeof window === "undefined") return;
  try {
    const already = localStorage.getItem(`${prefix}messages`);
    if (already != null && already !== "") return;

    const legacyMsgs = safeJson<ChatItem[]>(
      localStorage.getItem(LEGACY.messages),
      [],
    );
    if (!Array.isArray(legacyMsgs) || legacyMsgs.length === 0) return;

    localStorage.setItem(`${prefix}messages`, JSON.stringify(legacyMsgs.slice(-60)));
    const lsId = localStorage.getItem(LEGACY.sessionId);
    if (lsId) localStorage.setItem(`${prefix}sessionId`, lsId);
    const lsKey = localStorage.getItem(LEGACY.sessionKey);
    if (lsKey) localStorage.setItem(`${prefix}sessionKey`, lsKey);

    localStorage.removeItem(LEGACY.messages);
    localStorage.removeItem(LEGACY.sessionId);
    localStorage.removeItem(LEGACY.sessionKey);
  } catch {
    // ignore
  }
}

/** Đọc state chat đã lưu theo người dùng; `prefix` có sẵn (đã có token + email). */
function readPersistedUserChat(prefix: string): {
  messages: ChatItem[];
  sessionId: number | undefined;
  sessionKey: string | undefined;
} {
  migrateLegacyToUserScoped(prefix);
  const stored = safeJson<ChatItem[]>(
    localStorage.getItem(`${prefix}messages`),
    [],
  );
  const messages = stored.length > 0 ? stored : [WELCOME];
  const sessionId = readStoredNumberForFullKey(`${prefix}sessionId`);
  const sessionKey =
    localStorage.getItem(`${prefix}sessionKey`) ?? undefined;
  return { messages, sessionId, sessionKey };
}

export function ChatWidget() {
  const [open, setOpen] = useState(false);
  const [typing, setTyping] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draft, setDraft] = useState("");
  const [sessionId, setSessionId] = useState<number | undefined>(undefined);
  const [sessionKey, setSessionKey] = useState<string | undefined>(undefined);
  const [items, setItems] = useState<ChatItem[]>([WELCOME]);

  const listRef = useRef<HTMLDivElement | null>(null);
  const inputRef = useRef<HTMLTextAreaElement | null>(null);

  // Restore state: user đã đăng nhập → localStorage theo email; khách → chỉ WELCOME (không đọc LS session/messages)
  useEffect(() => {
    try {
      const storedMin = localStorage.getItem(KEY_MINIMIZED);
      if (storedMin === "false") setOpen(true);

      const prefix = getPersistedAiPrefix();
      if (prefix) {
        const { messages, sessionId: sid, sessionKey: sk } =
          readPersistedUserChat(prefix);
        setItems(messages);
        setSessionId(sid);
        setSessionKey(sk);
      } else {
        setItems([WELCOME]);
        setSessionId(undefined);
        setSessionKey(undefined);
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    function onAuthChanged() {
      try {
        const prefix = getPersistedAiPrefix();
        if (prefix) {
          const { messages, sessionId: sid, sessionKey: sk } =
            readPersistedUserChat(prefix);
          setItems(messages);
          setSessionId(sid);
          setSessionKey(sk);
        } else {
          setItems([WELCOME]);
          setSessionId(undefined);
          setSessionKey(undefined);
        }
      } catch {
        // ignore
      }
    }
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, []);

  // Scroll to bottom whenever messages change or panel opens
  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [items, typing, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 80);
  }, [open]);

  const canSend = useMemo(() => draft.trim().length > 0 && !busy, [draft, busy]);

  function persistMessages(next: ChatItem[]) {
    const prefix = getPersistedAiPrefix();
    if (!prefix) return;
    try {
      const trimmed = next.slice(-60);
      localStorage.setItem(`${prefix}messages`, JSON.stringify(trimmed));
    } catch {
      // ignore quota errors
    }
  }

  function persistAiSession(pid: number, pkey?: string | null) {
    const prefix = getPersistedAiPrefix();
    if (!prefix) return;
    try {
      localStorage.setItem(`${prefix}sessionId`, String(pid));
      if (pkey?.trim()) localStorage.setItem(`${prefix}sessionKey`, pkey.trim());
      else localStorage.removeItem(`${prefix}sessionKey`);
    } catch {
      // ignore
    }
  }

  async function send() {
    const msg = draft.trim();
    if (!msg || busy) return;

    setDraft("");
    setBusy(true);

    const userItem: ChatItem = { type: "message", role: "user", content: msg };
    setItems((prev) => {
      const next = [...prev, userItem];
      persistMessages(next);
      return next;
    });

    // Show typing indicator
    setTyping(true);

    const loggedIn = hasAccessToken();
    /** Khách (không JWT) chỉ được resume phiên có sessionKey — phiên chỉ của user chỉ được dùng lại sau khi đăng nhập lại */
    const validGuestResume =
      !loggedIn &&
      typeof sessionId === "number" &&
      Boolean(sessionKey?.trim());

    const res = await postAiMessage({
      sessionId:
        loggedIn || validGuestResume ? sessionId : undefined,
      sessionKey:
        loggedIn ? sessionKey : validGuestResume ? sessionKey : undefined,
      message: msg,
    });

    setTyping(false);

    if (!res.ok) {
      const errItem: ChatItem = {
        type: "message",
        role: "assistant",
        content: `Mình đang gặp lỗi khi kết nối (HTTP ${res.status}). Bạn thử lại sau hoặc kiểm tra backend đang chạy nhé.`,
      };
      setItems((prev) => {
        const next = [...prev, errItem];
        persistMessages(next);
        return next;
      });
      setBusy(false);
      return;
    }

    const nextSessionId = res.data.sessionId;
    const nextSessionKey = res.data.sessionKey;
    setSessionId(nextSessionId);
    setSessionKey(nextSessionKey);
    persistAiSession(nextSessionId, nextSessionKey);
    setItems((prev) => {
      const next: ChatItem[] = [
        ...prev,
        { type: "message", role: "assistant", content: res.data.reply },
      ];
      if (res.data.tours && res.data.tours.length > 0) {
        next.push({ type: "tours", tours: res.data.tours });
      }
      persistMessages(next);
      return next;
    });

    setBusy(false);
  }

  function toggle() {
    setOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(KEY_MINIMIZED, String(!next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function resetChat() {
    try {
      const prefix = getPersistedAiPrefix();
      if (prefix) {
        localStorage.removeItem(`${prefix}messages`);
        localStorage.removeItem(`${prefix}sessionId`);
        localStorage.removeItem(`${prefix}sessionKey`);
      }
    } catch {
      // ignore
    }
    setSessionId(undefined);
    setSessionKey(undefined);
    const resetMsg: ChatItem = {
      type: "message",
      role: "assistant",
      content: "Mình đã reset phiên chat. Bạn muốn tư vấn tour nào?",
    };
    setItems([WELCOME, resetMsg]);
  }

  return (
    <div className="fixed right-4 bottom-4 z-[60]">
      {!open ? (
        <button
          type="button"
          onClick={toggle}
          className="inline-flex items-center gap-2 rounded-full bg-sky-600 px-4 py-3 text-sm font-semibold text-white shadow-lg hover:bg-sky-700"
          aria-label="Mở chatbot"
        >
          <MessageCircle className="h-5 w-5" />
          Chat tư vấn
        </button>
      ) : (
        <div className="flex w-[min(92vw,24rem)] flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white shadow-2xl">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-stone-200 bg-gradient-to-r from-sky-600 to-blue-700 px-4 py-3 text-white">
            <div>
              <p className="text-sm font-semibold">Trợ lý tour</p>
              <p className="text-xs text-white/85">FAQ • Gợi ý tour • Theo lịch sử đặt</p>
            </div>
            <button
              type="button"
              onClick={toggle}
              className="rounded-full p-1 hover:bg-white/15"
              aria-label="Thu nhỏ"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Messages */}
          <div ref={listRef} className="max-h-[55vh] space-y-3 overflow-y-auto px-3 py-3">
            {items.map((it, idx) => {
              if (it.type === "tours") {
                return (
                  <div key={`tours-${idx}`} className="space-y-2">
                    {it.tours.map((t) => (
                      <MiniTourCard key={t.id} tour={t} />
                    ))}
                  </div>
                );
              }

              const mine = it.role === "user";
              const text =
                mine ? it.content : stripChatMarkdown(it.content);
              return (
                <div key={`m-${idx}`} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={[
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                      mine ? "bg-sky-600 text-white" : "bg-stone-100 text-stone-900",
                    ].join(" ")}
                  >
                    {text}
                  </div>
                </div>
              );
            })}

            {/* Typing indicator */}
            {typing && (
              <div className="flex justify-start">
                <div className="flex items-center gap-1 rounded-2xl bg-stone-100 px-4 py-3">
                  <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400 [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 animate-bounce rounded-full bg-stone-400" />
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <div className="border-t border-stone-200 p-3">
            <div className="flex items-end gap-2">
              <textarea
                ref={inputRef}
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    void send();
                  }
                }}
                rows={2}
                className="min-h-[2.75rem] flex-1 resize-none rounded-xl border border-stone-200 bg-white px-3 py-2 text-sm outline-none focus:border-sky-300 focus:ring-2 focus:ring-sky-200"
                disabled={busy}
              />
              <button
                type="button"
                onClick={() => void send()}
                disabled={!canSend}
                className="inline-flex h-[2.75rem] w-[2.75rem] shrink-0 items-center justify-center rounded-xl bg-sky-600 text-white disabled:cursor-not-allowed disabled:opacity-50"
                aria-label="Gửi"
              >
                <Send className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-2 flex items-center justify-between text-xs text-stone-500">
              <span>
                {busy ? "Đang trả lời…" : "Mẹo: \u201cgợi ý tour biển 3 ngày dưới 10tr\u201d"}
              </span>
              <button
                type="button"
                onClick={resetChat}
                className="font-medium text-sky-700 hover:underline"
              >
                Cuộc hội thoại mới
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function MiniTourCard({ tour }: { tour: TourListItem }) {
  const location =
    tour.destinationLocation?.name ?? tour.departureLocation?.name ?? "—";
  const duration = tour.durationDays != null ? `${tour.durationDays} ngày` : "—";
  const price = formatVnd(tour.basePrice ?? null);

  return (
    <Link
      href={`/tours/${tour.id}`}
      className="block rounded-xl border border-stone-200 bg-white p-3 shadow-sm transition hover:border-sky-300 hover:shadow-md"
    >
      <div className="flex gap-3">
        <div className="h-14 w-14 shrink-0 overflow-hidden rounded-lg bg-stone-100">
          {tour.thumbnailUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={tour.thumbnailUrl}
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-gradient-to-br from-sky-200 to-blue-300" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-stone-900">{tour.name}</p>
          <p className="mt-0.5 truncate text-xs text-stone-500">
            {location} · {duration}
          </p>
          <p className="mt-1 text-sm font-bold text-teal-700">
            {price}
            <span className="text-xs font-normal text-stone-400"> / khách</span>
          </p>
        </div>
      </div>
    </Link>
  );
}
