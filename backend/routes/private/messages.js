// Copyright 2026 Jeremiah Van Offeren

const { Router } = require('express');
const { pool } = require('../../db');
const { authenticateToken, sendNotFound, sendInternalError } = require('../../middleware');

const router = Router();

router.get('/', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM messages ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    return sendInternalError(res, 'Get messages error', error);
  }
});

router.put('/:id/read', authenticateToken, async (req, res) => {
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

module.exports = router;
