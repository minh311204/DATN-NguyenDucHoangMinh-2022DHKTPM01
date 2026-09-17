import type { Prisma, TourLine } from '@prisma/client'

/**
 * Tên danh mục (TourTag) trùng nhãn "Dòng tour" trong form tour → đếm / lọc gộp với
 * {@link TourLine} trên bảng Tour (không chỉ TourTagMapping).
 * Khớp admin `TOUR_LINE_LABEL` / user filter labels.
 */
const DANH_MUC_NAME_TO_TOUR_LINE: Record<string, TourLine> = {
  'Cao cấp': 'PREMIUM',
  'Tiêu chuẩn': 'STANDARD',
  'Tiết kiệm': 'ECONOMY',
  'Giá tốt': 'GOOD_VALUE',
}

const TOUR_LINE_VALUES = [
  'PREMIUM',
  'STANDARD',
  'ECONOMY',
  'GOOD_VALUE',
] as const satisfies readonly TourLine[]

function isTourLineValue(s: string): s is TourLine {
  return (TOUR_LINE_VALUES as readonly string[]).includes(s)
}

export function tourLineMatchingDanhMucTagName(name: string): TourLine | null {
  const n = name.trim()
  const fromVi = DANH_MUC_NAME_TO_TOUR_LINE[n]
  if (fromVi) return fromVi
  if (isTourLineValue(n)) return n
  return null
}

/** Tour thuộc danh mục: có mapping tag HOẶC dòng tour khớp tên danh mục (when applicable). */
export function catalogTagTourWhereClause(
  tagId: number,
  tagName: string,
): Prisma.TourWhereInput {
  const line = tourLineMatchingDanhMucTagName(tagName)
  const or: Prisma.TourWhereInput[] = [
    { tags: { some: { tagId } } },
  ]
  if (line != null) {
    or.push({ tourLine: line })
  }
  return { OR: or }
}
