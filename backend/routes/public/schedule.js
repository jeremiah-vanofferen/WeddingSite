// Copyright 2026 Jeremiah Van Offeren

const { Router } = require('express');
const { pool } = require('../../db');
const { authenticatePublicToken, sendInternalError } = require('../../middleware');

const router = Router();

router.get('/', authenticatePublicToken, async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM schedule ORDER BY sort_order, time');
    res.json(result.rows);
  } catch (error) {
    return sendInternalError(res, 'Get schedule error', error);
  }
});

module.exports = router;
