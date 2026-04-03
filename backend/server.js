// Copyright 2026 Jeremiah Van Offeren
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
const path = require('path');
const fs = require('fs');
const multer = require('multer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Validate required env vars at startup
if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production'
    ? (process.env.CORS_ORIGIN || false)
    : true,
  credentials: true
}));
app.use(express.json());

const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const uploadStorage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  }
});

const uploadPhoto = multer({
  storage: uploadStorage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedMime = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
    if (allowedMime.includes(file.mimetype)) {
      cb(null, true);
      return;
    }
    cb(Object.assign(new Error('Only JPEG, PNG, GIF, and WebP images are allowed'), { status: 400 }));
  }
});

app.use('/uploads', express.static(uploadDir));

let guestCountColumnReady = false;

// Rate limiting
// In test/dev environments, use relaxed defaults to avoid flaky local and CI runs.
const isRelaxedRateLimitEnv = ['test', 'development'].includes(process.env.NODE_ENV);
const parseRateLimitMax = (value, fallback) => {
  const parsed = Number.parseInt(value, 10);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : fallback;
};

const generalRateLimitMax = parseRateLimitMax(
  process.env.RATE_LIMIT_MAX,
  isRelaxedRateLimitEnv ? 10000 : 100
);

const strictRateLimitMax = parseRateLimitMax(
  process.env.STRICT_RATE_LIMIT_MAX,
  isRelaxedRateLimitEnv ? 10000 : 20
);

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: generalRateLimitMax,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/', limiter);

const strictLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: strictRateLimitMax,
  message: { error: 'Too many requests, please try again later' }
});
app.use('/api/auth/login', strictLimiter);
app.use('/api/auth/change-password', strictLimiter);
app.use('/api/rsvp', strictLimiter);
app.use('/api/public/token', strictLimiter);

const requirePublicAccessToken = process.env.NODE_ENV !== 'test';
const publicTokenExpiresIn = process.env.PUBLIC_JWT_EXPIRES_IN || '2h';

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    if (!user.id || !user.username) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

const authenticatePublicToken = (req, res, next) => {
  if (!requirePublicAccessToken) {
    return next();
  }

  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Public access token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err || payload?.type !== 'public') {
      return res.status(403).json({ error: 'Invalid public access token' });
    }
    req.publicToken = payload;
    next();
  });
};

const sendError = (res, status, message) => res.status(status).json({ error: message });
const sendBadRequest = (res, message) => sendError(res, 400, message);
const sendNotFound = (res, message) => sendError(res, 404, message);
const sendInternalError = (res, context, error) => {
  console.error(`${context}:`, error);
  return sendError(res, 500, 'Internal server error');
};

// Verify token route
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username } });
});

// Mint anonymous token for public endpoints
app.post('/api/public/token', (_req, res) => {
  try {
    const token = jwt.sign(
      { type: 'public' },
      process.env.JWT_SECRET,
      { expiresIn: publicTokenExpiresIn }
    );

    return res.json({ token, expiresIn: publicTokenExpiresIn });
  } catch (error) {
    return sendInternalError(res, 'Public token mint error', error);
  }
});

// Routes

// Login route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);

    if (result.rowCount === 0) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const user = result.rows[0];
    const isValidPassword = await bcrypt.compare(password, user.password_hash);

    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      user: { id: user.id, username: user.username }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Change password route
app.post('/api/auth/change-password', authenticateToken, async (req, res) => {
  try {
    const { currentPassword, newPassword, confirmPassword } = req.body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({ error: 'Current password, new password, and confirmation are required' });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ error: 'New password and confirmation do not match' });
    }

    if (newPassword.length < 8) {
      return res.status(400).json({ error: 'New password must be at least 8 characters long' });
    }

    const result = await pool.query('SELECT id, password_hash FROM admin_users WHERE id = $1', [req.user.id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Admin user not found' });
    }

    const adminUser = result.rows[0];
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, adminUser.password_hash);
    if (!isCurrentPasswordValid) {
      return res.status(401).json({ error: 'Current password is incorrect' });
    }

    const newPasswordHash = await bcrypt.hash(newPassword, 10);
    await pool.query(
      'UPDATE admin_users SET password_hash = $1 WHERE id = $2',
      [newPasswordHash, req.user.id]
    );

    res.json({ success: true, message: 'Password changed successfully' });
  } catch (error) {
    console.error('Change password error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all guests
app.get('/api/guests', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM guests ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get guests error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add new guest
app.post('/api/guests', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, address, rsvp, plusOne, plus_one, guestCount, guest_count } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const normalizedGuestCount = normalizeGuestCount(guestCount ?? guest_count, plusOne ?? plus_one);

    const result = await pool.query(
      `INSERT INTO guests (name, email, phone, address, rsvp, guest_count)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [
        name,
        email || null,
        phone || null,
        address || null,
        rsvp || 'Pending',
        normalizedGuestCount
      ]
    );

    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') { // Unique constraint violation
      res.status(409).json({ error: 'Email already exists' });
    } else {
      console.error('Add guest error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Update guest
app.put('/api/guests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, rsvp, plusOne, plus_one, guestCount, guest_count } = req.body;

    const normalizedGuestCount = normalizeGuestCount(guestCount ?? guest_count, plusOne ?? plus_one);

    const result = await pool.query(
      `UPDATE guests
       SET name = $1, email = $2, phone = $3, address = $4, rsvp = $5, guest_count = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, email, phone || null, address || null, rsvp, normalizedGuestCount, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      res.status(409).json({ error: 'Email already exists' });
    } else {
      console.error('Update guest error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  }
});

// Delete guest
app.delete('/api/guests/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM guests WHERE id = $1 RETURNING *', [id]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    res.json({ message: 'Guest deleted successfully' });
  } catch (error) {
    console.error('Delete guest error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: approve or reject RSVP
app.put('/api/guests/:id/approval', authenticateToken, async (req, res) => {
  await ensureApprovalStatusColumn();
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (status !== 'approved' && status !== 'rejected' && status !== 'pending') {
      return sendBadRequest(res, "Status must be 'approved', 'rejected', or 'pending'");
    }

    const result = await pool.query(
      `UPDATE guests SET approval_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2 RETURNING *`,
      [status, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }

    res.json({ guest: result.rows[0] });
  } catch (error) {
    console.error('Update RSVP approval error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: get pending RSVPs
app.get('/api/guests/pending-approvals', authenticateToken, async (req, res) => {
  await ensureApprovalStatusColumn();
  try {
    const result = await pool.query(
      `SELECT * FROM guests WHERE approval_status = 'pending' ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    console.error('Get pending approvals error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Bulk import guests
app.post('/api/guests/bulk', authenticateToken, async (req, res) => {
  try {
    const { guests, mode } = req.body;

    if (!Array.isArray(guests)) {
      return sendBadRequest(res, 'Guests must be an array');
    }

    if (mode !== 'replace' && mode !== 'merge') {
      return sendBadRequest(res, "mode must be 'replace' or 'merge'");
    }

    const client = await pool.connect();

    try {
      await client.query('BEGIN');

      if (mode === 'replace') {
        await client.query('DELETE FROM guests');
      }

      const values = guests.map(guest => [
        guest.name,
        guest.email,
        guest.phone || null,
        guest.address || null,
        guest.rsvp || 'Pending',
        normalizeGuestCount(guest.guestCount, guest.plusOne)
      ]);

      for (const value of values) {
        const [, email] = value;
        if (email) {
          await client.query(
            `INSERT INTO guests (name, email, phone, address, rsvp, guest_count)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (email) DO UPDATE SET
               name = EXCLUDED.name,
               phone = EXCLUDED.phone,
               address = EXCLUDED.address,
               rsvp = EXCLUDED.rsvp,
               guest_count = EXCLUDED.guest_count,
               updated_at = CURRENT_TIMESTAMP`,
            value
          );
        } else {
          await client.query(
            `INSERT INTO guests (name, email, phone, address, rsvp, guest_count)
             VALUES ($1, $2, $3, $4, $5, $6)`,
            value
          );
        }
      }

      await client.query('COMMIT');

      const result = await client.query('SELECT * FROM guests ORDER BY created_at DESC');
      res.json(result.rows);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  } catch (error) {
    return sendInternalError(res, 'Bulk import error', error);
  }
});

// Public RSVP endpoint
app.post('/api/rsvp', authenticatePublicToken, async (req, res) => {
  try {
    const { name, email, rsvp, guests } = req.body;
    if (!name || !email || !rsvp) {
      return sendBadRequest(res, 'Name, email, and RSVP status are required');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendBadRequest(res, 'Invalid email address');
    }

    const normalizedRsvp = String(rsvp).toLowerCase();
    if (normalizedRsvp !== 'yes' && normalizedRsvp !== 'no') {
      return sendBadRequest(res, "RSVP status must be 'yes' or 'no'");
    }

    const hasGuestsInput = guests !== undefined && guests !== null && String(guests).trim() !== '';
    const parsedGuests = hasGuestsInput ? Number.parseInt(guests, 10) : (normalizedRsvp === 'yes' ? 1 : 0);
    if (!Number.isInteger(parsedGuests) || parsedGuests < 0) {
      return sendBadRequest(res, 'Guests must be a non-negative integer');
    }
    if (normalizedRsvp === 'yes' && parsedGuests < 1) {
      return sendBadRequest(res, 'Attending guests must be at least 1');
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();

    // Match guest by name first, then update that record.
    const rsvpStatus = normalizedRsvp === 'yes' ? 'Yes' : 'No';
    const existingByNameResult = await pool.query(
      `SELECT id, email
       FROM guests
       WHERE lower(btrim(name)) = lower(btrim($1))
       ORDER BY created_at DESC
       LIMIT 1`,
      [normalizedName]
    );

    let result;
    if (existingByNameResult.rowCount > 0) {
      const matchedGuest = existingByNameResult.rows[0];

      const emailOwnerResult = await pool.query(
        'SELECT id FROM guests WHERE email = $1 AND id <> $2 LIMIT 1',
        [normalizedEmail, matchedGuest.id]
      );

      if (emailOwnerResult.rowCount > 0) {
        return res.status(409).json({ error: 'Email already exists' });
      }

      result = await pool.query(
        `UPDATE guests
         SET name = $1,
             email = $2,
             rsvp = $3,
             guest_count = $4,
             approval_status = 'pending',
             updated_at = CURRENT_TIMESTAMP
         WHERE id = $5
         RETURNING *`,
        [normalizedName, normalizedEmail, rsvpStatus, parsedGuests, matchedGuest.id]
      );
    } else {
      result = await pool.query(
        `INSERT INTO guests (name, email, rsvp, guest_count, approval_status)
         VALUES ($1, $2, $3, $4, 'pending')
         RETURNING *`,
        [normalizedName, normalizedEmail, rsvpStatus, parsedGuests]
      );
    }

    // Send email notification to admin
    const adminEmail = await getAdminEmail();
    if (adminEmail && process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
          }
        });
        const guestCount = `${parsedGuests} guest${parsedGuests === 1 ? '' : 's'}`;
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: adminEmail,
          subject: `New RSVP: ${name} — ${rsvpStatus}`,
          text: `A new RSVP has been submitted.\n\nName: ${name}\nEmail: ${email}\nRSVP: ${rsvpStatus}\nParty size: ${guestCount}`
        });
        console.log('RSVP notification email sent to', adminEmail);
      } catch (emailError) {
        console.error('Failed to send RSVP notification email:', emailError.message);
      }
    }

    res.status(201).json({ success: true, guest: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    return sendInternalError(res, 'RSVP error', error);
  }
});

// Public contact form endpoint
app.post('/api/messages', strictLimiter, authenticatePublicToken, async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return sendBadRequest(res, 'Name, email, and message are required');
    }
    const result = await pool.query(
      `INSERT INTO messages (name, email, message) VALUES ($1, $2, $3) RETURNING *`,
      [name, email, message]
    );

    // Send email to admin
    const adminEmail = await getAdminEmail();
    if (adminEmail && process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: {
            user: process.env.GMAIL_USER,
            pass: process.env.GMAIL_PASS
          }
        });
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: adminEmail,
          subject: 'New Contact Message',
          text: `From: ${name} <${email}>\n\n${message}`
        });
        console.log('Contact notification email sent to', adminEmail);
      } catch (emailError) {
        console.error('Failed to send contact notification email:', emailError.message);
      }
    } else {
      console.warn('Email not sent — missing adminEmail, GMAIL_USER, or GMAIL_PASS');
    }
    res.status(201).json({ success: true, message: result.rows[0] });
  } catch (error) {
    return sendInternalError(res, 'Message save error', error);
  }
});

// Admin: get all messages
app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM messages ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    return sendInternalError(res, 'Get messages error', error);
  }
});

// Mark message as read
app.put('/api/messages/:id/read', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      'UPDATE messages SET is_read = TRUE WHERE id = $1 RETURNING *',
      [id]
    );
    if (result.rows.length === 0) {
      return sendNotFound(res, 'Message not found');
    }
    res.json(result.rows[0]);
  } catch (error) {
    return sendInternalError(res, 'Mark message as read error', error);
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get public settings (wedding details + display settings, requires a valid public token)
app.get('/api/public/settings', authenticatePublicToken, async (req, res) => {
  try {
    const PUBLIC_KEYS = ['websiteName', 'theme', 'primaryColor', 'primaryColorHover', 'fontFamily',
      'showCountdown', 'allowRsvp', 'welcomeMessage',
      'weddingDate', 'weddingTime', 'weddingTimeZone', 'weddingLocation', 'weddingAddress', 'weddingDescription',
      'carouselSpeed', 'carouselTransition', 'registryUrl'];
    const result = await pool.query(
      'SELECT key, value FROM settings WHERE key = ANY($1)',
      [PUBLIC_KEYS]
    );
    const raw = Object.fromEntries(result.rows.map(r => [r.key, r.value]));
    // Normalize boolean strings to actual booleans so clients don't need to coerce
    const BOOL_KEYS = ['showCountdown', 'allowRsvp'];
    const settings = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, BOOL_KEYS.includes(k) ? v === 'true' : v])
    );
    res.json(settings);
  } catch (error) {
    return sendInternalError(res, 'Get public settings error', error);
  }
});

// Get public guest names for RSVP/contact autofill suggestions
app.get('/api/public/guest-names', authenticatePublicToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT name
       FROM guests
       WHERE name IS NOT NULL
         AND btrim(name) <> ''
       ORDER BY name ASC
       LIMIT 500`
    );

    const names = result.rows
      .map((row) => row.name)
      .filter((name) => typeof name === 'string' && name.trim() !== '');

    res.json(names);
  } catch (error) {
    return sendInternalError(res, 'Get public guest names error', error);
  }
});

// Get guest name suggestions for RSVP/Contact
app.get('/api/public/guest-lookup', authenticatePublicToken, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT name AS value
       FROM guests
       WHERE name IS NOT NULL
         AND btrim(name) <> ''
       ORDER BY name ASC
       LIMIT 500`
    );

    const suggestions = result.rows
      .map((row) => row.value)
      .filter((value) => typeof value === 'string' && value.trim() !== '');

    res.json({ suggestions });
  } catch (error) {
    return sendInternalError(res, 'Get guest lookup error', error);
  }
});

// Get schedule (public)
app.get('/api/schedule', authenticatePublicToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM schedule ORDER BY sort_order, time');
    res.json(result.rows);
  } catch (error) {
    return sendInternalError(res, 'Get schedule error', error);
  }
});

// Add a schedule event
app.post('/api/schedule', authenticateToken, async (req, res) => {
  try {
    const { time, event, description } = req.body;
    if (!time || !event) {
      return sendBadRequest(res, 'Time and event name are required');
    }
    const orderResult = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM schedule');
    const sortOrder = orderResult.rows[0].next_order;
    const result = await pool.query(
      'INSERT INTO schedule (time, event, description, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [time, event, description || null, sortOrder]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    return sendInternalError(res, 'Add schedule event error', error);
  }
});

// Update a schedule event
app.put('/api/schedule/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { time, event, description } = req.body;
    const result = await pool.query(
      'UPDATE schedule SET time = $1, event = $2, description = $3 WHERE id = $4 RETURNING *',
      [time, event, description || null, id]
    );
    if (result.rows.length === 0) {
      return sendNotFound(res, 'Event not found');
    }
    res.json(result.rows[0]);
  } catch (error) {
    return sendInternalError(res, 'Update schedule event error', error);
  }
});

// Reorder schedule (replace sort_order for all events)
app.put('/api/schedule', authenticateToken, async (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events)) {
      return sendBadRequest(res, 'events must be an array');
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < events.length; i++) {
        const scheduleEvent = events[i];
        await client.query(
          `UPDATE schedule
           SET sort_order = $1,
               time = $2,
               event = $3,
               description = $4
           WHERE id = $5`,
          [
            i + 1,
            scheduleEvent.time,
            scheduleEvent.event,
            scheduleEvent.description || null,
            scheduleEvent.id
          ]
        );
      }
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
    const result = await pool.query('SELECT * FROM schedule ORDER BY sort_order, time');
    res.json(result.rows);
  } catch (error) {
    return sendInternalError(res, 'Reorder schedule error', error);
  }
});

// Delete a schedule event
app.delete('/api/schedule/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM schedule WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return sendNotFound(res, 'Event not found');
    }
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    return sendInternalError(res, 'Delete schedule event error', error);
  }
});

// Update admin email in settings
app.put('/api/settings/admin-email', authenticateToken, async (req, res) => {
  try {
    const { adminEmail } = req.body;
    if (!adminEmail) {
      return sendBadRequest(res, 'Admin email is required');
    }
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('adminEmail', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [adminEmail]
    );
    res.json({ success: true, adminEmail });
  } catch (error) {
    return sendInternalError(res, 'Update admin email error', error);
  }
});

// Get admin email (for frontend settings)
app.get('/api/settings/admin-email', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'adminEmail'");
    res.json({ adminEmail: result.rows[0]?.value || '' });
  } catch (error) {
    return sendInternalError(res, 'Get admin email error', error);
  }
});

// Get all settings
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings = Object.fromEntries(result.rows.map(r => [r.key, r.value]));
    res.json(settings);
  } catch (error) {
    return sendInternalError(res, 'Get all settings error', error);
  }
});

// Update all settings
app.put('/api/settings', authenticateToken, async (req, res) => {
  try {
    const settings = req.body;
    const keys = Object.keys(settings);
    for (const key of keys) {
      await pool.query(
        `INSERT INTO settings (key, value) VALUES ($1, $2)
         ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
        [key, settings[key]]
      );
    }
    res.json({ success: true });
  } catch (error) {
    return sendInternalError(res, 'Update all settings error', error);
  }
});

// ── Gallery ──────────────────────────────────────────────────────────────────

// Public: submit a photo for admin approval
app.post('/api/gallery/upload', strictLimiter, authenticatePublicToken, async (req, res) => {
  try {
    const { url, caption, submitterName } = req.body;
    if (!url) {
      return sendBadRequest(res, 'Photo URL is required');
    }
    // Basic URL validation — must start with http(s)://
    if (!/^https?:\/\/.+/i.test(url)) {
      return sendBadRequest(res, 'Photo URL must start with http:// or https://');
    }
    const result = await pool.query(
      `INSERT INTO photo_uploads (url, caption, submitter_name, status)
       VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [url, caption || null, submitterName || null]
    );
    res.status(201).json({ success: true, photo: result.rows[0] });
  } catch (error) {
    return sendInternalError(res, 'Gallery upload error', error);
  }
});

// Public: submit a photo file for admin approval
app.post('/api/gallery/upload-file', strictLimiter, authenticatePublicToken, (req, res) => {
  uploadPhoto.array('photo', 10)(req, res, async (uploadError) => {
    try {
      if (uploadError) {
        const status = uploadError.status || (uploadError.code === 'LIMIT_FILE_SIZE' ? 413 : 400);
        return res.status(status).json({ error: uploadError.message || 'Invalid upload' });
      }

      const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
      if (files.length === 0) {
        return sendBadRequest(res, 'At least one image file is required');
      }

      const { caption, submitterName } = req.body;
      const uploadedPhotos = [];

      for (const file of files) {
        const url = `/uploads/${file.filename}`;
        const result = await pool.query(
          `INSERT INTO photo_uploads (url, caption, submitter_name, status)
           VALUES ($1, $2, $3, 'pending') RETURNING *`,
          [url, caption || null, submitterName || null]
        );
        uploadedPhotos.push(result.rows[0]);
      }

      return res.status(201).json({
        success: true,
        photo: uploadedPhotos[0],
        photos: uploadedPhotos
      });
    } catch (error) {
      const uploadedFiles = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
      for (const file of uploadedFiles) {
        if (file?.path) {
          fs.unlink(file.path, () => {});
        }
      }
      return sendInternalError(res, 'Gallery file upload error', error);
    }
  });
});

// Admin: upload an image file and directly approve it
app.post('/api/gallery/upload-file-admin', authenticateToken, (req, res) => {
  uploadPhoto.array('photo', 10)(req, res, async (uploadError) => {
    try {
      if (uploadError) {
        const status = uploadError.status || (uploadError.code === 'LIMIT_FILE_SIZE' ? 413 : 400);
        return res.status(status).json({ error: uploadError.message || 'Invalid upload' });
      }

      const files = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
      if (files.length === 0) {
        return sendBadRequest(res, 'At least one image file is required');
      }

      const { caption, submitterName } = req.body;
      const uploadedPhotos = [];

      for (const file of files) {
        const url = `/uploads/${file.filename}`;
        const result = await pool.query(
          `INSERT INTO photo_uploads (url, caption, submitter_name, status)
           VALUES ($1, $2, $3, 'approved') RETURNING *`,
          [url, caption || null, submitterName || null]
        );
        uploadedPhotos.push(result.rows[0]);
      }

      return res.status(201).json({
        success: true,
        photo: uploadedPhotos[0],
        photos: uploadedPhotos
      });
    } catch (error) {
      const uploadedFiles = Array.isArray(req.files) ? req.files : (req.file ? [req.file] : []);
      for (const file of uploadedFiles) {
        if (file?.path) {
          fs.unlink(file.path, () => {});
        }
      }
      return sendInternalError(res, 'Gallery file upload error', error);
    }
  });
});

// Public: get all approved photos
app.get('/api/gallery', authenticatePublicToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, url, caption, submitter_name, featured, uploaded_at
       FROM photo_uploads WHERE status = 'approved'
       ORDER BY uploaded_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    return sendInternalError(res, 'Gallery fetch error', error);
  }
});

// Public: get all featured photos for carousel
app.get('/api/gallery/carousel/featured', authenticatePublicToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT id, url, caption, submitter_name, uploaded_at
       FROM photo_uploads WHERE status = 'approved' AND featured = true
       ORDER BY uploaded_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    return sendInternalError(res, 'Featured carousel fetch error', error);
  }
});

// Admin: get all pending submissions
app.get('/api/gallery/pending', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM photo_uploads WHERE status = 'pending' ORDER BY uploaded_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    return sendInternalError(res, 'Gallery pending fetch error', error);
  }
});

// Admin: approve or reject a submitted photo
app.put('/api/gallery/:id/status', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    if (status !== 'approved' && status !== 'rejected') {
      return sendBadRequest(res, "status must be 'approved' or 'rejected'");
    }
    const result = await pool.query(
      `UPDATE photo_uploads SET status = $1 WHERE id = $2 RETURNING *`,
      [status, id]
    );
    if (result.rows.length === 0) {
      return sendNotFound(res, 'Photo not found');
    }
    res.json(result.rows[0]);
  } catch (error) {
    return sendInternalError(res, 'Gallery status update error', error);
  }
});

// Admin: toggle featured status of an approved photo
app.put('/api/gallery/:id/featured', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { featured } = req.body;
    if (typeof featured !== 'boolean') {
      return sendBadRequest(res, 'featured must be a boolean');
    }
    const result = await pool.query(
      `UPDATE photo_uploads SET featured = $1 WHERE id = $2 AND status = 'approved' RETURNING *`,
      [featured, id]
    );
    if (result.rows.length === 0) {
      return sendNotFound(res, 'Photo not found or not approved');
    }
    res.json(result.rows[0]);
  } catch (error) {
    return sendInternalError(res, 'Gallery featured update error', error);
  }
});

// Admin: update an approved gallery photo
app.put('/api/gallery/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { url, caption, featured } = req.body;

    if (!url || typeof url !== 'string') {
      return sendBadRequest(res, 'Photo URL is required');
    }

    if (!/^https?:\/\/.+/i.test(url) && !url.startsWith('/uploads/')) {
      return sendBadRequest(res, 'Photo URL must start with http://, https://, or /uploads/');
    }

    if (!caption || typeof caption !== 'string') {
      return sendBadRequest(res, 'Photo caption is required');
    }

    if (typeof featured !== 'boolean') {
      return sendBadRequest(res, 'featured must be a boolean');
    }

    const result = await pool.query(
      `UPDATE photo_uploads
       SET url = $1, caption = $2, featured = $3
       WHERE id = $4 AND status = 'approved'
       RETURNING *`,
      [url.trim(), caption.trim(), featured, id]
    );

    if (result.rows.length === 0) {
      return sendNotFound(res, 'Photo not found or not approved');
    }

    return res.json(result.rows[0]);
  } catch (error) {
    return sendInternalError(res, 'Gallery photo update error', error);
  }
});

// Admin: delete a gallery photo
app.delete('/api/gallery/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query(
      `DELETE FROM photo_uploads WHERE id = $1 RETURNING *`,
      [id]
    );

    if (result.rows.length === 0) {
      return sendNotFound(res, 'Photo not found');
    }

    const deletedPhoto = result.rows[0];
    if (deletedPhoto.url && deletedPhoto.url.startsWith('/uploads/')) {
      const filePath = path.join(uploadDir, path.basename(deletedPhoto.url));
      fs.unlink(filePath, () => {});
    }

    return res.json({ success: true, photo: deletedPhoto });
  } catch (error) {
    return sendInternalError(res, 'Gallery delete error', error);
  }
});

// Error handling middleware
app.use((err, req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server only when run directly (not when required for testing)
if (require.main === module) {
  (async () => {
    try {
      await runMigrations();
    } catch (error) {
      console.error('Failed to run startup migrations:', error);
      process.exit(1);
    }
    app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
    });
  })();
}

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  pool.end(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received, shutting down gracefully');
  pool.end(() => {
    console.log('Database connection closed');
    process.exit(0);
  });
});

// Get admin email from settings
async function getAdminEmail() {
  const result = await pool.query("SELECT value FROM settings WHERE key = 'adminEmail'");
  return result.rows[0]?.value || process.env.ADMIN_EMAIL;
}

async function ensureGuestCountColumn() {
  if (guestCountColumnReady || process.env.NODE_ENV === 'test') {
    return;
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const guestCountColumnResult = await client.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_name = 'guests' AND column_name = 'guest_count'
       LIMIT 1`
    );

    if (guestCountColumnResult.rowCount === 0) {
      await client.query('ALTER TABLE guests ADD COLUMN guest_count INTEGER');
    }

    const plusOneColumnResult = await client.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_name = 'guests' AND column_name = 'plus_one'
       LIMIT 1`
    );

    if (plusOneColumnResult.rowCount > 0) {
      await client.query(
        'UPDATE guests SET guest_count = CASE WHEN plus_one THEN 2 ELSE 1 END WHERE guest_count IS NULL'
      );
      await client.query('ALTER TABLE guests DROP COLUMN IF EXISTS plus_one');
    }

    await client.query('UPDATE guests SET guest_count = 1 WHERE guest_count IS NULL');
    await client.query('ALTER TABLE guests ALTER COLUMN guest_count SET DEFAULT 1');

    const emailNotNullResult = await client.query(
      `SELECT 1
       FROM information_schema.columns
       WHERE table_name = 'guests'
         AND column_name = 'email'
         AND is_nullable = 'NO'
       LIMIT 1`
    );

    if (emailNotNullResult.rowCount > 0) {
      await client.query('ALTER TABLE guests ALTER COLUMN email DROP NOT NULL');
    }
    const guestCountConstraintResult = await client.query(
      `SELECT 1
       FROM pg_constraint
       WHERE conname = 'guests_guest_count_non_negative'
       LIMIT 1`
    );

    if (guestCountConstraintResult.rowCount === 0) {
      await client.query(
        `ALTER TABLE guests
         ADD CONSTRAINT guests_guest_count_non_negative
         CHECK (guest_count >= 0) NOT VALID`
      );
      await client.query(
        'ALTER TABLE guests VALIDATE CONSTRAINT guests_guest_count_non_negative'
      );
    }

    // Ensure email column is nullable (changed from NOT NULL in init.sh)
    await client.query('ALTER TABLE guests ALTER COLUMN email DROP NOT NULL');

    await client.query('COMMIT');
    guestCountColumnReady = true;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

async function runMigrations() {
  if (process.env.NODE_ENV === 'test') {
    return;
  }
  try {
    await ensureGuestCountColumn();
    await ensureApprovalStatusColumn();
  } catch (error) {
    console.error('Startup migration error:', error);
    throw error;
  }
}

function normalizeGuestCount(guestCount, plusOne) {
  if (guestCount !== undefined && guestCount !== null && String(guestCount).trim() !== '') {
    const parsed = Number.parseInt(guestCount, 10);
    if (Number.isInteger(parsed) && parsed >= 0) {
      return parsed;
    }
  }

  return plusOne ? 2 : 1;
}

let approvalStatusColumnReady = false;
let approvalStatusColumnReadyPromise = null;

async function ensureApprovalStatusColumn() {
  if (process.env.NODE_ENV === 'test') {
    return;
  }

  if (approvalStatusColumnReady) {
    return;
  }

  if (approvalStatusColumnReadyPromise) {
    await approvalStatusColumnReadyPromise;
    return;
  }

  approvalStatusColumnReadyPromise = (async () => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      const approvalStatusColumnResult = await client.query(
        `SELECT 1
         FROM information_schema.columns
         WHERE table_name = 'guests' AND column_name = 'approval_status'
         LIMIT 1`
      );

      if (approvalStatusColumnResult.rowCount === 0) {
        await client.query(
          `ALTER TABLE guests ADD COLUMN approval_status VARCHAR(20) DEFAULT 'approved'
           CHECK (approval_status IN ('pending', 'approved', 'rejected'))`
        );
      }

      await client.query('COMMIT');
      approvalStatusColumnReady = true;
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
      approvalStatusColumnReadyPromise = null;
    }
  })();

  await approvalStatusColumnReadyPromise;
}

module.exports = app;