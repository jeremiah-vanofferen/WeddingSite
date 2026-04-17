// Copyright 2026 Jeremiah Van Offeren

const { Router } = require('express');
const nodemailer = require('nodemailer');
const { pool, getAdminEmail } = require('../../db');
const { authenticatePublicToken, sendBadRequest, sendInternalError } = require('../../middleware');

const router = Router();

router.post('/rsvp', authenticatePublicToken, async (req, res) => {
  try {
    const { name, email, rsvp, guests } = req.body;
    if (!name || !email || !rsvp) {
      return sendBadRequest(res, 'Name, email, and RSVP status are required');
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return sendBadRequest(res, 'Invalid email address');
    }

    const normalizedRsvp = String(rsvp).toLowerCase();
    if (normalizedRsvp !== 'yes' && normalizedRsvp !== 'no') {
      return sendBadRequest(res, "RSVP status must be 'yes' or 'no'");
    }

    const hasGuestsInput = guests !== undefined && guests !== null && String(guests).trim() !== '';
    const parsedGuests = hasGuestsInput ? Number.parseInt(guests, 10) : (normalizedRsvp === 'yes' ? 1 : 0);
    if (!Number.isInteger(parsedGuests) || parsedGuests < 0) {
      return sendBadRequest(res, 'Guests must be a non-negative integer');
    }
    if (normalizedRsvp === 'yes' && parsedGuests < 1) {
      return sendBadRequest(res, 'Attending guests must be at least 1');
    }

    const normalizedName = name.trim();
    const normalizedEmail = email.trim().toLowerCase();
    const rsvpStatus = normalizedRsvp === 'yes' ? 'Yes' : 'No';

    // Match guest by name only when the matched record has no email yet
    // (admin pre-added guest without an email is eligible to be "claimed" via name).
    // If the matched guest already has an email, insert a new RSVP to prevent
    // one guest from overwriting another guest's record via a shared name.
    const existingByNameResult = await pool.query(
      `SELECT id, email FROM guests
       WHERE lower(btrim(name)) = lower(btrim($1))
       ORDER BY created_at DESC LIMIT 1`,
      [normalizedName]
    );

    const matchedByName = existingByNameResult.rowCount > 0 ? existingByNameResult.rows[0] : null;
    const canClaimByName = matchedByName !== null && matchedByName.email === null;

    let result;
    if (canClaimByName) {
      const emailOwnerResult = await pool.query(
        'SELECT id FROM guests WHERE email = $1 AND id <> $2 LIMIT 1',
        [normalizedEmail, matchedByName.id]
      );
      if (emailOwnerResult.rowCount > 0) {
        return res.status(409).json({ error: 'Email already exists' });
      }
      result = await pool.query(
        `UPDATE guests
         SET name = $1, email = $2, rsvp = $3, guest_count = $4, approval_status = 'pending', updated_at = CURRENT_TIMESTAMP
         WHERE id = $5 RETURNING *`,
        [normalizedName, normalizedEmail, rsvpStatus, parsedGuests, matchedByName.id]
      );
    } else {
      // Upsert by email: allow guests to update an existing RSVP by resubmitting
      // with the same email address (preserves prior upsert behavior).
      const existingByEmailResult = await pool.query(
        'SELECT id FROM guests WHERE email = $1 LIMIT 1',
        [normalizedEmail]
      );
      if (existingByEmailResult.rowCount > 0) {
        result = await pool.query(
          `UPDATE guests
           SET name = $1, rsvp = $2, guest_count = $3, approval_status = 'pending', updated_at = CURRENT_TIMESTAMP
           WHERE id = $4 RETURNING *`,
          [normalizedName, rsvpStatus, parsedGuests, existingByEmailResult.rows[0].id]
        );
      } else {
        result = await pool.query(
          `INSERT INTO guests (name, email, rsvp, guest_count, approval_status)
           VALUES ($1, $2, $3, $4, 'pending') RETURNING *`,
          [normalizedName, normalizedEmail, rsvpStatus, parsedGuests]
        );
      }
    }

    const adminEmail = await getAdminEmail();
    if (adminEmail && process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
        });
        const guestCount = `${parsedGuests} guest${parsedGuests === 1 ? '' : 's'}`;
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: adminEmail,
          subject: `New RSVP: ${name} — ${rsvpStatus}`,
          text: `A new RSVP has been submitted.\n\nName: ${name}\nEmail: ${email}\nRSVP: ${rsvpStatus}\nParty size: ${guestCount}`
        });
        console.log('RSVP notification email sent to', adminEmail);
      } catch (emailError) {
        console.error('Failed to send RSVP notification email:', emailError.message);
      }
    }

    res.status(201).json({ success: true, guest: result.rows[0] });
  } catch (error) {
    if (error.code === '23505') {
      return res.status(409).json({ error: 'Email already exists' });
    }
    return sendInternalError(res, 'RSVP error', error);
  }
});

module.exports = router;
