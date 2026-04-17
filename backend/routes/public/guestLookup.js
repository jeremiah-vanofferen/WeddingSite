// Copyright 2026 Jeremiah Van Offeren

const { Router } = require('express');
const { pool } = require('../../db');
const { authenticatePublicToken, sendInternalError } = require('../../middleware');

const router = Router();

router.get('/guest-lookup', authenticatePublicToken, async (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q || q.length < 2) {
      return res.json({ suggestions: [] });
    }
    const result = await pool.query(
      `SELECT DISTINCT name AS value
         FROM guests
        WHERE name ILIKE $1
          AND name IS NOT NULL
          AND btrim(name) <> ''
        ORDER BY name ASC
        LIMIT 5`,
      [`%${q}%`]
    );
    const suggestions = result.rows
      .map(row => row.value)
      .filter(value => typeof value === 'string' && value.trim() !== '');
    res.json({ suggestions });
  } catch (error) {
    return sendInternalError(res, 'Guest lookup error', error);
  }
});

module.exports = router;
