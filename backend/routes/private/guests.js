// Copyright 2026 Jeremiah Van Offeren

const { Router } = require('express');
const { pool, normalizeGuestCount, ensureApprovalStatusColumn } = require('../../db');
const { authenticateToken, sendBadRequest, sendNotFound, sendInternalError } = require('../../middleware');

const router = Router();

router.get('/', authenticateToken, async (_req, res) => {
  try {
    const result = await pool.query('SELECT * FROM guests ORDER BY created_at DESC');
    res.json(result.rows);
  } catch (error) {
    return sendInternalError(res, 'Get guests error', error);
  }
});

router.get('/pending-approvals', authenticateToken, async (_req, res) => {
  await ensureApprovalStatusColumn();
  try {
    const result = await pool.query(
      `SELECT * FROM guests WHERE approval_status = 'pending' ORDER BY created_at DESC`
    );
    res.json(result.rows);
  } catch (error) {
    return sendInternalError(res, 'Get pending approvals error', error);
  }
});

router.post('/', authenticateToken, async (req, res) => {
  try {
    const { name, email, phone, address, rsvp, plusOne, plus_one, guestCount, guest_count } = req.body;
    if (!name) {
      return res.status(400).json({ error: 'Name is required' });
    }

    const normalizedGuestCount = normalizeGuestCount(guestCount ?? guest_count, plusOne ?? plus_one);
    const result = await pool.query(
      `INSERT INTO guests (name, email, phone, address, rsvp, guest_count)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`,
      [name, email || null, phone || null, address || null, rsvp || 'Pending', normalizedGuestCount]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    return sendInternalError(res, 'Add guest error', error);
  }
});

router.post('/bulk', authenticateToken, async (req, res) => {
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
               name = EXCLUDED.name, phone = EXCLUDED.phone, address = EXCLUDED.address,
               rsvp = EXCLUDED.rsvp, guest_count = EXCLUDED.guest_count, updated_at = CURRENT_TIMESTAMP`,
            value
          );
        } else {
          await client.query(
            `INSERT INTO guests (name, email, phone, address, rsvp, guest_count) VALUES ($1, $2, $3, $4, $5, $6)`,
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

router.put('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const { name, email, phone, address, rsvp, plusOne, plus_one, guestCount, guest_count } = req.body;
    const normalizedGuestCount = normalizeGuestCount(guestCount ?? guest_count, plusOne ?? plus_one);

    const result = await pool.query(
      `UPDATE guests
       SET name = $1, email = $2, phone = $3, address = $4, rsvp = $5, guest_count = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $7 RETURNING *`,
      [name, email, phone || null, address || null, rsvp, normalizedGuestCount, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    return sendInternalError(res, 'Update guest error', error);
  }
});

router.put('/:id/approval', authenticateToken, async (req, res) => {
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
    return sendInternalError(res, 'Update RSVP approval error', error);
  }
});

router.delete('/:id', authenticateToken, async (req, res) => {
  try {
    const { id } = req.params;
    const result = await pool.query('DELETE FROM guests WHERE id = $1 RETURNING *', [id]);
    if (result.rows.length === 0) {
      return sendNotFound(res, 'Guest not found');
    }
    res.json({ message: 'Guest deleted successfully' });
  } catch (error) {
    return sendInternalError(res, 'Delete guest error', error);
  }
});

module.exports = router;
