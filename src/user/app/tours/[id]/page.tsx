import { notFound } from "next/navigation";
import type { TourListItem } from "@/lib/api-types";
import TourDetailClient from "@/components/tour-detail-client";
import { fetchTourById, fetchTours, unwrapTourListResponse } from "@/lib/server-api";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

async function loadRelatedTours(currentId: number, destinationLocationId: number | undefined) {
  const cache = { next: { revalidate: 60 } } as const;
  const merged: TourListItem[] = [];
  const seen = new Set<number>();

  const pushUnique = (list: TourListItem[]) => {
    for (const t of list) {
      if (t.id === currentId || seen.has(t.id)) continue;
      merged.push(t);
      seen.add(t.id);
      if (merged.length >= 3) return;
    }
  };

  if (destinationLocationId != null) {
    const r = await fetchTours(
      {
        page: "1",
        pageSize: "12",
        destinationLocationId: String(destinationLocationId),
        isActive: "true",
      },
      cache,
    );
    if (r.ok) pushUnique(unwrapTourListResponse(r.data).tours);
  }

  if (merged.length < 3) {
    const r = await fetchTours({ page: "1", pageSize: "12", isActive: "true" }, cache);
    if (r.ok) pushUnique(unwrapTourListResponse(r.data).tours);
  }

  return merged.slice(0, 3);
}

export default async function TourDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) notFound();

  const res = await fetchTourById(numId, { next: { revalidate: 60 } });
  if (!res.ok) notFound();

  const relatedTours = await loadRelatedTours(numId, res.data.destinationLocationId);

  const sp = searchParams ? await searchParams : {};
  const rawDep = sp.departureDate;
  const departureDate =
    typeof rawDep === "string"
      ? rawDep
      : Array.isArray(rawDep)
        ? rawDep[0]
        : undefined;

  return (
    <TourDetailClient
      tour={res.data}
      initialScheduleYmd={departureDate}
      relatedTours={relatedTours}
    />
  );
}
