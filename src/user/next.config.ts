import type { NextConfig } from "next";
import path from "path";

/** Gốc monorepo: cho phép bundler đọc `src/shared/**` và tránh Turbopack chặn `../../shared` khi `root` chỉ là `src/user`. Đồng bộ với gợi ý khi có nhiều lockfile (xem Turbopack `root`). */
const monoRoot = path.join(__dirname, "..", "..");

const nextConfig: NextConfig = {
  turbopack: {
    root: monoRoot,
  },
  images: {
    /** Mọi giá trị `quality` truyền vào `<Image />` phải có trong danh sách (Next.js 16+) */
    qualities: [75, 95],
  },
};

export default nextConfig;
