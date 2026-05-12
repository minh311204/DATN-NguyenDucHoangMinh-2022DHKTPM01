/**
 * Gỡ ký hiệu markdown thường gặp từ câu trả lời LLM (**bold**, tiêu đề #, link …)
 * để hiển thị plain text trong ô chat (không cần renderer markdown).
 */
export function stripChatMarkdown(input: string): string {
  if (!input) return input;

  let s = input.replace(/\r\n/g, "\n");

  while (/\*\*[^*]+\*\*/.test(s)) {
    s = s.replace(/\*\*([^*]+)\*\*/g, "$1");
  }

  s = s.replace(/__([^_]+)__/g, "$1");
  s = s.replace(/\[([^\]]+)\]\([^)]*\)/g, "$1");
  s = s.replace(/^#{1,6}\s+/gm, "");
  s = s.replace(/\*\*/g, "");

  // *một từ* (không dính số/sao — tránh 3*10, 5 sao)
  s = s.replace(
    /(^|[\s([{"'「『])\*([^*\n]+)\*(?=[\s)\]}",.!?，。、』」]|$)/g,
    "$1$2",
  );

  return s;
}
