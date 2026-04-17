// Copyright 2026 Jeremiah Van Offeren

const { Router } = require('express');
const nodemailer = require('nodemailer');
const { pool, getAdminEmail } = require('../../db');
const { authenticatePublicToken, strictLimiter, sendBadRequest, sendInternalError } = require('../../middleware');

const router = Router();

router.post('/messages', strictLimiter, authenticatePublicToken, async (req, res) => {
  try {
    const { name, email, message } = req.body;
    if (!name || !email || !message) {
      return sendBadRequest(res, 'Name, email, and message are required');
    }
    const result = await pool.query(
      `INSERT INTO messages (name, email, message) VALUES ($1, $2, $3) RETURNING *`,
      [name, email, message]
    );

    const adminEmail = await getAdminEmail();
    if (adminEmail && process.env.GMAIL_USER && process.env.GMAIL_PASS) {
      try {
        const transporter = nodemailer.createTransport({
          service: 'gmail',
          auth: { user: process.env.GMAIL_USER, pass: process.env.GMAIL_PASS }
        });
        await transporter.sendMail({
          from: process.env.GMAIL_USER,
          to: adminEmail,
          subject: 'New Contact Message',
          text: `From: ${name} <${email}>\n\n${message}`
        });
        console.log('Contact notification email sent to', adminEmail);
      } catch (emailError) {
        console.error('Failed to send contact notification email:', emailError.message);
      }
    } else {
      console.warn('Email not sent — missing adminEmail, GMAIL_USER, or GMAIL_PASS');
    }

    res.status(201).json({ success: true, message: result.rows[0] });
  } catch (error) {
    return sendInternalError(res, 'Message save error', error);
  }
});

module.exports = router;
