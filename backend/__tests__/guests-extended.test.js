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

// Helper: mock pool.connect() returning a client with query/release mocks
const makeClient = () => {
  const client = { query: jest.fn(), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
  return client;
};

describe('POST /api/guests/bulk', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/guests/bulk').send({ guests: [] });
    expect(res.status).toBe(401);
  });

  it('returns 400 when guests is not an array', async () => {
    const res = await request(app)
      .post('/api/guests/bulk')
      .set('Authorization', AUTH)
      .send({ guests: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Guests must be an array');
  });

  it('merges guests successfully', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({});
    const imported = [{ id: 1, name: 'Jane', email: 'jane@example.com' }];
    pool.query.mockResolvedValueOnce({ rows: imported });

    const res = await request(app)
      .post('/api/guests/bulk')
      .set('Authorization', AUTH)
      .send({ guests: [{ name: 'Jane', email: 'jane@example.com' }], mode: 'merge' });

    expect(res.status).toBe(200);
    expect(client.query).toHaveBeenCalledWith('BEGIN');
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('deletes all guests first when mode is replace', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({});
    pool.query.mockResolvedValueOnce({ rows: [] });

    await request(app)
      .post('/api/guests/bulk')
      .set('Authorization', AUTH)
      .send({ guests: [], mode: 'replace' });

    const calls = client.query.mock.calls.map(c => c[0]);
    expect(calls).toContain('DELETE FROM guests');
  });

  it('rolls back and returns 500 on DB error', async () => {
    const client = makeClient();
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error('DB error')); // INSERT

    const res = await request(app)
      .post('/api/guests/bulk')
      .set('Authorization', AUTH)
      .send({ guests: [{ name: 'X', email: 'x@x.com' }], mode: 'merge' });

    expect(res.status).toBe(500);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
    expect(client.release).toHaveBeenCalled();
  });
});

describe('GET /api/guests (500 error path)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('returns 500 on DB failure', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/api/guests').set('Authorization', AUTH);
    expect(res.status).toBe(500);
  });
});

describe('PUT /api/guests/:id (409 duplicate and 500 paths)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('returns 409 on duplicate email', async () => {
    const err = Object.assign(new Error('dup'), { code: '23505' });
    pool.query.mockRejectedValueOnce(err);
    const res = await request(app)
      .put('/api/guests/1')
      .set('Authorization', AUTH)
      .send({ name: 'X', email: 'x@x.com', rsvp: 'Yes' });
    expect(res.status).toBe(409);
  });

  it('returns 500 on unexpected DB error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .put('/api/guests/1')
      .set('Authorization', AUTH)
      .send({ name: 'X', email: 'x@x.com', rsvp: 'Yes' });
    expect(res.status).toBe(500);
  });
});

describe('DELETE /api/guests/:id (500 path)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('returns 500 on DB failure', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).delete('/api/guests/1').set('Authorization', AUTH);
    expect(res.status).toBe(500);
  });
});
