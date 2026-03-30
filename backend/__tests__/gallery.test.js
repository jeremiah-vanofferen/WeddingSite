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
delete process.env.GMAIL_USER;
delete process.env.GMAIL_PASS;

const request = require('supertest');
const fs = require('fs');
const path = require('path');
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

const approvedPhoto = {
  id: 1,
  url: 'https://example.com/photo.jpg',
  caption: 'Our first dance',
  submitter_name: 'Alice',
  uploaded_at: '2026-06-01T12:00:00Z',
};

const pendingPhoto = {
  id: 2,
  url: 'https://example.com/pending.jpg',
  caption: 'Ceremony shot',
  submitter_name: 'Bob',
  status: 'pending',
  uploaded_at: '2026-06-02T08:00:00Z',
};

// ── POST /api/gallery/upload ───────────────────────────────────────────────────

describe('POST /api/gallery/upload', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
  });

  it('returns 400 when url is missing', async () => {
    const res = await request(app)
      .post('/api/gallery/upload')
      .send({ caption: 'no url' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/url is required/i);
  });

  it('returns 400 when url does not start with http(s)://', async () => {
    const res = await request(app)
      .post('/api/gallery/upload')
      .send({ url: 'ftp://invalid.com/photo.jpg' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/must start with http/i);
  });

  it('inserts a pending photo and returns 201', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...pendingPhoto, id: 3 }] });

    const res = await request(app)
      .post('/api/gallery/upload')
      .send({ url: 'https://example.com/photo.jpg', caption: 'Ceremony shot', submitterName: 'Bob' });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.photo).toBeDefined();
  });

  it('returns 500 on DB error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .post('/api/gallery/upload')
      .send({ url: 'https://example.com/photo.jpg' });
    expect(res.status).toBe(500);
  });
});

// ── POST /api/gallery/upload-file ─────────────────────────────────────────────

describe('POST /api/gallery/upload-file', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
  });

  it('returns 400 when image file is missing', async () => {
    const res = await request(app)
      .post('/api/gallery/upload-file');
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/file is required/i);
  });

  it('uploads a file and stores a local uploads URL', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{
        id: 10,
        url: '/uploads/fake-file.jpg',
        caption: 'From admin upload',
        submitter_name: null,
        status: 'approved'
      }]
    });

    const res = await request(app)
      .post('/api/gallery/upload-file')
      .field('caption', 'From admin upload')
      .attach('photo', Buffer.from('fake-image-content'), 'image.jpg');

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.photo.url).toContain('/uploads/');

    const [sql, params] = pool.query.mock.calls[0];
    expect(sql).toMatch(/insert into photo_uploads/i);
    expect(params[0]).toContain('/uploads/');

    const uploadedPath = path.join(__dirname, '..', params[0].replace(/^\//, ''));
    if (fs.existsSync(uploadedPath)) {
      fs.unlinkSync(uploadedPath);
    }
  });
});

// ── GET /api/gallery ───────────────────────────────────────────────────────────

describe('GET /api/gallery', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
  });

  it('returns approved photos array', async () => {
    pool.query.mockResolvedValueOnce({ rows: [approvedPhoto] });
    const res = await request(app).get('/api/gallery');
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].url).toBe(approvedPhoto.url);
  });

  it('returns empty array when no approved photos exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/gallery');
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 on DB error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/api/gallery');
    expect(res.status).toBe(500);
  });
});

// ── GET /api/gallery/pending ───────────────────────────────────────────────────

describe('GET /api/gallery/pending', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).get('/api/gallery/pending');
    expect(res.status).toBe(401);
  });

  it('returns pending photos for authenticated admin', async () => {
    pool.query.mockResolvedValueOnce({ rows: [pendingPhoto] });
    const res = await request(app).get('/api/gallery/pending').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(Array.isArray(res.body)).toBe(true);
    expect(res.body[0].status).toBe('pending');
  });

  it('returns empty array when no pending photos exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    const res = await request(app).get('/api/gallery/pending').set('Authorization', AUTH);
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it('returns 500 on DB error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app).get('/api/gallery/pending').set('Authorization', AUTH);
    expect(res.status).toBe(500);
  });
});

// ── PUT /api/gallery/:id/status ────────────────────────────────────────────────

describe('PUT /api/gallery/:id/status', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).put('/api/gallery/1/status').send({ status: 'approved' });
    expect(res.status).toBe(401);
  });

  it('returns 400 for invalid status value', async () => {
    const res = await request(app)
      .put('/api/gallery/1/status')
      .set('Authorization', AUTH)
      .send({ status: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/approved.*rejected/i);
  });

  it('approves a photo and returns the updated record', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...pendingPhoto, status: 'approved' }] });

    const res = await request(app)
      .put('/api/gallery/2/status')
      .set('Authorization', AUTH)
      .send({ status: 'approved' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('approved');
  });

  it('rejects a photo and returns the updated record', async () => {
    pool.query.mockResolvedValueOnce({ rows: [{ ...pendingPhoto, status: 'rejected' }] });

    const res = await request(app)
      .put('/api/gallery/2/status')
      .set('Authorization', AUTH)
      .send({ status: 'rejected' });

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('rejected');
  });

  it('returns 404 when photo does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/gallery/999/status')
      .set('Authorization', AUTH)
      .send({ status: 'approved' });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('returns 500 on DB error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));
    const res = await request(app)
      .put('/api/gallery/1/status')
      .set('Authorization', AUTH)
      .send({ status: 'approved' });
    expect(res.status).toBe(500);
  });
});

// ── PUT /api/gallery/:id ─────────────────────────────────────────────────────

describe('PUT /api/gallery/:id', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app)
      .put('/api/gallery/1')
      .send({ url: approvedPhoto.url, caption: approvedPhoto.caption, featured: true });
    expect(res.status).toBe(401);
  });

  it('returns 400 when url is invalid', async () => {
    const res = await request(app)
      .put('/api/gallery/1')
      .set('Authorization', AUTH)
      .send({ url: 'ftp://bad-url', caption: 'Updated caption', featured: true });

    expect(res.status).toBe(400);
    expect(res.body.error).toMatch(/must start with http/i);
  });

  it('updates an approved photo and returns the updated record', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [{ ...approvedPhoto, caption: 'Updated caption', featured: false }]
    });

    const res = await request(app)
      .put('/api/gallery/1')
      .set('Authorization', AUTH)
      .send({ url: approvedPhoto.url, caption: 'Updated caption', featured: false });

    expect(res.status).toBe(200);
    expect(res.body.caption).toBe('Updated caption');
    expect(res.body.featured).toBe(false);
  });

  it('returns 404 when photo does not exist or is not approved', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .put('/api/gallery/999')
      .set('Authorization', AUTH)
      .send({ url: approvedPhoto.url, caption: 'Updated caption', featured: true });

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });
});

// ── DELETE /api/gallery/:id ───────────────────────────────────────────────────

describe('DELETE /api/gallery/:id', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
    setupAuth();
  });

  it('returns 401 without auth token', async () => {
    const res = await request(app).delete('/api/gallery/1');
    expect(res.status).toBe(401);
  });

  it('returns 404 when photo does not exist', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .delete('/api/gallery/999')
      .set('Authorization', AUTH);

    expect(res.status).toBe(404);
    expect(res.body.error).toMatch(/not found/i);
  });

  it('deletes a photo record and returns success', async () => {
    const unlinkSpy = jest.spyOn(fs, 'unlink').mockImplementation((_filePath, cb) => {
      if (typeof cb === 'function') cb(null);
    });

    pool.query.mockResolvedValueOnce({
      rows: [{ id: 12, url: '/uploads/delete-me.jpg', caption: 'Delete me' }]
    });

    const res = await request(app)
      .delete('/api/gallery/12')
      .set('Authorization', AUTH);

    expect(res.status).toBe(200);
    expect(res.body.success).toBe(true);
    expect(res.body.photo.id).toBe(12);
    expect(unlinkSpy).toHaveBeenCalled();

    unlinkSpy.mockRestore();
  });

  it('returns 500 on DB error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB error'));

    const res = await request(app)
      .delete('/api/gallery/1')
      .set('Authorization', AUTH);

    expect(res.status).toBe(500);
  });
});
