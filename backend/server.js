const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const nodemailer = require('nodemailer');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Database connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : true,
  credentials: true
}));
app.use(express.json());

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});
app.use('/api/', limiter);

// Auth middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) return res.status(401).json({ error: 'Access token required' });

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Invalid token' });
    req.user = user;
    next();
  });
};

// Verify token route
app.get('/api/auth/verify', authenticateToken, (req, res) => {
  res.json({ user: { id: req.user.id, username: req.user.username } });
});

// Routes

// Login route
app.post('/api/auth/login', async (req, res) => {
  try {
    const { username, password } = req.body;
    console.log('Login attempt:', username);

    if (!username || !password) {
      return res.status(400).json({ error: 'Username and password required' });
    }

    const result = await pool.query('SELECT * FROM admin_users WHERE username = $1', [username]);

    if (result.rowCount == 0) {
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
    const { name, email, phone, address, rsvp, plusOne } = req.body;

    if (!name || !email) {
      return res.status(400).json({ error: 'Name and email are required' });
    }

    const result = await pool.query(
      `INSERT INTO guests (name, email, phone, address, rsvp, plus_one)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [name, email, phone || null, address || null, rsvp || 'Pending', plusOne || false]
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
    const { name, email, phone, address, rsvp, plusOne } = req.body;

    const result = await pool.query(
      `UPDATE guests
       SET name = $1, email = $2, phone = $3, address = $4, rsvp = $5, plus_one = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7
       RETURNING *`,
      [name, email, phone || null, address || null, rsvp, plusOne, id]
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

// Bulk import guests
app.post('/api/guests/bulk', authenticateToken, async (req, res) => {
  try {
    const { guests, mode } = req.body; // mode: 'replace' or 'merge'

    if (!Array.isArray(guests)) {
      return res.status(400).json({ error: 'Guests must be an array' });
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
        guest.plusOne || false
      ]);

      for (const value of values) {
        await client.query(
          `INSERT INTO guests (name, email, phone, address, rsvp, plus_one)
           VALUES ($1, $2, $3, $4, $5, $6)
           ON CONFLICT (email) DO UPDATE SET
             name = EXCLUDED.name,
             phone = EXCLUDED.phone,
             address = EXCLUDED.address,
             rsvp = EXCLUDED.rsvp,
             plus_one = EXCLUDED.plus_one,
             updated_at = CURRENT_TIMESTAMP`,
          value
        );
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
    console.error('Bulk import error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public RSVP endpoint
app.post('/api/rsvp', async (req, res) => {
  try {
    const { name, email, rsvp, guests, dietary } = req.body;
    if (!name || !email || !rsvp) {
      return res.status(400).json({ error: 'Name, email, and RSVP status are required' });
    }
    // Insert or update guest by email
    const rsvpStatus = rsvp === 'yes' ? 'Yes' : 'No';
    const result = await pool.query(
      `INSERT INTO guests (name, email, rsvp, plus_one, address)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (email) DO UPDATE SET
         name = EXCLUDED.name,
         rsvp = EXCLUDED.rsvp,
         plus_one = EXCLUDED.plus_one,
         address = EXCLUDED.address,
         updated_at = CURRENT_TIMESTAMP
       RETURNING *`,
      [name, email, rsvpStatus, guests > 1, dietary || null]
    );

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
        const guestCount = guests > 1 ? `${guests} guests` : '1 guest';
        const dietaryNote = dietary ? `\nDietary notes: ${dietary}` : '';
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: adminEmail,
          subject: `New RSVP: ${name} — ${rsvpStatus}`,
          text: `A new RSVP has been submitted.\n\nName: ${name}\nEmail: ${email}\nRSVP: ${rsvpStatus}\nParty size: ${guestCount}${dietaryNote}`
        });
        console.log('RSVP notification email sent to', adminEmail);
      } catch (emailError) {
        console.error('Failed to send RSVP notification email:', emailError.message);
      }
    }

    res.status(201).json({ success: true, guest: result.rows[0] });
  } catch (error) {
    console.error('RSVP error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Public contact form endpoint
app.post('/api/messages', async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return res.status(400).json({ error: 'Name, email, and message are required' });
    }
    const result = await pool.query(
      `INSERT INTO messages (name, email, message) VALUES ($1, $2, $3) RETURNING *`,
      [name, email, message]
    );
    // Send email to admin
    const adminEmail = await getAdminEmail();
    console.log('Admin email for notification:', adminEmail);
    console.log('GMAIL_USER configured:', !!process.env.GMAIL_USER);
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
    console.error('Message save error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Admin: get all messages
app.get('/api/messages', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM messages ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    console.error('Get messages error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      return res.status(404).json({ error: 'Message not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Mark message as read error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Get public settings (wedding details + display settings, no auth required)
app.get('/api/public/settings', async (req, res) => {
  try {
    const PUBLIC_KEYS = ['websiteName', 'theme', 'primaryColor', 'primaryColorHover', 'fontFamily',
      'showCountdown', 'allowRsvp', 'welcomeMessage',
      'weddingDate', 'weddingTime', 'weddingLocation', 'weddingAddress', 'weddingDescription'];
    const result = await pool.query(
      'SELECT key, value FROM settings WHERE key = ANY($1)',
      [PUBLIC_KEYS]
    );
    const settings = Object.fromEntries(result.rows.map(r => [r.key, r.value]));
    res.json(settings);
  } catch (error) {
    console.error('Get public settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get schedule (public)
app.get('/api/schedule', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM schedule ORDER BY sort_order, time');
    res.json(result.rows);
  } catch (error) {
    console.error('Get schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Add a schedule event
app.post('/api/schedule', authenticateToken, async (req, res) => {
  try {
    const { time, event, description } = req.body;
    if (!time || !event) {
      return res.status(400).json({ error: 'Time and event name are required' });
    }
    const orderResult = await pool.query('SELECT COALESCE(MAX(sort_order), 0) + 1 AS next_order FROM schedule');
    const sortOrder = orderResult.rows[0].next_order;
    const result = await pool.query(
      'INSERT INTO schedule (time, event, description, sort_order) VALUES ($1, $2, $3, $4) RETURNING *',
      [time, event, description || null, sortOrder]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    console.error('Add schedule event error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    console.error('Update schedule event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Reorder schedule (replace sort_order for all events)
app.put('/api/schedule', authenticateToken, async (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'events must be an array' });
    }
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < events.length; i++) {
        await client.query('UPDATE schedule SET sort_order = $1 WHERE id = $2', [i + 1, events[i].id]);
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
    console.error('Reorder schedule error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Delete a schedule event
app.delete('/api/schedule/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM schedule WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Event not found' });
    }
    res.json({ message: 'Event deleted successfully' });
  } catch (error) {
    console.error('Delete schedule event error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Update admin email in settings
app.put('/api/settings/admin-email', authenticateToken, async (req, res) => {
  try {
    const { adminEmail } = req.body;
    if (!adminEmail) {
      return res.status(400).json({ error: 'Admin email is required' });
    }
    await pool.query(
      `INSERT INTO settings (key, value) VALUES ('adminEmail', $1)
       ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value`,
      [adminEmail]
    );
    res.json({ success: true, adminEmail });
  } catch (error) {
    console.error('Update admin email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get admin email (for frontend settings)
app.get('/api/settings/admin-email', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'adminEmail'");
    res.json({ adminEmail: result.rows[0]?.value || '' });
  } catch (error) {
    console.error('Get admin email error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Get all settings
app.get('/api/settings', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings = Object.fromEntries(result.rows.map(r => [r.key, r.value]));
    res.json(settings);
  } catch (error) {
    console.error('Get all settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
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
    console.error('Update all settings error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start server only when run directly (not when required for testing)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
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

module.exports = app;