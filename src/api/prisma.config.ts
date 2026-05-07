import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";
import { defineConfig } from "prisma/config";

/** Migrate/CLI thường chạy từ root repo; API dùng `src/api/.env`. */
loadEnv({ path: resolve(process.cwd(), "src/api/.env") });
loadEnv({ path: resolve(process.cwd(), ".env") });

export default defineConfig({
  schema: "prisma/schema.prisma",
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: "npx tsx src/api/prisma/seed.ts",
  },
});