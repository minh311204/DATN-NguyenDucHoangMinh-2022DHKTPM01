import { SITE_BRAND } from "./site-brand";

/** Ô nhập form đăng nhập / đăng ký — focus theo màu thương hiệu */
export const AUTH_INPUT_CLASS =
  "w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 shadow-sm outline-none transition placeholder:text-slate-400 focus:border-[#0194f3] focus:ring-2 focus:ring-[#0194f3]/25 sm:text-[15px]";

export const AUTH_BRAND = SITE_BRAND;

/** Cột nội dung auth (tiêu đề + form) — dùng chung để không lệch giữa Đăng nhập / Đăng ký */
export const AUTH_SHELL_LAYOUT_CLASS = "w-full max-w-md";
