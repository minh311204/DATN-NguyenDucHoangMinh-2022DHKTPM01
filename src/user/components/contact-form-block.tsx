"use client";

import { ArrowUpRight } from "lucide-react";
import { FormEvent, useState } from "react";

const DEFAULT_TO = "info@tourbooking.vn";

function buildMailtoBody(fields: {
  name: string;
  phone: string;
  email: string;
  message: string;
}) {
  return encodeURIComponent(
    `Họ và tên: ${fields.name}\nĐiện thoại: ${fields.phone}\nEmail: ${fields.email}\n\nNội dung:\n${fields.message}`,
  );
}

export function ContactFormBlock() {
  const [pending, setPending] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "").trim();
    const phone = String(fd.get("phone_number") ?? "").trim();
    const email = String(fd.get("email") ?? "").trim();
    const message = String(fd.get("message") ?? "").trim();
    if (!name || !phone || !email || !message) return;

    setPending(true);
    const subject = encodeURIComponent(`[Liên hệ TourBooking] ${name}`);
    const body = buildMailtoBody({ name, phone, email, message });
    window.location.href = `mailto:${DEFAULT_TO}?subject=${subject}&body=${body}`;
    setTimeout(() => setPending(false), 800);
  }

  return (
    <div className="comment-form bgc-lighter z-1 rel mb-30 rmb-55">
      <form id="contactForm" className="contactForm" onSubmit={onSubmit}>
        <div className="section-title">
          <h2>Liên Hệ</h2>
        </div>
        <p className="mt-3">
          Địa chỉ email của bạn sẽ không được công bố. Các trường bắt buộc được đánh dấu{" "}
          <span style={{ color: "red" }}>*</span>
        </p>
        <div className="form-row grid gap-x-6 md:grid-cols-2">
          <div className="form-group md:col-span-1">
            <label htmlFor="name">
              Họ và tên <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              id="name"
              name="name"
              className="form-control"
              placeholder="Họ và tên"
              required
              autoComplete="name"
            />
          </div>
          <div className="form-group md:col-span-1">
            <label htmlFor="phone_number">
              Số điện thoại <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="text"
              id="phone_number"
              name="phone_number"
              className="form-control"
              placeholder="Số điện thoại"
              required
              autoComplete="tel"
            />
          </div>
          <div className="form-group md:col-span-2">
            <label htmlFor="email">
              Địa chỉ Email <span style={{ color: "red" }}>*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              className="form-control"
              placeholder="Nhập email"
              required
              autoComplete="email"
            />
          </div>
          <div className="form-group md:col-span-2">
            <label htmlFor="message">
              Nội dung <span style={{ color: "red" }}>*</span>
            </label>
            <textarea
              name="message"
              id="message"
              className="form-control"
              rows={5}
              placeholder="Nội dung"
              required
            />
          </div>
          <div className="form-group mb-0 md:col-span-2">
            <button type="submit" className="theme-btn style-two" disabled={pending}>
              <span>Gửi</span>
              <ArrowUpRight className="h-4 w-4 shrink-0" aria-hidden />
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
