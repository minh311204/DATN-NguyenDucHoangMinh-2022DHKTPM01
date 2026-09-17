/**
 * Seed Supplier, TourTransport, TourAccommodation, TourMeal
 * Dữ liệu tham khảo thương hiệu / địa chỉ thật tại Việt Nam (hotline công khai).
 * Chạy lại an toàn: bỏ qua tour/itinerary đã có bản ghi con.
 */
const mysql = require('mysql2/promise');

const SUPPLIERS = [
  // ── Vận chuyển ─────────────────────────────────────────
  {
    name: 'Vietnam Airlines',
    type: 'TRANSPORT',
    phone: '19001100',
    email: 'sales@vietnamairlines.com',
    address: '200 Nguyễn Sơn, P. Phú Thọ Hòa, TP.HCM',
    website: 'https://www.vietnamairlines.com',
    taxCode: '0300525924',
    notes: 'Hãng hàng không quốc gia; nối mạng nội địa & quốc tế.',
    key: 'air_vna',
  },
  {
    name: 'VietJet Air',
    type: 'TRANSPORT',
    phone: '19001886',
    email: 'cs@vietjetair.com',
    address: '302 Kim Mã, Ba Đình, Hà Nội',
    website: 'https://www.vietjetair.com',
    taxCode: '0313456547',
    notes: 'Hàng không giá rẻ; mạng bay nội địa dày.',
    key: 'air_vj',
  },
  {
    name: 'Bamboo Airways',
    type: 'TRANSPORT',
    phone: '19001166',
    email: 'contact@bambooairways.com',
    address: 'Tòa nhà FLC, đường Phạm Hùng, Nam Từ Liêm, Hà Nội',
    website: 'https://www.bambooairways.com',
    taxCode: '0107868914',
    notes: 'Hãng bay Bamboo Airways (FLC).',
    key: 'air_bamboo',
  },
  {
    name: 'Xe khách Phương Trang (Futa Bus Lines)',
    type: 'TRANSPORT',
    phone: '02838309393',
    email: 'futabusline@gmail.com',
    address: '468 Lê Văn Lương, Tân Phong, Quận 7, TP.HCM',
    website: 'https://futabus.vn',
    taxCode: '0301594578',
    notes: 'Xe giường nằm liên tỉnh; nhiều tuyến Nam Trung Bộ.',
    key: 'bus_futa',
  },
  {
    name: 'Tổng công ty Mai Linh',
    type: 'TRANSPORT',
    phone: '02839292929',
    email: 'info@mailinh.vn',
    address: '1 Phạm Ngũ Lão, Quận 1, TP.HCM',
    website: 'https://www.mailinh.vn',
    taxCode: '0300348235',
    notes: 'Taxi & xe khách liên tỉnh.',
    key: 'bus_mailinh',
  },
  {
    name: 'Công ty CP Xe khách Phương Đông',
    type: 'TRANSPORT',
    phone: '19006067',
    address: '292 Đinh Bộ Lĩnh, P.26, Bình Thạnh, TP.HCM',
    website: 'https://www.hoanglongasia.com',
    notes: 'Hoàng Long – tuyến Bắc Nam.',
    key: 'bus_hoanglong',
  },
  {
    name: 'Công ty TNHH Du lịch Lữ hành Việt Nam (Vietravel)',
    type: 'TRANSPORT',
    phone: '19001869',
    email: 'info@vietravel.com',
    address: '190 Pasteur, Phường Võ Thị Sáu, Quận 3, TP.HCM',
    website: 'https://travel.com.vn',
    taxCode: '0301181107',
    notes: 'Đội xe du lịch & land tour nội địa.',
    key: 'bus_tour',
  },
  // ── Khách sạn / resort (đối tác lưu trú) ─────────────────
  {
    name: 'Novotel Danang Premier Han River',
    type: 'HOTEL',
    phone: '02363872222',
    email: 'H7697@accor.com',
    address: '36 Bạch Đằng, Hải Châu, Đà Nẵng',
    website: 'https://all.accor.com',
    notes: 'Khách sạn 5* ven sông Hàn, trung tâm Đà Nẵng.',
    key: 'hotel_danang',
  },
  {
    name: 'Mường Thanh Luxury Nha Trang',
    type: 'HOTEL',
    phone: '02583822222',
    address: '60 Trần Phú, Lộc Thọ, Nha Trang, Khánh Hòa',
    website: 'https://muongthanh.com',
    notes: 'Khách sạn 5* mặt biển Trần Phú.',
    key: 'hotel_nhatrang',
  },
  {
    name: 'Vinpearl Resort & Spa Phú Quốc',
    type: 'HOTEL',
    phone: '02983898989',
    email: 'booking@vinpearl.com',
    address: 'Bãi Dài, Gành Dầu, Phú Quốc, Kiên Giang',
    website: 'https://vinpearl.com',
    notes: 'Resort 5* Vinpearl tại Phú Quốc.',
    key: 'hotel_pq',
  },
  {
    name: 'Sofitel Legend Metropole Hanoi',
    type: 'HOTEL',
    phone: '02438266919',
    email: 'H6702@sofitel.com',
    address: '15 Phố Ngô Quyền, Hoàn Kiếm, Hà Nội',
    website: 'https://sofitel.accor.com',
    notes: 'Khách sạn lịch sử 5* gần Hồ Hoàn Kiếm.',
    key: 'hotel_hn',
  },
  {
    name: 'Muong Thanh Grand Ha Long',
    type: 'HOTEL',
    phone: '02033685555',
    address: 'No 2, Hạ Long Road, Bãi Cháy, Hạ Long, Quảng Ninh',
    website: 'https://muongthanh.com',
    notes: 'Khách sạn gần bãi Cháy, thuận du thuyền vịnh.',
    key: 'hotel_halong',
  },
  {
    name: 'Du Parc Hotel Dalat',
    type: 'HOTEL',
    phone: '02633822266',
    address: '15 Trần Phú, Phường 3, Đà Lạt, Lâm Đồng',
    website: 'https://duparcdalat.com',
    notes: 'Khách sạn cổ điển trung tâm Đà Lạt.',
    key: 'hotel_dalat',
  },
  {
    name: 'Azerai La Residence Hue',
    type: 'HOTEL',
    phone: '02343747575',
    email: 'reservation@azerai.com',
    address: '5 Lê Lợi, Vĩnh Ninh, TP. Huế',
    website: 'https://www.azerai.com',
    notes: 'Boutique 5* ven sông Hương.',
    key: 'hotel_hue',
  },
  {
    name: 'Victoria Can Tho Resort',
    type: 'HOTEL',
    phone: '02923836666',
    email: 'victoria@victoriahotels.asia',
    address: 'Cái Khế, Ninh Kiều, Cần Thơ',
    website: 'https://www.victoriahotels.asia',
    notes: 'Resort 4* ven sông Hậu.',
    key: 'hotel_cantho',
  },
  {
    name: 'Rex Hotel Saigon',
    type: 'HOTEL',
    phone: '02838292105',
    email: 'info@rexhotelsaigon.com.vn',
    address: '141 Nguyễn Huệ, Quận 1, TP.HCM',
    website: 'https://www.rexhotelsaigon.com.vn',
    notes: 'Khách sạn lịch sử trung tâm Quận 1.',
    key: 'hotel_hcm',
  },
  {
    name: 'Hotel de la Coupole – MGallery Sapa',
    type: 'HOTEL',
    phone: '02143878888',
    email: 'H8669@accor.com',
    address: 'Hoàng Liên, Sa Pa, Lào Cai',
    website: 'https://all.accor.com',
    notes: 'Resort 5* phong cách Art Deco tại Sa Pa.',
    key: 'hotel_sapa',
  },
  {
    name: 'Grand Mercure Danang',
    type: 'HOTEL',
    phone: '02363788888',
    address: 'Lot A1, khu du lịch Non Nước, Ngũ Hành Sơn, Đà Nẵng',
    website: 'https://all.accor.com',
    notes: 'Gần biển Mỹ Khê.',
    key: 'hotel_danang2',
  },
  {
    name: 'Fusion Resort Cam Ranh',
    type: 'HOTEL',
    phone: '02586229999',
    email: 'reservations@fusionresorts.com',
    address: 'Nguyễn Tất Thành, Cam Hải Đông, Cam Lâm, Khánh Hòa',
    website: 'https://www.fusionresorts.com',
    notes: 'Resort all-spa villa gần Cam Ranh.',
    key: 'hotel_camranh',
  },
  {
    name: 'CenDeluxe Hotel Tuy Hòa',
    type: 'HOTEL',
    phone: '02573919999',
    email: 'sales@cendeluxe.com.vn',
    address: '02 Nguyễn Tất Thành, Phường 7, Tuy Hòa, Phú Yên',
    website: 'https://www.cendeluxe.com',
    notes: 'Khách sạn 4* trung tâm Tuy Hòa – thuận tiện tham quan Gành Đá Đĩa, Mũi Điện.',
    key: 'hotel_phuyen',
  },
  // ── Nhà hàng ────────────────────────────────────────────
  {
    name: 'Nhà hàng Ngon (Pasteur)',
    type: 'RESTAURANT',
    phone: '02838271313',
    address: '138 Nam Kỳ Khởi Nghĩa, Quận 1, TP.HCM',
    notes: 'Ẩm thực ba miền trong không gian sân vườn.',
    key: 'rest_hcm',
  },
  {
    name: 'Cơm niêu Sài Gòn',
    type: 'RESTAURANT',
    phone: '02838245678',
    address: '6C Tôn Thất Thiệp, Quận 1, TP.HCM',
    notes: 'Cơm niêu đặc trưng Nam Bộ.',
    key: 'rest_comnieu',
  },
  {
    name: 'Nhà hàng Hải sản Phố Biển (Nha Trang)',
    type: 'RESTAURANT',
    phone: '02583877777',
    address: '6 Nguyễn Thị Minh Khai, Nha Trang',
    notes: 'Hải sản tươi sống Khánh Hòa.',
    key: 'rest_nt',
  },
  {
    name: 'Nhà hàng Madame Lân (Đà Nẵng)',
    type: 'RESTAURANT',
    phone: '02363614455',
    address: '4-6 Bạch Đằng, Hải Châu, Đà Nẵng',
    notes: 'Món Việt cao cấp view sông Hàn.',
    key: 'rest_dng',
  },
  {
    name: 'Nhà hàng Ancient Faifo (Hội An)',
    type: 'RESTAURANT',
    phone: '02353861194',
    address: '66 Nguyễn Thị Minh Khai, Hội An',
    notes: 'Ẩm thực fusion giữa phố cổ.',
    key: 'rest_hoi',
  },
  {
    name: 'Nhà hàng Sen Hạ Long',
    type: 'RESTAURANT',
    phone: '02033678888',
    address: 'Đường Hạ Long, Bãi Cháy, Quảng Ninh',
    notes: 'Hải sản vịnh & buffet.',
    key: 'rest_hl',
  },
  // ── HDV / hoạt động ─────────────────────────────────────
  {
    name: 'Hiệp hội Hướng dẫn viên du lịch TP.HCM',
    type: 'GUIDE',
    phone: '02838225678',
    address: '23 Lê Lợi, Quận 1, TP.HCM',
    notes: 'Điều phối HDV tiếng Việt/Anh.',
    key: 'guide_hcm',
  },
  {
    name: 'Sun World Ba Na Hills',
    type: 'ACTIVITY',
    phone: '02363791888',
    address: 'An Sơn, Hòa Ninh, Hòa Vang, Đà Nẵng',
    website: 'https://banahills.sunworld.vn',
    notes: 'KDL Bà Nà – Cầu Vàng, cáp treo.',
    key: 'act_bana',
  },
  {
    name: 'VinWonders Nha Trang',
    type: 'ACTIVITY',
    phone: '02583586868',
    address: 'Hòn Tre, Nha Trang, Khánh Hòa',
    website: 'https://vinwonders.com',
    notes: 'Công viên giải trí trên đảo Hòn Tre.',
    key: 'act_vw_nt',
  },
];

/** Chọn hãng bay luân phiên */
function pickAirlineKey(tourId) {
  const keys = ['air_vna', 'air_vj', 'air_bamboo'];
  return keys[tourId % 3];
}

/** Chọn xe khách */
function pickBusKey(tourId) {
  const keys = ['bus_futa', 'bus_mailinh', 'bus_tour'];
  return keys[tourId % 3];
}

/** Ước lượng giờ bay nội địa (đơn giản) */
function estimateFlightHours(dep, dest) {
  const north = ['Hà Nội', 'Hải Phòng', 'Quảng Ninh'];
  const south = ['TP. Hồ Chí Minh', 'Cần Thơ', 'Cà Mau', 'Phú Quốc'];
  const d1 = north.some((x) => dep.includes(x) || dest.includes(x));
  const d2 = south.some((x) => dep.includes(x) || dest.includes(x));
  if (d1 && d2) return 2.0;
  return 1.25;
}

/** Khách sạn theo điểm đến + PREMIUM */
function pickHotelKey(destName, tourLine) {
  const d = destName.normalize('NFC');
  const premium = tourLine === 'PREMIUM';
  if (/Phú Quốc|Phu Quoc/i.test(d)) return 'hotel_pq';
  if (/Phú Yên|Phu Yen|Quy Nhơn|Quy Nhon|Tuy Hòa|Tuy Hoa/i.test(d)) return premium ? 'hotel_camranh' : 'hotel_phuyen';
  if (/Nha Trang/i.test(d)) return premium ? 'hotel_camranh' : 'hotel_nhatrang';
  if (/Đà Nẵng|Da Nang/i.test(d)) return premium ? 'hotel_danang' : 'hotel_danang2';
  if (/Hạ Long|Ha Long|Vịnh/i.test(d)) return 'hotel_halong';
  if (/Hà Nội|Ha Noi/i.test(d)) return 'hotel_hn';
  if (/Đà Lạt|Da Lat/i.test(d)) return 'hotel_dalat';
  if (/Huế|Hue/i.test(d)) return 'hotel_hue';
  if (/Cần Thơ|Can Tho/i.test(d)) return 'hotel_cantho';
  if (/Sapa|Sa Pa|Lào Cai/i.test(d)) return 'hotel_sapa';
  if (/Hồ Chí Minh|TP\.?\s*HCM|Sài Gòn/i.test(d)) return 'hotel_hcm';
  return 'hotel_danang';
}

/** Nhà hàng luân phiên theo ngày */
function pickRestaurantKey(dayNumber, tourId) {
  const keys = ['rest_hcm', 'rest_comnieu', 'rest_nt', 'rest_dng', 'rest_hoi', 'rest_hl'];
  return keys[(dayNumber + tourId) % keys.length];
}

function buildTransportRows(tour, idMap) {
  const dep = tour.depName;
  const dest = tour.destName;
  const tt = tour.transportType || 'BUS';
  const tid = tour.id;
  const airline = idMap[pickAirlineKey(tid)];
  const busCo = idMap[pickBusKey(tid)];
  const tourBus = idMap.bus_tour;

  const rows = [];

  if (tt === 'FLIGHT') {
    const fh = estimateFlightHours(dep, dest);
    rows.push(
      {
        tourId: tid,
        supplierId: tourBus,
        legOrder: 1,
        vehicleType: 'BUS_45',
        vehicleDetail: 'Xe du lịch đưa đoàn ra sân bay (45 chỗ, ghế ngả)',
        seatClass: null,
        departurePoint: `${dep} – điểm tập trung theo thông báo`,
        arrivalPoint: `Ga đi nội địa – Cảng hàng không ${dep}`,
        estimatedHours: 0.75,
        notes: 'Quý khách có mặt trước giờ bay ít nhất 2 tiếng (nội địa).',
      },
      {
        tourId: tid,
        supplierId: airline,
        legOrder: 2,
        vehicleType: 'FLIGHT',
        vehicleDetail: `VN${String(1660 + (tid % 80)).padStart(4, '0')}`,
        seatClass: 'Economy',
        departurePoint: `Sân bay ${dep}`,
        arrivalPoint: `Sân bay ${dest}`,
        estimatedHours: fh,
        notes: 'Hành lý xách tay 7kg; ký gửi theo điều kiện vé.',
      },
      {
        tourId: tid,
        supplierId: busCo,
        legOrder: 3,
        vehicleType: 'BUS_29',
        vehicleDetail: 'Xe đón từ sân bay về khu lưu trú (29 chỗ)',
        seatClass: null,
        departurePoint: `Sân bay ${dest} – cửa ra đón khách`,
        arrivalPoint: `${dest} – khách sạn/khu nghỉ theo chương trình`,
        estimatedHours: 1.0,
        notes: null,
      },
      {
        tourId: tid,
        supplierId: airline,
        legOrder: 4,
        vehicleType: 'FLIGHT',
        vehicleDetail: `VN${String(1390 + (tid % 60)).padStart(4, '0')}`,
        seatClass: 'Economy',
        departurePoint: `Sân bay ${dest}`,
        arrivalPoint: `Sân bay ${dep}`,
        estimatedHours: fh,
        notes: 'Chặng bay về.',
      },
    );
  } else if (tt === 'BUS') {
    const est = Math.min(11.5, 4 + (tid % 7));
    rows.push({
      tourId: tid,
      supplierId: busCo,
      legOrder: 1,
      vehicleType: tid % 2 === 0 ? 'BUS_45' : 'BUS_29',
      vehicleDetail: 'Xe du lịch đời mới, điều hòa, nước uống trên xe',
      seatClass: null,
      departurePoint: dep,
      arrivalPoint: dest,
      estimatedHours: est,
      notes: 'Có dừng nghỉ giữa chặng theo quy định tài xế.',
    });
  } else {
    // MIXED
    rows.push(
      {
        tourId: tid,
        supplierId: airline,
        legOrder: 1,
        vehicleType: 'FLIGHT',
        vehicleDetail: `VN${String(1580 + (tid % 70)).padStart(4, '0')}`,
        seatClass: 'Economy',
        departurePoint: `Sân bay ${dep}`,
        arrivalPoint: `Sân bay khu vực trung chuyển`,
        estimatedHours: estimateFlightHours(dep, dest),
        notes: null,
      },
      {
        tourId: tid,
        supplierId: tourBus,
        legOrder: 2,
        vehicleType: 'BUS_29',
        vehicleDetail: 'Xe du lịch nối tuyến đến điểm tham quan & lưu trú',
        seatClass: null,
        departurePoint: `${dest} – ga trung chuyển / sân bay`,
        arrivalPoint: `${dest} – các điểm trong chương trình`,
        estimatedHours: 2.5,
        notes: 'Phương án MIXED: kết hợp máy bay và ô tô theo lịch khởi hành.',
      },
      {
        tourId: tid,
        supplierId: airline,
        legOrder: 3,
        vehicleType: 'FLIGHT',
        vehicleDetail: `VN${String(1420 + (tid % 55)).padStart(4, '0')}`,
        seatClass: 'Economy',
        departurePoint: `Sân bay ${dest}`,
        arrivalPoint: `Sân bay ${dep}`,
        estimatedHours: estimateFlightHours(dep, dest),
        notes: 'Chặng bay về (MIXED).',
      },
    );
  }

  return rows;
}

function mealLabel(type, dayNumber, durationDays) {
  const styles = {
    BREAKFAST: ['Buffet sáng tại khách sạn', 'Set menu sáng kiểu Việt', 'Bánh mì – phở – trứng theo tiêu chuẩn tour'],
    LUNCH: ['Cơm phần 4 món + canh + tráng miệng', 'Set đặc sản địa phương', 'Buffet trưa nhà hàng đối tác'],
    DINNER: ['Tiệc đoàn / set menu tối', 'Ăn tối tự chọn thực đơn địa phương', 'Buffet hải sản (theo chương trình)'],
  };
  const arr = styles[type];
  return arr[(dayNumber + durationDays) % arr.length];
}

async function main() {
  const conn = await mysql.createConnection({
    host: 'localhost',
    port: 3306,
    user: 'root',
    password: 'root',
    database: 'tour_booking',
  });

  const idMap = {};

  for (const s of SUPPLIERS) {
    const [ex] = await conn.execute('SELECT id FROM Supplier WHERE name = ?', [s.name]);
    let id;
    if (ex.length) {
      id = ex[0].id;
    } else {
      const [r] = await conn.execute(
        `INSERT INTO Supplier (name, type, phone, email, address, website, taxCode, notes, isActive)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, TRUE)`,
        [
          s.name,
          s.type,
          s.phone || null,
          s.email || null,
          s.address || null,
          s.website || null,
          s.taxCode || null,
          s.notes || null,
        ],
      );
      id = r.insertId;
    }
    idMap[s.key] = id;
  }

  const [tours] = await conn.execute(`
    SELECT t.id, t.durationDays, t.transportType, t.tourLine,
           dep.name AS depName, dest.name AS destName
    FROM Tour t
    JOIN Location dep ON t.departureLocationId = dep.id
    JOIN Location dest ON t.destinationLocationId = dest.id
    WHERE t.name != 'test'
    ORDER BY t.id
  `);

  const [haveT] = await conn.execute('SELECT DISTINCT tourId FROM TourTransport');
  const hasTransport = new Set(haveT.map((x) => x.tourId));

  let transportCount = 0;
  for (const tour of tours) {
    if (hasTransport.has(tour.id)) continue;
    const rows = buildTransportRows(tour, idMap);
    for (const row of rows) {
      await conn.execute(
        `INSERT INTO TourTransport (tourId, supplierId, legOrder, vehicleType, vehicleDetail, seatClass,
          departurePoint, arrivalPoint, estimatedHours, notes)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          row.tourId,
          row.supplierId,
          row.legOrder,
          row.vehicleType,
          row.vehicleDetail,
          row.seatClass,
          row.departurePoint,
          row.arrivalPoint,
          row.estimatedHours,
          row.notes,
        ],
      );
      transportCount++;
    }
  }

  const [itineraries] = await conn.execute(`
    SELECT ti.id AS itineraryId, ti.tourId, ti.dayNumber, t.durationDays, t.tourLine,
           dest.name AS destName
    FROM TourItinerary ti
    JOIN Tour t ON ti.tourId = t.id
    JOIN Location dest ON t.destinationLocationId = dest.id
    WHERE t.name != 'test'
    ORDER BY t.id, ti.dayNumber
  `);

  const [haveM] = await conn.execute('SELECT DISTINCT itineraryId FROM TourMeal');
  const hasMeal = new Set(haveM.map((x) => x.itineraryId));
  const [haveA] = await conn.execute('SELECT DISTINCT itineraryId FROM TourAccommodation');
  const hasAcc = new Set(haveA.map((x) => x.itineraryId));

  let mealCount = 0;
  let accCount = 0;

  const hotelKey = (dest, line) => pickHotelKey(dest, line);
  const starsForLine = (line) => {
    if (line === 'PREMIUM') return 5;
    if (line === 'STANDARD' || line === 'GOOD_VALUE') return 4;
    return 3;
  };

  for (const it of itineraries) {
    const { itineraryId, tourId, dayNumber, durationDays, tourLine, destName } = it;
    const hk = hotelKey(destName, tourLine);
    const hid = idMap[hk] || idMap.hotel_danang;
    const stars = starsForLine(tourLine);

    if (!hasAcc.has(itineraryId) && dayNumber < durationDays) {
      await conn.execute(
        `INSERT INTO TourAccommodation (itineraryId, supplierId, hotelName, starRating, roomType, checkInNote, checkOutNote, address, mapUrl)
         VALUES (?, ?, (SELECT name FROM Supplier WHERE id = ?), ?, ?, ?, ?, ?, ?)`,
        [
          itineraryId,
          hid,
          hid,
          stars,
          tourLine === 'PREMIUM' ? 'Deluxe/ Suite (theo chương trình)' : 'Superior Twin/ Triple (2–3 khách/phòng)',
          `Sau khi tham quan ngày ${dayNumber}, nhận phòng theo giờ quy định khách sạn.`,
          dayNumber === durationDays - 1
            ? 'Trả phòng buổi sáng ngày hôm sau (theo lịch trình).'
            : 'Giữ phòng qua đêm; hành lý theo hướng dẫn HDV.',
          'Theo xác nhận booking của đoàn; chi tiết gửi khi khởi hành.',
          null,
        ],
      );
      accCount++;
    }

    if (!hasMeal.has(itineraryId)) {
      const types =
        dayNumber >= durationDays
          ? ['BREAKFAST', 'LUNCH']
          : ['BREAKFAST', 'LUNCH', 'DINNER'];

      for (const mt of types) {
        const rk = pickRestaurantKey(dayNumber, tourId);
        const rid = idMap[rk];
        await conn.execute(
          `INSERT INTO TourMeal (itineraryId, supplierId, mealType, restaurantName, menuStyle, dietaryNotes)
           VALUES (?, ?, ?, (SELECT name FROM Supplier WHERE id = ?), ?, ?)`,
          [
            itineraryId,
            rid,
            mt,
            rid,
            mealLabel(mt, dayNumber, durationDays),
            'Chay / kiêng: báo trước ít nhất 48h khi đăng ký tour.',
          ],
        );
        mealCount++;
      }
    }
  }

  /** Cập nhật khách sạn đúng khu vực Phú Yên / Quy Nhơn (nếu trước đó gán mặc định Đà Nẵng) */
  if (idMap.hotel_phuyen) {
    const [fix] = await conn.execute(
      `UPDATE TourAccommodation ta
       INNER JOIN TourItinerary ti ON ta.itineraryId = ti.id
       INNER JOIN Tour t ON ti.tourId = t.id
       INNER JOIN Location l ON t.destinationLocationId = l.id
       SET ta.supplierId = ?, ta.hotelName = 'CenDeluxe Hotel Tuy Hòa'
       WHERE (l.name LIKE '%Phú Yên%' OR l.name LIKE '%Quy Nhơn%' OR l.name LIKE '%Tuy Hòa%')`,
      [idMap.hotel_phuyen],
    );
    if (fix.affectedRows > 0) {
      console.log(`🔧 Đã chỉnh ${fix.affectedRows} bản ghi TourAccommodation → CenDeluxe Tuy Hòa (Phú Yên/Quy Nhơn).`);
    }
  }

  const [[sc]] = await conn.execute('SELECT COUNT(*) c FROM Supplier');
  const [[tc]] = await conn.execute('SELECT COUNT(*) c FROM TourTransport');
  const [[mc]] = await conn.execute('SELECT COUNT(*) c FROM TourMeal');
  const [[ac]] = await conn.execute('SELECT COUNT(*) c FROM TourAccommodation');

  console.log('✅ Supplier:', sc.c);
  console.log('✅ TourTransport:', tc.c, `(+${transportCount} mới)`);
  console.log('✅ TourMeal:', mc.c, `(+${mealCount} mới)`);
  console.log('✅ TourAccommodation:', ac.c, `(+${accCount} mới)`);

  await conn.end();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
