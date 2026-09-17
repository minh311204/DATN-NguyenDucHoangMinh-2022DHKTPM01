'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { ArrowLeft } from 'lucide-react';
import { BookingFlowStepper } from '@/components/booking/booking-flow-stepper';
import type { TourDetail } from '@/lib/api-types';

const REDIRECT_MS = 5200;

/**
 * Màn ĐẶT TOUR sau VNPAY: stepper HOÀN TẤT xanh, thông báo, rồi về trang chủ.
 */
export function BookingPaySuccessReturnView({
  tour,
  bookingIdSuffix,
}: {
  tour: TourDetail;
  bookingIdSuffix?: string;
}) {
  const router = useRouter();
  const [secondsLeft, setSecondsLeft] = useState(
    Math.ceil(REDIRECT_MS / 1000),
  );

  useEffect(() => {
    window.history.replaceState({}, '', `/book/${tour.id}`);
  }, [tour.id]);

  useEffect(() => {
    const id = window.setTimeout(() => {
      router.replace('/');
    }, REDIRECT_MS);
    return () => clearTimeout(id);
  }, [router]);

  useEffect(() => {
    const iv = window.setInterval(() => {
      setSecondsLeft((s) => Math.max(0, s - 1));
    }, 1000);
    return () => clearInterval(iv);
  }, []);

  return (
    <div className="min-h-screen bg-stone-50">
      <div className="border-b border-stone-200 bg-white">
        <div className="mx-auto max-w-6xl px-4 pb-8 pt-5 sm:px-6 sm:pb-10 sm:pt-6">
          <div className="flex w-full justify-start">
            <Link
              href="/"
              className="inline-flex cursor-pointer items-center gap-1.5 text-sm font-medium text-stone-600 transition hover:text-[#0b5ea8]"
            >
              <ArrowLeft className="h-4 w-4 shrink-0" />
              Trang chủ
            </Link>
          </div>
          <h1 className="mt-6 text-center text-2xl font-bold tracking-[0.2em] text-[#0b5ea8] sm:mt-8 sm:text-3xl">
            ĐẶT TOUR
          </h1>
          <p className="mx-auto mt-2 max-w-lg px-2 text-center text-sm font-medium text-emerald-800 sm:mt-3">
            Đặt tour thành công — cảm ơn bạn đã tin tưởng!
          </p>
          <BookingFlowStepper variant="complete" />
        </div>
      </div>

      <div className="mx-auto max-w-lg px-4 py-10 sm:px-6">
        <div className="rounded-2xl border border-emerald-200 bg-white p-6 text-center shadow-sm">
          <p className="text-base font-semibold text-stone-900">
            Thanh toán đã hoàn tất
            {bookingIdSuffix ? (
              <>
                {' '}
                <span className="font-mono text-[#0b5ea8]">
                  (BK-{bookingIdSuffix})
                </span>
              </>
            ) : null}
          </p>
          <p className="mt-3 text-sm leading-relaxed text-stone-600">
            Đơn đã được xác nhận. Vui lòng kiểm tra email; chúng tôi sẽ chuyển bạn
            về trang chủ sau vài giây.
          </p>
          <p className="mt-4 text-xs text-stone-500">
            Tự động chuyển sau ~{secondsLeft}s…
          </p>
          <Link
            href="/"
            className="mt-6 inline-flex w-full items-center justify-center rounded-xl bg-[#0b5ea8] py-3 text-sm font-bold text-white transition hover:bg-[#0a4f8f]"
          >
            Về trang chủ ngay
          </Link>
          <p className="mt-4 text-sm">
            <Link
              href="/bookings"
              className="font-semibold text-[#0b5ea8] underline-offset-4 hover:underline"
            >
              Quản lý đặt chỗ
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
