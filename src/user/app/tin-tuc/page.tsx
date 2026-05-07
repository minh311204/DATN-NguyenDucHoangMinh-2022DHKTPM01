import Link from "next/link";
import { MotionInView } from "@/components/motion-in-view";
import { SimplePageBanner } from "@/components/simple-page-banner";

export default function NewsPage() {
  return (
    <>
      <SimplePageBanner title="Tin tức" />
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-12">
        <MotionInView axis="left" className="text-stone-600">
          <p>
            Kênh tin tức du lịch đang được cập nhật. Quý khách có thể xem các tour đang mở
            bán tại trang Khám phá.
          </p>
        </MotionInView>
        <MotionInView className="mt-8" delayMs={100}>
          <Link
            href="/tours"
            className="inline-flex rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white transition duration-200 hover:-translate-y-0.5 hover:bg-teal-700 hover:shadow-sm active:translate-y-0"
          >
            Khám phá tour
          </Link>
        </MotionInView>
      </div>
    </>
  );
}
