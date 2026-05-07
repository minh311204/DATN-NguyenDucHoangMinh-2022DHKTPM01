# Kịch bản thử chatbot thủ công (web)

Ứng dụng **không** có “client system prompt”: người dùng chỉ gửi **tin nhắn**. Các case dưới đây là **chuỗi tin nhắn** để bạn gõ trên web và đối chiếu kết quả.

## Chuẩn bị

- API + frontend chạy; có thể đăng nhập hoặc dùng khách (guest).
- **Luôn tiếp tục cùng một phiên chat**: sau tin đầu, gửi kèm `sessionId` / `sessionKey` mà API trả về (ứng dụng web thường tự lưu — đừng refresh mất session nếu đang test chuỗi nhiều lượt).
- Có `OPENAI_API_KEY`: LLM trích slot + (nếu bật) câu trả lời tự nhiên. Không có key: chỉ rule/FAQ, hành vi khác một phần.

---

## 1. FAQ — không search tour

| Bước | Nội dung gửi | Kỳ vọng (gần đúng) |
|------|----------------|---------------------|
| 1 | `Thanh toán qua VNPay được không?` | Trả lời cố định về thanh toán; **không** trả về danh sách `tours` hoặc rất ngắn, không gợi ý tour. |

---

## 2. Chào hỏi — chưa ép gợi ý tour

| Bước | Nội dung gửi | Kỳ vọng |
|------|----------------|--------|
| 1 | `Xin chào` | Lời chào + hỏi điểm đến / ngày / ngân sách; không nhất thiết đã list tour (tùy logic `wantsTourRecommendation`). |

---

## 3. Một điểm đến cụ thể (guest)

| Bước | Nội dung gửi | Kỳ vọng |
|------|----------------|--------|
| 1 | `Tôi muốn đi Hà Nội` | Có `tours` (nếu DB có tour active + lịch); reply nhắc gợi ý phù hợp. |

---

## 4. Vùng miền + tin chỉ bổ sung ngày/giá (quan trọng)

Mục tiêu: sau lượt 1 đã nói **miền Tây**, lượt 2 **không** nhắc lại miền nhưng bot vẫn giữ ngữ cảnh và search không “mất vùng”.

| Bước | Nội dung gửi | Kỳ vọng |
|------|----------------|--------|
| 1 | `Tôi muốn đi miền Tây` | Có `tours` gắn miền Tây (nếu DB có); reply không báo “chưa khớp” nếu có kết quả lọc. |
| 2 | `Đi 4 ngày. Ngân sách khoảng 5 triệu/người` | Vẫn lọc theo miền Tây + 4 ngày + ngân sách; **không** nên chuyển hẳn sang chỉ tour nổi bật ngẫu nhiên nếu vẫn có tour khớp trong DB. |
| 3 | (tuỳ chọn) `Ngân sách tối đa 4,7 triệu` | Thu hẹp giá; reply nhất quán với `khop_tim_kiem` (có kết quả vs gợi ý tham khảo). |

**Ghi chú:** Nếu DB không có tour thỏa điều kiện, bot có thể show tour nổi bật và nói “tham khảo” — đó là đúng thiết kế.

---

## 5. Intent “không liên quan tour”

| Bước | Nội dung gửi | Kỳ vọng (khi có LLM) |
|------|----------------|----------------------|
| 1 | `Viết giúp mình code Python sort mảng` | `userIntent` other → từ chối nhẹ, gợi ý hỏi về tour/chính sách (không list tour dài). |

---

## 6. FAQ do LLM nhận nhưng keyword rule không bắt

| Bước | Nội dung gửi | Kỳ vọng |
|------|----------------|--------|
| 1 | Câu hỏi chính sách dài, không trùng keyword FAQ có sẵn | Có thể nhận `faq` → trả lời gợi ý chủ đề hoặc FAQ nếu khớp lần hai. |

---

## 7. Đã đăng nhập — gợi ý có điểm đến

| Bước | Nội dung gửi | Kỳ vọng |
|------|----------------|--------|
| 1 | Đăng nhập → `Muốn đi Huế` | Có `tours`; phía server có thể ghi `chat_recommendation` (hành vi). |

---

## 8. Đặt tour / booking (từ khóa)

| Bước | Nội dung gửi | Kỳ vọng |
|------|----------------|--------|
| 1 | `Mình muốn đặt tour` | Reply hướng đặt chỗ + list tour nếu có; tone `booking` trong template. |

---

## 9. Tin ngắn không đủ tín hiệu

| Bước | Nội dung gửi | Kỳ vọng |
|------|----------------|--------|
| 1 | `BK-17` (hoặc mã ngắn không rõ ngữ cảnh) | Hỏi thêm điểm đến / ngày / ngân sách; không ép list tour lớn. |

---

## 10. “Tôi muốn đi + vị trí” rồi “Đi … ngày. Ngân sách khoảng … triệu/người”

Mục tiêu: kiểm tra **hai lượt** giống hành vi người dùng thật; hiểu đúng **kỳ vọng hợp lệ** (backend **không** cam kết trả đúng **một** tour cụ thể trong DB).

| Bước | Nội dung gửi | Kỳ vọng khi Pass |
|------|----------------|-------------------|
| 1 | `Tôi muốn đi Đà Nẵng` (đổi sang tỉnh/thành bạn **có tour + lịch** trong DB) | Có `tours` hoặc ít nhất phản hồi gợi ý; **cùng session** cho bước 2. |
| 2 | `Đi 4 ngày. Ngân sách khoảng 5 triệu/người` (đổi số cho khớp dữ liệu bạn có) | Khi **khớp lọc chặt** (`strictMatch`): mỗi tour thỏa (a)–(d) như cũ — địa điểm từ lượt 1, `durationDays` đúng số ngày, giá trong **khoảng X ± 2 triệu**, có lịch tương lai. Số tour trả về mặc định **3**, có thể tới **25** nếu user yêu cầu (vd. “cho mình 10 tour”). Nếu hệ thống **nới lỏng** tìm kiếm (vẫn có `tours` nhưng không đủ ngày/giá chặt): reply nên như **chưa khớp hoàn toàn** / tham khảo — đối chiếu từng tour với điều kiện bạn đặt. |

**Khi coi là Fail (hoặc cần kiểm tra lại DB):**

- Lượt 2 làm **mất** địa điểm lượt 1 (list tour không còn liên quan đến “Đà Nẵng” / vùng đã nói) trong khi DB vẫn có tour thỏa điều kiện.
- Có tour thỏa lọc nhưng reply báo kiểu “chưa khớp” + chỉ trending (so khớp thủ công với DB).
- Reply **bịa** tên tour / giá không có trong `tours` (LLM tự nhiên phải bám danh sách).

**Khi search ra 0 tour sau mọi mức nới lỏng:**

- API trả **tour nổi bật (trending)** — không phải ranking “gần đúng” theo filter.
- Copy nên nói **gợi ý tham khảo** khi không khớp lọc chặt / trending (natural reply nếu bật).

**Khi có tour nhờ nới lỏng (partial):** Vẫn có danh sách liên quan địa điểm/từ khóa nhưng có thể khác số ngày hoặc khoảng giá — `matched` / wording “chưa khớp hoàn toàn” là đúng kỳ vọng.

**Ghi chú chuẩn bị dữ liệu:** Trước khi đánh Pass/Fail, nên tra DB một tour: `isActive`, `durationDays` **trùng** số ngày user gõ, `basePrice` trong [X−2tr, X+2tr], và có ít nhất một `schedule` với `startDate` ≥ hôm nay.

---

## 11. LIMIT động & sắp xếp (Prisma — không text-to-SQL)

| Bước | Nội dung gửi | Kỳ vọng |
|------|----------------|--------|
| 1 | `Tôi muốn đi Hà Nội, cho mình 8 tour` | Tối đa **8** tour trong response (nếu DB đủ; cap 25). |
| 2 | `Gợi ý tour Đà Nẵng, sắp xếp theo giá giảm dần` | Trong các tour còn chỗ, thứ tự xấp xỉ **giá cao → thấp** (sau khi ưu tiên còn chỗ). |
| 3 | `Tour miền Tây giá rẻ nhất` hoặc `sắp xếp giá tăng dần` | Ưu tiên **giá thấp → cao** trong nhóm còn chỗ. |

---

## Checklist nhanh sau mỗi case

- [ ] `sessionId` giữ nguyên suốt chuỗi hội thoại.
- [ ] Khi có `tours`: tên/giá hiển thị **khớp** dữ liệu (không bịa từ LLM — phần text tự nhiên vẫn phải bám `danh_sach_tour`).
- [ ] Khi **không** có tour khớp bộ lọc: copy không nói ngược (“đã khớp hoàn toàn” trong khi đang trending) — đã cố gắng siết bằng `ghi_chu_khop_tim_kiem` trong LLM reply.
- [ ] **Mục 10:** Hai lượt giữ `sessionId`; không kỳ vọng “đúng một tour” nếu nhiều tour cùng thỏa lọc; 0 kết quả → chấp nhận trending, không đòi “tour liên quan” từ code.

---

## Gợi ý mở rộng (tùy DB)

- Tour có tên dài chứa “Hoàng” + từ “hủy” trong FAQ — đảm bảo không nhầm FAQ.
- Hai lượt: `Tour Đà Nẵng 4 ngày` → có search theo tên + số ngày.

Bạn có thể copy từng ô “Nội dung gửi” vào ô chat trên web và đánh dấu Pass/Fail theo bảng kỳ vọng.
