import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common'
import { PrismaService } from '../prisma/prima.service'
import { randomUUID } from 'crypto'
import { Prisma } from '@prisma/client'
import {
  extractSlotsWithLlm,
  generateRecommendationReplyNatural,
  isLlmEnabled,
  isNaturalReplyEnabled,
  type LlmExtractedSlots,
} from './llm'
import { generateReplyWithWebSearch } from './openai-search'

type SendMessageInput = {
  userId: number | null
  sessionId?: number
  sessionKey?: string
  message: string
}

/** Slots đã merge từ rule-based + LLM */
type ResolvedSlots = {
  q?: string
  qTokens?: string[]
  days?: number
  budget?: { min?: number; max?: number; approx?: number }
  adults?: number
  children?: number
  infants?: number
  transportType?: string
  tourLine?: string
  regionTerms?: string[]
  /** Tên khu vực gợi ý (vd. miền tây) — dùng hiển thị; `regionTerms` là danh sách địa danh mở rộng */
  regionKey?: string
  destination?: string
  departure?: string
  /** Số tour tối đa (1–25), bắt từ lời user — tương tự LIMIT động */
  resultLimit?: number
  /** Ưu tiên sắp xếp sau lọc (Prisma an toàn, không phải text-to-SQL) */
  sortPreference?: 'price_asc' | 'price_desc' | 'rating_desc' | 'reviews_desc'
}

/** Kết quả gợi ý tour: strictMatch = lượt tìm chặt (đủ ngày/giá/keyword) có ít nhất một tour */
type RecommendToursResult = { tours: any[]; strictMatch: boolean }

@Injectable()
export class AiService implements OnModuleInit {
  constructor(private readonly prisma: PrismaService) { }

  async onModuleInit() {
    // Tự động xóa sạch lịch sử chat khi server khởi động lại (yêu cầu của khách hàng)
    try {
      await this.prisma.chatMessage.deleteMany({})
      await this.prisma.chatSession.deleteMany({})
    } catch (e) {
      // ignore
    }
  }

  // ─────────────────────────────────────────────────────────
  // Text helpers
  // ─────────────────────────────────────────────────────────

  private static stripDiacritics(input: string) {
    return input
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
  }

  private normalizeForMatch(s: string) {
    return AiService.stripDiacritics(s)
      .trim()
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s]/gu, ' ')
      .replace(/\s+/g, ' ')
  }

  private normalizeText(s: string) {
    return s.trim().toLowerCase().replace(/\s+/g, ' ')
  }

  // ─────────────────────────────────────────────────────────
  // Region map
  // ─────────────────────────────────────────────────────────

  private static readonly REGION_KEYWORDS: Record<string, string[]> = {
    'miền tây': [
      'Cần Thơ', 'An Giang', 'Kiên Giang', 'Phú Quốc', 'Cà Mau',
      'Bạc Liêu', 'Sóc Trăng', 'Bến Tre', 'Tiền Giang', 'Vĩnh Long',
      'Đồng Tháp', 'Hậu Giang', 'Long An', 'Trà Vinh',
    ],
    'tây bắc': ['Sa Pa', 'Sapa', 'Lào Cai', 'Hà Giang', 'Mộc Châu', 'Sơn La', 'Điện Biên', 'Yên Bái', 'Lai Châu'],
    'đông bắc': ['Cao Bằng', 'Bắc Kạn', 'Lạng Sơn', 'Quảng Ninh', 'Hà Giang'],
    'miền trung': ['Đà Nẵng', 'Huế', 'Hội An', 'Quảng Bình', 'Quảng Trị', 'Quảng Nam', 'Nha Trang'],
    'miền bắc': ['Hà Nội', 'Ninh Bình', 'Hạ Long', 'Sapa', 'Sa Pa', 'Hải Phòng'],
    'miền nam': ['Hồ Chí Minh', 'Sài Gòn', 'Vũng Tàu', 'Phú Quốc', 'Cần Thơ'],
  }

  // ─────────────────────────────────────────────────────────
  // FAQ
  // ─────────────────────────────────────────────────────────

  getFaq() {
    return [
      {
        question: 'Chính sách hủy/đổi tour như thế nào?',
        answer: 'Tùy từng tour và thời điểm hủy/đổi. Bạn gửi mã booking hoặc tên tour + ngày khởi hành để mình kiểm tra chính sách áp dụng.',
        keywords: [
          'hủy tour',
          'huy tour',
          'hủy',
          'đổi',
          'hoàn',
          'hoàn tiền',
          'hủy đặt',
          'đổi ngày',
          'refund',
          'cancel',
        ],
      },
      {
        question: 'Thanh toán bằng những phương thức nào?',
        answer: 'Hiện hỗ trợ chuyển khoản ngân hàng và VNPay. Bạn chọn phương thức tại bước thanh toán.',
        keywords: ['thanh toán', 'payment', 'momo', 'zalopay', 'cod', 'chuyển khoản', 'vnpay'],
      },
      {
        question: 'Tôi cần chuẩn bị giấy tờ gì?',
        answer: 'Thường cần CCCD/CMND hoặc hộ chiếu (tùy tour). Nếu tour có bay, vui lòng dùng đúng giấy tờ theo quy định của hãng.',
        keywords: ['giấy tờ', 'cccd', 'cmnd', 'hộ chiếu', 'passport'],
      },
      {
        question: 'Có hỗ trợ trẻ em không?',
        answer: 'Có. Trẻ em 5–11 tuổi áp dụng nửa giá, em bé dưới 2 tuổi miễn phí. Bạn cho mình số lượng mỗi nhóm để tư vấn chính xác.',
        keywords: ['trẻ em', 'em bé', 'infant', 'child', 'trẻ nhỏ'],
      },
      {
        question: 'Lịch khởi hành được cập nhật thế nào?',
        answer: 'Lịch khởi hành được cập nhật thường xuyên. Bạn xem trang chi tiết tour để chọn ngày phù hợp và đặt trực tiếp.',
        keywords: ['lịch khởi hành', 'khởi hành', 'ngày đi', 'ngày khởi hành', 'khi nào', 'lịch tour'],
      },
      {
        question: 'Đặt cọc bao nhiêu?',
        answer: 'Thường 30–50% giá trị tour tùy chính sách từng gói. Bạn xem chi tiết tại trang thanh toán sau khi chọn tour.',
        keywords: ['đặt cọc', 'cọc', 'deposit', 'trả trước'],
      },
      {
        question: 'Bảo hiểm du lịch có bắt buộc không?',
        answer:
          'Tùy gói tour và điều kiện đối tác. Phần lớn tour không bắt buộc mua thêm bảo hiểm riêng nếu đã nêu trong mô tả; bạn xem chi tiết tour hoặc ghi chú khi đặt. Nếu cần chắc chắn, gửi mã tour hoặc liên hệ hotline để được xác nhận.',
        keywords: ['bảo hiểm du lịch', 'bảo hiểm travel', 'mua bảo hiểm'],
      },
    ]
  }

  /**
   * Tránh khớp FAQ kiểu `includes` với từ ngắn (vd. "hoàn" trong "Hoàng", "hủy" trong từ khác).
   * Từ khóa dài hoặc có khoảng trắng vẫn dùng includes.
   */
  private textMatchesFaqKeyword(textLower: string, keyword: string): boolean {
    const k = keyword.trim().toLowerCase()
    if (k.length === 0) return false
    if (k.includes(' ') || k.length >= 8) return textLower.includes(k)
    const tokens = textLower.split(/[^a-zà-ỹ0-9]+/u).filter(Boolean)
    return tokens.some((t) => t === k)
  }

  private matchFaq(message: string) {
    const text = message.toLowerCase()
    return this.getFaq().find((f) => f.keywords.some((k) => this.textMatchesFaqKeyword(text, k)))
  }

  /**
   * Tránh coi mọi câu ngắn là “tìm tour” (gây trả lời lệch).
   * Khi có LLM: destination/ngày/ngân sách/keywords → gợi ý tour.
   * Khi không LLM: cần từ khóa du lịch, miền/vùng, số ngày, giá…
   */
  private wantsTourRecommendation(input: {
    message: string
    llmSlots: LlmExtractedSlots | null | undefined
    inferredIntent: string | undefined
    isGreeting: boolean
  }): boolean {
    const { message, llmSlots, inferredIntent, isGreeting } = input
    if (inferredIntent === 'recommend' || inferredIntent === 'booking') return true
    if (inferredIntent === 'faq' || inferredIntent === 'other') return false

    const m = message.trim()
    if (m.length < 3) return false

    if (
      /^(cảm ơn|cam on|thanks|thank you|ok|oke|được|duoc|rồi|roi|bye|tạm biệt|tam biet|vâng|vang|dạ|da)\b/i.test(
        m,
      ) &&
      m.length <= 48
    ) {
      return false
    }

    if (isGreeting) return false

    // Câu kiểu hỏi chính sách / bảo hiểm — không kích hoạt gợi ý tour vì cụm "du lịch"
    if (this.isNonTourPolicyQuestion(m)) return false

    if (llmSlots) {
      if (
        llmSlots.destination ||
        llmSlots.departure ||
        llmSlots.days != null ||
        llmSlots.budgetMin != null ||
        llmSlots.budgetMax != null ||
        (llmSlots.keywords && llmSlots.keywords.length > 0)
      ) {
        return true
      }
    }

    if (this.looksLikeDestinationIntent(m)) return true

    /** Người dùng dán cả dòng tên tour từ web — vẫn cần tìm/gợi ý */
    if (this.looksLikeTourTitlePaste(m)) return true

    const matchText = this.normalizeForMatch(m)
    const hasRegion = Object.keys(AiService.REGION_KEYWORDS).some((k) =>
      matchText.includes(this.normalizeForMatch(k)),
    )

    // Không dùng \bdu lịch\b chung: dễ trùng "bảo hiểm du lịch" → list tour sai.
    return (
      hasRegion ||
      /\b(gợi ý|goi y|recommend|tour|đặt tour|dat tour|book|điểm đến|diem den|khởi hành|khoi hanh|lịch trình|lich trinh)\b/i.test(
        m,
      ) ||
      /\b(biển|bien|núi|nui|phượt|phuot|gia đình|gia dinh|cặp đôi|cap doi|honeymoon|resort|vé máy bay|ve may bay)\b/i.test(
        m,
      ) ||
      /\d{1,2}\s*ngày|\d{1,2}\s*ngay|\d{1,2}\s*n\s*\d{1,2}\s*đ|\d{1,2}\s*n\s*\d{1,2}\s*d/i.test(m) ||
      /\d+(?:[.,]\d+)?\s*(triệu|trieu|tr)\b/i.test(matchText)
    )
  }

  /** "Tôi muốn đi Hà Nội", "đi Nha Trang 3 ngày" (không cần LLM) */
  private looksLikeDestinationIntent(message: string): boolean {
    const m = message.trim()
    if (/\bmuốn\s+(đi|đến|tới)\s+[a-zà-ỹ0-9][a-zà-ỹ0-9\s]{1,60}/i.test(m)) return true
    if (/\b(đi|đến|tới)\s+[a-zà-ỹ0-9][a-zà-ỹ0-9\s]{1,50}\b/i.test(m)) return true
    if (/^tour\s+[a-zà-ỹ0-9][a-zà-ỹ0-9\s–—-]{1,80}$/i.test(m)) return true
    return false
  }

  /** Chuỗi dài, nhiều đoạn tách bằng –/— (thường là tên tour copy từ trang chi tiết) */
  private looksLikeTourTitlePaste(message: string): boolean {
    const m = message.trim()
    if (m.length < 28) return false
    const dashSegs = (m.match(/\s[–—]\s/g) ?? []).length
    return dashSegs >= 2
  }

  private isNonTourPolicyQuestion(message: string): boolean {
    return /\b(bảo hiểm\s+du lịch|visa\b|hoàn\s+thuế|công\s+ty\s+du\s+lịch)\b/i.test(message)
  }

  // ─────────────────────────────────────────────────────────
  // Main entrypoint
  // ─────────────────────────────────────────────────────────

  async sendMessage(input: SendMessageInput) {
    const { userId, sessionId, sessionKey, message } = input

    const session = await this.getOrCreateSession({ userId, sessionId, sessionKey })
    if (!session) throw new NotFoundException('Chat session not found')

    await this.prisma.chatMessage.create({
      data: { sessionId: session.id, role: 'user', content: message },
    })

    // 1. FAQ match (fast path, không cần LLM)
    const faq = this.matchFaq(message)
    if (faq) {
      await this.saveAssistant(session.id, faq.answer)
      return { sessionId: session.id, sessionKey: session.sessionKey ?? undefined, reply: faq.answer }
    }

    // 2. LLM extraction (nếu có key)
    const llmSlots = await this.tryExtractWithLlm(session.id, message)

    // 3. Route theo intent
    const normalizedIntentText = this.normalizeForMatch(message)
    const inferredIntent =
      llmSlots?.userIntent ??
      (/\b(dat tour|dat ve|booking|book tour|book|giu cho)\b/i.test(normalizedIntentText)
        ? 'booking'
        : undefined)
    const trimmed = message.trim()
    const isGreeting = /^(hi|hello|xin chào|chào|chao|alo|hey)\b/i.test(trimmed)

    if (inferredIntent === 'faq') {
      const again = this.matchFaq(message)
      let reply = again?.answer
      if (!reply) {
        try {
          const priorForReply = await this.getPriorConversationTurns(session.id, message)
          const searchReply = await generateReplyWithWebSearch({
            userMessage: message,
            conversation: priorForReply,
            tours: []
          })
          if (searchReply) {
            reply = searchReply
          }
        } catch (e) {
          // ignore
        }
      }
      if (!reply) {
        reply = 'Mình có thể giúp nhanh về: chính sách hủy/đổi, thanh toán (VNPay/chuyển khoản), giấy tờ, trẻ em, lịch khởi hành, đặt cọc. Bạn gõ từ khóa (vd. "hủy tour", "thanh toán") hoặc hỏi rõ hơn để mình trả lời đúng hơn nhé.'
      }
      await this.saveAssistant(session.id, reply)
      return { sessionId: session.id, sessionKey: session.sessionKey ?? undefined, reply }
    }

    if (isGreeting && !inferredIntent) {
      const reply = 'Chào bạn! Bạn muốn đi đâu, đi mấy ngày và ngân sách khoảng bao nhiêu? Mình có thể gợi ý tour phù hợp ngay.'
      await this.saveAssistant(session.id, reply)
      return { sessionId: session.id, sessionKey: session.sessionKey ?? undefined, reply }
    }

    if (inferredIntent === 'other') {
      let reply = 'Mình chỉ hỗ trợ tư vấn và gợi ý tour du lịch. Bạn muốn đi đâu hay hỏi về chính sách đặt tour không ạ?'
      try {
        const priorForReply = await this.getPriorConversationTurns(session.id, message)
        const geminiReply = await generateReplyWithWebSearch({
          userMessage: message,
          conversation: priorForReply,
          tours: []
        })
        if (geminiReply) reply = geminiReply
      } catch (e) {
        // ignore
      }
      await this.saveAssistant(session.id, reply)
      return { sessionId: session.id, sessionKey: session.sessionKey ?? undefined, reply }
    }

    const shouldRecommend = this.wantsTourRecommendation({
      message,
      llmSlots,
      inferredIntent,
      isGreeting,
    })

    if (shouldRecommend) {
      const userRegionContext = await this.getRecentUserMessagesConcat(session.id, 12)
      const slots = this.mergeSlots(message, llmSlots, { regionContext: userRegionContext })

      const rec: RecommendToursResult =
        userId != null
          ? await this.recommendToursForUser({ userId, message, slots })
          : await this.recommendTours(slots)

      const searchToursList = rec.tours
      const want = this.effectiveTourResultLimit(slots, 3)
      const finalTours =
        searchToursList.length > 0 ? searchToursList : await this.getTrendingTours(want)

      if (userId != null && searchToursList.length > 0) {
        await this.trackRecommendations({ userId, tourIds: searchToursList.map((t) => t.id) })
      }

      const followUps = this.buildFollowUps(slots, llmSlots)
      const matched = rec.strictMatch && searchToursList.length > 0
      const personalized = userId != null && !slots.destination && !slots.q
      const fallbackReply = this.buildRecommendationReply({
        slots,
        followUps,
        matched,
        resultCount: finalTours.length,
        personalized,
        intent: inferredIntent,
      })

      let reply = fallbackReply
      if (isNaturalReplyEnabled()) {
        try {
          const priorForReply = await this.getPriorConversationTurns(session.id, message)
          const toursForReply = finalTours.map((t) => ({
            name: t.name,
            durationDays: t.durationDays ?? null,
            basePrice: t.basePrice,
            departure: t.departureLocation?.name,
            destination: t.destinationLocation?.name,
            slug: t.slug ?? null,
          }))

          const geminiReply = await generateReplyWithWebSearch({
            userMessage: message,
            conversation: priorForReply,
            tours: toursForReply
          })

          if (geminiReply) {
            reply = geminiReply
          } else {
            const natural = await generateRecommendationReplyNatural({
              userMessage: message,
              fallbackReply,
              followUps,
              matched,
              personalized,
              conversation: priorForReply,
              tours: toursForReply,
            })
            if (natural) reply = natural
          }
        } catch {
          reply = fallbackReply
        }
      }

      await this.saveAssistant(session.id, reply)
      return { sessionId: session.id, sessionKey: session.sessionKey ?? undefined, reply, tours: finalTours }
    }

    // fallback
    const reply = 'Bạn muốn hỏi về tour nào (điểm đến), đi mấy ngày, ngày khởi hành và ngân sách khoảng bao nhiêu? Mình sẽ gợi ý tour phù hợp và lịch khởi hành gần nhất.'
    await this.saveAssistant(session.id, reply)
    return { sessionId: session.id, sessionKey: session.sessionKey ?? undefined, reply }
  }

  // ─────────────────────────────────────────────────────────
  // Slot merging: rule-based + LLM
  // ─────────────────────────────────────────────────────────

  /**
   * Gộp các tin nhắn user gần đây (cùng session) để giữ ngữ cảnh địa danh/vùng khi lượt sau
   * chỉ bổ sung "4 ngày", "5 triệu" mà không nhắc lại "miền Tây".
   */
  private async getRecentUserMessagesConcat(sessionId: number, take: number): Promise<string> {
    const rows = await this.prisma.chatMessage.findMany({
      where: { sessionId, role: 'user' },
      orderBy: { createdAtUtc: 'desc' },
      take,
      select: { content: true },
    })
    return rows
      .reverse()
      .map((r) => r.content)
      .join('\n')
  }

  private mergeSlots(
    message: string,
    llmSlots?: LlmExtractedSlots | null,
    opts?: { regionContext?: string },
  ): ResolvedSlots {
    const text = this.normalizeText(message)
    const matchText = this.normalizeForMatch(message)
    const rawLower = message.toLowerCase()
    const regionSource = opts?.regionContext?.trim() ? opts.regionContext.trim() : message
    const matchTextRegion = this.normalizeForMatch(regionSource)
    const rawLowerRegion = regionSource.toLowerCase()

    // Days
    const rulesDays = (() => {
      const m1 = text.match(/(\d{1,2})\s*ng(à|a)y/)
      if (m1?.[1]) return Number(m1[1])
      const m2 = text.match(/(\d{1,2})\s*n\s*\d{1,2}\s*đ/)
      if (m2?.[1]) return Number(m2[1])
    })()

    // Budget
    const rulesBudget = (() => {
      const r = text.match(/(\d+(?:[.,]\d+)?)\s*(?:-|đến|toi|to)\s*(\d+(?:[.,]\d+)?)\s*(triệu|tr|m)(?=\s|$|[.,!?])/)
      if (r?.[1] && r?.[2]) {
        const a = Number(String(r[1]).replace(',', '.'))
        const b = Number(String(r[2]).replace(',', '.'))
        if (Number.isFinite(a) && Number.isFinite(b)) {
          return { min: Math.round(Math.min(a, b) * 1_000_000), max: Math.round(Math.max(a, b) * 1_000_000) }
        }
      }
      const m = text.match(/(\d+(?:[.,]\d+)?)\s*(triệu|tr|m)(?=\s|$|[.,!?])/)
      if (!m?.[1]) return undefined
      const val = Number(String(m[1]).replace(',', '.'))
      if (!Number.isFinite(val)) return undefined
      const nm = this.normalizeForMatch(text)
      if (/\b(duoi|nho hon)\b/.test(nm)) return { max: Math.round(val * 1_000_000) }
      if (/\b(tren|lon hon)\b/.test(nm)) return { min: Math.round(val * 1_000_000) }
      return { approx: Math.round(val * 1_000_000) }
    })()

    // Transport / tourLine
    const rulesTransport = /máy bay|bay|flight/.test(text) ? 'FLIGHT' : /xe|bus/.test(text) ? 'BUS' : undefined
    const rulesTourLine = /cao cấp|premium/.test(text) ? 'PREMIUM'
      : /tiêu chuẩn|standard/.test(text) ? 'STANDARD'
        : /tiết kiệm|economy/.test(text) ? 'ECONOMY'
          : /giá tốt|good value/.test(text) ? 'GOOD_VALUE'
            : undefined

    // Region / điểm đến: nhìn cả lịch sử user (regionContext) để không mất "miền Tây" ở lượt chỉ sửa ngày/giá
    const regionEntry = Object.entries(AiService.REGION_KEYWORDS).find(([k]) =>
      matchTextRegion.includes(this.normalizeForMatch(k)),
    )
    const regionTerms = regionEntry?.[1]
    const regionKey = regionEntry?.[0]
    const passengerCounts = this.extractPassengerCounts(message, llmSlots)

    const ruleDestination =
      rawLowerRegion
        .match(
          /(?:muốn\s+)?(?:đi|đến|toi|tới)\s+([a-zà-ỹ0-9\s]+?)(?=\s*[–—-]\s|\s+\d+\s*ng(?:ày|ay)|\s+khoảng|\s+ngân sách|$|,|\.)/i,
        )?.[1]
        ?.trim()
        ?.replace(/\s+/g, ' ')
    const ruleDeparture =
      rawLower.match(/(?:từ|khởi hành từ)\s+([a-zà-ỹ\s]+?)(?=\s+đi|\s+\d+\s*ng(?:ày|ay)|\s+khoảng|\s+ngân sách|$|,|\.)/i)?.[1]
        ?.trim()
        ?.replace(/\s+/g, ' ')

    // Destination / departure từ LLM (ưu tiên LLM vì chính xác hơn regex)
    const destination = llmSlots?.destination ?? ruleDestination ?? undefined
    const departure = llmSlots?.departure ?? ruleDeparture ?? undefined

    // Build q: ưu tiên LLM destination, rồi mới rule-based
    let q: string | undefined
    if (destination) {
      q = destination
    } else if (regionKey) {
      q = regionKey
    } else if (this.looksLikeTourTitlePaste(message)) {
      const firstSeg = rawLower.split(/\s*[–—]\s*/)[0]?.trim().replace(/\s+/g, ' ')
      if (firstSeg && firstSeg.length >= 2) q = firstSeg
    } else {
      const stripped = text
        .replace(/\b(tour|đi|du lịch|gợi ý|cho tôi|mình|muốn|đến|điểm đến|đặt|book)\b/g, ' ')
        .replace(/\s+/g, ' ').trim()
      const tokenCount = stripped.split(' ').filter(Boolean).length
      q = stripped.length >= 2 && tokenCount <= 4 ? stripped : undefined
    }

    // LLM keywords bổ sung vào qTokens nếu có
    const llmKeywords = llmSlots?.keywords?.filter((k) => k.length >= 2).slice(0, 4) ?? []

    const qTokens = [
      ...(q ? this.normalizeForMatch(q).split(' ').filter((x) => x.length >= 2 && !['tour', 'du', 'lich', 'di', 'den'].includes(x)) : []),
      ...llmKeywords.map((k) => this.normalizeForMatch(k)),
    ].filter((v, i, a) => a.indexOf(v) === i).slice(0, 8)

    // Budget: LLM wins nếu có
    const hasBudgetHint = /\b(ngan sach|budget|trieu|duoi|tren)\b/.test(matchText)
    let budget: ResolvedSlots['budget'] =
      hasBudgetHint && (llmSlots?.budgetMin != null || llmSlots?.budgetMax != null)
        ? {
          ...(llmSlots.budgetMin != null ? { min: llmSlots.budgetMin } : {}),
          ...(llmSlots.budgetMax != null ? { max: llmSlots.budgetMax } : {}),
        }
        : rulesBudget

    const isBookingText = /\b(dat tour|dat ve|booking|book tour|book|giu cho)\b/i.test(matchText)
    if (isBookingText && !hasBudgetHint) {
      budget = undefined
    }

    return {
      q,
      qTokens: qTokens.length > 0 ? qTokens : undefined,
      days: llmSlots?.days ?? rulesDays,
      budget,
      adults: passengerCounts.adults,
      children: passengerCounts.children,
      infants: passengerCounts.infants,
      transportType: llmSlots?.transportType ?? rulesTransport,
      tourLine: llmSlots?.tourLine ?? rulesTourLine,
      regionTerms,
      regionKey,
      destination,
      departure,
      resultLimit: this.extractResultLimit(message),
      sortPreference: this.extractSortPreference(matchText),
    }
  }

  /** Giới hạn số tour (1–25), tương tự LIMIT động trong prompt thương mại */
  private extractResultLimit(message: string): number | undefined {
    const t = message.toLowerCase()
    const patterns = [
      /(?:lấy|lay|cho)\s*(?:mình|minh|tôi|toi)?\s*(\d{1,2})\s*(?:tour|chuyến|chuyen|kết quả|ket qua)/i,
      /\b(\d{1,2})\s*tour\b/i,
      /\btop\s*(\d{1,2})\b/i,
      /(?:hiện|hien)\s*(\d{1,2})\s*(?:tour|kết quả|ket qua)/i,
    ]
    for (const p of patterns) {
      const m = t.match(p)
      if (m?.[1]) {
        const n = parseInt(m[1], 10)
        if (n >= 1 && n <= 25) return n
      }
    }
    return undefined
  }

  /** Sắp xếp theo yêu cầu user (matchText đã normalize không dấu) */
  private extractSortPreference(matchText: string): ResolvedSlots['sortPreference'] {
    const m = matchText
    if (
      /\b(sap xep|sort)\b.*\b(gia|price)\b.*\b(giam|desc|cao xuong|tu cao)\b/.test(m) ||
      /\b(gia|price)\b.*\b(giam dan|giamd|cao den thap|tu cao xuong thap)\b/.test(m) ||
      /\b(dat nhat|max price|expensive first)\b/.test(m)
    ) {
      return 'price_desc'
    }
    if (
      /\b(sap xep|sort)\b.*\b(gia|price)\b.*\b(tang|asc|re nhat)\b/.test(m) ||
      /\b(gia|price)\b.*\b(tang dan|re nhat|tu re den dat)\b/.test(m) ||
      /\b(re nhat|gia re|cheap first)\b/.test(m)
    ) {
      return 'price_asc'
    }
    if (/\b(danh gia|cao diem|rating|sao)\b/.test(m) && /\b(cao|tot|nhieu|sort|sap xep)\b/.test(m)) {
      return 'rating_desc'
    }
    if (/\b(pho bien|popular|ban chay|nhieu review|hot)\b/.test(m)) {
      return 'reviews_desc'
    }
    return undefined
  }

  private effectiveTourResultLimit(slots: ResolvedSlots, fallback: number): number {
    return Math.min(25, Math.max(1, slots.resultLimit ?? fallback))
  }

  // ─────────────────────────────────────────────────────────
  // Follow-up: chỉ hỏi cái chưa biết
  // ─────────────────────────────────────────────────────────

  private buildFollowUps(slots: ResolvedSlots, llmSlots?: LlmExtractedSlots | null): string {
    const qs: string[] = []

    const hasDestination = !!(slots.destination ?? slots.q ?? slots.regionTerms?.length ?? slots.regionKey)
    const hasDays = slots.days != null
    const hasBudget = slots.budget != null

    // Nếu LLM đã extract destination, không hỏi nữa
    if (!hasDestination) qs.push('Bạn muốn đi đâu (điểm đến) ạ?')
    if (!hasDays) qs.push('Đi mấy ngày?')
    if (!hasBudget) qs.push('Ngân sách khoảng bao nhiêu/người?')

    // Nếu LLM đã biết hết thì không hỏi thêm
    if (llmSlots?.destination && llmSlots?.days && (llmSlots?.budgetMin || llmSlots?.budgetMax)) {
      return ''
    }

    return qs.slice(0, 2).join(' ')
  }

  private extractPassengerCounts(message: string, llmSlots?: LlmExtractedSlots | null) {
    const normalized = this.normalizeForMatch(message)
    const extractByPattern = (patterns: RegExp[]) => {
      for (const pattern of patterns) {
        const match = normalized.match(pattern)
        if (match?.[1]) return Number(match[1])
      }
      return undefined
    }

    const adults =
      llmSlots?.adults ??
      extractByPattern([
        /(\d+)\s*nguoi lon/,
        /(\d+)\s*adult/,
      ])

    const children =
      llmSlots?.children ??
      extractByPattern([
        /(\d+)\s*tre em/,
        /(\d+)\s*be/,
        /(\d+)\s*child/,
      ])

    const infants =
      llmSlots?.infants ??
      extractByPattern([
        /(\d+)\s*em be/,
        /(\d+)\s*infant/,
      ])

    return { adults, children, infants }
  }

  private formatBudget(budget?: { min?: number; max?: number; approx?: number }) {
    if (!budget) return null
    const fm = (n: number) => `${Math.round(n / 1_000_000)} triệu`
    if (budget.min != null && budget.max != null) return `${fm(budget.min)}-${fm(budget.max)}`
    if (budget.max != null) return `dưới ${fm(budget.max)}`
    if (budget.min != null) return `trên ${fm(budget.min)}`
    if (budget.approx != null) return `khoảng ${fm(budget.approx)}`
    return null
  }

  private formatPassengers(slots: ResolvedSlots) {
    const parts: string[] = []
    if (slots.adults) parts.push(`${slots.adults} người lớn`)
    if (slots.children) parts.push(`${slots.children} trẻ em`)
    if (slots.infants) parts.push(`${slots.infants} em bé`)
    return parts.length > 0 ? parts.join(', ') : null
  }

  private formatCriteria(slots: ResolvedSlots) {
    const parts: string[] = []
    if (slots.destination) parts.push(`điểm đến ${slots.destination}`)
    else if (slots.regionKey) parts.push(`khu vực ${slots.regionKey}`)
    else if (slots.regionTerms?.length) parts.push(`khu vực gợi ý (${slots.regionTerms.slice(0, 3).join(', ')})`)
    if (slots.departure) parts.push(`khởi hành từ ${slots.departure}`)
    if (slots.days) parts.push(`${slots.days} ngày`)
    const budget = this.formatBudget(slots.budget)
    if (budget) parts.push(`ngân sách ${budget}`)
    if (slots.transportType === 'FLIGHT') parts.push('đi máy bay')
    if (slots.transportType === 'BUS') parts.push('đi xe')
    const passengers = this.formatPassengers(slots)
    if (passengers) parts.push(passengers)
    return parts
  }

  private buildRecommendationReply(input: {
    slots: ResolvedSlots
    followUps: string
    matched: boolean
    resultCount: number
    personalized: boolean
    intent?: string
  }) {
    const { slots, followUps, matched, resultCount, personalized, intent } = input
    const criteria = this.formatCriteria(slots)
    const intro =
      criteria.length > 0
        ? `Mình hiểu bạn đang tìm tour ${criteria.join(', ')}.`
        : personalized
          ? 'Mình đang gợi ý dựa trên lịch sử đặt tour của bạn.'
          : 'Mình đang tìm tour phù hợp cho bạn.'

    if (intent === 'booking') {
      const passengers = this.formatPassengers(slots)
      const bookingLead = passengers ? ` Mình đã ghi nhận ${passengers}.` : ''
      if (matched) {
        return `${intro}${bookingLead} Mình tìm thấy ${resultCount} tour khá phù hợp bên dưới.${followUps ? ` ${followUps}` : ' Bạn có thể chọn tour rồi cho mình ngày khởi hành để tiếp tục đặt.'}`.trim()
      }
      return `${intro}${bookingLead} Hiện mình chưa thấy tour khớp hoàn toàn, nên gửi bạn vài tour tham khảo trước.${followUps ? ` ${followUps}` : ' Bạn cho mình thêm điểm đến hoặc ngày khởi hành để mình lọc chính xác hơn.'}`.trim()
    }

    if (matched) {
      return `${intro} Mình tìm thấy ${resultCount} tour phù hợp nhất bên dưới.${followUps ? ` ${followUps}` : ''}`.trim()
    }

    return `${intro} Hiện mình chưa thấy tour khớp hoàn toàn, nên gửi bạn vài tour nổi bật để tham khảo.${followUps ? ` ${followUps}` : ''}`.trim()
  }

  // ─────────────────────────────────────────────────────────
  // Recommend
  // ─────────────────────────────────────────────────────────

  private async recommendTours(slots: ResolvedSlots): Promise<RecommendToursResult> {
    const take = this.effectiveTourResultLimit(slots, 3)
    return this.searchToursWithRelaxation(slots, take)
  }

  private async recommendToursForUser(input: {
    userId: number
    message: string
    slots: ResolvedSlots
  }): Promise<RecommendToursResult> {
    const { userId, slots } = input

    // Nếu đã có destination/region từ LLM hoặc rule → dùng search trực tiếp
    const hasSpecificTarget = !!(slots.destination ?? slots.q ?? slots.regionTerms?.length)
    if (hasSpecificTarget) {
      return await this.recommendTours(slots)
    }

    const take = this.effectiveTourResultLimit(slots, 3)

    // Booking history based
    const bookings = await this.prisma.booking.findMany({
      where: { userId },
      include: { schedule: { include: { tour: true } } },
      orderBy: { bookingDateUtc: 'desc' },
      take: 10,
    })

    if (bookings.length === 0) {
      const trending = await this.getTrendingTours(take)
      return { tours: trending, strictMatch: false }
    }

    const bookedTourIds = new Set<number>()
    const destinationIds = new Set<number>()
    const tourLines = new Set<string>()
    const transportTypes = new Set<string>()

    for (const b of bookings) {
      const tour = b.schedule?.tour
      if (!tour) continue
      bookedTourIds.add(tour.id)
      destinationIds.add(tour.destinationLocationId)
      if (tour.tourLine) tourLines.add(tour.tourLine)
      if (tour.transportType) transportTypes.add(tour.transportType)
    }

    const tours = await this.prisma.tour.findMany({
      where: {
        isActive: true,
        id: { notIn: [...bookedTourIds] },
        OR: [
          destinationIds.size > 0 ? { destinationLocationId: { in: [...destinationIds] } } : undefined,
          tourLines.size > 0 ? { tourLine: { in: [...tourLines] as any } } : undefined,
          transportTypes.size > 0 ? { transportType: { in: [...transportTypes] as any } } : undefined,
        ].filter(Boolean) as any,
      },
      include: { departureLocation: true, destinationLocation: true },
      orderBy: [{ ratingAvg: 'desc' }, { totalReviews: 'desc' }, { basePrice: 'asc' }],
      take,
    })

    if (tours.length === 0) {
      const trending = await this.getTrendingTours(take)
      return { tours: trending, strictMatch: false }
    }
    return { tours: this.normalizeTours(tours), strictMatch: true }
  }

  private async getTrendingTours(take: number = 3) {
    const t = Math.min(25, Math.max(1, take))
    const tours = await this.prisma.tour.findMany({
      where: { isActive: true },
      include: { departureLocation: true, destinationLocation: true },
      orderBy: [{ ratingAvg: 'desc' }, { totalReviews: 'desc' }, { basePrice: 'asc' }],
      take: t,
    })
    return this.normalizeTours(tours)
  }

  // ─────────────────────────────────────────────────────────
  // Search core (Prisma an toàn — không sinh SQL động từ LLM)
  // ─────────────────────────────────────────────────────────

  /**
   * Nới lỏng dần nếu rỗng: 0 đủ điều kiện → 1 bỏ số ngày → 2 bỏ ngân sách → 3 keyword OR + mô tả.
   * Cảm hứng từ prompt e-commerce (partial match / tránh empty) nhưng luôn SELECT qua Prisma.
   */
  private async searchToursWithRelaxation(slots: ResolvedSlots, take: number): Promise<RecommendToursResult> {
    const locationIds = await this.resolveLocationIds(slots)
    for (let relax = 0; relax <= 3; relax++) {
      if (relax === 3 && !this.slotsHadTextualOrGeoFilter(slots, locationIds)) continue
      const raw = await this.executeTourSearchQuery(slots, locationIds, take, relax)
      if (raw.length > 0) {
        const ranked = this.rankAndSliceTourRows(raw, slots, take)
        return { tours: this.normalizeTours(ranked), strictMatch: relax === 0 }
      }
    }
    return { tours: [], strictMatch: false }
  }

  private slotsHadTextualOrGeoFilter(slots: ResolvedSlots, locationIds: number[]): boolean {
    return !!(
      slots.q ||
      slots.qTokens?.length ||
      slots.regionTerms?.length ||
      locationIds.length > 0
    )
  }

  private async executeTourSearchQuery(
    slots: ResolvedSlots,
    locationIds: number[],
    take: number,
    relaxLevel: number,
  ) {
    const now = new Date()
    const and = this.buildTourSearchAndArray(slots, locationIds, relaxLevel)

    const where: Prisma.TourWhereInput = {
      isActive: true,
      ...(and.length ? { AND: and } : {}),
      ...(relaxLevel < 1 && slots.days != null ? { durationDays: slots.days } : {}),
      ...(slots.transportType ? { transportType: slots.transportType as any } : {}),
      ...(slots.tourLine ? { tourLine: slots.tourLine as any } : {}),
    }

    if (relaxLevel < 2) {
      if (slots.budget?.min != null && slots.budget?.max != null) {
        where.basePrice = { gte: slots.budget.min, lte: slots.budget.max }
      } else if (slots.budget?.max != null) {
        where.basePrice = { lte: slots.budget.max }
      } else if (slots.budget?.min != null) {
        where.basePrice = { gte: slots.budget.min }
      } else if (slots.budget?.approx != null) {
        const a = slots.budget.approx
        where.basePrice = { gte: Math.max(0, a - 2_000_000), lte: a + 2_000_000 }
      }
    }

    return this.prisma.tour.findMany({
      where: {
        ...where,
        schedules: { some: { startDate: { gte: now } } },
      },
      include: {
        departureLocation: true,
        destinationLocation: true,
        schedules: {
          where: { startDate: { gte: now } },
          orderBy: { startDate: 'asc' },
          take: 1,
        },
      },
      orderBy: [{ ratingAvg: 'desc' }, { totalReviews: 'desc' }, { basePrice: 'asc' }],
      take: Math.max(20, take),
    })
  }

  private buildTourSearchAndArray(
    slots: ResolvedSlots,
    locationIds: number[],
    relaxLevel: number,
  ): Prisma.TourWhereInput[] {
    const and: Prisma.TourWhereInput[] = []
    const loose = relaxLevel >= 3

    if (!loose) {
      const tokens = slots.qTokens?.length ? slots.qTokens : undefined
      if (tokens) {
        for (const tok of tokens) {
          and.push({
            OR: [
              { name: { contains: tok } },
              { departureLocation: { name: { contains: tok } } },
              { destinationLocation: { name: { contains: tok } } },
              { tags: { some: { tag: { name: { contains: tok } } } } },
            ],
          })
        }
      } else if (slots.q) {
        and.push({
          OR: [
            { name: { contains: slots.q } },
            { departureLocation: { name: { contains: slots.q } } },
            { destinationLocation: { name: { contains: slots.q } } },
            { tags: { some: { tag: { name: { contains: slots.q } } } } },
          ],
        })
      }
    } else {
      const tokens = slots.qTokens?.length ? slots.qTokens : undefined
      if (tokens?.length) {
        and.push({
          OR: tokens.flatMap((tok) => [
            { name: { contains: tok } },
            { departureLocation: { name: { contains: tok } } },
            { destinationLocation: { name: { contains: tok } } },
            { tags: { some: { tag: { name: { contains: tok } } } } },
            { description: { contains: tok } },
          ]),
        })
      } else if (slots.q) {
        and.push({
          OR: [
            { name: { contains: slots.q } },
            { departureLocation: { name: { contains: slots.q } } },
            { destinationLocation: { name: { contains: slots.q } } },
            { tags: { some: { tag: { name: { contains: slots.q } } } } },
            { description: { contains: slots.q } },
          ],
        })
      }
    }

    if (locationIds.length > 0) {
      and.push({
        OR: [
          { destinationLocationId: { in: locationIds } },
          { departureLocationId: { in: locationIds } },
        ],
      })
    }

    if (slots.regionTerms?.length) {
      const regionOr: Prisma.TourWhereInput[] = slots.regionTerms.flatMap((term) => [
        { destinationLocation: { name: { contains: term } } },
        { departureLocation: { name: { contains: term } } },
        { tags: { some: { tag: { name: { contains: term } } } } },
        { name: { contains: term } },
        ...(loose ? [{ description: { contains: term } } as Prisma.TourWhereInput] : []),
      ])
      and.push({ OR: regionOr })
    }

    return and
  }

  private rankAndSliceTourRows(raw: any[], slots: ResolvedSlots, take: number): any[] {
    const pref = slots.sortPreference
    const rows = raw.map((t: any) => {
      const s = t.schedules?.[0]
      const start = s?.startDate ? new Date(s.startDate).getTime() : Number.POSITIVE_INFINITY
      const seatsLeft =
        s?.availableSeats != null && s?.bookedSeats != null
          ? Number(s.availableSeats) - Number(s.bookedSeats)
          : null
      const seatPenalty = seatsLeft != null ? (seatsLeft > 0 ? 0 : 1e10) : 0
      const price = t.basePrice != null ? Number(t.basePrice) : 0
      const rating = t.ratingAvg ?? 0
      const reviews = t.totalReviews ?? 0
      return { t, seatPenalty, start, price, rating, reviews }
    })

    rows.sort((a, b) => {
      if (a.seatPenalty !== b.seatPenalty) return a.seatPenalty - b.seatPenalty
      switch (pref) {
        case 'price_asc':
          if (a.price !== b.price) return a.price - b.price
          break
        case 'price_desc':
          if (a.price !== b.price) return b.price - a.price
          break
        case 'rating_desc':
          if (a.rating !== b.rating) return b.rating - a.rating
          break
        case 'reviews_desc':
          if (a.reviews !== b.reviews) return b.reviews - a.reviews
          break
        default:
          break
      }
      if (a.start !== b.start) return a.start - b.start
      if (a.rating !== b.rating) return b.rating - a.rating
      return a.price - b.price
    })

    return rows.slice(0, take).map((x) => x.t)
  }

  // ─────────────────────────────────────────────────────────
  // Location ID lookup
  // ─────────────────────────────────────────────────────────

  private async resolveLocationIds(slots: ResolvedSlots): Promise<number[]> {
    const terms: string[] = []

    // Ưu tiên destination/departure từ LLM
    if (slots.destination) {
      terms.push(...this.normalizeForMatch(slots.destination).split(' ').filter((x) => x.length >= 2))
    }
    if (slots.departure) {
      terms.push(...this.normalizeForMatch(slots.departure).split(' ').filter((x) => x.length >= 2))
    }

    // Token-based
    if (slots.qTokens?.length) {
      terms.push(...slots.qTokens)
    } else if (slots.q && !slots.destination) {
      terms.push(...this.normalizeForMatch(slots.q).split(' ').filter((x) => x.length >= 2).slice(0, 6))
    }

    // Region expand
    if (slots.regionTerms?.length) {
      terms.push(
        ...slots.regionTerms
          .flatMap((t) => this.normalizeForMatch(t).split(' '))
          .filter((x) => x.length >= 2)
          .slice(0, 12),
      )
    }

    const uniq = [...new Set(terms)].slice(0, 14)
    if (uniq.length === 0) return []

    const locations = await this.prisma.location.findMany({
      where: { isActive: true, OR: uniq.map((t) => ({ name: { contains: t } })) },
      select: { id: true },
      take: 60,
    })

    return locations.map((l) => l.id)
  }

  // ─────────────────────────────────────────────────────────
  // LLM helpers
  // ─────────────────────────────────────────────────────────

  /**
   * Lấy các lượt user/assistant trước tin nhắn hiện tại (đã lưu trong session).
   * Bỏ bản ghi user cuối nếu trùng `currentUserMessage` để tránh lặp với "Tin nhắn mới" trong llm.ts.
   */
  private async getPriorConversationTurns(sessionId: number, currentUserMessage: string) {
    const history = await this.prisma.chatMessage.findMany({
      where: { sessionId },
      orderBy: { createdAtUtc: 'asc' },
      take: 24,
    })

    const turns = history
      .filter((m) => m.role === 'user' || m.role === 'assistant')
      .map((m) => ({ role: m.role as 'user' | 'assistant', content: m.content }))

    const last = turns[turns.length - 1]
    const cur = currentUserMessage.trim()
    if (last?.role === 'user' && last.content.trim() === cur) {
      return turns.slice(0, -1)
    }
    return turns
  }

  private async tryExtractWithLlm(sessionId: number, message: string) {
    if (!isLlmEnabled()) return null

    const conversation = await this.getPriorConversationTurns(sessionId, message)

    try {
      return await extractSlotsWithLlm({ message, conversation })
    } catch {
      return null
    }
  }

  // ─────────────────────────────────────────────────────────
  // Session helpers
  // ─────────────────────────────────────────────────────────

  private async getOrCreateSession(input: {
    userId: number | null
    sessionId?: number
    sessionKey?: string
  }) {
    const { userId, sessionId, sessionKey } = input

    if (sessionId) {
      if (userId != null) {
        return await this.prisma.chatSession.findFirst({ where: { id: sessionId, userId } })
      }
      if (!sessionKey) throw new NotFoundException('Missing sessionKey for guest session')
      return await this.prisma.chatSession.findFirst({ where: { id: sessionId, userId: null, sessionKey } })
    }

    if (userId != null) {
      return await this.prisma.chatSession.create({ data: { userId } })
    }

    return await this.prisma.chatSession.create({ data: { userId: null, sessionKey: randomUUID() } })
  }

  private async saveAssistant(sessionId: number, content: string) {
    await this.prisma.chatMessage.create({ data: { sessionId, role: 'assistant', content } })
  }

  private async trackRecommendations(input: { userId: number; tourIds: number[] }) {
    if (input.tourIds.length === 0) return
    await this.prisma.userBehavior.createMany({
      data: input.tourIds.map((tourId) => ({ userId: input.userId, tourId, action: 'chat_recommendation' })),
      skipDuplicates: false,
    })
  }

  // ─────────────────────────────────────────────────────────
  // Normalize tour shape
  // ─────────────────────────────────────────────────────────

  private normalizeTours(tours: any[]) {
    return tours.map((t) => ({
      id: t.id,
      departureLocationId: t.departureLocationId,
      destinationLocationId: t.destinationLocationId,
      name: t.name,
      slug: t.slug,
      description: t.description,
      durationDays: t.durationDays,
      basePrice: t.basePrice ? Number(t.basePrice) : null,
      maxPeople: t.maxPeople,
      thumbnailUrl: t.thumbnailUrl,
      ratingAvg: t.ratingAvg,
      totalReviews: t.totalReviews,
      tourLine: t.tourLine,
      transportType: t.transportType,
      isActive: t.isActive,
      createdAtUtc: t.createdAtUtc ? t.createdAtUtc.toISOString() : null,
      departureLocation: t.departureLocation
        ? { id: t.departureLocation.id, name: t.departureLocation.name } : undefined,
      destinationLocation: t.destinationLocation
        ? { id: t.destinationLocation.id, name: t.destinationLocation.name } : undefined,
    }))
  }
}
