import OpenAI from 'openai';

async function getWeather(location: string): Promise<string> {
  try {
    const res = await fetch(`https://wttr.in/${encodeURIComponent(location)}?format=j1&lang=vi`);
    const data = await res.json() as any;
    const current = data.current_condition[0];
    return `Thời tiết hiện tại ở ${location}: Nhiệt độ ${current.temp_C}°C, cảm giác như ${current.FeelsLikeC}°C. Độ ẩm: ${current.humidity}%. Tình trạng: ${current.lang_vi?.[0]?.value || current.weatherDesc?.[0]?.value || 'Không rõ'}.`;
  } catch (e) {
    console.error('Weather error:', e);
    return `Không thể lấy dữ liệu thời tiết cho ${location} lúc này.`;
  }
}

export async function generateReplyWithWebSearch(input: {
  userMessage: string
  tours: any[]
  conversation?: { role: 'user' | 'assistant'; content: string }[]
}): Promise<string | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  try {
    const client = new OpenAI({ apiKey });

    const toursJson = input.tours.map((t) => ({
      ten: t.name,
      so_ngay: t.durationDays,
      gia_vnd: t.basePrice,
      khoi_hanh: t.departure ?? null,
      diem_den: t.destination ?? null,
    }));

    // Inject REAL TIME context
    const now = new Date();
    const dateStr = now.toLocaleDateString('vi-VN');
    const timeStr = now.toLocaleTimeString('vi-VN');

    const systemInstruction = `Bạn là chuyên gia tư vấn du lịch Việt Nam.
[THÔNG TIN THỜI GIAN THỰC ĐỂ BẠN CĂN CỨ TƯ VẤN]
- Hôm nay là ngày: ${dateStr}, giờ: ${timeStr} (Mùa này là tháng ${now.getMonth() + 1}).

Nhiệm vụ của bạn:
1. Trả lời câu hỏi của khách hàng một cách thân thiện, chính xác, dể hiểu.
2. Khi khách hỏi "mùa này đi đâu", hãy DỰA VÀO ngày tháng hiện tại ở trên để tư vấn các vùng miền hợp lý. Trí tuệ của bạn đã có sẵn kiến thức về các mùa du lịch Việt Nam, hãy tự tin trả lời.
3. NẾU khách hỏi về thời tiết của MỘT ĐỊA DANH CỤ THỂ, HÃY DÙNG CÔNG CỤ get_weather để tra cứu nhiệt độ thực tế ngay lúc này.
4. Nếu khách muốn tư vấn tour, hãy ƯU TIÊN gợi ý các tour có trong danh sách sau (nếu có): ${JSON.stringify(toursJson)}. Chỉ giới thiệu các tour có trong danh sách, không tự bịa thông tin tour.
5. Xưng "mình", gọi khách là "bạn".`;

    const messages: any[] = [{ role: 'system', content: systemInstruction }];
    const prior = (input.conversation ?? []).slice(-10);
    messages.push(...prior.map(m => ({ role: m.role, content: m.content })));
    messages.push({ role: 'user', content: input.userMessage });

    const tools = [
      {
        type: 'function',
        function: {
          name: 'get_weather',
          description: 'Lấy thông tin thời tiết hiện tại của một địa danh cụ thể (VD: Sapa, Hanoi, Ho Chi Minh).',
          parameters: {
            type: 'object',
            properties: {
              location: {
                type: 'string',
                description: 'Tên địa phương không dấu hoặc có dấu (VD: Sapa, Da Nang)',
              },
            },
            required: ['location'],
          },
        },
      },
    ];

    const model = process.env.OPENAI_REPLY_MODEL ?? process.env.OPENAI_MODEL ?? 'gpt-4o-mini';

    const response = await client.chat.completions.create({
      model,
      messages,
      tools: tools as any,
      tool_choice: 'auto',
      temperature: 0.7,
    });

    const responseMessage = response.choices[0].message;

    if (responseMessage.tool_calls) {
      messages.push(responseMessage);
      for (const toolCall of responseMessage.tool_calls) {
        if (toolCall.type === 'function' && toolCall.function.name === 'get_weather') {
          const args = JSON.parse(toolCall.function.arguments);
          const weatherResult = await getWeather(args.location);
          messages.push({
            tool_call_id: toolCall.id,
            role: 'tool',
            name: 'get_weather',
            content: weatherResult,
          });
        }
      }

      const secondResponse = await client.chat.completions.create({
        model,
        messages,
      });
      return secondResponse.choices[0].message.content ?? null;
    }

    return responseMessage.content ?? null;
  } catch (e) {
    console.error('OpenAI Search error:', e);
    return null;
  }
}
