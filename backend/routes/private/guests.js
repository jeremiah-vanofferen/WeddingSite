// Copyright 2026 Jeremiah Van Offeren

const { Router } = require('express');
const { pool, normalizeGuestCount, ensureApprovalStatusColumn, guestDecryptCols } = require('../../db');
const { authenticateToken, sendBadRequest, sendNotFound, sendInternalError } = require('../../middleware');

const router = Router();

router.get('/', authenticateToken, async (_req, res) => {
  try {
    const key = process.env.ENCRYPTION_KEY;
    const result = await pool.query(
      `SELECT ${guestDecryptCols('$1')} FROM guests ORDER BY created_at DESC`,
      [key]
    );
    res.json(result.rows);
  } catch (error) {
    return sendInternalError(res, 'Get guests error', error);
  }
});

router.get('/pending-approvals', authenticateToken, async (_req, res) => {
  await ensureApprovalStatusColumn();
  try {
    const key = process.env.ENCRYPTION_KEY;
    const result = await pool.query(
      `SELECT ${guestDecryptCols('$1')} FROM guests WHERE approval_status = 'pending' ORDER BY created_at DESC`,
      [key]
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

    const key = process.env.ENCRYPTION_KEY;
    const normalizedGuestCount = normalizeGuestCount(guestCount ?? guest_count, plusOne ?? plus_one);

    if (email) {
      const dup = await pool.query(
        `SELECT id FROM guests WHERE email IS NOT NULL AND pgp_sym_decrypt(decode(email, 'base64'), $1) = $2 LIMIT 1`,
        [key, email]
      );
      if (dup.rowCount > 0) return res.status(409).json({ error: 'Email already exists' });
    }

    const result = await pool.query(
      `INSERT INTO guests (name, email, phone, address, rsvp, guest_count)
       VALUES ($1,
         CASE WHEN $2::text IS NOT NULL THEN encode(pgp_sym_encrypt($2::text, $7), 'base64') ELSE NULL END,
         CASE WHEN $3::text IS NOT NULL THEN encode(pgp_sym_encrypt($3::text, $7), 'base64') ELSE NULL END,
         CASE WHEN $4::text IS NOT NULL THEN encode(pgp_sym_encrypt($4::text, $7), 'base64') ELSE NULL END,
         $5, $6)
       RETURNING ${guestDecryptCols('$7')}`,
      [name, email || null, phone || null, address || null, rsvp || 'Pending', normalizedGuestCount, key]
    );
    res.status(201).json(result.rows[0]);
  } catch (error) {
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

    const key = process.env.ENCRYPTION_KEY;
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      if (mode === 'replace') {
        await client.query('DELETE FROM guests');
      }

      for (const guest of guests) {
        const guestName = guest.name;
        const guestEmail = guest.email || null;
        const guestPhone = guest.phone || null;
        const guestAddress = guest.address || null;
        const guestRsvp = guest.rsvp || 'Pending';
        const guestCount = normalizeGuestCount(guest.guestCount, guest.plusOne);

        if (guestEmail) {
          const existing = await client.query(
            `SELECT id FROM guests WHERE email IS NOT NULL AND pgp_sym_decrypt(decode(email, 'base64'), $1) = $2 LIMIT 1`,
            [key, guestEmail]
          );

          if (existing.rowCount > 0) {
            await client.query(
              `UPDATE guests
               SET name = $1,
                 phone   = CASE WHEN $2::text IS NOT NULL THEN encode(pgp_sym_encrypt($2::text, $3), 'base64') ELSE NULL END,
                 address = CASE WHEN $4::text IS NOT NULL THEN encode(pgp_sym_encrypt($4::text, $3), 'base64') ELSE NULL END,
                 rsvp = $5, guest_count = $6, updated_at = CURRENT_TIMESTAMP
               WHERE id = $7`,
              [guestName, guestPhone, key, guestAddress, guestRsvp, guestCount, existing.rows[0].id]
            );
          } else {
            await client.query(
              `INSERT INTO guests (name, email, phone, address, rsvp, guest_count)
               VALUES ($1,
                 encode(pgp_sym_encrypt($2::text, $7), 'base64'),
                 CASE WHEN $3::text IS NOT NULL THEN encode(pgp_sym_encrypt($3::text, $7), 'base64') ELSE NULL END,
                 CASE WHEN $4::text IS NOT NULL THEN encode(pgp_sym_encrypt($4::text, $7), 'base64') ELSE NULL END,
                 $5, $6)`,
              [guestName, guestEmail, guestPhone, guestAddress, guestRsvp, guestCount, key]
            );
          }
        } else {
          await client.query(
            `INSERT INTO guests (name, phone, address, rsvp, guest_count)
             VALUES ($1,
               CASE WHEN $2::text IS NOT NULL THEN encode(pgp_sym_encrypt($2::text, $4), 'base64') ELSE NULL END,
               CASE WHEN $3::text IS NOT NULL THEN encode(pgp_sym_encrypt($3::text, $4), 'base64') ELSE NULL END,
               $5, $6)`,
            [guestName, guestPhone, guestAddress, key, guestRsvp, guestCount]
          );
        }
      }

      await client.query('COMMIT');
      const result = await client.query(
        `SELECT ${guestDecryptCols('$1')} FROM guests ORDER BY created_at DESC`,
        [key]
      );
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

    const key = process.env.ENCRYPTION_KEY;

    if (email) {
      const dup = await pool.query(
        `SELECT id FROM guests WHERE email IS NOT NULL AND pgp_sym_decrypt(decode(email, 'base64'), $1) = $2 AND id <> $3 LIMIT 1`,
        [key, email, id]
      );
      if (dup.rowCount > 0) return res.status(409).json({ error: 'Email already exists' });
    }

    const result = await pool.query(
      `UPDATE guests
       SET name = $1,
         email   = CASE WHEN $2::text IS NOT NULL THEN encode(pgp_sym_encrypt($2::text, $7), 'base64') ELSE NULL END,
         phone   = CASE WHEN $3::text IS NOT NULL THEN encode(pgp_sym_encrypt($3::text, $7), 'base64') ELSE NULL END,
         address = CASE WHEN $4::text IS NOT NULL THEN encode(pgp_sym_encrypt($4::text, $7), 'base64') ELSE NULL END,
         rsvp = $5, guest_count = $6, updated_at = CURRENT_TIMESTAMP
       WHERE id = $8
       RETURNING ${guestDecryptCols('$7')}`,
      [name, email || null, phone || null, address || null, rsvp, normalizedGuestCount, key, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Guest not found' });
    }
    res.json(result.rows[0]);
  } catch (error) {
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

    const key = process.env.ENCRYPTION_KEY;
    const result = await pool.query(
      `UPDATE guests SET approval_status = $1, updated_at = CURRENT_TIMESTAMP WHERE id = $2
       RETURNING ${guestDecryptCols('$3')}`,
      [status, id, key]
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
    const result = await pool.query('DELETE FROM guests WHERE id = $1 RETURNING id', [id]);
    if (result.rows.length === 0) {
      return sendNotFound(res, 'Guest not found');
    }
    res.json({ message: 'Guest deleted successfully' });
  } catch (error) {
    return sendInternalError(res, 'Delete guest error', error);
  }
});

module.exports = router;
