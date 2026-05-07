import { notFound } from "next/navigation";
import { fetchTourById } from "@/lib/server-api";
import { BookingPaySuccessReturnView } from "@/components/booking/booking-pay-success-return";
import TourBookingClient from "@/components/booking/tour-booking-client";

type Props = {
  params: Promise<{ id: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function BookTourPage({ params, searchParams }: Props) {
  const { id } = await params;
  const sp = await searchParams;
  const numId = Number(id);
  if (!Number.isFinite(numId)) notFound();

  const res = await fetchTourById(numId, { next: { revalidate: 60 } });
  if (!res.ok) notFound();

  const rawScheduleId = Array.isArray(sp.scheduleId) ? sp.scheduleId[0] : sp.scheduleId;
  const preselectedScheduleId = rawScheduleId ? Number(rawScheduleId) : undefined;

  const paymentRaw = Array.isArray(sp.payment) ? sp.payment[0] : sp.payment;
  const bidRaw = Array.isArray(sp.bookingId) ? sp.bookingId[0] : sp.bookingId;
  let paymentReturnBookingId: number | undefined;
  if (bidRaw != null && /^\d+$/.test(String(bidRaw))) {
    const n = Number(bidRaw);
    if (Number.isFinite(n)) paymentReturnBookingId = n;
  }
  const paymentReturn =
    paymentRaw === "success"
      ? { bookingId: paymentReturnBookingId }
      : undefined;

  if (paymentReturn != null) {
    return (
      <BookingPaySuccessReturnView
        tour={res.data}
        bookingIdSuffix={
          paymentReturn.bookingId != null
            ? String(paymentReturn.bookingId)
            : undefined
        }
      />
    );
  }

  return (
    <TourBookingClient
      tour={res.data}
      preselectedScheduleId={preselectedScheduleId}
    />
  );
}
