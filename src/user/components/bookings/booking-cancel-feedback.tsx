"use client";

import { useEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { AlertTriangle, CheckCircle2, Loader2, X, XCircle } from "lucide-react";

export type BookingCornerToastPayload =
  | { variant: "loading"; message: string }
  | { variant: "success"; message: string }
  | { variant: "error"; message: string };

export function BookingCornerToast({
  toast,
  onDismiss,
}: {
  toast: BookingCornerToastPayload | null;
  onDismiss: () => void;
}) {
  useEffect(() => {
    if (!toast || toast.variant === "loading") return;
    const ms = toast.variant === "success" ? 4200 : 5800;
    const id = window.setTimeout(onDismiss, ms);
    return () => window.clearTimeout(id);
  }, [toast, onDismiss]);

  if (!toast || typeof document === "undefined") return null;

  const icon =
    toast.variant === "loading" ? (
      <Loader2 className="h-5 w-5 animate-spin text-teal-600" aria-hidden />
    ) : toast.variant === "success" ? (
      <CheckCircle2 className="h-5 w-5 text-emerald-600" aria-hidden />
    ) : (
      <XCircle className="h-5 w-5 text-red-600" aria-hidden />
    );

  const ring =
    toast.variant === "loading"
      ? "ring-teal-600/15"
      : toast.variant === "success"
        ? "ring-emerald-600/15"
        : "ring-red-600/12";

  return createPortal(
    <div className="pointer-events-none fixed inset-x-0 top-0 z-[310] flex justify-center p-4 sm:inset-x-auto sm:right-0 sm:justify-end">
      <div
        role="status"
        aria-live={toast.variant === "loading" ? "polite" : "assertive"}
        className="pointer-events-auto w-full max-w-sm origin-top animate-[toast-in_0.35s_ease-out]"
      >
        <div
          className={`flex items-start gap-3 rounded-xl border border-stone-200/90 bg-white p-4 shadow-2xl ring-1 ${ring}`}
        >
          <div
            className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${
              toast.variant === "loading"
                ? "bg-teal-50"
                : toast.variant === "success"
                  ? "bg-emerald-50"
                  : "bg-red-50"
            }`}
          >
            {icon}
          </div>
          <p className="min-w-0 flex-1 pt-2 text-sm font-medium leading-snug text-stone-900">
            {toast.message}
          </p>
          {toast.variant !== "loading" ? (
            <button
              type="button"
              onClick={onDismiss}
              className="shrink-0 rounded-lg p-1 text-stone-400 transition hover:bg-stone-100 hover:text-stone-700"
              aria-label="Đóng"
            >
              <X className="h-4 w-4" />
            </button>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  );
}

export function CancelBookingConfirmModal({
  open,
  bookingId,
  minCancelDays,
  onClose,
  onConfirm,
}: {
  open: boolean;
  bookingId: number;
  minCancelDays: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const confirmBtnRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const id = window.requestAnimationFrame(() => {
      confirmBtnRef.current?.focus();
    });
    return () => {
      window.removeEventListener("keydown", onKey);
      window.cancelAnimationFrame(id);
    };
  }, [open, onClose]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div
      className="fixed inset-0 isolate z-[300] flex items-end justify-center p-4 sm:items-center"
      role="presentation"
    >
      <button
        type="button"
        aria-label="Đóng"
        className="absolute inset-0 z-0 bg-stone-900/50 backdrop-blur-[2px] transition-opacity"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="cancel-booking-title"
        className="relative z-10 w-full max-w-md origin-bottom animate-[toast-in_0.35s_ease-out] rounded-2xl border border-stone-200 bg-white p-6 shadow-2xl ring-1 ring-teal-600/10 sm:origin-center"
        onMouseDown={(e) => e.stopPropagation()}
      >
        <div className="flex gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700">
            <AlertTriangle className="h-6 w-6" strokeWidth={2} aria-hidden />
          </div>
          <div className="min-w-0 flex-1">
            <h2
              id="cancel-booking-title"
              className="text-lg font-semibold text-stone-900"
            >
              Xác nhận gửi yêu cầu hủy
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-stone-600">
              Bạn có chắc muốn gửi yêu cầu hủy booking{" "}
              <span className="font-mono font-semibold text-stone-800">
                BK-{bookingId}
              </span>
              ?
            </p>
            <p className="mt-3 rounded-xl border border-stone-100 bg-stone-50 px-3 py-2 text-xs leading-relaxed text-stone-600">
            Yêu cầu của bạn sẽ được hệ thống xem xét theo chính sách hủy tour.
            </p>
          </div>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 hover:bg-stone-50"
          >
            Quay lại
          </button>
          <button
            ref={confirmBtnRef}
            type="button"
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              onConfirm();
            }}
            className="rounded-xl bg-red-600 px-4 py-2.5 text-sm font-semibold text-white hover:bg-red-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-red-500 focus-visible:ring-offset-2"
          >
            Gửi yêu cầu hủy
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
