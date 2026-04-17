// Copyright 2026 Jeremiah Van Offeren

const { Router } = require('express');

const router = Router();

router.get('/health', (_req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

module.exports = router;
