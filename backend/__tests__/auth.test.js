// Copyright 2026 Jeremiah Van Offeren
// Mock external modules before any require()
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
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const app = require('../server');

// Capture the pool returned by the Pool constructor in server.js
const pool = Pool.mock.results[0].value;

const silenceExpectedConsole = () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
};

describe('POST /api/auth/login', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
  });

  it('returns 400 when username and password are missing', async () => {
    const res = await request(app).post('/api/auth/login').send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Username and password required');
  });

  it('returns 400 when only username is provided', async () => {
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin' });
    expect(res.status).toBe(400);
  });

  it('returns 401 when user is not found', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 0, rows: [] });
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'nobody', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns 401 when password is incorrect', async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, username: 'admin', password_hash: 'hashed' }],
    });
    bcrypt.compare.mockResolvedValueOnce(false);
    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'wrong' });
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Invalid credentials');
  });

  it('returns a JWT token on successful login', async () => {
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, username: 'admin', password_hash: 'hashed' }],
    });
    bcrypt.compare.mockResolvedValueOnce(true);
    jwt.sign.mockReturnValueOnce('mock-jwt-token');

    const res = await request(app)
      .post('/api/auth/login')
      .send({ username: 'admin', password: 'correct' });

    expect(res.status).toBe(200);
    expect(res.body.token).toBe('mock-jwt-token');
    expect(res.body.user).toEqual({ id: 1, username: 'admin' });
  });
});

describe('GET /api/auth/verify', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
  });

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).get('/api/auth/verify');
    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Access token required');
  });

  it('returns 403 when the token is invalid', async () => {
    jwt.verify.mockImplementationOnce((_, __, cb) =>
      cb(new Error('invalid'), null)
    );
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer bad-token');
    expect(res.status).toBe(403);
    expect(res.body.error).toBe('Invalid token');
  });

  it('returns user info when the token is valid', async () => {
    jwt.verify.mockImplementationOnce((_, __, cb) =>
      cb(null, { id: 1, username: 'admin' })
    );
    const res = await request(app)
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer valid-token');
    expect(res.status).toBe(200);
    expect(res.body.user).toEqual({ id: 1, username: 'admin' });
  });
});

describe('POST /api/auth/change-password', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
  });

  it('returns 401 when no Authorization header is provided', async () => {
    const res = await request(app).post('/api/auth/change-password').send({
      currentPassword: 'old-password',
      newPassword: 'new-password-123',
      confirmPassword: 'new-password-123'
    });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Access token required');
  });

  it('returns 400 when required fields are missing', async () => {
    jwt.verify.mockImplementationOnce((_, __, cb) => cb(null, { id: 1, username: 'admin' }));

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', 'Bearer valid-token')
      .send({ currentPassword: 'old-password' });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Current password, new password, and confirmation are required');
  });

  it('returns 400 when new password and confirmation do not match', async () => {
    jwt.verify.mockImplementationOnce((_, __, cb) => cb(null, { id: 1, username: 'admin' }));

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', 'Bearer valid-token')
      .send({
        currentPassword: 'old-password',
        newPassword: 'new-password-123',
        confirmPassword: 'different-password-123'
      });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('New password and confirmation do not match');
  });

  it('returns 401 when current password is incorrect', async () => {
    jwt.verify.mockImplementationOnce((_, __, cb) => cb(null, { id: 1, username: 'admin' }));
    pool.query.mockResolvedValueOnce({
      rowCount: 1,
      rows: [{ id: 1, password_hash: 'old-hash' }]
    });
    bcrypt.compare.mockResolvedValueOnce(false);

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', 'Bearer valid-token')
      .send({
        currentPassword: 'wrong-password',
        newPassword: 'new-password-123',
        confirmPassword: 'new-password-123'
      });

    expect(res.status).toBe(401);
    expect(res.body.error).toBe('Current password is incorrect');
  });

  it('updates password and returns success when current password is valid', async () => {
    jwt.verify.mockImplementationOnce((_, __, cb) => cb(null, { id: 1, username: 'admin' }));
    pool.query
      .mockResolvedValueOnce({
        rowCount: 1,
        rows: [{ id: 1, password_hash: 'old-hash' }]
      })
      .mockResolvedValueOnce({ rowCount: 1, rows: [] });
    bcrypt.compare.mockResolvedValueOnce(true);
    bcrypt.hash.mockResolvedValueOnce('new-hash');

    const res = await request(app)
      .post('/api/auth/change-password')
      .set('Authorization', 'Bearer valid-token')
      .send({
        currentPassword: 'old-password',
        newPassword: 'new-password-123',
        confirmPassword: 'new-password-123'
      });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ success: true, message: 'Password changed successfully' });
    expect(pool.query).toHaveBeenNthCalledWith(
      1,
      'SELECT id, password_hash FROM admin_users WHERE id = $1',
      [1]
    );
    expect(pool.query).toHaveBeenNthCalledWith(
      2,
      'UPDATE admin_users SET password_hash = $1 WHERE id = $2',
      ['new-hash', 1]
    );
  });
});
