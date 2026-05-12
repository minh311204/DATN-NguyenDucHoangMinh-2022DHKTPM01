"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { MessageCircle, Send, X } from "lucide-react";
import type { TourListItem } from "@/lib/api-types";
import { postAiMessage } from "@/lib/client-ai";
import { formatVnd } from "@/lib/format";
import { AUTH_CHANGED_EVENT } from "@/lib/auth-storage";

type ChatRole = "user" | "assistant";
type ChatItem =
  | { type: "message"; role: ChatRole; content: string }
  | { type: "tours"; tours: TourListItem[] };

const STORAGE_KEYS = {
  sessionId: "aiChat.sessionId",
  sessionKey: "aiChat.sessionKey",
  minimized: "aiChat.minimized",
  messages: "aiChat.messages",
} as const;

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

function readStoredNumber(key: string): number | undefined {
  if (typeof window === "undefined") return undefined;
  const v = localStorage.getItem(key);
  if (!v) return undefined;
  const n = Number(v);
  return Number.isFinite(n) ? n : undefined;
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

  // Restore state from localStorage on mount
  useEffect(() => {
    try {
      const storedMin = localStorage.getItem(STORAGE_KEYS.minimized);
      if (storedMin === "false") setOpen(true);

      setSessionId(readStoredNumber(STORAGE_KEYS.sessionId));
      const sk = localStorage.getItem(STORAGE_KEYS.sessionKey) ?? undefined;
      setSessionKey(sk || undefined);

      const stored = safeJson<ChatItem[]>(localStorage.getItem(STORAGE_KEYS.messages), []);
      setItems(stored.length > 0 ? stored : [WELCOME]);
    } catch {
      // ignore
    }
  }, []);

  // Listen for login/logout to reset chat
  useEffect(() => {
    if (typeof window === "undefined") return;
    const handleAuth = () => {
      resetChat();
    };
    window.addEventListener(AUTH_CHANGED_EVENT, handleAuth);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, handleAuth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    try {
      // Keep last 60 items to avoid localStorage bloat
      const trimmed = next.slice(-60);
      localStorage.setItem(STORAGE_KEYS.messages, JSON.stringify(trimmed));
    } catch {
      // ignore quota errors
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

    const res = await postAiMessage({ sessionId, sessionKey, message: msg });

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
    try {
      localStorage.setItem(STORAGE_KEYS.sessionId, String(nextSessionId));
      if (nextSessionKey) localStorage.setItem(STORAGE_KEYS.sessionKey, nextSessionKey);
    } catch {
      // ignore
    }

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
        localStorage.setItem(STORAGE_KEYS.minimized, String(!next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  function resetChat() {
    try {
      localStorage.removeItem(STORAGE_KEYS.sessionId);
      localStorage.removeItem(STORAGE_KEYS.sessionKey);
      localStorage.removeItem(STORAGE_KEYS.messages);
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
              return (
                <div key={`m-${idx}`} className={`flex ${mine ? "justify-end" : "justify-start"}`}>
                  <div
                    className={[
                      "max-w-[85%] rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap",
                      mine ? "bg-sky-600 text-white" : "bg-stone-100 text-stone-900",
                    ].join(" ")}
                  >
                    {it.content}
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
