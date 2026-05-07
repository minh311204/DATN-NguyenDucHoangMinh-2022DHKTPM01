import { config as loadEnv } from 'dotenv';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const apiEnvPath = resolve(process.cwd(), 'src/api/.env');
if (existsSync(apiEnvPath)) {
  loadEnv({ path: apiEnvPath });
}
loadEnv();

import { NestFactory } from '@nestjs/core';
import { IoAdapter } from '@nestjs/platform-socket.io';
import { AppModule } from './app.module';
import { urlencoded } from 'express';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useWebSocketAdapter(new IoAdapter(app));
  app.use(urlencoded({ extended: true }));
  app.enableCors({
    origin: [
      'http://localhost:3000',
      'http://localhost:3001',
      'http://127.0.0.1:3000',
      'http://127.0.0.1:3001',
    ],
    credentials: true,
  });
  // Tránh trùng Next (3000/3001): dùng API_PORT hoặc mặc định 4000, không dùng PORT chung.
  const port = Number(process.env.API_PORT) || 4000;
  await app.listen(port);
  console.log(`API listening on http://localhost:${port}`);
  console.log('DATABASE_URL =', process.env.DATABASE_URL);
}
bootstrap();
