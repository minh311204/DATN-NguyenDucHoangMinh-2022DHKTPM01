"use client";

import { useCallback, useEffect, useState } from "react";
import { Heart } from "lucide-react";
import {
  addToWishlist,
  checkWishlist,
  removeFromWishlist,
} from "@/lib/client-wishlist";
import { AUTH_CHANGED_EVENT, hasAccessToken } from "@/lib/auth-storage";
import { ensureSessionFresh } from "@/lib/client-auth";
import { trackBehavior } from "@/lib/client-preference";

type Props = {
  tourId: number;
  tourName?: string;
  /** variant: 'icon' (compact) | 'button' (bordered) | 'text' (Travela-style header link) */
  variant?: "icon" | "button" | "text";
  className?: string;
};

export function WishlistButton({
  tourId,
  tourName,
  variant = "icon",
  className = "",
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [inWishlist, setInWishlist] = useState(false);
  const [loading, setLoading] = useState(false);

  const syncWishlistFlag = useCallback(() => {
    const isAuthed = hasAccessToken();
    setAuthed(isAuthed);
    if (isAuthed) {
      void checkWishlist(tourId).then((res) => {
        if (res.ok) setInWishlist(res.data.inWishlist);
      });
    } else {
      setInWishlist(false);
    }
  }, [tourId]);

  useEffect(() => {
    let alive = true;
    setMounted(true);
    void (async () => {
      await ensureSessionFresh();
      if (!alive) return;
      syncWishlistFlag();
    })();
    return () => {
      alive = false;
    };
  }, [tourId, syncWishlistFlag]);

  useEffect(() => {
    function onAuthChanged() {
      syncWishlistFlag();
    }
    window.addEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
    return () => window.removeEventListener(AUTH_CHANGED_EVENT, onAuthChanged);
  }, [syncWishlistFlag]);

  async function toggle(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!authed) {
      window.location.href = "/login";
      return;
    }
    if (loading) return;
    setLoading(true);
    try {
      if (inWishlist) {
        const res = await removeFromWishlist(tourId);
        if (res.ok) setInWishlist(false);
      } else {
        const res = await addToWishlist(tourId);
        if (res.ok) {
          setInWishlist(true);
          void trackBehavior(tourId, "wishlist");
        }
      }
    } finally {
      setLoading(false);
    }
  }

  if (!mounted) return null;

  const label = inWishlist ? "Bỏ yêu thích" : "Yêu thích";
  const textLinkLabel = inWishlist ? "Đã lưu" : "Yêu thích";

  if (variant === "text") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        title={tourName ? `${tourName} — ${textLinkLabel}` : textLinkLabel}
        aria-label={label}
        className={`inline-flex items-center gap-2 text-sm font-semibold text-stone-800 transition hover:text-[#0b5ea8] disabled:opacity-60 ${className}`}
      >
        <Heart
          className={`h-4 w-4 shrink-0 transition ${
            inWishlist ? "fill-rose-500 text-rose-500" : "text-current"
          }`}
        />
        {textLinkLabel}
      </button>
    );
  }

  if (variant === "button") {
    return (
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        title={label}
        aria-label={label}
        className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
          inWishlist
            ? "border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100"
            : "border-stone-200 bg-white text-stone-700 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
        } ${className}`}
      >
        <Heart
          className={`h-4 w-4 transition ${
            inWishlist ? "fill-rose-500 text-rose-500" : "text-current"
          }`}
        />
        {label}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={loading}
      title={label}
      aria-label={label}
      className={`flex h-8 w-8 items-center justify-center rounded-full transition disabled:opacity-60 ${
        inWishlist
          ? "bg-rose-50 text-rose-500"
          : "bg-black/30 text-white hover:bg-rose-50 hover:text-rose-500"
      } backdrop-blur ${className}`}
    >
      <Heart
        className={`h-4 w-4 ${inWishlist ? "fill-rose-500" : ""}`}
      />
    </button>
  );
}
