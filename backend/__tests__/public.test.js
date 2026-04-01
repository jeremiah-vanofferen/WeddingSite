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
// Ensure email sending is skipped (no Gmail credentials)
delete process.env.GMAIL_USER;
delete process.env.GMAIL_PASS;

const request = require('supertest');
const { Pool } = require('pg');
const app = require('../server');

const pool = Pool.mock.results[0].value;

const silenceExpectedConsole = () => {
  jest.spyOn(console, 'error').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'log').mockImplementation(() => {});
};

describe('GET /api/health', () => {
  it('returns 200 with status OK', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('OK');
  });
});

describe('GET /api/public/settings', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
  });

  it('returns all public settings keys with correct values', async () => {
    pool.query.mockResolvedValueOnce({
      rows: [
        { key: 'websiteName', value: 'Test Wedding' },
        { key: 'theme', value: 'elegant' },
        { key: 'primaryColor', value: '#0a20ca' },
        { key: 'primaryColorHover', value: '#1894dc' },
        { key: 'fontFamily', value: 'sans serif' },
        { key: 'showCountdown', value: 'true' },
        { key: 'allowRsvp', value: 'false' },
        { key: 'welcomeMessage', value: 'Welcome to our wedding!' },
        { key: 'weddingDate', value: '2026-08-08' },
        { key: 'weddingTime', value: '16:00' },
        { key: 'weddingTimeZone', value: 'America/Chicago' },
        { key: 'weddingLocation', value: 'Windpoint Lighthouse' },
        { key: 'weddingAddress', value: '4725 Lighthouse Drive, Wind Point, WI 53402' },
        { key: 'weddingDescription', value: 'A beautiful outdoor ceremony.' },
        { key: 'carouselSpeed', value: '6' },
        { key: 'carouselTransition', value: 'fade' },
      ],
    });
    const res = await request(app).get('/api/public/settings');
    expect(res.status).toBe(200);
    // String fields
    expect(res.body.websiteName).toBe('Test Wedding');
    expect(res.body.theme).toBe('elegant');
    expect(res.body.primaryColor).toBe('#0a20ca');
    expect(res.body.primaryColorHover).toBe('#1894dc');
    expect(res.body.fontFamily).toBe('sans serif');
    expect(res.body.welcomeMessage).toBe('Welcome to our wedding!');
    expect(res.body.weddingDate).toBe('2026-08-08');
    expect(res.body.weddingTime).toBe('16:00');
    expect(res.body.weddingTimeZone).toBe('America/Chicago');
    expect(res.body.weddingLocation).toBe('Windpoint Lighthouse');
    expect(res.body.weddingAddress).toBe('4725 Lighthouse Drive, Wind Point, WI 53402');
    expect(res.body.weddingDescription).toBe('A beautiful outdoor ceremony.');
    expect(res.body.carouselSpeed).toBe('6');
    expect(res.body.carouselTransition).toBe('fade');
    // Booleans are coerced from strings
    expect(res.body.showCountdown).toBe(true);
    expect(res.body.allowRsvp).toBe(false);
  });

  it('passes only the allowed public keys to the query', async () => {
    pool.query.mockResolvedValueOnce({ rows: [] });
    await request(app).get('/api/public/settings');
    const queryArgs = pool.query.mock.calls[0];
    const keysArg = queryArgs[1][0];
    expect(keysArg).toEqual(expect.arrayContaining([
      'websiteName', 'theme', 'primaryColor', 'primaryColorHover', 'fontFamily',
      'showCountdown', 'allowRsvp', 'welcomeMessage',
      'weddingDate', 'weddingTime', 'weddingTimeZone', 'weddingLocation', 'weddingAddress', 'weddingDescription',
      'carouselSpeed', 'carouselTransition', 'registryUrl',
    ]));
    expect(keysArg).toHaveLength(17);
  });

  it('returns 500 on database error', async () => {
    pool.query.mockRejectedValueOnce(new Error('DB failure'));
    const res = await request(app).get('/api/public/settings');
    expect(res.status).toBe(500);
    expect(res.body.error).toBeDefined();
  });
});

describe('GET /api/schedule', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
  });

  it('returns the schedule list', async () => {
    const events = [
      { id: 1, time: '14:00', event: 'Ceremony', description: 'Outdoor ceremony', sort_order: 1 },
    ];
    pool.query.mockResolvedValueOnce({ rows: events });

    const res = await request(app).get('/api/schedule');
    expect(res.status).toBe(200);
    expect(res.body).toEqual(events);
  });
});

describe('POST /api/rsvp', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/rsvp')
      .send({ name: 'John' }); // missing email and rsvp
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Name, email, and RSVP status are required');
  });

  it('returns 400 when attending guests is 0', async () => {
    const res = await request(app)
      .post('/api/rsvp')
      .send({ name: 'John Doe', email: 'john@example.com', rsvp: 'yes', guests: 0 });

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Attending guests must be at least 1');
    expect(pool.query).not.toHaveBeenCalled();
  });

  it('allows 0 guests when RSVP is not attending', async () => {
    const guest = { id: 1, name: 'John Doe', email: 'john@example.com', rsvp: 'No' };
    pool.query
      .mockResolvedValueOnce({ rows: [guest] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/rsvp')
      .send({ name: 'John Doe', email: 'john@example.com', rsvp: 'no', guests: 0 });

    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.guest.rsvp).toBe('No');
    expect(pool.query.mock.calls[0][1][3]).toBe(false);
  });

  it('creates an RSVP and returns 201', async () => {
    const guest = { id: 1, name: 'John Doe', email: 'john@example.com', rsvp: 'Yes' };
    // First query: INSERT guest; Second query: getAdminEmail (no email configured)
    pool.query
      .mockResolvedValueOnce({ rows: [guest] })
      .mockResolvedValueOnce({ rows: [] });

    const res = await request(app)
      .post('/api/rsvp')
      .send({ name: 'John Doe', email: 'john@example.com', rsvp: 'yes', guests: 1 });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.guest.name).toBe('John Doe');
  });
});

describe('POST /api/messages', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    silenceExpectedConsole();
  });

  it('returns 400 when required fields are missing', async () => {
    const res = await request(app)
      .post('/api/messages')
      .send({ name: 'Jane' }); // missing email and message
    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Name, email, and message are required');
  });

  it('saves a message and returns 201', async () => {
    const msg = { id: 1, name: 'Jane', email: 'jane@example.com', message: 'Hello!' };
    pool.query
      .mockResolvedValueOnce({ rows: [msg] })   // INSERT message
      .mockResolvedValueOnce({ rows: [] });      // getAdminEmail

    const res = await request(app)
      .post('/api/messages')
      .send({ name: 'Jane', email: 'jane@example.com', message: 'Hello!' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
    expect(res.body.message.name).toBe('Jane');
  });
});
