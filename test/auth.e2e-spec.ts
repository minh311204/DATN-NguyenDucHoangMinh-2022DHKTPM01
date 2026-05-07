import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/api/src/app.module';
import { PrismaService } from './../src/api/src/prisma/prima.service';

describe('Auth flow (e2e)', () => {
  let app: INestApplication<App>;
  let prisma: PrismaService;

  const email = `auth-e2e-${Date.now()}@example.com`;
  const phone = `09${String(Date.now()).slice(-9)}`;
  const password = 'Password123!';

  let accessToken = '';
  let refreshToken = '';
  let refreshedAccessToken = '';
  let userId = 0;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
    prisma = app.get(PrismaService);
  });

  afterAll(async () => {
    if (userId > 0) {
      await prisma.emailVerificationToken.deleteMany({
        where: { userId },
      });
      await prisma.blacklistedAccessToken.deleteMany({
        where: { userId },
      });
      await prisma.refreshToken.deleteMany({
        where: { userId },
      });
      await prisma.resetPasswordToken.deleteMany({
        where: { userId },
      });
      await prisma.user.delete({
        where: { id: userId },
      });
    }

    await prisma.$disconnect();
    await app.close();
  });

  it('registers a user (pending email verification)', async () => {
    const res = await request(app.getHttpServer()).post('/auth/register').send({
      email,
      password,
      passwordConfirm: password,
      firstName: 'Auth',
      lastName: 'E2E',
      phone,
    });

    expect(res.status).toBe(201);
    expect(res.body.email).toBe(email);
    expect(typeof res.body.message).toBe('string');

    const u = await prisma.user.findUniqueOrThrow({ where: { email } });
    userId = u.id;
    expect(u.status).toBe('INACTIVE');
    expect(u.emailVerified).toBe(false);
  });

  it('rejects login before email verification', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({
      email,
      password,
    });
    expect(res.status).toBe(401);
  });

  it('verifies email and returns tokens', async () => {
    const row = await prisma.emailVerificationToken.findFirst({
      where: { userId },
    });
    expect(row?.token).toBeDefined();

    const res = await request(app.getHttpServer())
      .post('/auth/verify-email')
      .send({ token: row!.token });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.refreshToken).toBe('string');
    expect(typeof res.body.jti).toBe('string');

    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;

    const u = await prisma.user.findUniqueOrThrow({ where: { id: userId } });
    expect(u.status).toBe('ACTIVE');
    expect(u.emailVerified).toBe(true);
  });

  it('logs in with password after verification', async () => {
    const res = await request(app.getHttpServer()).post('/auth/login').send({
      email,
      password,
    });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    accessToken = res.body.accessToken;
    refreshToken = res.body.refreshToken;
  });

  it('refreshes token and returns a new access token', async () => {
    const res = await request(app.getHttpServer()).post('/auth/refresh').send({
      refreshToken,
    });

    expect(res.status).toBe(200);
    expect(typeof res.body.accessToken).toBe('string');
    expect(typeof res.body.jti).toBe('string');
    expect(res.body.accessToken).not.toBe(accessToken);

    refreshedAccessToken = res.body.accessToken;
  });

  it('returns current user with refreshed access token', async () => {
    const res = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${refreshedAccessToken}`);

    expect(res.status).toBe(200);
    expect(res.body.id).toBe(userId);
    expect(res.body.email).toBe(email);
  });

  it('logs out and invalidates the current access token', async () => {
    const logoutRes = await request(app.getHttpServer())
      .post('/auth/logout')
      .set('Authorization', `Bearer ${refreshedAccessToken}`)
      .send({});

    expect(logoutRes.status).toBe(200);
    expect(logoutRes.body.message).toBe('Logged out successfully');

    const meRes = await request(app.getHttpServer())
      .get('/auth/me')
      .set('Authorization', `Bearer ${refreshedAccessToken}`);

    expect(meRes.status).toBe(401);
  });
});
