// Copyright 2026 Jeremiah Van Offeren

const { Router } = require('express');
const jwt = require('jsonwebtoken');
const { sendInternalError } = require('../../middleware');

const router = Router();
const publicTokenExpiresIn = process.env.PUBLIC_JWT_EXPIRES_IN || '2h';

router.post('/token', (_req, res) => {
  try {
    const token = jwt.sign({ type: 'public' }, process.env.JWT_SECRET, { expiresIn: publicTokenExpiresIn });
    return res.json({ token, expiresIn: publicTokenExpiresIn });
  } catch (error) {
    return sendInternalError(res, 'Public token mint error', error);
  }
});

module.exports = router;
