// Copyright 2026 Jeremiah Van Offeren

const { Router } = require('express');
const { pool } = require('../../db');
const { authenticateToken, sendBadRequest, sendNotFound, sendInternalError } = require('../../middleware');

const router = Router();

router.post('/', authenticateToken, async (req, res) => {
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

router.put('/', authenticateToken, async (req, res) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events)) {
      return sendBadRequest(res, 'events must be an array');
    }
    for (let i = 0; i < events.length; i++) {
      const e = events[i];
      if (!e.id || !e.time || !e.event) {
        return sendBadRequest(res, `events[${i}] must have id, time, and event`);
      }
    }

    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      for (let i = 0; i < events.length; i++) {
        const scheduleEvent = events[i];
        await client.query(
          `UPDATE schedule SET sort_order = $1, time = $2, event = $3, description = $4 WHERE id = $5`,
          [i + 1, scheduleEvent.time, scheduleEvent.event, scheduleEvent.description || null, scheduleEvent.id]
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

router.put('/:id', authenticateToken, async (req, res) => {
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

router.delete('/:id', authenticateToken, async (req, res) => {
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

module.exports = router;
