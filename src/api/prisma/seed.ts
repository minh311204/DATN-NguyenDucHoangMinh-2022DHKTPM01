/**
 * Seed một tour mẫu (Miền Tây 4N3Đ – mã NDSGN846).
 * Chạy từ thư mục gốc repo: npm run db:seed
 */
import { config } from 'dotenv'
import { resolve } from 'path'
import * as bcrypt from 'bcrypt'
import { PrismaClient } from '@prisma/client'
import { PrismaMariaDb } from '@prisma/adapter-mariadb'
import { preferIpv4Localhost } from '../src/prisma/normalize-database-url'

config({ path: resolve(process.cwd(), 'src/api/.env') })

const raw = process.env.DATABASE_URL
if (!raw) {
  throw new Error(
    'Missing DATABASE_URL. Tạo src/api/.env với DATABASE_URL hoặc export biến môi trường.',
  )
}

const url = preferIpv4Localhost(raw)

const prisma = new PrismaClient({
  adapter: new PrismaMariaDb(url),
})

const SAMPLE_SLUG = 'ndsgn846-mien-tay-4n3d'

function addDaysUtc(d: Date, days: number): Date {
  const x = new Date(d.getTime())
  x.setUTCDate(x.getUTCDate() + days)
  return x
}

async function removeSampleTourIfExists() {
  const existing = await prisma.tour.findFirst({
    where: { slug: SAMPLE_SLUG },
  })
  if (!existing) return

  await prisma.tourSchedule.deleteMany({ where: { tourId: existing.id } })
  await prisma.tourTagMapping.deleteMany({ where: { tourId: existing.id } })
  await prisma.tourImage.deleteMany({ where: { tourId: existing.id } })
  await prisma.tourVideo.deleteMany({ where: { tourId: existing.id } })
  await prisma.tourItinerary.deleteMany({ where: { tourId: existing.id } })
  await prisma.tour.delete({ where: { id: existing.id } })
  console.log('Đã xóa tour mẫu cũ (cùng slug) để seed lại.')
}

async function ensureDepartureAndDestination() {
  let region = await prisma.region.findFirst({ where: { name: 'Miền Nam' } })
  if (!region) {
    region = await prisma.region.create({ data: { name: 'Miền Nam' } })
  }

  let provinceHcm = await prisma.province.findFirst({
    where: { name: 'TP. Hồ Chí Minh', regionId: region.id },
  })
  if (!provinceHcm) {
    provinceHcm = await prisma.province.create({
      data: { regionId: region.id, name: 'TP. Hồ Chí Minh' },
    })
  }

  let departure = await prisma.location.findFirst({
    where: { name: 'Thành phố Hồ Chí Minh', provinceId: provinceHcm.id },
  })
  if (!departure) {
    departure = await prisma.location.create({
      data: {
        provinceId: provinceHcm.id,
        name: 'Thành phố Hồ Chí Minh',
        description: 'Điểm khởi hành',
        isActive: true,
      },
    })
  }

  let provinceCt = await prisma.province.findFirst({
    where: { name: 'Cần Thơ', regionId: region.id },
  })
  if (!provinceCt) {
    provinceCt = await prisma.province.create({
      data: { regionId: region.id, name: 'Cần Thơ' },
    })
  }

  let destination = await prisma.location.findFirst({
    where: { name: 'Cần Thơ', provinceId: provinceCt.id },
  })
  if (!destination) {
    destination = await prisma.location.create({
      data: {
        provinceId: provinceCt.id,
        name: 'Cần Thơ',
        description: 'Điểm đến / khu vực tour Miền Tây',
        isActive: true,
      },
    })
  }

  return { departure, destination }
}

/** Tài khoản ADMIN để đăng nhập quản trị (CRUD tour cần role ADMIN). */
async function ensureAdminUser() {
  const email = 'admin@example.com'
  const passwordPlain = 'Admin123!'
  const existing = await prisma.user.findUnique({ where: { email } })
  if (!existing) {
    const passwordHash = await bcrypt.hash(passwordPlain, 10)
    await prisma.user.create({
      data: {
        email,
        passwordHash,
        firstName: 'Quản trị',
        lastName: 'Hệ thống',
        status: 'ACTIVE',
        role: 'ADMIN',
        emailVerified: true,
      },
    })
    console.log(`Đã tạo ADMIN: ${email} / ${passwordPlain}`)
  } else {
    await prisma.user.update({
      where: { id: existing.id },
      data: {
        role: 'ADMIN',
        status: 'ACTIVE',
      },
    })
    console.log(
      `Đã đảm bảo quyền ADMIN cho: ${email} (giữ mật khẩu hiện tại; tài khoản mới dùng ${passwordPlain})`,
    )
  }
}

async function ensureTags(names: string[]) {
  const tags: { id: number; name: string }[] = []
  for (const name of names) {
    let t = await prisma.tourTag.findFirst({ where: { name } })
    if (!t) {
      t = await prisma.tourTag.create({ data: { name } })
    }
    tags.push(t)
  }
  return tags
}

async function main() {
  await removeSampleTourIfExists()
  await ensureAdminUser()

  const { departure, destination } = await ensureDepartureAndDestination()
  const tags = await ensureTags([
    'Tiêu chuẩn',
    'Xe du lịch',
    'Giá tốt',
    'Miền Tây',
  ])

  const price = 4_790_000

  const itineraries = [
    {
      dayNumber: 1,
      title: 'Thành phố Hồ Chí Minh - Cần Thơ - Cồn Sơn',
      description:
        '03 bữa ăn (sáng, trưa, chiều). Khởi hành theo chương trình.',
    },
    {
      dayNumber: 2,
      title: 'Cần Thơ - Chợ nổi Cái Răng - Bạc Liêu - Cà Mau',
      description: '03 bữa ăn (sáng, trưa, chiều).',
    },
    {
      dayNumber: 3,
      title: 'Cà Mau - Đất Mũi - Bạc Liêu - Cánh đồng điện gió',
      description: '03 bữa ăn (sáng, trưa, chiều).',
    },
    {
      dayNumber: 4,
      title: 'Bạc Liêu - Sóc Trăng - Thành phố Hồ Chí Minh',
      description: '02 bữa ăn (sáng, trưa). Kết thúc chương trình.',
    },
  ]

  const departureDays = [
    '2026-03-24',
    '2026-03-25',
    '2026-03-28',
    '2026-03-29',
  ]

  const tour = await prisma.tour.create({
    data: {
      departureLocationId: departure.id,
      destinationLocationId: destination.id,
      name: 'Miền Tây: Cần Thơ – Cái Răng – Bạc Liêu – Cà Mau – Đất Mũi (4N3Đ)',
      slug: SAMPLE_SLUG,
      description:
        'Tour Miền Tây 4N3Đ: chợ nổi Cái Răng, Đất Mũi, Bạc Liêu, Sóc Trăng. Xe du lịch, mã NDSGN846.',
      durationDays: 4,
      basePrice: price,
      singleRoomSupplement: 2_000_000,
      maxPeople: 45,
      tourLine: 'STANDARD',
      transportType: 'BUS',
      thumbnailUrl:
        'https://images.unsplash.com/photo-1583417319070-4a69db38a2c6?w=800',
      ratingAvg: 4.6,
      totalReviews: 128,
      isActive: true,
      isFeatured: true,
      itineraries: {
        create: itineraries,
      },
      schedules: {
        create: departureDays.map((day) => {
          const startDate = new Date(`${day}T07:00:00.000Z`)
          const endDate = addDaysUtc(startDate, 3)
          endDate.setUTCHours(18, 0, 0, 0)
          return {
            startDate,
            endDate,
            availableSeats: 30,
            bookedSeats: 0,
            priceOverride: price,
            status: 'OPEN',
          }
        }),
      },
      images: {
        create: [
          {
            imageUrl:
              'https://images.unsplash.com/photo-1583417319070-4a69db38a2c6?w=1200',
            isThumbnail: true,
          },
          {
            imageUrl:
              'https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?w=1200',
            isThumbnail: false,
          },
        ],
      },
      tags: {
        create: tags.map((t) => ({ tagId: t.id })),
      },
    },
  })

  console.log('Đã seed tour mẫu:', {
    id: tour.id,
    slug: tour.slug,
    name: tour.name,
    basePrice: price,
    schedules: departureDays.length,
    itineraries: itineraries.length,
    tags: tags.length,
  })

  await prisma.promoCode.upsert({
    where: { code: 'GIAM10' },
    create: {
      code: 'GIAM10',
      percentOff: 10,
      maxDiscountAmount: 5_000_000,
      isActive: true,
      tourId: null,
    },
    update: { isActive: true },
  })
  console.log('Đã upsert mã giảm giá mẫu: GIAM10 (10%, tối đa 5.000.000đ)')
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
