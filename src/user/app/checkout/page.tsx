import { redirect } from "next/navigation";

type Search = Record<string, string | string[] | undefined>;

/**
 * Route cũ `/checkout`: chuyển hết sang quản lý đặt chỗ (đã bỏ màn checkout trung gian).
 */
export default async function CheckoutLegacyRedirectPage({
  searchParams,
}: {
  searchParams: Promise<Search>;
}) {
  const params = await searchParams;
  const q = new URLSearchParams();
  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined) continue;
    if (Array.isArray(raw))
      raw.forEach((value) => {
        q.append(key, value);
      });
    else q.set(key, raw);
  }
  const qs = q.toString();
  redirect(`/bookings${qs ? `?${qs}` : ""}`);
}
