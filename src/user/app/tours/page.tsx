import Link from "next/link";
import type { LocationRow } from "@/lib/api-types";
import {
  fetchLocations,
  fetchTourTags,
  fetchTours,
  unwrapTourListResponse,
} from "@/lib/server-api";
import { parseTourListQuery } from "@/lib/tour-query";
import { errorMessage } from "@/lib/format";
import { MotionInView } from "@/components/motion-in-view";
import { TourDealCard } from "@/components/tour-deal-card";
import { ToursBackButton } from "@/components/tours-back-button";
import { ToursFilterForm } from "./tours-filter-form";
import { ToursPagination, TOURS_PAGE_SIZE } from "./tours-pagination";

type Props = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickFeatured(sp: Record<string, string | string[] | undefined>) {
  const v = sp.featured;
  const raw = Array.isArray(v) ? v[0] : v;
  return raw === "true" || raw === "1";
}

function getListPage(sp: Record<string, string | string[] | undefined>): number {
  const v = sp.page;
  const raw = Array.isArray(v) ? v[0] : v;
  const n = parseInt(String(raw ?? "1"), 10);
  return Number.isFinite(n) && n >= 1 ? n : 1;
}

export default async function ToursSearchPage({ searchParams }: Props) {
  const sp = await searchParams;
  const featuredOnly = pickFeatured(sp);
  const listPage = getListPage(sp);
  const query = featuredOnly
    ? parseTourListQuery(sp)
    : {
        ...parseTourListQuery(sp),
        page: String(listPage),
        pageSize: String(TOURS_PAGE_SIZE),
      };

  const toursRes = await fetchTours(query, { next: { revalidate: 30 } });
  const [locationsRes, tagsRes] = featuredOnly
    ? [null, null]
    : await Promise.all([
        fetchLocations({ next: { revalidate: 300 } }),
        fetchTourTags({}, { next: { revalidate: 120 } }),
      ]);

  const { tours, total } = toursRes.ok
    ? unwrapTourListResponse(toursRes.data)
    : { tours: [], total: 0 };
  const locations: LocationRow[] =
    locationsRes?.ok === true ? locationsRes.data : [];
  const tagOptions =
    tagsRes?.ok === true
      ? tagsRes.data.map((t) => ({ id: t.id, name: t.name }))
      : [];

  const listError = !toursRes.ok ? errorMessage(toursRes.body) : null;

  if (featuredOnly) {
    return (
      <div
        className="min-h-[calc(100svh-4rem)] border-b border-sky-200/60"
        style={{ backgroundColor: "#e0f2f7" }}
      >
        <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
          <MotionInView>
            <ToursBackButton />
          </MotionInView>

          {listError ? (
            <MotionInView className="mt-6" delayMs={40}>
              <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
                {listError}
              </div>
            </MotionInView>
          ) : tours.length === 0 ? (
            <MotionInView className="mt-8" delayMs={40}>
              <p className="text-center text-stone-600">Chưa có tour nổi bật.</p>
            </MotionInView>
          ) : (
            <MotionInView
              className="tours-reveal-wrap mt-6 grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              delayMs={30}
            >
              {tours.map((t) => (
                <div key={t.id} className="tours-stagger-item w-full max-w-[320px] sm:max-w-none">
                  <TourDealCard tour={t} />
                </div>
              ))}
            </MotionInView>
          )}

          <MotionInView className="mt-10 flex justify-center" delayMs={60}>
            <Link
              href="/tours"
              className="inline-flex min-w-[220px] items-center justify-center rounded-lg border border-sky-500 bg-sky-100/80 px-8 py-2.5 text-sm font-semibold text-sky-800 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-sky-200/90"
            >
              Xem tất cả tour
            </Link>
          </MotionInView>
        </div>
      </div>
    );
  }

  return (
    <div
      className="min-h-[calc(100svh-4rem)] border-b border-sky-200/60"
      style={{ backgroundColor: "#e0f2f7" }}
    >
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
        <MotionInView>
          <div className="text-center sm:text-left">
            <h1 className="text-xl font-bold uppercase tracking-wide text-[#0056b3] sm:text-2xl">
              <span className="relative inline-block">
                Tất cả
                <span
                  className="absolute -bottom-1 left-0 h-1 w-full min-w-[2.5rem] rounded-full bg-[#0056b3]"
                  aria-hidden
                />
              </span>{" "}
              tour
            </h1>
          </div>
        </MotionInView>
        <MotionInView className="mt-8" delayMs={50}>
          <div className="rounded-2xl border border-white/60 bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:p-6">
            <ToursFilterForm
              locations={locations}
              tags={tagOptions}
              initial={{
                departureLocationId: sp.departureLocationId as string | undefined,
                destinationLocationId: sp.destinationLocationId as string | undefined,
                tagId: (Array.isArray(sp.tagId) ? sp.tagId[0] : sp.tagId) as
                  | string
                  | undefined,
                budget: sp.budget as string | undefined,
                departureDate: sp.departureDate as string | undefined,
                q: sp.q as string | undefined,
              }}
            />
          </div>
        </MotionInView>

        {listError ? (
          <MotionInView className="mt-8" delayMs={40}>
            <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
              {listError}
            </div>
          </MotionInView>
        ) : tours.length === 0 ? (
          <MotionInView className="mt-10" delayMs={40}>
            <p className="text-center text-stone-600">Không có tour phù hợp.</p>
          </MotionInView>
        ) : (
          <>
            <MotionInView
              className="tours-reveal-wrap mt-10 grid grid-cols-1 justify-items-center gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
              delayMs={30}
              role="region"
              aria-label="Danh sách tour"
            >
              {tours.map((t) => (
                <div
                  key={t.id}
                  className="tours-stagger-item w-full max-w-[320px] sm:max-w-none"
                >
                  <TourDealCard tour={t} variant="catalog" />
                </div>
              ))}
            </MotionInView>
            <MotionInView className="mt-8" delayMs={80}>
              <ToursPagination
                page={listPage}
                total={total}
                searchParams={sp}
              />
            </MotionInView>
          </>
        )}

        <MotionInView className="mt-10 flex justify-center" delayMs={40}>
          <Link
            href="/tours?featured=true"
            className="inline-flex min-w-[200px] items-center justify-center rounded-lg border border-sky-500 bg-sky-100/80 px-8 py-2.5 text-sm font-semibold text-sky-800 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:bg-sky-200/90"
          >
            Tour nổi bật
          </Link>
        </MotionInView>
      </div>
    </div>
  );
}
