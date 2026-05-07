import OpenAI from 'openai'

export type LlmExtractedSlots = {
  destination?: string
  departure?: string
  days?: number
  budgetMin?: number
  budgetMax?: number
  adults?: number
  children?: number
  infants?: number
  transportType?: 'BUS' | 'FLIGHT' | 'MIXED'
  tourLine?: 'PREMIUM' | 'STANDARD' | 'ECONOMY' | 'GOOD_VALUE'
  keywords?: string[]
  userIntent?: 'recommend' | 'faq' | 'booking' | 'other'
}

/** Schema strict cho OpenAI Structured Outputs (json_schema) */
const SLOT_EXTRACTION_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  properties: {
    userIntent: {
      type: 'string',
      enum: ['recommend', 'faq', 'booking', 'other'],
      description: 'Ý định chính của tin nhắn mới (ưu tiên ngữ cảnh du lịch/đặt tour).',
    },
    destination: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
      description: 'Điểm đến nếu có; không đoán bừa.',
    },
    departure: {
      anyOf: [{ type: 'string' }, { type: 'null' }],
      description: 'Nơi khởi hành nếu có.',
    },
    days: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'Số ngày tour nếu người dùng nêu rõ.',
    },
    budgetMin: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'Ngân sách tối thiểu VND.',
    },
    budgetMax: {
      anyOf: [{ type: 'number' }, { type: 'null' }],
      description: 'Ngân sách tối đa VND.',
    },
    adults: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    children: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    infants: { anyOf: [{ type: 'number' }, { type: 'null' }] },
    transportType: {
      anyOf: [{ type: 'string', enum: ['BUS', 'FLIGHT', 'MIXED'] }, { type: 'null' }],
    },
    tourLine: {
      anyOf: [
        { type: 'string', enum: ['PREMIUM', 'STANDARD', 'ECONOMY', 'GOOD_VALUE'] },
        { type: 'null' },
      ],
    },
    keywords: {
      anyOf: [
        { type: 'array', items: { type: 'string' }, maxItems: 8 },
        { type: 'null' },
      ],
      description: 'Từ khóa tìm kiếm tour, không trùng destination.',
    },
  },
  required: [
    'userIntent',
    'destination',
    'departure',
    'days',
    'budgetMin',
    'budgetMax',
    'adults',
    'children',
    'infants',
    'transportType',
    'tourLine',
    'keywords',
  ],
} as const

/** Mặc định: gpt-5.4-mini (có thể ghi đè bằng OPENAI_MODEL / OPENAI_REPLY_MODEL) */
const DEFAULT_OPENAI_MODEL = 'gpt-5.4-mini'

/**
 * Prompt guidance (GPT-5.4 / mini): quy tắc quan trọng trước, hợp đồng đầu ra, grounding, xử lý mơ hồ.
 * @see https://developers.openai.com/api/docs/guides/prompt-guidance
 */
const SLOT_EXTRACTION_SYSTEM = [
  '<role>Bạn là tầng trích xuất tham số (slot) cho chatbot gợi ý tour du lịch Việt Nam. Bạn không trò chuyện với người dùng; chỉ chuẩn bị dữ liệu có cấu trúc cho hệ thống.</role>',
  '',
  '<critical_rules>',
  '1) CHỈ điền giá trị khi chúng xuất hiện rõ ràng trong hội thoại (các lượt user/assistant đã cho) hoặc trong "Tin nhắn mới". Không bịa địa danh, giá, số ngày, số khách.',
  '2) Không chắc → dùng null cho field đó (schema bắt buộc vẫn trả đủ key theo JSON Schema).',
  '3) Tiền tệ: luôn VND, số nguyên (vd. 5 triệu → 5000000).',
  '</critical_rules>',
  '',
  '<instruction_priority>',
  'Nếu tin nhắn mới mâu thuẫn với tin cũ về số ngày, ngân sách, điểm đến/đi, số khách → ưu tiên tin nhắn mới.',
  'Nếu tin nhắn mới chỉ bổ sung (vd. thêm ngày/ngân sách) mà không đổi điểm đến → giữ ràng buộc địa danh/vùng từ các lượt trước khi vẫn còn nhất quán.',
  '</instruction_priority>',
  '',
  '<grounding_rules>',
  'destination / departure: chỉ tên địa danh hoặc vùng người dùng đã nêu; không suy diễn tour cụ thể.',
  'keywords: từ khóa ngắn (tối đa 8) phục vụ tìm kiếm, không trùng nghĩa destination nếu không cần.',
  '</grounding_rules>',
  '',
  '<userIntent>',
  'recommend: muốn gợi ý/chọn/xem tour.',
  'faq: chính sách, thanh toán, giấy tờ, hủy đổi, trẻ em, bảo hiểm…',
  'booking: đặt tour / giữ chỗ / book.',
  'other: không thuộc tư vấn/đặt tour du lịch trong phạm vi sản phẩm.',
  '</userIntent>',
  '',
  '<budget_hints>',
  '"X triệu" → nhân 1_000_000. "dưới X triệu" → budgetMax. "trên X triệu" → budgetMin. Khoảng hai đầu số → budgetMin và budgetMax.',
  '</budget_hints>',
  '',
  '<output_contract>',
  'Tuân thủ đúng JSON Schema (structured output). Không thêm giải thích ngoài JSON.',
  '</output_contract>',
].join('\n')

const SLOT_EXTRACTION_LEGACY_SYSTEM = [
  '<role>Trích xuất slot cho hệ thống gợi ý tour Việt Nam. Chỉ trả về một object JSON, không prose.</role>',
  '<critical_rules>Không bịa địa danh hay số tiền. null khi không chắc. VND là số nguyên.</critical_rules>',
  '<instruction_priority>Tin nhắn mới ưu tiên hơn tin cũ nếu mâu thuẫn về ngày/giá/địa điểm.</instruction_priority>',
  '<userIntent>recommend | faq | booking | other</userIntent>',
].join('\n')

const RECOMMENDATION_REPLY_SYSTEM = [
  '<role>Bạn là nhân viên tư vấn tour du lịch Việt Nam. Xưng "mình". Giọng thân thiện, súc tích.</role>',
  '',
  '<critical_rules>',
  '1) CHỈ mô tả tour dựa trên mảng "danh_sach_tour" trong JSON user. Không thêm tour, giá, điểm đến không có trong mảng.',
  '2) Mọi giá (đ) và tên tour phải khớp một phần tử trong danh_sach_tour (có thể diễn đạt lại ngắn, không đổi số).',
  '3) Đọc "ghi_chu_khop_tim_kiem": nếu khop_tim_kiem=false thì phải nói rõ đây là gợi ý tham khảo/nổi bật vì không có kết quả khớp bộ lọc; không nói "đã tìm thấy tour phù hợp nhất" theo bộ lọc.',
  '4) Nếu khop_tim_kiem=true có thể nói đã có vài lựa chọn phù hợp theo dữ liệu hệ thống.',
  '</critical_rules>',
  '',
  '<grounding_rules>',
  'Không đưa link, mã, giảm giá, chính sách chi tiết trừ khi nằm trong fallback_neu_loi hoặc dữ liệu cho phép.',
  'Nếu danh_sach_tour rỗng: an toàn nhất là nhắc theo fallback_neu_loi, không bịa tour.',
  '</grounding_rules>',
  '',
  '<instruction_priority>',
  'Ưu tiên ý trong tin_nhan_khach và lịch sử (nếu có). Chỉ dẫn mới hơn ghi đè chi tiết cũ khi trùng chủ đề.',
  '</instruction_priority>',
  '',
  '<verification_loop>',
  'Trước khi trả lời: (1) Mỗi tour nhắc tên có trong danh_sach_tour? (2) Giá khớp đúng gia_vnd của tour đó? (3) Lời thoại có mâu thuẫn khop_tim_kiem/ghi_chu_khop_tim_kiem không? Nếu có thì sửa.',
  '</verification_loop>',
  '',
  '<style>',
  '3–6 câu, không bullet dài. Kết thúc bằng một câu hỏi gợi ý tiếp; ưu tiên dùng ý từ cau_hoi_tiep nếu có, diễn đạt tự nhiên.',
  'Không mở đầu bằng "Dạ", "Okay", "Great question". Vào thẳng nội dung hữu ích.',
  '</style>',
].join('\n')

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY
  if (!apiKey) return null
  return new OpenAI({ apiKey })
}

export function isLlmEnabled() {
  return !!process.env.OPENAI_API_KEY
}

/** Bật sinh câu trả lời tự nhiên (B): cần API key; tắt: OPENAI_NATURAL_REPLY=0 */
export function isNaturalReplyEnabled() {
  return isLlmEnabled() && process.env.OPENAI_NATURAL_REPLY !== '0'
}

function parseReplyTemperature(): number {
  const raw = process.env.OPENAI_REPLY_TEMPERATURE
  if (raw === undefined || raw === '') return 0.45
  const n = Number(raw)
  return Number.isFinite(n) ? Math.min(2, Math.max(0, n)) : 0.45
}

/** Số lượt user/assistant gửi kèm khi sinh reply (không tính payload JSON cuối). */
function replyHistoryTurnLimit(): number {
  const raw = process.env.OPENAI_REPLY_HISTORY_TURNS
  if (raw === undefined || raw === '') return 10
  const n = parseInt(raw, 10)
  return Number.isFinite(n) && n >= 0 ? Math.min(24, n) : 10
}

function nullToUndefined<T>(v: T | null | undefined): T | undefined {
  if (v === null || v === undefined) return undefined
  return v
}

function parseSlotsPayload(raw: Record<string, unknown>): LlmExtractedSlots {
  const out: LlmExtractedSlots = {
    userIntent: raw.userIntent as LlmExtractedSlots['userIntent'],
  }
  const d = nullToUndefined(raw.destination as string | null)
  if (d) out.destination = d
  const dep = nullToUndefined(raw.departure as string | null)
  if (dep) out.departure = dep
  const days = nullToUndefined(raw.days as number | null)
  if (days != null) out.days = days
  const bmin = nullToUndefined(raw.budgetMin as number | null)
  if (bmin != null) out.budgetMin = bmin
  const bmax = nullToUndefined(raw.budgetMax as number | null)
  if (bmax != null) out.budgetMax = bmax
  const a = nullToUndefined(raw.adults as number | null)
  if (a != null) out.adults = a
  const c = nullToUndefined(raw.children as number | null)
  if (c != null) out.children = c
  const i = nullToUndefined(raw.infants as number | null)
  if (i != null) out.infants = i
  const tt = nullToUndefined(raw.transportType as string | null)
  if (tt === 'BUS' || tt === 'FLIGHT' || tt === 'MIXED') out.transportType = tt
  const tl = nullToUndefined(raw.tourLine as string | null)
  if (tl === 'PREMIUM' || tl === 'STANDARD' || tl === 'ECONOMY' || tl === 'GOOD_VALUE') out.tourLine = tl
  const kw = raw.keywords as string[] | null | undefined
  if (kw && kw.length > 0) out.keywords = kw
  return out
}

async function extractSlotsWithLlmStructured(client: OpenAI, input: {
  message: string
  conversation?: { role: 'user' | 'assistant'; content: string }[]
}): Promise<LlmExtractedSlots | null> {
  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SLOT_EXTRACTION_SYSTEM },
    ...(input.conversation ?? []).slice(-8).map((m) => ({ role: m.role, content: m.content })),
    { role: 'user', content: `Tin nhắn mới:\n${input.message}` },
  ]

  const model = process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL

  const res = await client.chat.completions.create({
    model,
    temperature: 0,
    messages,
    response_format: {
      type: 'json_schema',
      json_schema: {
        name: 'slot_extraction',
        strict: true,
        schema: SLOT_EXTRACTION_SCHEMA as unknown as Record<string, unknown>,
      },
    },
  })

  const content = res.choices?.[0]?.message?.content
  if (!content) return null
  try {
    const raw = JSON.parse(content) as Record<string, unknown>
    return parseSlotsPayload(raw)
  } catch {
    return null
  }
}

async function extractSlotsWithLlmLegacyJsonObject(client: OpenAI, input: {
  message: string
  conversation?: { role: 'user' | 'assistant'; content: string }[]
}): Promise<LlmExtractedSlots | null> {
  const schemaHint = {
    userIntent: 'recommend | faq | booking | other',
    destination: 'string | null',
    departure: 'string | null',
    days: 'number | null',
    budgetMin: 'number | null',
    budgetMax: 'number | null',
    adults: 'number | null',
    children: 'number | null',
    infants: 'number | null',
    transportType: 'BUS | FLIGHT | MIXED | null',
    tourLine: 'PREMIUM | STANDARD | ECONOMY | GOOD_VALUE | null',
    keywords: 'string[] | null',
  }

  const messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: 'system', content: SLOT_EXTRACTION_LEGACY_SYSTEM },
    ...(input.conversation ?? []).slice(-8).map((m) => ({ role: m.role, content: m.content })),
    {
      role: 'user',
      content: [`Tin nhắn mới: ${input.message}`, '---', `Trả về JSON: ${JSON.stringify(schemaHint)}`].join('\n'),
    },
  ]

  const model = process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL

  const res = await client.chat.completions.create({
    model,
    temperature: 0,
    messages,
    response_format: { type: 'json_object' },
  })

  const content = res.choices?.[0]?.message?.content
  if (!content) return null
  try {
    return JSON.parse(content) as LlmExtractedSlots
  } catch {
    return null
  }
}

export async function extractSlotsWithLlm(input: {
  message: string
  conversation?: { role: 'user' | 'assistant'; content: string }[]
}): Promise<LlmExtractedSlots | null> {
  const client = getClient()
  if (!client) return null

  const useLegacy = process.env.OPENAI_SLOT_LEGACY_JSON === '1'

  if (useLegacy) {
    try {
      return await extractSlotsWithLlmLegacyJsonObject(client, input)
    } catch {
      return null
    }
  }

  try {
    return await extractSlotsWithLlmStructured(client, input)
  } catch {
    try {
      return await extractSlotsWithLlmLegacyJsonObject(client, input)
    } catch {
      return null
    }
  }
}

export type TourBriefForReply = {
  name: string
  durationDays: number | null
  basePrice: number | null
  departure?: string
  destination?: string
  slug?: string | null
}

/**
 * (B) Sinh câu trả lời tự nhiên dựa trên tour đã lấy từ DB; không bịa giá/tên ngoài danh sách.
 * `conversation`: các lượt trước tin nhắn hiện tại (ngữ cảnh hội thoại); tin hiện tại nằm trong payload.
 * Trả về null nếu tắt LLM hoặc lỗi → caller dùng fallbackReply.
 */
export async function generateRecommendationReplyNatural(input: {
  userMessage: string
  fallbackReply: string
  followUps: string
  tours: TourBriefForReply[]
  matched: boolean
  personalized: boolean
  /** Lịch sử user/assistant trước tin hiện tại — để trả lời mạch lạc với câu hỏi trước đó */
  conversation?: { role: 'user' | 'assistant'; content: string }[]
}): Promise<string | null> {
  if (!isNaturalReplyEnabled()) return null

  const client = getClient()
  if (!client) return null

  const model = process.env.OPENAI_REPLY_MODEL ?? process.env.OPENAI_MODEL ?? DEFAULT_OPENAI_MODEL

  const toursJson = input.tours.map((t) => ({
    ten: t.name,
    so_ngay: t.durationDays,
    gia_vnd: t.basePrice,
    khoi_hanh: t.departure ?? null,
    diem_den: t.destination ?? null,
    slug: t.slug ?? null,
  }))

  // ghi_chu_khop_tim_kiem: làm rõ ý nghĩa khop_tim_kiem cho gpt-5.4-mini (grounding theo tài liệu prompt guidance)
  const userPayload = {
    tin_nhan_khach: input.userMessage,
    khop_tim_kiem: input.matched,
    ghi_chu_khop_tim_kiem: input.matched
      ? 'true: các tour trong danh_sach_tour là kết quả tìm theo bộ lọc (có ít nhất một tour thỏa điều kiện search).'
      : 'false: không có tour thỏa bộ lọc; danh_sach_tour đang là gợi ý nổi bật/tham khảo — không khẳng định khớp từng tiêu chí (ngày/giá/vùng).',
    goi_y_ca_nhan: input.personalized,
    cau_hoi_tiep: input.followUps.trim() || null,
    fallback_neu_loi: input.fallbackReply,
    danh_sach_tour: toursJson,
  }

  const prior = (input.conversation ?? []).slice(-replyHistoryTurnLimit())
  const replyTemp = parseReplyTemperature()

  const res = await client.chat.completions.create({
    model,
    temperature: replyTemp,
    max_tokens: 450,
    messages: [
      { role: 'system', content: RECOMMENDATION_REPLY_SYSTEM },
      ...prior.map((m) => ({ role: m.role, content: m.content })),
      {
        role: 'user',
        content: `Dữ liệu JSON (dùng để trả lời, không trích nguyên văn JSON cho khách):\n${JSON.stringify(userPayload, null, 0)}`,
      },
    ],
  })

  const text = res.choices?.[0]?.message?.content?.trim()
  if (!text || text.length < 20) return null
  return text
}
