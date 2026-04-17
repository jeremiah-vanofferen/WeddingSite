// Copyright 2026 Jeremiah Van Offeren

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
require('dotenv').config();

const { pool, runMigrations } = require('./db');
const { limiter, strictLimiter } = require('./middleware');
const { uploadDir } = require('./upload');

const app = express();
const PORT = process.env.PORT || 5000;
const BIND_HOST = process.env.BIND_HOST || '0.0.0.0';

if (!process.env.JWT_SECRET) {
  console.error('FATAL: JWT_SECRET environment variable is not set');
  process.exit(1);
}

app.use(helmet());
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? (process.env.CORS_ORIGIN || false) : true,
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(uploadDir));

// Rate limiting
app.use('/api/', limiter);
app.use('/api/auth/login', strictLimiter);
app.use('/api/auth/change-password', strictLimiter);
app.use('/api/rsvp', strictLimiter);
app.use('/api/public/token', strictLimiter);

// Routes
app.use('/api', require('./routes/health'));

// Public routes
app.use('/api/public', require('./routes/public/token'));
app.use('/api/public', require('./routes/public/settings'));
app.use('/api/public', require('./routes/public/guestLookup'));
app.use('/api', require('./routes/public/rsvp'));
app.use('/api', require('./routes/public/messages'));
app.use('/api/schedule', require('./routes/public/schedule'));
app.use('/api/gallery', require('./routes/public/gallery'));

// Private routes
app.use('/api/auth', require('./routes/private/auth'));
app.use('/api/guests', require('./routes/private/guests'));
app.use('/api/messages', require('./routes/private/messages'));
app.use('/api/settings', require('./routes/private/settings'));
app.use('/api/schedule', require('./routes/private/schedule'));
app.use('/api/gallery', require('./routes/private/gallery'));

// Error handlers
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});
app.use('*', (_req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

if (require.main === module) {
  (async () => {
    try {
      await runMigrations();
    } catch (error) {
      console.error('Failed to run startup migrations:', error);
      process.exit(1);
    }
    app.listen(PORT, BIND_HOST, () => {
      console.log(`Server running on ${BIND_HOST}:${PORT}`);
    });
  })();
}

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

module.exports = app;
