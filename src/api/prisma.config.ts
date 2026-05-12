import { config as loadEnv } from "dotenv";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "prisma/config";

/** Thư mục chứa file này (= src/api), không phụ thuộc process.cwd() */
const apiRoot = dirname(fileURLToPath(import.meta.url));

/** .env trong src/api trước, rồi .env ở root repo (nếu có) */
loadEnv({ path: resolve(apiRoot, ".env") });
loadEnv({ path: resolve(apiRoot, "..", "..", ".env") });

export default defineConfig({
  schema: resolve(apiRoot, "prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL,
  },
  migrations: {
    seed: `npx tsx "${resolve(apiRoot, "prisma", "seed.ts")}"`,
  },
});
