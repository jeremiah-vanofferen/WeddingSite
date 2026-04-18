// Copyright 2026 Jeremiah Van Offeren
jest.mock('dotenv', () => ({ config: jest.fn() }));

jest.mock('nodemailer', () => ({
  createTransport: jest.fn(() => ({ sendMail: jest.fn().mockResolvedValue({}) })),
}));

jest.mock('pg', () => {
  const Pool = jest.fn().mockImplementation(() => ({
    query: jest.fn(),
    connect: jest.fn(),
    end: jest.fn(),
  }));
  return { Pool };
});

jest.mock('bcryptjs');
jest.mock('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';
process.env.ENCRYPTION_KEY = 'test-encryption-key';
process.env.NODE_ENV = 'production';

const request = require('supertest');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const app = require('../server');

const pool = Pool.mock.results[0].value;

const silenceExpectedConsole = () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
};

afterAll(() => {
  process.env.NODE_ENV = 'test';
});

describe('Public anonymous token auth', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
  });

  it('keeps /api/health public without token', async () => {
    const res = await request(app).get('/api/health');

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });

  it('returns 401 for protected public route without token', async () => {
    const res = await request(app).get('/api/public/settings');

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Public access token required');
  });

  it('returns 403 for protected public route with invalid token', async () => {
    jwt.verify.mockImplementation((_token, _secret, cb) => cb(new Error('Invalid')));

    const res = await request(app)
      .get('/api/public/settings')
      .set('Authorization', 'Bearer invalid-token');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Invalid public access token');
  });

  it('allows protected public route with valid public token', async () => {
    jwt.verify.mockImplementation((_token, _secret, cb) => cb(null, { type: 'public' }));
    pool.query.mockResolvedValueOnce({
      rows: [
        { key: 'websiteName', value: 'Test Wedding' },
        { key: 'showCountdown', value: 'true' },
      ],
    });

    const res = await request(app)
      .get('/api/public/settings')
      .set('Authorization', 'Bearer valid-public-token');

    expect(res.status).toBe(200);
    expect(res.body.websiteName).toBe('Test Wedding');
    expect(res.body.showCountdown).toBe(true);
  });

  it('mints a public token from /api/public/token', async () => {
    jwt.sign.mockReturnValue('minted-public-token');

    const res = await request(app).post('/api/public/token');

    expect(res.status).toBe(200);
    expect(jwt.sign).toHaveBeenCalledWith(
      { type: 'public' },
      process.env.JWT_SECRET,
      { expiresIn: expect.any(String) }
    );
    expect(res.body.token).toBe('minted-public-token');
  });

  it('rejects a public token on admin-protected routes', async () => {
    jwt.verify.mockImplementation((_token, _secret, cb) => cb(null, { type: 'public' }));

    const res = await request(app)
      .get('/api/guests')
      .set('Authorization', 'Bearer public-token');

    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Invalid token');
  });
});
