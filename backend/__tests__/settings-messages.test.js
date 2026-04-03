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
process.env.NODE_ENV = 'test';

const request = require('supertest');
const { Pool } = require('pg');
const jwt = require('jsonwebtoken');
const app = require('../server');

const pool = Pool.mock.results[0].value;
const AUTH = 'Bearer test-token';

const silenceExpectedConsole = () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
};

const setupAuth = () =>
  jwt.verify.mockImplementation((_, __, cb) =>
    cb(null, { id: 1, username: 'admin' })
  );

describe('GET /api/settings', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/settings');
    expect(res.status).toBe(401);
  });

  it('returns all settings as a key/value map', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { key: 'websiteName', value: 'My Wedding' },
        { key: 'theme', value: 'elegant' },
      ],
    });
    const res = await request(app).get('/api/settings').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.websiteName).toBe('My Wedding');
    expect(res.body.theme).toBe('elegant');
  });

  it('returns 500 on DB error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/api/settings').set('Authorization', AUTH);
    expect(res.status).toBe(500);
  });
});

describe('PUT /api/settings', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('saves all settings and returns success', async () => {
    pool.query.mockResolvedValue({});
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', AUTH)
      .send({ websiteName: 'Our Wedding', theme: 'rustic' });

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(pool.query).toHaveBeenCalledTimes(2); // one per key
  });

  it('returns 500 on DB error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .put('/api/settings')
      .set('Authorization', AUTH)
      .send({ websiteName: 'Test' });
    expect(res.status).toBe(500);
  });
});

describe('GET /api/settings/admin-email', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('returns the admin email', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ value: 'admin@example.com' }] });
    const res = await request(app).get('/api/settings/admin-email').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.adminEmail).toBe('admin@example.com');
  });

  it('returns empty string when no email is set', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/settings/admin-email').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.adminEmail).toBe('');
  });

  it('returns 500 on DB error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/api/settings/admin-email').set('Authorization', AUTH);
    expect(res.status).toBe(500);
  });
});

describe('PUT /api/settings/admin-email', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('returns 400 when adminEmail is missing', async () => {
    const res = await request(app)
      .put('/api/settings/admin-email')
      .set('Authorization', AUTH)
      .send({});
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Admin email is required');
  });

  it('saves the admin email and returns success', async () => {
    pool.query.mockResolvedValueOnce({});
    const res = await request(app)
      .put('/api/settings/admin-email')
      .set('Authorization', AUTH)
      .send({ adminEmail: 'new@example.com' });
    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.adminEmail).toBe('new@example.com');
  });

  it('returns 500 on DB error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .put('/api/settings/admin-email')
      .set('Authorization', AUTH)
      .send({ adminEmail: 'x@x.com' });
    expect(res.status).toBe(500);
  });
});

describe('GET /api/messages', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('returns all messages', async () => {
    const msgs = [{ id: 1, name: 'Alice', email: 'a@a.com', message: 'Hi', is_read: false }];
    pool.query.mockResolvedValueOnce({ rows: msgs });
    const res = await request(app).get('/api/messages').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(msgs);
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).get('/api/messages');
    expect(res.status).toBe(401);
  });

  it('returns 500 on DB error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/api/messages').set('Authorization', AUTH);
    expect(res.status).toBe(500);
  });
});

describe('PUT /api/messages/:id/read', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('marks a message as read', async () => {
    const msg = { id: 1, name: 'Alice', is_read: true };
    pool.query.mockResolvedValueOnce({ rows: [msg] });
    const res = await request(app)
      .put('/api/messages/1/read')
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.is_read).toBe(true);
  });

  it('returns 404 when message does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .put('/api/messages/999/read')
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
    expect(res.body.error).toBe('Message not found');
  });

  it('returns 500 on DB error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .put('/api/messages/1/read')
      .set('Authorization', AUTH);
    expect(res.status).toBe(500);
  });
});
