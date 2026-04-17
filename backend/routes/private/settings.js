// Copyright 2026 Jeremiah Van Offeren

const { Router } = require('express');
const { pool } = require('../../db');
const { authenticateToken, sendBadRequest, sendInternalError } = require('../../middleware');

const router = Router();

router.get('/', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query('SELECT key, value FROM settings');
    const settings = Object.fromEntries(result.rows.map(r => [r.key, r.value]));
    res.json(settings);
  } catch (error) {
    return sendInternalError(res, 'Get all settings error', error);
  }
});

router.put('/', authenticateToken, async (req, res) => {
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

router.get('/admin-email', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query("SELECT value FROM settings WHERE key = 'adminEmail'");
    res.json({ adminEmail: result.rows[0]?.value || '' });
  } catch (error) {
    return sendInternalError(res, 'Get admin email error', error);
  }
});

router.put('/admin-email', authenticateToken, async (req, res) => {
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

module.exports = router;
