'use client';

import Image from 'next/image';
import { useEffect } from 'react';
import { Wallet, X } from 'lucide-react';

export const VNPAY_LOGO_PUBLIC_PATH =
  '/assets/images/payment/logo-vnpay.png';

type Props = {
  open: boolean;
  onClose: () => void;
  /** Xác nhận → chuyển thẳng sang cổng VNPAY sandbox */
  onConfirm: () => void;
  submitting: boolean;
};

/**
 * Panel trượt từ phải — chỉ Ví điện tử (VNPAY sandbox).
 */
export function PaymentMethodDrawer({
  open,
  onClose,
  onConfirm,
  submitting,
}: Props) {
  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[100] flex justify-end bg-black/40"
      role="dialog"
      aria-modal="true"
      aria-labelledby="pay-methods-drawer-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Đóng lớp phủ"
        onClick={onClose}
      />
      <div
        className="checkout-pay-drawer-panel relative z-[101] flex h-full w-full max-w-md flex-col border-l border-stone-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-stone-200 px-5 py-4">
          <h2
            id="pay-methods-drawer-title"
            className="text-sm font-bold uppercase tracking-[0.14em] text-stone-900"
          >
            Các hình thức thanh toán
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-lg p-2 text-stone-400 transition hover:bg-stone-100 hover:text-stone-800 disabled:opacity-40"
            aria-label="Đóng"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-6">
          <p className="font-serif text-lg font-medium text-[#6b5344]">
            Phương thức thanh toán
          </p>

          <div className="mt-5 rounded-xl border border-stone-200 bg-white p-4">
            <div className="flex gap-3">
              <span
                className="mt-1 flex h-4 w-4 shrink-0 items-center justify-center rounded-full border-[5px] border-[#0b5ea8] bg-white ring-2 ring-[#0b5ea8]/25"
                aria-hidden
              />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-50 text-amber-800">
                    <Wallet className="h-4 w-4" strokeWidth={2} aria-hidden />
                  </span>
                  <span className="text-sm font-semibold text-stone-900">
                    Ví điện tử
                  </span>
                </span>
                <div className="ml-11 mt-3 flex items-center justify-between gap-4 rounded-lg border border-stone-200 bg-stone-50/90 px-4 py-2.5">
                  <span className="text-[13px] font-semibold tracking-wide text-stone-800">
                    VN PAY
                  </span>
                  <Image
                    src={VNPAY_LOGO_PUBLIC_PATH}
                    alt="VNPAY"
                    width={120}
                    height={40}
                    className="h-9 w-auto object-contain object-right"
                  />
                </div>
                <p className="ml-11 mt-2 text-[11px] leading-relaxed text-stone-500">
                  Sandbox VNPAY — quét QR, thẻ ATM, ví liên kết trên cổng thử
                  nghiệm.
                </p>
              </span>
            </div>
          </div>
        </div>

        <div className="shrink-0 border-t border-stone-200 p-5">
          <button
            type="button"
            disabled={submitting}
            onClick={onConfirm}
            className="w-full rounded-lg bg-red-600 py-3.5 text-sm font-bold uppercase tracking-[0.12em] text-white shadow-md transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-40"
          >
            {submitting ? 'Đang xử lý…' : 'XÁC NHẬN'}
          </button>
        </div>
      </div>
    </div>
  );
}
