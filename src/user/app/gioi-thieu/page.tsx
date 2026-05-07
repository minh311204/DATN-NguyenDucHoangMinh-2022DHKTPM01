import { AboutPageContent } from "@/components/about-page-content";

import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Giới thiệu | TourBooking",
  description:
    "TourBooking — nền tảng đặt tour trực tuyến. Kinh nghiệm, minh bạch và hỗ trợ tận tâm cho mỗi hành trình.",
};

export default function AboutPage() {
  return <AboutPageContent />;
}
