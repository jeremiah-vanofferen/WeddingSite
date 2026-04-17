// Copyright 2026 Jeremiah Van Offeren

const { Router } = require('express');
const { pool } = require('../../db');
const { authenticatePublicToken, sendInternalError } = require('../../middleware');

const router = Router();

const PUBLIC_KEYS = [
  'websiteName', 'theme', 'primaryColor', 'primaryColorHover', 'fontFamily',
  'showCountdown', 'allowRsvp', 'welcomeMessage',
  'weddingDate', 'weddingTime', 'weddingTimeZone', 'weddingLocation', 'weddingAddress', 'weddingDescription',
  'carouselSpeed', 'carouselTransition', 'registryUrl'
];
const BOOL_KEYS = ['showCountdown', 'allowRsvp'];

router.get('/settings', authenticatePublicToken, async (_req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings WHERE key = ANY($1)', [PUBLIC_KEYS]);
    const raw = Object.fromEntries(result.rows.map(r => [r.key, r.value]));
    const settings = Object.fromEntries(
      Object.entries(raw).map(([k, v]) => [k, BOOL_KEYS.includes(k) ? v === 'true' : v])
    );
    res.json(settings);
  } catch (error) {
    return sendInternalError(res, 'Get public settings error', error);
  }
});

module.exports = router;
