import { notFound } from "next/navigation";
import { fetchTourById } from "@/lib/server-api";
import TourDetailClient from "@/components/tour-detail-client";

type Props = {
  params: Promise<{ id: string }>;
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

export default async function TourDetailPage({ params, searchParams }: Props) {
  const { id } = await params;
  const numId = Number(id);
  if (!Number.isFinite(numId)) notFound();

  const res = await fetchTourById(numId, { next: { revalidate: 60 } });
  if (!res.ok) notFound();

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
    />
  );
}
