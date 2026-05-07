"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

/**
 * Fallback khi callback VNPAY không có tourId (/ ?payment=success).
 */
export function HomePaymentSuccessFallbackStrip() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    if (sp.get("payment") !== "success") return;
    window.history.replaceState({}, "", "/");
    setVisible(true);
  }, []);
  if (!visible) return null;
  return (
    <div className="border-b border-emerald-200 bg-emerald-50 px-4 py-3 text-center text-sm text-emerald-900">
      Thanh toán thành công.&nbsp;
      <Link href="/bookings" className="font-semibold text-[#0b5ea8] underline-offset-4 hover:underline">
        Quản lý đặt chỗ
      </Link>
    </div>
  );
}
