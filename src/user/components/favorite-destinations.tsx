"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { API_BASE_URL } from "@/lib/env";
import { errorMessage } from "@/lib/format";
import { MotionInView } from "./motion-in-view";

type Province = { id: number; regionId: number; name?: string | null };

function stripDiacritics(s: string) {
  return s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
}

function normalizeProvinceKey(s: string) {
  return stripDiacritics(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "");
}

function provinceKeyFromThumbnailFilename(filename: string) {
  const withoutExt = filename.replace(/\.[^.]+$/, "");
  return normalizeProvinceKey(withoutExt.replace(/\?/g, "a"));
}

type TabKey = "north" | "center" | "southEast" | "southWest";

const REGION_THUMBNAILS: Record<TabKey, readonly string[]> = {
  north: [
    // Order ưu tiên hiển thị để masonry khớp với layout mẫu.
    "QUẢNG NINH.jpg",
    "HÀ GIANG.jpg",
    "LÀO CAI.jpg",
    "NINH BÌNH.jpg",
    "YÊN BÁI.jpg",
    "SƠN LA.jpg",
    "CAO BẰNG.jpg",
    "HẢI PHÒNG.jpg",
    "HÀ NỘI.jpg",
  ],
  center: [
    "THỪA THIÊN HUẾ.jpg",
    "HỘI AN.jpg",
    "LÂM ĐỒNG.jpg",
    "NHA TRANG.jpg",
    "PHAN THIẾT.jpg",
    "PHÚ YÊN.jpg",
    "QUY NHƠN.jpg",
    "QUẢNG BÌNH.jpg",
    "ĐÀ NẴNG.jpg",
  ],
  southEast: [
    "BÀ RỊA - VŨNG TÀU.jpg",
    "BÌNH PHƯỚC.webp",
    "CÔN ĐẢO.jpg",
    "PHƯỚC HẢI.jpg",
    "TP. HỒ CHÍ MINH.jpg",
    "TÂY NINH.jpg",
    "ĐỒNG NAI.jpg",
  ],
  southWest: [
    "AN GIANG.jpg",
    "BẠC LIÊU.jpg",
    "BẾN TRE.jpg",
    "CÀ MAU.jpg",
    "CẦN THƠ.jpg",
    "KIÊN GIANG.jpg",
    "PHÚ QUỐC.jpg",
    "TIỀN GIANG.jpg",
    "ĐỒNG THÁP.jpg",
  ],
};

const REGION_THUMBNAIL_MAPS: Record<TabKey, Map<string, string>> = {
  north: new Map(),
  center: new Map(),
  southEast: new Map(),
  southWest: new Map(),
};

const TAB_FOLDER: Record<TabKey, string> = {
  north: "Miền Bắc",
  center: "Miền Trung",
  southEast: "Miền Đông Nam Bộ",
  southWest: "Miền Tây Nam Bộ",
};

(Object.keys(REGION_THUMBNAILS) as TabKey[]).forEach((tab) => {
  const m = new Map<string, string>();
  REGION_THUMBNAILS[tab].forEach((filename) => {
    const withoutExt = filename.replace(/\.[^.]+$/, "");
    const key = normalizeProvinceKey(withoutExt.replace(/\?/g, "a"));
    m.set(key, filename);
  });
  REGION_THUMBNAIL_MAPS[tab] = m;
});

function pickGradient(id: number) {
  const gradients = [
    "from-cyan-600/95 to-blue-800/95",
    "from-emerald-700/95 to-teal-900/95",
    "from-amber-500/95 to-orange-700/95",
    "from-violet-600/95 to-fuchsia-800/95",
    "from-rose-600/95 to-red-900/95",
  ];
  return gradients[Math.abs(id) % gradients.length];
}

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(errorMessage(body));
  }
  return body as T;
}

function ProvinceThumbnail({
  src,
  alt,
  loading,
  fetchPriority,
}: {
  src: string;
  alt: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={alt}
      className="image-mansory__item--image"
      loading={loading ?? "lazy"}
      fetchPriority={fetchPriority}
      decoding="async"
      onError={(e) => {
        // Nếu không có file thực sự thì bỏ ảnh (để gradient nền vẫn hiển thị).
        (e.currentTarget as HTMLImageElement).style.display = "none";
      }}
    />
  );
}

export function FavoriteDestinations() {
  const [provinces, setProvinces] = useState<Province[]>([]);

  const [activeTabKey, setActiveTabKey] = useState<TabKey>("north");

  const [loadingInitial, setLoadingInitial] = useState(true);
  const [initialError, setInitialError] = useState<string | null>(null);

  const regionTargets = useMemo(
    () => [
      { key: "north" as const, label: "Miền Bắc" },
      { key: "center" as const, label: "Miền Trung" },
      { key: "southEast" as const, label: "Miền Đông Nam Bộ" },
      { key: "southWest" as const, label: "Miền Tây Nam Bộ" },
    ],
    [],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadInitial() {
      setLoadingInitial(true);
      setInitialError(null);
      try {
        const provincesRes = await fetchJson<Province[]>(
          `${API_BASE_URL}/locations/provinces`,
        );

        if (cancelled) return;

        setProvinces(provincesRes);
      } catch (e) {
        if (cancelled) return;
        setInitialError(e instanceof Error ? e.message : "Đã có lỗi xảy ra");
      } finally {
        if (cancelled) return;
        setLoadingInitial(false);
      }
    }

    loadInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  const provincesWithImage = useMemo(() => {
    // Sắp theo đúng thứ tự thumbnail để layout masonry (first/normal/wide/tall/special)
    // rơi vào vị trí giống layout mẫu.
    const provinceByKey = new Map<string, Province>();
    provinces.forEach((p) => {
      const key = normalizeProvinceKey(String(p.name ?? ""));
      if (key) provinceByKey.set(key, p);
    });

    return REGION_THUMBNAILS[activeTabKey]
      .map((filename) => {
        const key = provinceKeyFromThumbnailFilename(filename);
        const province = provinceByKey.get(key);
        if (!province) return null;
        return { province, filename };
      })
      .filter(
        (x): x is { province: Province; filename: string } => x != null,
      );
  }, [provinces, activeTabKey]);

  const variants = [
    { variant: "first" },
    { variant: "normal" },
    { variant: "wide" },
    { variant: "normal" },
    { variant: "normal" },
    { variant: "tall" },
    { variant: "normal" },
    { variant: "special" },
    { variant: "normal" },
  ] as const;

  type MasonryVariant = (typeof variants)[number]["variant"];

  const getMasonryVariant = (index: number) => variants[index % variants.length].variant;

  // Tỉ lệ kích thước theo yêu cầu (width / height) của từng dạng thumbnail.
  // Lưu ý: vì layout responsive, đây là aspect-ratio để đảm bảo hình hiển thị đúng tỉ lệ.
  const aspectRatioByVariant: Record<MasonryVariant, string> = {
    first: "434.13 / 610",
    normal: "282.75 / 300",
    wide: "575.52 / 300",
    tall: "282.77 / 610",
    special: "434.13 / 300",
  };

  const tileSpanClass = (index: number) => {
    // Pattern giống đoạn HTML mẫu (9 ô lặp lại):
    // first(big left, row-span 2), wide, tall(row-span 2), special...
    const pattern = [
      "sm:col-span-2 sm:row-span-2 lg:col-span-4 lg:row-span-2", // big left (first)
      "sm:col-span-1 sm:row-span-1 lg:col-span-3 lg:row-span-1", // normal
      "sm:col-span-1 sm:row-span-1 lg:col-span-5 lg:row-span-1", // wide
      "sm:col-span-1 sm:row-span-1 lg:col-span-3 lg:row-span-1", // normal
      "sm:col-span-1 sm:row-span-1 lg:col-span-3 lg:row-span-1", // normal
      "sm:col-span-1 sm:row-span-2 lg:col-span-2 lg:row-span-2", // tall right
      "sm:col-span-1 sm:row-span-1 lg:col-span-3 lg:row-span-1", // normal
      "sm:col-span-1 sm:row-span-1 lg:col-span-4 lg:row-span-1", // special
      "sm:col-span-1 sm:row-span-1 lg:col-span-3 lg:row-span-1", // normal
    ];
    return pattern[index % pattern.length];
  };

  if (loadingInitial) {
    return (
      <section className="mx-auto max-w-[1312px] px-4 py-12 sm:px-6">
        <div className="h-10 w-48 animate-pulse rounded bg-stone-200/60" />
        <div className="mt-6 h-20 w-full animate-pulse rounded bg-stone-200/40" />
      </section>
    );
  }

  if (initialError) {
    return (
      <section className="mx-auto max-w-[1312px] px-4 py-12 sm:px-6">
        <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-900">
          Không tải được dữ liệu điểm đến: {initialError}
        </div>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-[1312px] px-4 py-12 sm:px-6">
      <MotionInView>
        <div className="text-center">
          <h2 className="text-2xl text-sky-700">ĐIỂM ĐẾN YÊU THÍCH</h2>
          <p className="mt-2 text-sm text-stone-600">
            Hãy chọn một điểm đến du lịch nổi tiếng dưới đây để khám phá các chuyến đi độc quyền của chúng tôi với mức giá vô cùng hợp lý.
          </p>
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm font-medium text-stone-600">
          {regionTargets.map((rt) => {
            const active = rt.key === activeTabKey;
            return (
              <button
                key={rt.key}
                type="button"
                onClick={() => setActiveTabKey(rt.key)}
                className={
                  (active ? "text-sky-800" : "text-stone-600 hover:text-sky-700") +
                  " transition-colors duration-200"
                }
                style={{
                  borderBottom: active ? "2px solid #0ea5e9" : "2px solid transparent",
                  paddingBottom: 10,
                }}
              >
                {rt.label}
              </button>
            );
          })}
        </div>
      </MotionInView>

      <MotionInView
        className="fav-dest-wrap mt-8"
        key={activeTabKey}
      >
        {provincesWithImage.length === 0 ? (
          <p className="text-center text-sm text-stone-500">
            Chưa có ảnh thumbnail cho miền này.
          </p>
        ) : (
          <div className="image-mansory grid auto-rows-[301px] grid-cols-2 gap-2 sm:grid-cols-3 sm:auto-rows-[301px] lg:grid-cols-12 lg:auto-rows-[301px]">
            {provincesWithImage.map(({ province, filename }, idx) => {
              const gradient = pickGradient(province.id);
              const label = province.name ?? `Tỉnh #${province.id}`;
              const metaVariant = getMasonryVariant(idx) as MasonryVariant;
              return (
                <div
                  key={province.id}
                  className={`fav-dest-tile image-mansory__item ${metaVariant} ${tileSpanClass(idx)}`}
                >
                  <Link
                    href={`/favorites/${province.id}`}
                    className="image-mansory__item--wrapper"
                    style={{ aspectRatio: aspectRatioByVariant[metaVariant] }}
                  >
                    <div className="image-mansory__item--bg">
                      <div
                        className={`image-mansory__item--bg-gradient absolute inset-0 bg-gradient-to-br ${gradient} opacity-60`}
                      />
                    </div>

                    <ProvinceThumbnail
                      src={`/assets/images/${encodeURIComponent(TAB_FOLDER[activeTabKey])}/${encodeURIComponent(filename)}`}
                      alt={label}
                      loading={idx === 0 ? "eager" : "lazy"}
                      fetchPriority={idx === 0 ? "high" : "auto"}
                    />

                    <div className="image-mansory__item--overlay">
                      <label className="image-mansory__item--overlay--text">
                        {label}
                      </label>
                      <div className="image-mansory__item--overlay--divider" />
                      <span className="image-mansory__item--overlay--button btn btn-primary">
                        Khám phá
                      </span>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}
      </MotionInView>
    </section>
  );
}

