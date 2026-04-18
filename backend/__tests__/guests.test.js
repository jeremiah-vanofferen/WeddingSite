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

// Default: all protected routes authenticate successfully
const setupAuth = () =>
  jwt.verify.mockImplementation((_, __, cb) =>
    cb(null, { id: 1, username: 'admin' })
  );

describe('GET /api/guests', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('returns 401 when Authorization header is absent', async () => {
    const res = await request(app).get('/api/guests');
    expect(res.status).toBe(401);
  });

  it('returns the list of guests', async () => {
    const guests = [{ id: 1, name: 'Jane Doe', email: 'jane@example.com', rsvp: 'Yes' }];
    pool.query.mockResolvedValueOnce({ rows: guests });

    const res = await request(app).get('/api/guests').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toEqual(guests);
  });
});

describe('POST /api/guests', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('returns 400 when name is missing', async () => {
    const res = await request(app)
      .post('/api/guests')
      .set('Authorization', AUTH)
      .send({ email: 'test@example.com' });
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Name is required');
  });

  it('creates a guest without email when email is missing', async () => {
    const guest = { id: 1, name: 'John Doe', email: null, rsvp: 'Pending', plus_one: false };
    pool.query.mockResolvedValueOnce({ rows: [guest] });

    const res = await request(app)
      .post('/api/guests')
      .set('Authorization', AUTH)
      .send({ name: 'John Doe' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('John Doe');
    expect(res.body.email).toBeNull();
  });

  it('creates a guest and returns 201', async () => {
    const guest = { id: 1, name: 'Jane Doe', email: 'jane@example.com', rsvp: 'Pending', plus_one: false };
    pool.query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // duplicate email check
      .mockResolvedValueOnce({ rows: [guest] });         // insert

    const res = await request(app)
      .post('/api/guests')
      .set('Authorization', AUTH)
      .send({ name: 'Jane Doe', email: 'jane@example.com' });
    expect(res.status).toBe(201);
    expect(res.body.name).toBe('Jane Doe');
  });

  it('returns 409 on duplicate email', async () => {
    pool.query.mockResolvedValueOnce({ rowCount: 1, rows: [{ id: 1 }] }); // duplicate found

    const res = await request(app)
      .post('/api/guests')
      .set('Authorization', AUTH)
      .send({ name: 'Jane Doe', email: 'jane@example.com' });
    expect(res.status).toBe(409);
    expect(res.body.error).toBe('Email already exists');
  });
});

describe('PUT /api/guests/:id', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('updates a guest and returns the updated record', async () => {
    const updated = { id: 1, name: 'John Updated', email: 'john@example.com', rsvp: 'Yes', plus_one: true };
    pool.query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // duplicate email check
      .mockResolvedValueOnce({ rows: [updated] });       // update

    const res = await request(app)
      .put('/api/guests/1')
      .set('Authorization', AUTH)
      .send({ name: 'John Updated', email: 'john@example.com', rsvp: 'Yes', plusOne: true });
    expect(res.status).toBe(200);
    expect(res.body.name).toBe('John Updated');
  });

  it('returns 404 when guest does not exist', async () => {
    pool.query
      .mockResolvedValueOnce({ rowCount: 0, rows: [] }) // duplicate email check
      .mockResolvedValueOnce({ rows: [] });              // update finds nothing

    const res = await request(app)
      .put('/api/guests/999')
      .set('Authorization', AUTH)
      .send({ name: 'Nobody', email: 'nobody@example.com', rsvp: 'No' });
    expect(res.status).toBe(404);
  });
});

describe('DELETE /api/guests/:id', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('deletes a guest and returns a success message', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const res = await request(app)
      .delete('/api/guests/1')
      .set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('Guest deleted successfully');
  });

  it('returns 404 when guest does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/guests/999')
      .set('Authorization', AUTH);
    expect(res.status).toBe(404);
  });
});
