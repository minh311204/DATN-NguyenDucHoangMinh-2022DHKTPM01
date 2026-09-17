import { HeroSearchBar } from "@/components/hero-search-bar";
import { HomePaymentSuccessFallbackStrip } from "@/components/home-payment-success-fallback-strip";
import { HomeHeroTravelaReveal } from "@/components/home-hero-travela-reveal";
import { FavoriteDestinations } from "@/components/favorite-destinations";
import { HomeExplorePromo } from "@/components/home-explore-promo";
import { HomeAboutSnapshotSection } from "@/components/home-about-snapshot-section";
import { FeaturedToursSection } from "@/components/featured-tours-section";
import { HomeFeaturesSection } from "@/components/home-features-section";
import { fetchTours, unwrapTourListResponse } from "@/lib/server-api";
import { errorMessage } from "@/lib/format";

/** Nền hero — ảnh cover, overlay đen nhẹ */
const HERO_BG =
  "/assets/images/header/video_bg_vietravel.ca0484d0.jpeg";

export default async function HomePage() {
  const res = await fetchTours(
    { isActive: "true", featured: "true" },
    { next: { revalidate: 60 } },
  );

  const featured = res.ok
    ? unwrapTourListResponse(res.data).tours.slice(0, 6)
    : [];
  const loadError = !res.ok;

  return (
    <>
      <HomePaymentSuccessFallbackStrip />

      <HomeHeroTravelaReveal
        kicker={
          <p className="motion-fade-in-up text-sm font-semibold uppercase tracking-[0.25em] text-white [text-shadow:0_1px_4px_rgba(0,0,0,0.85)] sm:text-base">
            Đặt tour trực tuyến
          </p>
        }
        subline={
          <p className="text-pretty text-sm font-normal text-white/95 [text-shadow:0_1px_8px_rgba(0,0,0,0.45)] sm:text-base">
            Giá tốt – hỗ trợ 24/7 – khắp mọi miền
          </p>
        }
        search={<HeroSearchBar className="w-full" />}
      >
        <div
          className="motion-hero-bg pointer-events-none absolute inset-0 origin-center"
          style={{
            backgroundColor: "#1a1d2e",
            backgroundImage: `url('${HERO_BG}')`,
            backgroundRepeat: "no-repeat",
            backgroundSize: "cover",
            backgroundPosition: "center center",
            backgroundAttachment: "scroll",
          }}
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-0 bg-gradient-to-b from-black/45 via-black/25 to-black/55"
          aria-hidden
        />
      </HomeHeroTravelaReveal>

      <HomeExplorePromo />

      <HomeAboutSnapshotSection />

      <FeaturedToursSection
        tours={featured}
        loadError={
          loadError ? (
            <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Không tải được danh sách tour. Chạy API (cổng 4000) và cấu hình{" "}
              <code className="rounded bg-amber-100 px-1">NEXT_PUBLIC_API_URL</code>{" "}
              trong <code className="rounded bg-amber-100 px-1">.env.local</code>.
              {!res.ok && (
                <span className="mt-1 block text-amber-800">
                  {errorMessage(res.body)}
                </span>
              )}
            </div>
          ) : null
        }
      />

      <HomeFeaturesSection />

      <FavoriteDestinations />
    </>
  );
}
