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

const makeClient = () => {
  const client = { query: jest.fn(), release: jest.fn() };
  pool.connect.mockResolvedValue(client);
  return client;
};

describe('POST /api/schedule', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('returns 401 without auth', async () => {
    const res = await request(app).post('/api/schedule').send({ time: '14:00', event: 'Ceremony' });
    expect(res.status).toBe(401);
  });

  it('returns 400 when time or event is missing', async () => {
    const res = await request(app)
      .post('/api/schedule')
      .set('Authorization', AUTH)
      .send({ time: '14:00' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Time and event name are required');
  });

  it('creates a schedule event and returns 201', async () => {
    const event = { id: 1, time: '14:00', event: 'Ceremony', description: null, sort_order: 1 };
    pool.query
      .mockResolvedValueOnce({ rows: [{ next_order: 1 }] }) // sort_order query
      .mockResolvedValueOnce({ rows: [event] });             // INSERT

    const res = await request(app)
      .post('/api/schedule')
      .set('Authorization', AUTH)
      .send({ time: '14:00', event: 'Ceremony' });

    expect(res.status).toBe(201);
    expect(res.body.event).toBe('Ceremony');
  });

  it('returns 500 on DB error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .post('/api/schedule')
      .set('Authorization', AUTH)
      .send({ time: '14:00', event: 'Ceremony' });
    expect(res.status).toBe(500);
  });
});

describe('PUT /api/schedule/:id', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('updates a schedule event', async () => {
    const event = { id: 1, time: '15:00', event: 'Reception', description: 'Party time' };
    pool.query.mockResolvedValueOnce({ rows: [event] });

    const res = await request(app)
      .put('/api/schedule/1')
      .set('Authorization', AUTH)
      .send({ time: '15:00', event: 'Reception', description: 'Party time' });

    expect(res.status).toBe(200);
    expect(res.body.event).toBe('Reception');
  });

  it('returns 404 when event does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .put('/api/schedule/999')
      .set('Authorization', AUTH)
      .send({ time: '15:00', event: 'Ghost' });
    expect(res.status).toBe(404);
  });

  it('returns 500 on DB error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .put('/api/schedule/1')
      .set('Authorization', AUTH)
      .send({ time: '15:00', event: 'X' });
    expect(res.status).toBe(500);
  });
});

describe('PUT /api/schedule (reorder)', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('returns 400 when events is not an array', async () => {
    const res = await request(app)
      .put('/api/schedule')
      .set('Authorization', AUTH)
      .send({ events: 'bad' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('events must be an array');
  });

  it('reorders events and returns the updated list', async () => {
    const client = makeClient();
    client.query.mockResolvedValue({});
    const reordered = [
      { id: 2, time: '14:00', event: 'Ceremony', sort_order: 1 },
      { id: 1, time: '15:00', event: 'Reception', sort_order: 2 },
    ];
    pool.query.mockResolvedValueOnce({ rows: reordered });

    const res = await request(app)
      .put('/api/schedule')
      .set('Authorization', AUTH)
      .send({ events: [{ id: 2 }, { id: 1 }] });

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(client.query).toHaveBeenCalledWith('COMMIT');
    expect(client.release).toHaveBeenCalled();
  });

  it('rolls back on DB error', async () => {
    const client = makeClient();
    client.query
      .mockResolvedValueOnce({}) // BEGIN
      .mockRejectedValueOnce(new Error('DB error')); // UPDATE

    const res = await request(app)
      .put('/api/schedule')
      .set('Authorization', AUTH)
      .send({ events: [{ id: 1 }] });

    expect(res.status).toBe(500);
    expect(client.query).toHaveBeenCalledWith('ROLLBACK');
  });
});

describe('DELETE /api/schedule/:id', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('deletes a schedule event', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });
    const res = await request(app)
      .delete('/api/schedule/1')
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Event deleted successfully');
  });

  it('returns 404 when event does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app)
      .delete('/api/schedule/999')
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });

  it('returns 500 on DB error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .delete('/api/schedule/1')
      .set('Authorization', AUTH);
    expect(res.status).toBe(500);
  });
});
